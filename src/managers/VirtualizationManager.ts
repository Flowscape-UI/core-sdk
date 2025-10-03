import Konva from 'konva';

import type { BaseNode } from '../nodes/BaseNode';
import { ThrottleHelper } from '../utils/ThrottleHelper';

import type { NodeManager } from './NodeManager';
import { LODManager, type LODOptions } from './LODManager';

export interface VirtualizationStats {
  total: number;
  visible: number;
  hidden: number;
  cullingRate: number; // percentage of hidden nodes
}

export interface VirtualizationOptions {
  enabled?: boolean;
  bufferZone?: number; // pixels outside viewport for smoothness
  throttleMs?: number; // delay between updates (ms)
  lod?: LODOptions; // Level of Detail settings
}

/**
 * VirtualizationManager - manages node visibility for performance optimization
 *
 * IMPORTANT: This is an ADDITIONAL optimization on top of Konva framework.
 * Konva does not provide automatic viewport virtualization, so this implementation is necessary.
 *
 * Main idea: render only nodes that are within the viewport (visible area).
 * This provides a significant performance boost when dealing with many nodes.
 *
 * Optimizations (uses built-in Konva APIs):
 * 1. visible: false - node is not rendered (Konva recommendation)
 * 2. listening: false - node does not handle events (Konva recommendation)
 * 3. Buffer zone - render slightly more than viewport for smoothness
 * 4. Throttling - limits update frequency
 * 5. getClientRect() - Konva automatically caches results internally
 *
 * Konva documentation: https://konvajs.org/docs/performance/All_Performance_Tips.html
 */
export class VirtualizationManager {
  private _enabled: boolean;
  private _bufferZone: number;
  private _throttle: ThrottleHelper;

  private _viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = { x: 0, y: 0, width: 0, height: 0 };

  private _visibleNodes = new Set<string>();
  private _hiddenNodes = new Set<string>();

  private _updateScheduled = false;

  // LOD Manager for additional optimization
  private _lod: LODManager | null = null;

  constructor(
    private _stage: Konva.Stage,
    private _world: Konva.Group,
    private _nodeManager: NodeManager,
    options: VirtualizationOptions = {},
  ) {
    this._enabled = options.enabled ?? true;
    this._bufferZone = options.bufferZone ?? 200;
    this._throttle = new ThrottleHelper(options.throttleMs ?? 16); // ~60 FPS

    // Initialize LOD if enabled
    if (options.lod) {
      this._lod = new LODManager(options.lod);
    }

    this._updateViewport();
    this._setupListeners();

    // Initial update
    if (this._enabled) {
      this.updateVisibility();
    }
  }

  /**
   * Updates viewport based on current position and scale of world
   */
  private _updateViewport(): void {
    const scale = this._world.scaleX();
    const position = this._world.position();

    // Calculate viewport in world coordinates
    // Consider that world may be transformed (position + scale)
    this._viewport = {
      x: -position.x / scale - this._bufferZone,
      y: -position.y / scale - this._bufferZone,
      width: this._stage.width() / scale + this._bufferZone * 2,
      height: this._stage.height() / scale + this._bufferZone * 2,
    };
  }

  /**
   * Gets node bounding box in world coordinates (relative to world)
   *
   * OPTIMIZATION: Konva automatically caches getClientRect() results internally,
   * so additional TTL-cache is not needed. Konva invalidates its cache on transformations,
   * which is more reliable than our TTL-approach.
   */
  private _getNodeBBox(node: BaseNode): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const konvaNode = node.getNode();

    // Konva automatically caches getClientRect() and invalidates on transformations
    const clientRect = konvaNode.getClientRect({ relativeTo: this._world });

