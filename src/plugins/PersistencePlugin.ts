/**
 * PersistencePlugin - Auto-saves canvas state to IndexedDB on any change.
 * Restores state on page reload. Supports export/import to JSON with embedded blobs.
 */

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import {
  createBlobUrlMap,
  deserializeCanvas,
  exportCanvasToJSON,
  importCanvasFromJSON,
  revokeBlobUrls,
  serializeCanvas,
  type SerializedCanvas,
} from '../utils/CanvasSerializer';
import { PersistenceStorage } from '../utils/PersistenceStorage';

import { Plugin } from './Plugin';

export interface PersistencePluginOptions {
  /** Unique ID for this canvas (default: 'default') */
  canvasId?: string;
  /** Debounce delay in ms before saving (default: 300) */
  debounceMs?: number;
  /** Auto-restore on attach (default: true) */
  autoRestore?: boolean;
  /** Custom IndexedDB database name */
  dbName?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export class PersistencePlugin extends Plugin {
  private _core: CoreEngine | undefined;
  private _storage: PersistenceStorage;
  private _canvasId: string;
  private _debounceMs: number;
  private _autoRestore: boolean;
  private _debug: boolean;
  private _saveTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private _isRestoring = false;
  private _blobUrls = new Map<string, string>();
  private _initialized = false;
  /** Maps original blob URLs to stored blob IDs */
  private _blobUrlToId = new Map<string, string>();

  constructor(options: PersistencePluginOptions = {}) {
    super();
    this._canvasId = options.canvasId ?? 'default';
    this._debounceMs = options.debounceMs ?? 300;
    this._autoRestore = options.autoRestore ?? true;
    this._debug = options.debug ?? false;
    this._storage = new PersistenceStorage(options.dbName);
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    void this._initialize();
  }

  protected onDetach(core: CoreEngine): void {
    this._unsubscribeFromEvents(core);
    this._cancelPendingSave();
    revokeBlobUrls(this._blobUrls);
    this._storage.close();
    this._core = undefined;
    this._initialized = false;
  }

  private async _initialize(): Promise<void> {
    if (!this._core) return;

    try {
      await this._storage.init();
      this._log('Storage initialized');

      if (this._autoRestore) {
        try {
          await this.restore();
        } catch (error: unknown) {
          if (error instanceof Error) {
            this._core.eventBus.emit('persistence:restore:error', { error: error.message });
          }
        } finally {
          // Show container after restore completes
          this._core.showContainer();
        }
      }

      this._subscribeToEvents(this._core);
      this._initialized = true;
      this._log('Plugin initialized');
    } catch (error) {
      globalThis.console.error('[PersistencePlugin] Failed to initialize:', error);
    }
  }

  private _subscribeToEvents(core: CoreEngine): void {
    const eventBus = core.eventBus;

    // Node events - capture blobs immediately on creation
    eventBus.on('node:created', this._onNodeCreated);
    eventBus.on('node:removed', this._onNodeChange);
    eventBus.on('node:transformed', this._onNodeTransformed);
    eventBus.on('node:zIndexChanged', this._onNodeChange);

    // Group events
    eventBus.on('group:created', this._onNodeChange);
    eventBus.on('group:ungrouped', this._onNodeChange);

    // Clipboard events - capture blobs from pasted nodes
    eventBus.on('clipboard:paste', this._onClipboardPaste);

    // Camera events
    eventBus.on('camera:zoom', this._onCameraChange);
    eventBus.on('camera:setZoom', this._onCameraChange);
    eventBus.on('camera:pan', this._onCameraChange);
    eventBus.on('camera:reset', this._onCameraChange);

    // Konva events for drag/transform end
    const world = core.nodes.world;
    world.on('dragend.persistence', this._onKonvaDragEnd);

    const layer = core.nodes.layer;
    layer.on('transformend.persistence', this._onKonvaTransformEnd);

    this._log('Subscribed to events');
  }

  private _unsubscribeFromEvents(core: CoreEngine): void {
    const eventBus = core.eventBus;

    eventBus.off('node:created', this._onNodeCreated);
    eventBus.off('node:removed', this._onNodeChange);
    eventBus.off('node:transformed', this._onNodeTransformed);
    eventBus.off('node:zIndexChanged', this._onNodeChange);
    eventBus.off('group:created', this._onNodeChange);
    eventBus.off('group:ungrouped', this._onNodeChange);
    eventBus.off('clipboard:paste', this._onClipboardPaste);
    eventBus.off('camera:zoom', this._onCameraChange);
    eventBus.off('camera:setZoom', this._onCameraChange);
    eventBus.off('camera:pan', this._onCameraChange);
    eventBus.off('camera:reset', this._onCameraChange);

    core.nodes.world.off('.persistence');
    core.nodes.layer.off('.persistence');

    this._log('Unsubscribed from events');
  }

  // Event handlers
  private _onNodeCreated = (node: BaseNode): void => {
    if (this._isRestoring) return;
    // Immediately capture blob data for media nodes with blob URLs
    void this._captureBlobFromNode(node);

    // Subscribe to text changes for TextNode
    const konvaNode = node.getKonvaNode();
    if (konvaNode.className === 'Text') {
      konvaNode.on('textChange.persistence', this._onTextChange);
    }

    this._scheduleSave();
  };

  private _onNodeChange = (_node?: BaseNode | BaseNode[]): void => {
    if (this._isRestoring) return;
    this._scheduleSave();
  };

  private _onClipboardPaste = (nodes: BaseNode[]): void => {
    if (this._isRestoring) return;
    // Capture blobs from all pasted nodes
    for (const node of nodes) {
      void this._captureBlobFromNode(node);
    }
    this._scheduleSave();
  };

  /**
   * Capture blob data from a media node if it has a blob URL
   */
  private async _captureBlobFromNode(node: BaseNode): Promise<void> {
    const konvaNode = node.getKonvaNode();
    const src = konvaNode.getAttr('src') as string | undefined;

    if (!src?.startsWith('blob:')) return;

    // Skip if already captured
    if (this._blobUrlToId.has(src)) return;

    try {
      const response = await globalThis.fetch(src);
      if (!response.ok) return;

      const blob = await response.blob();
      const blobId = `blob_${String(Date.now())}_${Math.random().toString(36).substring(2, 11)}`;

      await this._storage.saveBlob(blobId, blob, src);
      this._blobUrlToId.set(src, blobId);

      this._log(`Captured blob: ${src} -> ${blobId}`);
    } catch (error) {
      this._log(`Failed to capture blob from ${src}: ${String(error)}`);
    }
  }

  private _onNodeTransformed = (_node: BaseNode, _changes: unknown): void => {
    if (this._isRestoring) return;
    this._scheduleSave();
  };

  private _onCameraChange = (): void => {
    if (this._isRestoring) return;
    this._scheduleSave();
  };

  private _onKonvaDragEnd = (): void => {
    if (this._isRestoring) return;
    this._scheduleSave();
  };

  private _onKonvaTransformEnd = (): void => {
    if (this._isRestoring) return;
    this._scheduleSave();
  };

  private _onTextChange = (): void => {
    if (this._isRestoring) return;
    this._log('Text changed, scheduling save');
    this._scheduleSave();
  };

  /**
   * Subscribe to textChange events for all existing TextNodes
   */
  private _subscribeToTextNodes(): void {
    if (!this._core) return;
    const allNodes = this._core.nodes.list();
    for (const node of allNodes) {
      const konvaNode = node.getKonvaNode();
      if (konvaNode.className === 'Text') {
        // Remove existing listener to avoid duplicates
        konvaNode.off('textChange.persistence');
        konvaNode.on('textChange.persistence', this._onTextChange);
      }
    }
  }

  private _scheduleSave(): void {
    this._cancelPendingSave();
    this._saveTimer = globalThis.setTimeout(() => {
      void this.save();
    }, this._debounceMs);
  }

  private _cancelPendingSave(): void {
    if (this._saveTimer) {
      globalThis.clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
  }

  /**
   * Save current canvas state to IndexedDB
   */
  public async save(): Promise<void> {
    if (!this._core || !this._initialized) return;

    try {
      // Capture any blob URLs that weren't captured on node:created
      // (e.g., VideoNode where src is set after creation via setSrc())
      // This also saves blobs to IndexedDB immediately
      await this._captureAllBlobUrls();

      // Serialize canvas state using the blobUrlToId mapping
      // (blobs are already saved in _captureAllBlobUrls)
      const state = serializeCanvas(this._core, { blobUrlToId: this._blobUrlToId });

      // Save state
      await this._storage.saveCanvasState(this._canvasId, JSON.stringify(state));

      // Cleanup unused blobs
      const usedBlobIds = new Set(state.blobIds);
      await this._storage.cleanupUnusedBlobs(usedBlobIds);

      this._log('Saved canvas state');
    } catch (error) {
      globalThis.console.error('[PersistencePlugin] Failed to save:', error);
    }
  }

  /**
   * Restore canvas state from IndexedDB
   */
  public async restore(): Promise<boolean> {
    if (!this._core) return false;

    try {
      const stored = await this._storage.loadCanvasState(this._canvasId);
      if (!stored) {
        this._log('No saved state found');
        return false;
      }

      const state = JSON.parse(stored.state) as SerializedCanvas;

      // Load blobs
      const storedBlobs = new Map<string, Blob>();
      for (const blobId of state.blobIds) {
        const blobData = await this._storage.loadBlob(blobId);
        if (blobData) {
          storedBlobs.set(blobId, blobData.blob);
        }
      }

      // Create blob URLs and rebuild blobUrlToId mapping
      revokeBlobUrls(this._blobUrls);
      this._blobUrls = createBlobUrlMap(state, storedBlobs);

      // Rebuild blobUrlToId mapping: new blob URL -> stored blobId
      this._blobUrlToId.clear();
      for (const [blobId, blobUrl] of this._blobUrls) {
        // Reverse mapping: blobUrl -> blobId
        this._blobUrlToId.set(blobUrl, blobId);
      }

      // Deserialize
      this._isRestoring = true;
      try {
        deserializeCanvas(this._core, state, { blobUrls: this._blobUrls, clearExisting: true });
      } finally {
        this._isRestoring = false;
      }

      // Subscribe to textChange for all restored TextNodes
      this._subscribeToTextNodes();

      // Trigger camera event to update frame labels position
      // (NodeManager subscribes to camera events to update overlay labels)
      this._core.eventBus.emit('camera:pan', {
        dx: 0,
        dy: 0,
        position: { x: state.camera.x, y: state.camera.y },
      });

      this._log('Restored canvas state');
      return true;
    } catch (error) {
      globalThis.console.error('[PersistencePlugin] Failed to restore:', error);
      return false;
    }
  }

  /**
   * Clear saved state from IndexedDB
   */
  public async clear(): Promise<void> {
    try {
      await this._storage.deleteCanvasState(this._canvasId);
      await this._storage.clearAll();
      revokeBlobUrls(this._blobUrls);
      this._log('Cleared saved state');
    } catch (error) {
      globalThis.console.error('[PersistencePlugin] Failed to clear:', error);
    }
  }

  /**
   * Export canvas to JSON string with embedded blobs
   */
  public async exportToJSON(): Promise<string> {
    if (!this._core) {
      throw new Error('Plugin not attached to CoreEngine');
    }
    return exportCanvasToJSON(this._core);
  }

  /**
   * Import canvas from JSON string with embedded blobs
   */
  public importFromJSON(json: string): void {
    if (!this._core) {
      throw new Error('Plugin not attached to CoreEngine');
    }
    this._isRestoring = true;
    importCanvasFromJSON(this._core, json, { clearExisting: true });
    this._isRestoring = false;

    // Subscribe to textChange for all imported TextNodes
    this._subscribeToTextNodes();

    // Trigger camera event to update frame labels position
    const state = JSON.parse(json) as { camera?: { x: number; y: number } };
    this._core.eventBus.emit('camera:pan', {
      dx: 0,
      dy: 0,
      position: { x: state.camera?.x ?? 0, y: state.camera?.y ?? 0 },
    });

    // Save after import
    void this.save();
  }

  /**
   * Download canvas as JSON file
   */
  public async downloadJSON(filename = 'canvas.json'): Promise<void> {
    const json = await this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Upload and import canvas from JSON file
   */
  public uploadJSON(): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = globalThis.document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = reader.result as string;
            this.importFromJSON(json);
            resolve();
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  /**
   * Check if there is saved state
   */
  public async hasSavedState(): Promise<boolean> {
    const stored = await this._storage.loadCanvasState(this._canvasId);
    return stored !== null;
  }

  /**
   * Get storage instance for advanced usage
   */
  public getStorage(): PersistenceStorage {
    return this._storage;
  }

  /**
   * Get canvas ID
   */
  public getCanvasId(): string {
    return this._canvasId;
  }

  /**
   * Set canvas ID (will trigger restore if autoRestore is enabled)
   */
  public async setCanvasId(id: string): Promise<void> {
    this._canvasId = id;
    if (this._autoRestore && this._initialized) {
      await this.restore();
    }
  }

  private _log(message: string): void {
    if (this._debug) {
      globalThis.console.log(`[PersistencePlugin] ${message}`);
    }
  }

  /**
   * Capture blob URLs from all nodes that haven't been captured yet
   */
  private async _captureAllBlobUrls(): Promise<void> {
    if (!this._core) return;

    const nodes = this._core.nodes.list();
    for (const node of nodes) {
      await this._captureBlobFromNode(node);
    }
  }
}
