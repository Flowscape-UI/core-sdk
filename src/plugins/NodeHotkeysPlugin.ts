import Konva from 'konva'

import type { CoreEngine } from '../core/CoreEngine'
import type { BaseNode } from '../nodes/BaseNode'
import { FrameNode } from '../nodes/FrameNode'
import { TextNode } from '../nodes/TextNode'
import type { NodeHandle } from '../types/public/node-handles'

import { Plugin } from './Plugin'
import { SelectionPlugin } from './SelectionPlugin'

export interface NodeHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  ignoreEditableTargets?: boolean;
}

export interface ClipboardData {
  nodes: {
    type: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
    children?: ClipboardData['nodes'];
  }[];
  // Visual center in world coordinates at the time of copying (takes into account offset/rotation/scale)
  center?: { x: number; y: number };
}

const FLOWSCAPE_CLIPBOARD_PREFIX = 'flowscape:nodes:';

interface CloneNode extends BaseNode {
  _originalAbsPos?: { x: number; y: number };
}

interface CloneOriginalState {
  node: BaseNode;
  draggable: boolean;
}

export class NodeHotkeysPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<Omit<NodeHotkeysOptions, 'target'>> & { target: EventTarget };
  private _clipboard: ClipboardData | null = null;
  private _selectionPlugin?: SelectionPlugin;
  private _isAltPressed = false;
  private _isMouseDown = false;
  private _cloneStartPos: { x: number; y: number } | null = null;
  private _clonedNodes: CloneNode[] = [];
  private _cloneOriginals: CloneOriginalState[] = [];
  private _cloneDragEventsStarted = false;
  private _clonePrevDraggable = new Map<Konva.Node, boolean>();
  private _prevCursor: string | null = null;
  private _isCloneCursorActive = false;
  private _doubleCursorCss: string | null = null;
  private _cloneOriginalsHidden = false;
  private _cloneAutoPanRafId: number | null = null;
  private _cloneAutoPanActive = false;
  private _cloneAutoPanEdgePx = 40;
  private _cloneAutoPanMaxSpeedPx = 24;

  constructor(options: NodeHotkeysOptions = {}) {
    super();
    const { target = globalThis as unknown as EventTarget, ignoreEditableTargets = true } = options;

    this._options = {
      target,
      ignoreEditableTargets,
    };
  }

  private _startCloneAutoPanLoop(): void {
    if (!this._core) return;
    if (this._cloneAutoPanRafId != null) return;
    this._cloneAutoPanActive = true;
    const core = this._core;
    const stage = core.stage;
    const world = core.nodes.world;

    const tick = () => {
      this._cloneAutoPanRafId = null;
      if (!this._cloneAutoPanActive || !this._core) return;
      if (!this._isMouseDown || this._clonedNodes.length === 0 || !this._cloneStartPos) {
        this._cloneAutoPanRafId = globalThis.requestAnimationFrame(tick);
        return;
      }

      const ptr = stage.getPointerPosition();
      if (ptr) {
        const w = stage.width();
        const h = stage.height();
        const edge = this._cloneAutoPanEdgePx;
        const leftPress = Math.max(0, edge - ptr.x);
        const rightPress = Math.max(0, ptr.x - (w - edge));
        const topPress = Math.max(0, edge - ptr.y);
        const bottomPress = Math.max(0, ptr.y - (h - edge));
        const norm = (p: number) => Math.min(1, p / edge);
        const vx = this._cloneAutoPanMaxSpeedPx * (norm(rightPress) - norm(leftPress));
        const vy = this._cloneAutoPanMaxSpeedPx * (norm(bottomPress) - norm(topPress));

        if (vx !== 0 || vy !== 0) {
          world.x(world.x() - vx);
          world.y(world.y() - vy);
          const pos = world.position();
          core.eventBus.emit('camera:pan', {
            dx: -vx,
            dy: -vy,
            position: { x: pos.x, y: pos.y },
          });

          const c = stage.container();
          const r = c.getBoundingClientRect();
          try {
            this._handleCloneMove(
              new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: r.left + ptr.x,
                clientY: r.top + ptr.y,
              }),
            );
          } catch {
            // ignore
          }
        }
      }

      this._cloneAutoPanRafId = globalThis.requestAnimationFrame(tick);
    };

    this._cloneAutoPanRafId = globalThis.requestAnimationFrame(tick);
  }

  private _stopCloneAutoPanLoop(): void {
    this._cloneAutoPanActive = false;
    if (this._cloneAutoPanRafId != null) {
      globalThis.cancelAnimationFrame(this._cloneAutoPanRafId);
      this._cloneAutoPanRafId = null;
    }
  }

  private _getHoveredNodeUnderPointer(): BaseNode | null {
    if (!this._core) return null;
    const stage = this._core.stage;
    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const hit = stage.getIntersection(pos);
    if (!hit) return null;

    const candidates: BaseNode[] = [];
    for (const bn of this._core.nodes.list()) {
      const kn = bn.getKonvaNode() as unknown as Konva.Node;
      if (hit === kn) {
        candidates.push(bn);
        continue;
      }
      const anyKn = kn as unknown as { isAncestorOf?: (n: Konva.Node) => boolean };
      if (typeof anyKn.isAncestorOf === 'function' && anyKn.isAncestorOf(hit)) {
        candidates.push(bn);
      }
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0] ?? null;

    // Pick the deepest candidate (closest ancestor of the hit target)
    let best = candidates[0] ?? null;
    if (!best) return null;
    for (const c of candidates) {
      if (c === best) continue;
      const cKn = c.getKonvaNode() as unknown as Konva.Node;
      const bestKn = best.getKonvaNode() as unknown as Konva.Node;
      const bestAny = bestKn as unknown as { isAncestorOf?: (n: Konva.Node) => boolean };
      const cAny = cKn as unknown as { isAncestorOf?: (n: Konva.Node) => boolean };

      // If best is ancestor of c, then c is deeper
      if (typeof bestAny.isAncestorOf === 'function' && bestAny.isAncestorOf(cKn)) {
        best = c;
        continue;
      }
      // If c is ancestor of best, keep best
      if (typeof cAny.isAncestorOf === 'function' && cAny.isAncestorOf(bestKn)) {
        continue;
      }
    }

    return best;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Subscribe to keydown and paste
    this._options.target.addEventListener('keydown', this._onKeyDown as EventListener);
    this._options.target.addEventListener('paste', this._onPaste as EventListener);
    this._options.target.addEventListener('mousedown', this._onMouseDown as EventListener);
    this._options.target.addEventListener('mouseup', this._onMouseUp as EventListener);
    this._options.target.addEventListener('mousemove', this._onMouseMove as EventListener);
    this._options.target.addEventListener('keydown', this._onKeyDown as EventListener);
    this._options.target.addEventListener('keyup', this._onKeyUp as EventListener);
  }

  protected onDetach(_core: CoreEngine): void {
    this._options.target.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._options.target.removeEventListener('paste', this._onPaste as EventListener);
    this._options.target.removeEventListener('mousedown', this._onMouseDown as EventListener);
    this._options.target.removeEventListener('mouseup', this._onMouseUp as EventListener);
    this._options.target.removeEventListener('mousemove', this._onMouseMove as EventListener);
    this._options.target.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._options.target.removeEventListener('keyup', this._onKeyUp as EventListener);

    this._stopCloneAutoPanLoop();

    this._core = undefined as unknown as CoreEngine;
    this._selectionPlugin = undefined as unknown as SelectionPlugin;
    this._clipboard = null;
    this._clonedNodes = [];
    this._cloneStartPos = null;

    this._restoreCursor();
  }

  private _onPaste = (e: ClipboardEvent) => {
    if (!this._core) return;

    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const dt = e.clipboardData;
    const text = dt?.getData('text/plain') ?? '';
    if (!text.startsWith(FLOWSCAPE_CLIPBOARD_PREFIX)) {
      return;
    }

    const raw = text.slice(FLOWSCAPE_CLIPBOARD_PREFIX.length);
    let data: ClipboardData | null = null;
    try {
      data = JSON.parse(raw) as ClipboardData;
    } catch {
      data = null;
    }

    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return;
    }

    // Check if we have internal clipboard data
    // If yes - handle it and prevent external clipboard handling
    // If no - let ContentFromClipboardPlugin handle external clipboard
    if (data.nodes.length > 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this._clipboard = data;
      this._handlePaste();
      return;
    }
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this._core) return;

    // Lazy get SelectionPlugin on first use (robust against minification via instanceof)
    if (!this._selectionPlugin) {
      const plugin = this._core.plugins
        .list()
        .find((p): p is SelectionPlugin => p instanceof SelectionPlugin);
      if (plugin) {
        this._selectionPlugin = plugin;
      }
    }

    if (!this._selectionPlugin) return;

    // Ignore if focus is on editable element
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // Enter — начать редактирование, если выделена одна текстовая нода
    if (!ctrl && !shift && e.code === 'Enter') {
      const selected = this._getSelectedNodes();
      if (selected.length === 1 && selected[0] instanceof TextNode) {
        e.preventDefault();
        selected[0].startEdit();
        return;
      }
    }

    // Ctrl+C - Copy
    if (ctrl && e.code === 'KeyC') {
      e.preventDefault();
      this._handleCopy();
      return;
    }

    // Ctrl+X - Cut
    if (ctrl && e.code === 'KeyX') {
      e.preventDefault();
      this._handleCut();
      return;
    }

    // Ctrl+V - Paste
    if (ctrl && e.code === 'KeyV') {
      return;
    }

    // Delete or Backspace - Delete
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      this._handleDelete();
      return;
    }

    // Ctrl+Shift+] - Move to top
    if (ctrl && shift && e.code === 'BracketRight') {
      e.preventDefault();
      this._handleMoveToTop();
      return;
    }

    // Ctrl+Shift+[ - Move to bottom
    if (ctrl && shift && e.code === 'BracketLeft') {
      e.preventDefault();
      this._handleMoveToBottom();
      return;
    }

    // Ctrl+] or Ctrl+Shift+= - Raise z-index (moveUp)
    if (ctrl && (e.code === 'BracketRight' || (shift && e.code === 'Equal'))) {
      e.preventDefault();
      this._handleMoveUp();
      return;
    }

    // Ctrl+[ or Ctrl+Shift+- - Lower z-index (moveDown)
    if (ctrl && (e.code === 'BracketLeft' || (shift && e.code === 'Minus'))) {
      e.preventDefault();
      this._handleMoveDown();
      return;
    }

    // Ctrl + F — center camera on current selection
    if (!shift && ctrl && e.code === 'KeyF') {
      const selected = this._getSelectedNodes();
      if (selected.length === 0) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      this._centerOnSelection(selected);
      return;
    }

    if (e.key === 'Alt') {
      this._isAltPressed = true;
      if (this._isMouseDown && this._clonedNodes.length > 0 && this._cloneOriginalsHidden) {
        this._cloneOriginals.forEach((o) => {
          const kn = o.node.getKonvaNode() as unknown as Konva.Node;
          kn.visible(true);
        });
        this._cloneOriginalsHidden = false;
      }
      this._updateCloneCursor();
    }
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      this._isAltPressed = false;
      if (this._isMouseDown && this._clonedNodes.length > 0 && !this._cloneOriginalsHidden) {
        this._cloneOriginals.forEach((o) => {
          const kn = o.node.getKonvaNode() as unknown as Konva.Node;
          kn.visible(false);
        });
        this._cloneOriginalsHidden = true;
      }
      this._restoreCursor();
    }
  };

  private _onMouseDown = (e: MouseEvent) => {
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }
    if (e.button === 0 && this._isAltPressed) {
      this._isMouseDown = true;
      this._handleCloneStart(e);
    }
  };

  private _onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this._isMouseDown = false;
      this._handleCloneEnd();
    }
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      this._restoreCursor();
      return;
    }
    if (this._isMouseDown && this._clonedNodes.length > 0) {
      this._handleCloneMove(e);
      // During clone-drag we force our cursor to win over other drag handlers
      this._updateCloneCursor(true);
      return;
    }

    this._updateCloneCursor();
  };

  private _updateCloneCursor(force = false): void {
    if (!this._core) return;
    if (!this._isAltPressed) {
      this._restoreCursor();
      return;
    }

    // While cloning with Alt+LMB, keep cursor always in clone mode.
    // This prevents SelectionPlugin / drag handlers from temporarily resetting it.
    if (force) {
      const container = this._core.stage.container();
      if (!this._isCloneCursorActive) {
        this._prevCursor = container.style.cursor;
        this._isCloneCursorActive = true;
      }
      container.style.cursor = this._getDoubleCursorCss();
      return;
    }

    const stage = this._core.stage;
    const pos = stage.getPointerPosition();
    if (!pos) {
      this._restoreCursor();
      return;
    }

    const hit = stage.getIntersection(pos);
    if (!hit) {
      this._restoreCursor();
      return;
    }

    // Only show clone cursor when hovering over nodes.layer subtree
    const nodesLayer = this._core.nodes.layer as unknown as Konva.Node;
    let p: Konva.Node | null = hit;
    let inNodesLayer = false;
    while (p) {
      if (p === nodesLayer) {
        inNodesLayer = true;
        break;
      }
      p = p.getParent();
    }

    if (!inNodesLayer) {
      this._restoreCursor();
      return;
    }

    const container = stage.container();
    if (!this._isCloneCursorActive) {
      this._prevCursor = container.style.cursor;
      this._isCloneCursorActive = true;
    }

    container.style.cursor = this._getDoubleCursorCss();
  }

  private _getDoubleCursorCss(): string {
    if (this._doubleCursorCss) return this._doubleCursorCss;

    const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#filter0_d_8_108)"><path fill-rule="evenodd" clip-rule="evenodd" d="M28.6355 15.5813L14.0108 8.87001L17.4698 24.7135L21.6964 18.4558L28.6355 15.5813Z" fill="white"/><path d="M27.3848 15.5575L21.5049 17.994L21.3663 18.0517L21.2823 18.1757L17.709 23.4657L14.712 9.74208L27.3848 15.5575Z" stroke="white" stroke-miterlimit="16"/></g><g filter="url(#filter1_d_8_108)"><path fill-rule="evenodd" clip-rule="evenodd" d="M27 15.5068L15 10L17.8382 23L21.3062 17.8654L27 15.5068Z" fill="white"/><path d="M25.75 15.4824L21.1152 17.4033L20.9756 17.4609L20.8916 17.5859L18.0771 21.751L15.7012 10.8721L25.75 15.4824Z" stroke="#363B3E" stroke-miterlimit="16"/></g><g filter="url(#filter2_d_8_108)"><path fill-rule="evenodd" clip-rule="evenodd" d="M22 15.5068L10 10L12.8382 23L16.3062 17.8654L22 15.5068Z" fill="#363B3E"/><path d="M10.209 9.5459L22.209 15.0527L23.25 15.5303L22.1914 15.9688L16.6367 18.2695L13.2529 23.2803L12.5986 24.248L12.3496 23.1064L9.51172 10.1064L9.29785 9.12793L10.209 9.5459Z" stroke="white" stroke-miterlimit="16"/></g><defs><filter id="filter0_d_8_108" x="11.0108" y="6.87001" width="20.6247" height="21.8435" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_8_108"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_8_108" result="shape"/></filter><filter id="filter1_d_8_108" x="12" y="8" width="18" height="19" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_8_108"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_8_108" result="shape"/></filter><filter id="filter2_d_8_108" x="5.59552" y="6.25522" width="19.8216" height="23.2402" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_8_108"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_8_108" result="shape"/></filter></defs></svg>`;
    const encoded = encodeURIComponent(svg);
    this._doubleCursorCss = `url("data:image/svg+xml,${encoded}") 16 16, copy`;
    return this._doubleCursorCss;
  }

  private _restoreCursor(): void {
    if (!this._core) return;
    if (!this._isCloneCursorActive) return;
    const container = this._core.stage.container();
    container.style.cursor = this._prevCursor ?? '';
    this._prevCursor = null;
    this._isCloneCursorActive = false;
  }

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  private _handleCopy(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    try {
      void globalThis.navigator.clipboard.writeText(
        `${FLOWSCAPE_CLIPBOARD_PREFIX}${JSON.stringify(this._clipboard)}`,
      );
    } catch {
      globalThis.console.error('Failed to copy to clipboard');
    }

    // Copied successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:copy', selected);
    }
  }

  private _handleCut(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    try {
      void globalThis.navigator.clipboard.writeText(
        `${FLOWSCAPE_CLIPBOARD_PREFIX}${JSON.stringify(this._clipboard)}`,
      );
    } catch {
      globalThis.console.error('Failed to cut to clipboard');
    }

    // Delete nodes
    this._deleteNodes(selected);

    // Cut successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:cut', selected);
    }
  }

  private _handlePaste(): void {
    if (!this._core || !this._clipboard || this._clipboard.nodes.length === 0) return;
    // Determine paste position
    const pastePosition = this._getPastePosition();

    // Calculate center of copied nodes
    const clipboardCenter = this._getClipboardCenter();

    // Paste nodes with offset relative to new position
    const newNodes: BaseNode[] = [];
    for (const nodeData of this._clipboard.nodes) {
      const offsetX = nodeData.position.x - clipboardCenter.x;
      const offsetY = nodeData.position.y - clipboardCenter.y;

      const newNode = this._deserializeNode(nodeData, {
        x: pastePosition.x + offsetX,
        y: pastePosition.y + offsetY,
      });

      if (newNode) {
        newNodes.push(newNode);
      }
    }

    // Pasted successfully
    if (newNodes.length > 0) {
      this._core.eventBus.emit('clipboard:paste', newNodes);
    }
    this._core.nodes.layer.batchDraw();
  }

  private _detachClonesFromFrame(pointerAbs: { x: number; y: number }): void {
    if (!this._core) return;

    const frames = this._core.nodes.list().filter((bn): bn is FrameNode => bn instanceof FrameNode);
    if (frames.length === 0) return;

    for (const clone of this._clonedNodes) {
      const cloneKonva = clone.getKonvaNode() as unknown as Konva.Node;
      const parent = cloneKonva.getParent();
      if (!parent) continue;

      const owningFrame = frames.find((fr) => fr.getContentGroup() === parent);
      if (!owningFrame) continue;

      const frameKonva = owningFrame.getKonvaNode() as unknown as Konva.Node;
      const box = frameKonva.getClientRect({ skipShadow: true, skipStroke: false });

      const inside =
        pointerAbs.x >= box.x &&
        pointerAbs.x <= box.x + box.width &&
        pointerAbs.y >= box.y &&
        pointerAbs.y <= box.y + box.height;

      if (inside) continue;

      const abs = cloneKonva.absolutePosition();
      this._core.nodes.world.add(cloneKonva as unknown as Konva.Group | Konva.Shape);
      cloneKonva.absolutePosition({ x: abs.x, y: abs.y });
    }
  }

  private _handleDelete(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    this._deleteNodes(selected);
    // Deleted successfully
  }

  private _getSelectedNodes(): BaseNode[] {
    if (!this._selectionPlugin) return [];
    // 1) If a temporary group (_tempMultiGroup) is active, collect nodes from its children
    const tempGroup = (
      this._selectionPlugin as unknown as { _tempMultiGroup?: { getChildren?: () => unknown[] } }
    )._tempMultiGroup;
    if (tempGroup && typeof tempGroup.getChildren === 'function' && this._core) {
      const children = tempGroup.getChildren();
      const list: BaseNode[] = this._core.nodes.list();
      const set = new Set<BaseNode>();
      for (const ch of children) {
        const bn = list.find((n) => n.getKonvaNode() === ch);
        if (bn) set.add(bn);
      }
      if (set.size > 0) return Array.from(set);
    }

    // 2) Check temporary group through _tempMultiSet (multiset SelectionPlugin)
    const tempMultiSet = (this._selectionPlugin as unknown as { _tempMultiSet?: Set<BaseNode> })
      ._tempMultiSet;
    if (tempMultiSet && tempMultiSet.size > 0) {
      return Array.from(tempMultiSet);
    }

    // 3) Check single selection
    const selected = (this._selectionPlugin as unknown as { _selected?: BaseNode | null })
      ._selected;
    if (selected) {
      return [selected];
    }

    return [];
  }

  private _deleteNodes(nodes: BaseNode[]): void {
    if (!this._core) return;

    // Clear selection before deletion
    if (this._selectionPlugin) {
      const plugin = this._selectionPlugin as unknown as {
        _destroyTempMulti?: () => void;
        _clearSelection?: () => void;
      };
      if (typeof plugin._destroyTempMulti === 'function') {
        plugin._destroyTempMulti();
      }
      if (typeof plugin._clearSelection === 'function') {
        plugin._clearSelection();
      }
    }

    // Используем batch-режим для удаления нескольких нод
    const historyPlugin = this._core.plugins.get('HistoryPlugin') as
      | { startBatch: () => void; commitBatch: () => void }
      | undefined;

    if (nodes.length > 1 && historyPlugin) {
      historyPlugin.startBatch();
    }

    // Delete nodes
    for (const node of nodes) {
      this._core.nodes.remove(node);
    }

    if (nodes.length > 1 && historyPlugin) {
      historyPlugin.commitBatch();
    }
  }

  // Serialize node to buffer, position in world coordinates
  private _serializeNode(node: BaseNode): ClipboardData['nodes'][0] {
    const konvaNode = node.getKonvaNode();
    const attrs = konvaNode.getAttrs();
    // Use Konva className (robust against minification), not constructor.name
    const nodeType = this._getNodeTypeFromKonva(konvaNode as unknown as Konva.Node);

    let pos = { x: 0, y: 0 };
    if (this._core) {
      const kn = konvaNode as unknown as Konva.Node;
      const abs = kn.getAbsolutePosition();
      const inv = this._core.nodes.world.getAbsoluteTransform().copy().invert();
      const wpt = inv.point(abs);
      pos = { x: wpt.x, y: wpt.y };
    }

    // Remove non-serializable attributes (image, video objects, etc.)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, image, video, visible, ...serializableAttrs } = attrs;

    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: serializableAttrs,
      position: pos,
    };

    // If it's a group, serialize child elements
    if (nodeType === 'group') {
      const gKn = konvaNode as unknown as Konva.Group;
      const children = gKn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        // Serialize each child Konva.Node directly
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  // Serialize Konva.Node (not BaseNode) for group children
  private _serializeKonvaNode(kn: Konva.Node): ClipboardData['nodes'][0] | null {
    if (!this._core) return null;

    const attrs = kn.getAttrs();
    const className = kn.getClassName();

    // Define type of className Konva (Rect -> shape, Circle -> circle, etc.)
    let nodeType = className.toLowerCase();
    if (nodeType === 'rect') nodeType = 'shape';
    if (className === 'Image') {
      const imageAttrs = kn.getAttrs() as Record<string, unknown>;
      const flowscapeType = imageAttrs['flowscapeNodeType'];
      if (flowscapeType === 'svg') nodeType = 'svg';
      else if (flowscapeType === 'gif') nodeType = 'gif';
      else if (flowscapeType === 'video') nodeType = 'video';
      else nodeType = 'image';
    }

    // Remove non-serializable attributes (image, video objects, etc.)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, image, video, visible, ...serializableAttrs } = attrs;

    // For group children, save RELATIVE positions (x, y inside group)
    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: serializableAttrs,
      position: { x: kn.x(), y: kn.y() }, // Relative coordinates inside group
    };

    // Recursively process nested groups
    if (kn instanceof Konva.Group) {
      const children = kn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  // Get node type from Konva className (robust against minification)
  private _getNodeTypeFromKonva(kn: Konva.Node): string {
    const className = kn.getClassName();
    if (className === 'Image') {
      const attrs = kn.getAttrs() as Record<string, unknown>;
      const nodeType = attrs['flowscapeNodeType'];
      if (nodeType === 'svg') return 'svg';
      if (nodeType === 'gif') return 'gif';
      if (nodeType === 'video') return 'video';
      return 'image';
    }
    // Map Konva class names to our internal types
    const typeMap: Record<string, string> = {
      Rect: 'shape',
      Circle: 'circle',
      Ellipse: 'ellipse',
      Text: 'text',
      Group: 'group',
      Arc: 'arc',
      Star: 'star',
      Arrow: 'arrow',
      Ring: 'ring',
      RegularPolygon: 'regularPolygon',
      Label: 'label',
    };
    return typeMap[className] ?? className.toLowerCase();
  }

  private _deserializeNode(
    data: ClipboardData['nodes'][0],
    position: { x: number; y: number },
  ): BaseNode | null {
    if (!this._core) return null;

    // Remove zIndex from config, as it will be set automatically
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zIndex, ...configWithoutZIndex } = data.config;

    // Map serialized Konva attrs -> Node options
    // Placeholder is stored in attrs for copy/paste, but node constructors expect it in `placeholder`
    const placeholder = configWithoutZIndex['placeholder'] as Record<string, unknown> | undefined;
    const { placeholder: _placeholderAttr, ...configSansPlaceholder } = configWithoutZIndex;

    const config = {
      ...configSansPlaceholder,
      ...(placeholder ? { placeholder } : {}),
      x: position.x,
      y: position.y,
    };

    try {
      let newNode: NodeHandle | null = null;

      switch (data.type) {
        case 'shape':
          newNode = this._core.nodes.addShape(config) as unknown as BaseNode;
          break;
        case 'text':
          newNode = this._core.nodes.addText(config) as unknown as BaseNode;
          break;
        case 'circle':
          newNode = this._core.nodes.addCircle(config) as unknown as BaseNode;
          break;
        case 'ellipse':
          newNode = this._core.nodes.addEllipse(config) as unknown as BaseNode;
          break;
        case 'arc':
          newNode = this._core.nodes.addArc(config) as unknown as BaseNode;
          break;
        case 'star':
          newNode = this._core.nodes.addStar(config) as unknown as BaseNode;
          break;
        case 'arrow':
          newNode = this._core.nodes.addArrow(config) as unknown as BaseNode;
          break;
        case 'ring':
          newNode = this._core.nodes.addRing(config) as unknown as BaseNode;
          break;
        case 'regularPolygon':
        case 'regularpolygon':
          newNode = this._core.nodes.addRegularPolygon(config) as unknown as BaseNode;
          break;
        case 'image':
          newNode = this._core.nodes.addImage(config) as unknown as BaseNode;
          break;
        case 'svg':
          newNode = this._core.nodes.addSvg(config) as unknown as BaseNode;
          break;
        case 'gif':
          newNode = this._core.nodes.addGif(config) as unknown as BaseNode;
          break;
        case 'video':
          newNode = this._core.nodes.addVideo(config) as unknown as BaseNode;
          break;
        case 'label':
          // LabelNode пока не поддерживается через NodeManager
          globalThis.console.warn('LabelNode is not supported for copy/paste yet');
          return null;
        case 'group': {
          newNode = this._core.nodes.addGroup(config) as unknown as BaseNode;
          // Принудительно применяем все атрибуты трансформации после создания
          const groupKonvaNode = newNode.getKonvaNode() as unknown as Konva.Group;
          // Применяем масштаб, поворот и другие атрибуты
          if (data.config['scaleX'] !== undefined)
            groupKonvaNode.scaleX(data.config['scaleX'] as number);
          if (data.config['scaleY'] !== undefined)
            groupKonvaNode.scaleY(data.config['scaleY'] as number);
          if (data.config['rotation'] !== undefined)
            groupKonvaNode.rotation(data.config['rotation'] as number);
          if (data.config['skewX'] !== undefined)
            groupKonvaNode.skewX(data.config['skewX'] as number);
          if (data.config['skewY'] !== undefined)
            groupKonvaNode.skewY(data.config['skewY'] as number);
          if (data.config['offsetX'] !== undefined)
            groupKonvaNode.offsetX(data.config['offsetX'] as number);
          if (data.config['offsetY'] !== undefined)
            groupKonvaNode.offsetY(data.config['offsetY'] as number);

          // CRITICAL FIX: restore ALL child elements through NodeManager
          // This ensures that they can be accessed through double-click
          if (data.children && data.children.length > 0) {
            for (const childData of data.children) {
              // Create ANY child node (group or regular) through _deserializeNode
              // This registers it in NodeManager and makes it available
              const childBaseNode = this._deserializeNode(childData, {
                x: childData.position.x,
                y: childData.position.y,
              });
              if (childBaseNode) {
                const childKonvaNode = childBaseNode.getKonvaNode();
                // Disable draggable for child elements
                if (typeof childKonvaNode.draggable === 'function') {
                  childKonvaNode.draggable(false);
                }
                // Move from world to parent group
                childKonvaNode.moveTo(groupKonvaNode);
              }
            }
          }
          break;
        }
        default:
          globalThis.console.warn(`Unknown node type: ${data.type}`);
          return null;
      }

      // Apply transformation attributes for ALL node types
      const konvaNode = newNode.getKonvaNode() as unknown as Konva.Node;
      if (data.config['scaleX'] !== undefined) konvaNode.scaleX(data.config['scaleX'] as number);
      if (data.config['scaleY'] !== undefined) konvaNode.scaleY(data.config['scaleY'] as number);
      if (data.config['rotation'] !== undefined)
        konvaNode.rotation(data.config['rotation'] as number);
      if (data.config['skewX'] !== undefined) konvaNode.skewX(data.config['skewX'] as number);
      if (data.config['skewY'] !== undefined) konvaNode.skewY(data.config['skewY'] as number);
      if (data.config['offsetX'] !== undefined) konvaNode.offsetX(data.config['offsetX'] as number);
      if (data.config['offsetY'] !== undefined) konvaNode.offsetY(data.config['offsetY'] as number);

      return newNode as unknown as BaseNode;
    } catch (error) {
      globalThis.console.error(`Failed to deserialize node:`, error);
      return null;
    }
  }

  private _getPastePosition(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const pointer = stage.getPointerPosition();

    // Check if cursor is on screen and within canvas
    if (pointer && this._isPointerOnScreen(pointer)) {
      const world = this._core.nodes.world;
      const worldTransform = world.getAbsoluteTransform().copy().invert();
      const worldPos = worldTransform.point(pointer);
      return { x: worldPos.x, y: worldPos.y };
    }

    // If cursor is not on screen or out of bounds - paste in the center of the screen
    return this._getScreenCenter();
  }

  private _isPointerOnScreen(pointer: { x: number; y: number }): boolean {
    if (!this._core) return false;
    const stage = this._core.stage;
    const width = stage.width();
    const height = stage.height();
    return pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  }

  private _getScreenCenter(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const world = this._core.nodes.world;

    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;

    const worldTransform = world.getAbsoluteTransform().copy().invert();
    const worldPos = worldTransform.point({ x: centerX, y: centerY });

    return { x: worldPos.x, y: worldPos.y };
  }

  private _getClipboardCenter(): { x: number; y: number } {
    if (!this._clipboard || this._clipboard.nodes.length === 0) {
      return { x: 0, y: 0 };
    }
    // If exact visual center is saved, use it
    if (this._clipboard.center) return this._clipboard.center;
    // Fallback: average of positions
    let sumX = 0;
    let sumY = 0;
    for (const node of this._clipboard.nodes) {
      sumX += node.position.x;
      sumY += node.position.y;
    }
    return { x: sumX / this._clipboard.nodes.length, y: sumY / this._clipboard.nodes.length };
  }

  // Calculate visual bbox of selected nodes and return its center in world coordinates
  private _computeSelectionWorldCenter(nodes: BaseNode[]): { x: number; y: number } {
    if (!this._core || nodes.length === 0) return { x: 0, y: 0 };
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const n of nodes) {
      const kn = n.getKonvaNode() as unknown as Konva.Node;
      // clientRect already accounts for all transformations (except default stroke — not critical for us)
      const r = kn.getClientRect({ skipShadow: true, skipStroke: true });
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { x: 0, y: 0 };
    }

    // Center of bbox is now in stage coordinates. Convert to world coordinates.
    const cxStage = (minX + maxX) / 2;
    const cyStage = (minY + maxY) / 2;
    const world = this._core.nodes.world;
    const invWorld = world.getAbsoluteTransform().copy().invert();
    const ptWorld = invWorld.point({ x: cxStage, y: cyStage });
    return { x: ptWorld.x, y: ptWorld.y };
  }

  // Center camera (world group) on provided selection
  private _centerOnSelection(nodes: BaseNode[]): void {
    if (!this._core || nodes.length === 0) return;

    const worldCenter = this._computeSelectionWorldCenter(nodes);
    const stage = this._core.stage;
    const world = this._core.nodes.world;

    // Current screen position of the worldCenter
    const absWorld = world.getAbsoluteTransform();
    const currentStagePt = absWorld.point({ x: worldCenter.x, y: worldCenter.y });

    // Desired screen position: center of the viewport
    const desiredStagePt = { x: stage.width() / 2, y: stage.height() / 2 };

    // Translate world so that currentStagePt moves to desiredStagePt (stage coordinates)
    const dx = desiredStagePt.x - currentStagePt.x;
    const dy = desiredStagePt.y - currentStagePt.y;

    const newX = world.x() + dx;
    const newY = world.y() + dy;
    world.position({ x: newX, y: newY });

    // Emit camera pan event to keep subscribers in sync
    this._core.eventBus.emit('camera:pan', { dx, dy, position: { x: newX, y: newY } });
    stage.batchDraw();
  }

  // Raise z-index of selected node (increment by 1)
  private _handleMoveUp(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Move each selected node one level forward
    for (const node of selected) {
      const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

      // Skip changing z-index for single node inside a real group
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveUp();
      const newIndex = konvaNode.zIndex();

      // Check if z-index change is possible (for nodes inside groups)
      this._syncGroupZIndex(konvaNode);

      // Emit z-index change event
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Force redraw of the entire layer
      this._core.nodes.layer.draw();

      // Also redraw stage to update transformer
      this._core.stage.batchDraw();
    }
  }

  // Lower z-index of selected node (decrement by 1)
  private _handleMoveDown(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Move each selected node one level backward (in reverse order to avoid conflicts)
    for (let i = selected.length - 1; i >= 0; i--) {
      const node = selected[i];
      if (!node) continue;
      const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

      // Skip changing z-index for single node inside a real group
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveDown();
      const newIndex = konvaNode.zIndex();

      // Check if z-index change is possible (for nodes inside groups)
      this._syncGroupZIndex(konvaNode);

      // Emit z-index change event
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Force redraw of the entire layer
      this._core.nodes.layer.draw();

      // Also redraw stage to update transformer
      this._core.stage.batchDraw();
    }
  }

  private _handleMoveToTop(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const sorted = [...selected].sort((a, b) => {
      const knA = a.getKonvaNode() as unknown as Konva.Node;
      const knB = b.getKonvaNode() as unknown as Konva.Node;
      return knA.zIndex() - knB.zIndex();
    });

    for (const node of sorted) {
      const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveToTop();
      const newIndex = konvaNode.zIndex();

      this._syncGroupZIndex(konvaNode);

      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      this._core.nodes.layer.draw();
      this._core.stage.batchDraw();
    }
  }

  private _handleMoveToBottom(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const sorted = [...selected].sort((a, b) => {
      const knA = a.getKonvaNode() as unknown as Konva.Node;
      const knB = b.getKonvaNode() as unknown as Konva.Node;
      return knB.zIndex() - knA.zIndex();
    });

    for (const node of sorted) {
      const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveToBottom();
      const newIndex = konvaNode.zIndex();

      this._syncGroupZIndex(konvaNode);

      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      this._core.nodes.layer.draw();
      this._core.stage.batchDraw();
    }
  }

  /**
   * Checks if the node is inside a real group (not the group itself)
   */
  private _isNodeInsidePermanentGroup(konvaNode: Konva.Node): boolean {
    // If it's the group itself, allow z-index change
    if (konvaNode instanceof Konva.Group) {
      return false;
    }

    const parent = konvaNode.getParent();
    if (!parent) return false;

    // If parent is not a group at all — definitely not a permanent group
    if (!(parent instanceof Konva.Group)) return false;

    // Top-level nodes live directly under core.nodes.world.
    // For them we DO allow z-index changes.
    if (parent === this._core?.nodes.world) {
      return false;
    }

    // Any other Konva.Group parent is considered a real group,
    // for which child z-index changes are forbidden.
    return true;
  }

  /**
   * Checks if the node is inside a real group
   * - For group itself — do nothing (moveUp/moveDown already applied to the group)
   * - For node inside group — FORBIDDEN to change z-index
   */
  private _syncGroupZIndex(konvaNode: Konva.Node): void {
    const parent = konvaNode.getParent();
    if (!parent) return;

    // If it's the group itself, do nothing (moveUp/moveDown already applied to the group)
    // Children keep their relative order inside the group
    if (konvaNode instanceof Konva.Group) {
      return;
    }

    // If node inside group — FORBIDDEN to change z-index
    // Need to change z-index of the group, not individual nodes
    if (parent instanceof Konva.Group && parent.name() !== 'world') {
      // z-index change forbidden for nodes inside group
      return;
    }
  }

  private _handleCloneStart(_e: MouseEvent): void {
    if (!this._core || !this._selectionPlugin) return;

    // Get target nodes (selected or hovered)
    const selected = this._getSelectedNodes();
    const hoveredRaw = this._getHoveredNodeUnderPointer();

    const hoveredRawKn = hoveredRaw ? (hoveredRaw.getKonvaNode() as unknown as Konva.Node) : null;

    let hovered: BaseNode | null = hoveredRaw;
    if (hoveredRawKn && !(hoveredRawKn instanceof Konva.Group)) {
      const selectedContainsHoveredRaw = selected.some(
        (n) => n === hoveredRaw || (n.id && hoveredRaw?.id && n.id === hoveredRaw.id),
      );

      if (!selectedContainsHoveredRaw) {
        const groupCandidates = this._core.nodes.list().filter((bn): bn is BaseNode => {
          const bnKn = bn.getKonvaNode() as unknown as Konva.Node;
          if (!(bnKn instanceof Konva.Group)) return false;
          const anyBn = bnKn as unknown as { isAncestorOf?: (other: Konva.Node) => boolean };
          return typeof anyBn.isAncestorOf === 'function' && anyBn.isAncestorOf(hoveredRawKn);
        });

        if (groupCandidates.length > 0) {
          let best = groupCandidates[0] ?? null;
          for (const c of groupCandidates) {
            if (!best || c === best) continue;
            const cKn = c.getKonvaNode() as unknown as Konva.Node;
            const bestKn = best.getKonvaNode() as unknown as Konva.Node;
            const bestAny = bestKn as unknown as { isAncestorOf?: (n: Konva.Node) => boolean };
            if (typeof bestAny.isAncestorOf === 'function' && bestAny.isAncestorOf(cKn)) {
              best = c;
            }
          }
          if (best) hovered = best;
        }
      }
    }

    // If pointer is over a different node than current selection, clone hovered.
    // If hovered is part of selection (single or multi), keep cloning selection.
    const hoveredInSelection =
      !!hovered &&
      selected.some((n) => {
        if (n === hovered || (n.id && hovered.id && n.id === hovered.id)) return true;

        const nKn = n.getKonvaNode() as unknown as Konva.Node;
        const hKn = hovered.getKonvaNode() as unknown as Konva.Node;
        if (nKn instanceof Konva.Group) {
          const anyN = nKn as unknown as { isAncestorOf?: (other: Konva.Node) => boolean };
          if (typeof anyN.isAncestorOf === 'function' && anyN.isAncestorOf(hKn)) {
            return true;
          }
        }
        return false;
      });

    const nodes = hovered && !hoveredInSelection ? [hovered] : selected;

    if (nodes.length === 0) return;

    this._cloneOriginals = nodes.map((n) => {
      const kn = n.getKonvaNode() as unknown as Konva.Node & {
        draggable?: (v?: boolean) => boolean;
        stopDrag?: () => void;
      };
      const draggable = typeof kn.draggable === 'function' ? kn.draggable() : false;
      if (typeof kn.stopDrag === 'function') kn.stopDrag();
      if (typeof kn.draggable === 'function') kn.draggable(false);
      return { node: n, draggable };
    });

    // While dragging clones, remove selection/transformer from originals
    // (we will select clones on mouseup)
    this._selectionPlugin.clearSelectionFromAreaLasso();

    this._cloneDragEventsStarted = false;

    // Create clones with original position tracking
    this._clonedNodes = nodes
      .map((node) => {
        try {
          const serialized = this._serializeNode(node);
          const clone = this._deserializeNode(serialized, serialized.position) as CloneNode;

          // Preserve original parent (group/frame content group) and keep absolute position
          const origKonva = node.getKonvaNode() as unknown as Konva.Node;
          const origParent = origKonva.getParent();
          const cloneKonva = clone.getKonvaNode() as unknown as Konva.Node;

          // Save abs before reparenting (NodeManager might add into world)
          const absBefore = origKonva.absolutePosition();
          if (origParent && origParent !== cloneKonva.getParent()) {
            origParent.add(cloneKonva);
          }
          cloneKonva.absolutePosition({ x: absBefore.x, y: absBefore.y });
          const cloneWithVisible = cloneKonva as unknown as Konva.Node & {
            visible?: (v?: boolean) => unknown;
          };
          if (typeof cloneWithVisible.visible === 'function') cloneWithVisible.visible(true);
          clone._originalAbsPos = { x: absBefore.x, y: absBefore.y };

          return clone;
        } catch {
          return null;
        }
      })
      .filter((node): node is CloneNode => node !== null);

    // VisualGuidesPlugin reacts only to draggable() nodes.
    // During our manual move we temporarily enable draggable on clones so snapping works
    // for all node types (Video/Text/Frame/Svg/etc).
    this._clonePrevDraggable.clear();

    if (!this._isAltPressed && this._cloneOriginals.length > 0) {
      const originals = this._cloneOriginals.map((o) => o.node);
      this._deleteNodes(originals);
    } else {
      this._cloneOriginals.forEach((o) => {
        const kn = o.node.getKonvaNode() as unknown as Konva.Node;
        kn.visible(true);
      });
    }
    this._clonedNodes.forEach((n) => {
      const kn = n.getKonvaNode() as unknown as Konva.Node & {
        draggable?: (v?: boolean) => boolean;
      };
      if (typeof kn.draggable === 'function') {
        const prev = kn.draggable();
        this._clonePrevDraggable.set(kn as unknown as Konva.Node, prev);
        kn.draggable(true);
      }
    });

    // Track start position
    const pos = this._core.stage.getPointerPosition();
    if (pos) this._cloneStartPos = pos;
    this._cloneOriginalsHidden = false;

    this._startCloneAutoPanLoop();
  }

  private _handleCloneMove(_e: MouseEvent): void {
    if (!this._core || !this._cloneStartPos || this._clonedNodes.length === 0) return;

    const pos = this._core.stage.getPointerPosition();
    if (!pos) return;

    this._detachClonesFromFrame(pos);

    this._cloneOriginals.forEach((o) => {
      const kn = o.node.getKonvaNode() as unknown as Konva.Node & { stopDrag?: () => void };
      if (typeof kn.stopDrag === 'function') kn.stopDrag();
    });

    const dx = pos.x - this._cloneStartPos.x;
    const dy = pos.y - this._cloneStartPos.y;

    this._clonedNodes.forEach((node) => {
      const kn = node.getKonvaNode() as unknown as Konva.Node;
      const currentAbs = kn.absolutePosition() as unknown as Konva.Vector2d;
      const originalAbs = (node._originalAbsPos ?? { x: currentAbs.x, y: currentAbs.y }) as {
        x: number;
        y: number;
      };
      kn.absolutePosition({
        x: originalAbs.x + dx,
        y: originalAbs.y + dy,
      });
    });

    // Trigger VisualGuidesPlugin (it listens to stage dragmove/dragend)
    const stage = this._core.stage;
    if (!this._cloneDragEventsStarted) {
      this._clonedNodes.forEach((node) => {
        const kn = node.getKonvaNode() as unknown as Konva.Node;
        stage.fire('dragstart', {
          target: kn,
          evt: _e,
        } as unknown as Konva.KonvaEventObject<DragEvent>);
      });
      this._cloneDragEventsStarted = true;
    }
    this._clonedNodes.forEach((node) => {
      const kn = node.getKonvaNode() as unknown as Konva.Node;
      stage.fire('dragmove', {
        target: kn,
        evt: _e,
      } as unknown as Konva.KonvaEventObject<DragEvent>);
    });

    this._core.nodes.layer.batchDraw();
  }

  private _handleCloneEnd(): void {
    const clones = [...this._clonedNodes];
    const originals = this._cloneOriginals.map((o) => o.node);
    this._cloneOriginals.forEach((o) => {
      const kn = o.node.getKonvaNode() as unknown as Konva.Node & {
        draggable?: (v?: boolean) => boolean;
        stopDrag?: () => void;
      };
      if (typeof kn.stopDrag === 'function') kn.stopDrag();
      if (typeof kn.draggable === 'function') kn.draggable(o.draggable);
    });

    if (!this._isAltPressed && originals.length > 0) {
      this._deleteNodes(originals);
    } else {
      this._cloneOriginals.forEach((o) => {
        const kn = o.node.getKonvaNode() as unknown as Konva.Node & {
          visible?: (v?: boolean) => unknown;
        };
        if (typeof kn.visible === 'function') kn.visible(true);
      });
    }

    this._cloneOriginals = [];

    if (this._selectionPlugin && clones.length > 0) {
      if (clones.length === 1) {
        const only = clones[0];
        if (only) this._selectionPlugin.selectSingleFromArea(only);
      } else {
        this._selectionPlugin.getMultiGroupController().ensure(clones);
      }
    }

    if (this._core && this._cloneDragEventsStarted) {
      const stage = this._core.stage;
      clones.forEach((node) => {
        const kn = node.getKonvaNode() as unknown as Konva.Node;
        stage.fire('dragend', { target: kn } as unknown as Konva.KonvaEventObject<DragEvent>);
      });
    }
    this._cloneDragEventsStarted = false;

    // Restore clones draggable state back to what it was before our alt-drag session
    clones.forEach((n) => {
      const kn = n.getKonvaNode() as unknown as Konva.Node & {
        draggable?: (v?: boolean) => boolean;
      };
      if (typeof kn.draggable !== 'function') return;
      const prev = this._clonePrevDraggable.get(kn as unknown as Konva.Node);
      if (prev != null) kn.draggable(prev);
    });
    this._clonePrevDraggable.clear();

    if (this._core && clones.length > 0) {
      const core = this._core;
      clones.forEach((node) => {
        const konvaNode = node.getKonvaNode() as unknown as Konva.Node;
        const changes: { x?: number; y?: number } = {};
        if (typeof (konvaNode as unknown as { x?: () => number }).x === 'function') {
          changes.x = (konvaNode as unknown as { x: () => number }).x();
        }
        if (typeof (konvaNode as unknown as { y?: () => number }).y === 'function') {
          changes.y = (konvaNode as unknown as { y: () => number }).y();
        }
        core.eventBus.emit('node:transformed', node, changes);
      });

      const persistence = core.plugins.get('PersistencePlugin') as
        | { save?: () => Promise<void> }
        | undefined;
      if (persistence && typeof persistence.save === 'function') {
        try {
          void persistence.save();
        } catch {
          globalThis.console.error('Failed to save clone');
        }
      }
    }

    this._cloneStartPos = null;
    this._clonedNodes = [];
    this._cloneOriginalsHidden = false;

    this._stopCloneAutoPanLoop();
  }
}