    return {
      x: clientRect.x,
      y: clientRect.y,
      width: clientRect.width,
      height: clientRect.height,
    };
  }

  /**
   * Checks if node is within viewport
   */
  private _isNodeVisible(node: BaseNode): boolean {
    const box = this._getNodeBBox(node);

    // Check intersection with viewport
    return !(
      box.x + box.width < this._viewport.x ||
      box.x > this._viewport.x + this._viewport.width ||
      box.y + box.height < this._viewport.y ||
      box.y > this._viewport.y + this._viewport.height
    );
  }

  /**
   * Updates visibility of all nodes
   */
  public updateVisibility(): void {
    if (!this._enabled) return;

    // Throttling - do not update too often
    if (!this._throttle.shouldExecute()) {
      return;
    }

    const nodes = this._nodeManager.list();
    const newVisibleNodes = new Set<string>();
    let changesCount = 0;

    for (const node of nodes) {
      const isVisible = this._isNodeVisible(node);
      const konvaNode = node.getNode();

      if (isVisible) {
        newVisibleNodes.add(node.id);

        // Show node if it was hidden
        if (this._hiddenNodes.has(node.id)) {
          konvaNode.visible(true);
          konvaNode.listening(true);
          this._hiddenNodes.delete(node.id);
          changesCount++;
        }
      } else {
        // Hide node if it was visible
        if (!this._hiddenNodes.has(node.id)) {
          konvaNode.visible(false);
          konvaNode.listening(false);
          this._hiddenNodes.add(node.id);
          changesCount++;
        }
      }
    }

    this._visibleNodes = newVisibleNodes;

    // OPTIMIZATION: Apply LOD only to CHANGED nodes
    if (this._lod?.enabled && changesCount > 0) {
      const scale = this._world.scaleX();

      // Apply LOD only to newly visible nodes
      for (const node of nodes) {
        if (newVisibleNodes.has(node.id)) {
          this._lod.applyLOD(node, scale);
        }
      }
    }

    // Redraw only if changes occurred
    if (changesCount > 0) {
      this._nodeManager.layer.batchDraw();
    }
  }

  /**
   * Sets up event listeners
   */
  private _setupListeners(): void {
    this._world.on('xChange yChange scaleXChange scaleYChange', () => {
      // OPTIMIZATION: DO NOT clear cache on panning/zooming!
      // BBox in world coordinates does not change during world transformation
      // Cache remains valid!
      this._scheduleUpdate();
    });

    // Update on stage resize
    // Konva does not provide a standard resize event, so we use window.resize
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.addEventListener('resize', () => {
        this._updateViewport();
        this._scheduleUpdate();
      });
    }
    this._nodeManager.eventBus.on('node:removed', (node: BaseNode) => {
      this._visibleNodes.delete(node.id);
      this._hiddenNodes.delete(node.id);
    });
  }

  /**
   * Schedules update for the next frame
   */
  private _scheduleUpdate(): void {
    if (this._updateScheduled) return;

    this._updateScheduled = true;

    globalThis.requestAnimationFrame(() => {
      this._updateViewport();
      this.updateVisibility();
      this._updateScheduled = false;
    });
  }

  /**
   * Enables virtualization
   */
  public enable(): void {
    if (this._enabled) return;

    this._enabled = true;
    this.updateVisibility();
  }

  /**
   * Disables virtualization (shows all nodes)
   */
  public disable(): void {
    if (!this._enabled) return;

    this._enabled = false;

    // Show all hidden nodes
    for (const nodeId of this._hiddenNodes) {
      const node = this._nodeManager.findById(nodeId);
      if (node) {
        const konvaNode = node.getNode();
        konvaNode.visible(true);
        konvaNode.listening(true);
      }
    }

    this._hiddenNodes.clear();
    this._visibleNodes.clear();
    this._nodeManager.layer.batchDraw();
  }

  /**
   * Returns virtualization statistics
   */
  public getStats(): VirtualizationStats {
    const total = this._nodeManager.list().length;
    const visible = this._visibleNodes.size;
    const hidden = this._hiddenNodes.size;

    return {
      total,
      visible,
      hidden,
      cullingRate: total > 0 ? (hidden / total) * 100 : 0,
    };
  }

  /**
   * Sets buffer zone size
   */
  public setBufferZone(pixels: number): void {
    this._bufferZone = pixels;
    this._updateViewport();
    this._scheduleUpdate();
  }

  /**
   * Sets throttle for updates
   */
  public setThrottle(ms: number): void {
    this._throttle = new ThrottleHelper(ms);
  }

  /**
   * Checks if virtualization is enabled
   */
  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Returns current viewport
   */
  public get viewport(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return { ...this._viewport };
  }

  /**
   * Forcefully updates visibility (ignores throttle)
   */
  public forceUpdate(): void {
    this._throttle.reset();
    this._updateViewport();
    this.updateVisibility();
  }

  /**
   * Returns LOD Manager (if enabled)
   */
  public get lod(): LODManager | null {
    return this._lod;
  }

  /**
   * Destroys manager and releases resources
   */
  public destroy(): void {
    this.disable();
    this._visibleNodes.clear();
    this._hiddenNodes.clear();

    // Clear LOD
    if (this._lod) {
      const nodes = this._nodeManager.list();
      this._lod.restoreAll(nodes);
    }
  }
}
