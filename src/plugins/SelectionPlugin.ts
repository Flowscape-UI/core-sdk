import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import { MultiGroupController } from '../utils/MultiGroupController';
import { restyleSideAnchorsForTr as restyleSideAnchorsUtil } from '../utils/OverlayAnchors';
import { makeRotateHandle } from '../utils/RotateHandleFactory';
import { OverlayFrameManager } from '../utils/OverlayFrameManager';
import { ThrottleHelper } from '../utils/ThrottleHelper';
import { DebounceHelper } from '../utils/DebounceHelper';

import { Plugin } from './Plugin';

// Konva node with draggable() getter/setter support
type DraggableNode = Konva.Node & { draggable(value?: boolean): boolean };

export interface SelectionPluginOptions {
  // Allow dragging of selected node
  dragEnabled?: boolean;
  // Add visual Transformer for selected node
  enableTransformer?: boolean;
  // Deselect on empty area click
  deselectOnEmptyClick?: boolean;
  // Custom check if specific Konva.Node can be selected
  selectablePredicate?: (node: Konva.Node) => boolean;
  // Auto-pan world when dragging near screen edges
  autoPanEnabled?: boolean;
  // Edge zone width (px)
  autoPanEdgePx?: number;
  // Max auto-pan speed in px/frame
  autoPanMaxSpeedPx?: number;
}

/**
 * Universal selection and dragging plugin for nodes compatible with BaseNode.
 *
 * Default behavior:
 * - Click on node in NodeManager layer selects the node
 * - Selected node becomes draggable (dragEnabled)
 * - Click on empty area deselects (deselectOnEmptyClick)
 * - Optionally enable Konva.Transformer (enableTransformer)
 */
export class SelectionPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<SelectionPluginOptions>;

  private _selected: BaseNode | null = null;
  private _prevDraggable: boolean | null = null;
  private _transformer: Konva.Transformer | null = null;
  private _transformerWasVisibleBeforeDrag = false;
  private _cornerHandlesWereVisibleBeforeDrag = false;
  private _sizeLabelWasVisibleBeforeDrag = false;
  // Visibility state for rotation handles during drag
  private _rotateHandlesWereVisibleBeforeDrag = false;
  // Group and references to corner handles for rounding
  private _cornerHandlesGroup: Konva.Group | null = null;
  private _cornerHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  // Flag to suppress corner-radius handles during transformation
  private _cornerHandlesSuppressed = false;
  // Saved opposite corner position at transformation start (to fix origin)
  private _transformOppositeCorner: { x: number; y: number } | null = null;
  // Label with selected node dimensions (width × height)
  private _sizeLabel: Konva.Label | null = null;
  // Label for displaying radius on hover/drag of corner handles
  private _radiusLabel: Konva.Label | null = null;
  // Group and references to rotation corner handles
  private _rotateHandlesGroup: Konva.Group | null = null;
  private _rotateHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  private _rotateDragState: { base: number; start: number } | null = null;
  // Absolute center at rotation start — for position compensation
  private _rotateCenterAbsStart: { x: number; y: number } | null = null;
  // Saved stage.draggable() state before rotation starts
  private _prevStageDraggableBeforeRotate: boolean | null = null;

  // RAF-id for coalescing overlay sync during world zoom/pan
  private _worldSyncRafId: number | null = null;
  // Reference to camera event handler for on/off
  private _onCameraZoomEvent: (() => void) | null = null;

  // Minimal hover frame (blue border on hover)
  private _hoverTr: Konva.Transformer | null = null;
  private _isPointerDown = false;

  // Auto-pan world when dragging near screen edges
  private _autoPanRafId: number | null = null;
  private _autoPanActive = false;
  private _autoPanEdgePx: number; // edge zone width (px)
  private _autoPanMaxSpeedPx: number; // max auto-pan speed in px/frame
  private _draggingNode: Konva.Node | null = null; // current node being dragged

  // --- Proportional resize with Shift for corner handles ---
  private _ratioKeyPressed = false;
  private _onGlobalKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onGlobalKeyUp: ((e: KeyboardEvent) => void) | null = null;

  // Temporary multi-group (Shift+Click)
  private _tempMultiSet = new Set<BaseNode>();
  private _tempMultiGroup: Konva.Group | null = null;
  private _tempMultiTr: Konva.Transformer | null = null;
  private _tempOverlay: OverlayFrameManager | null = null;
  private _tempRotateHandlesGroup: Konva.Group | null = null;
  private _tempRotateHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  private _tempPlacement = new Map<
    Konva.Node,
    {
      parent: Konva.Container;
      indexInParent: number; // FIX: save position in children array
      abs: { x: number; y: number };
      prevDraggable: boolean | null;
    }
  >();

  public getMultiGroupController(): MultiGroupController {
    if (!this._core) throw new Error('Core is not attached');
    this._multiCtrl ??= new MultiGroupController({
      ensureTempMulti: (nodes) => {
        this._ensureTempMulti(nodes);
      },
      destroyTempMulti: () => {
        this._destroyTempMulti();
      },
      commitTempMultiToGroup: () => {
        this._commitTempMultiToGroup();
      },
      isActive: () => !!this._tempMultiGroup || this._tempMultiSet.size > 0,
      forceUpdate: () => {
        this._tempOverlay?.forceUpdate();
      },
      onWorldChanged: () => {
        this._tempOverlay?.onWorldChanged();
      },
      isInsideTempByTarget: (target) => {
        if (!this._tempMultiGroup) return false;
        if (target === this._tempMultiGroup) return true;
        return (
          target.isAncestorOf(this._tempMultiGroup) || this._tempMultiGroup.isAncestorOf(target)
        );
      },
    });
    return this._multiCtrl;
  }
  private _tempMultiSizeLabel: Konva.Label | null = null;
  private _tempMultiHitRect: Konva.Rect | null = null;
  private _multiCtrl: MultiGroupController | null = null;

  private _startAutoPanLoop() {
    if (!this._core) return;
    if (this._autoPanRafId != null) return;
    this._autoPanActive = true;
    const world = this._core.nodes.world;
    const stage = this._core.stage;
    const tick = () => {
      this._autoPanRafId = null;
      if (!this._core || !this._autoPanActive) return;
      const ptr = stage.getPointerPosition();
      if (ptr) {
        const w = stage.width();
        const h = stage.height();
        const edge = this._autoPanEdgePx;
        let vx = 0;
        let vy = 0;
        const leftPress = Math.max(0, edge - ptr.x);
        const rightPress = Math.max(0, ptr.x - (w - edge));
        const topPress = Math.max(0, edge - ptr.y);
        const bottomPress = Math.max(0, ptr.y - (h - edge));
        const norm = (p: number) => Math.min(1, p / edge);
        vx = this._autoPanMaxSpeedPx * (norm(rightPress) - norm(leftPress));
        vy = this._autoPanMaxSpeedPx * (norm(bottomPress) - norm(topPress));
        if (vx !== 0 || vy !== 0) {
          // Shift world to "pull" field under cursor (in screen pixels)
          world.x(world.x() - vx);
          world.y(world.y() - vy);
          // Compensation for dragged node: keep under cursor
          if (this._draggingNode && typeof this._draggingNode.setAbsolutePosition === 'function') {
            const abs = this._draggingNode.getAbsolutePosition();
            this._draggingNode.setAbsolutePosition({ x: abs.x + vx, y: abs.y + vy });
            this._transformer?.forceUpdate();
          }
          this._core.nodes.layer.batchDraw();
        }
      }
      this._autoPanRafId = globalThis.requestAnimationFrame(tick);
    };
    this._autoPanRafId = globalThis.requestAnimationFrame(tick);
  }

  private _stopAutoPanLoop() {
    this._autoPanActive = false;
    if (this._autoPanRafId != null) {
      globalThis.cancelAnimationFrame(this._autoPanRafId);
      this._autoPanRafId = null;
    }
  }

  /**
   * Deferred redraw (throttling)
   * Groups multiple batchDraw calls into one
   */
  private _scheduleBatchDraw() {
    if (this._batchDrawScheduled) return;

    this._batchDrawScheduled = true;
    const raf = globalThis.requestAnimationFrame;
    raf(() => {
      this._batchDrawScheduled = false;
      this._core?.stage.batchDraw();
    });
  }

  // Child node editing mode inside group: storing parent group state
  private _parentGroupDuringChildEdit: Konva.Group | null = null;
  private _parentGroupPrevDraggable: boolean | null = null;

  // Cache for optimization
  private _dragMoveScheduled = false;
  private _batchDrawScheduled = false;

  // OPTIMIZATION: Throttling for mousemove
  private _hoverThrottle = new ThrottleHelper(16); // 60 FPS

  // OPTIMIZATION: Debouncing for UI updates (size label, rotate handles, etc.)
  private _uiUpdateDebounce = new DebounceHelper();

  constructor(options: SelectionPluginOptions = {}) {
    super();
    const {
      dragEnabled = true,
      enableTransformer = true,
      deselectOnEmptyClick = true,
      selectablePredicate,
    } = options;

    this._options = {
      dragEnabled,
      enableTransformer,
      deselectOnEmptyClick,
      selectablePredicate: selectablePredicate ?? (() => true),
      autoPanEnabled: options.autoPanEnabled ?? true,
      autoPanEdgePx: options.autoPanEdgePx ?? 40,
      autoPanMaxSpeedPx: options.autoPanMaxSpeedPx ?? 24,
    };

    // Initialize auto-pan private fields from options
    this._autoPanEdgePx = this._options.autoPanEdgePx;
    this._autoPanMaxSpeedPx = this._options.autoPanMaxSpeedPx;
  }

  public setOptions(patch: Partial<SelectionPluginOptions>) {
    this._options = { ...this._options, ...patch } as typeof this._options;
    // Update Transformer for new options state
    if (this._core) this._refreshTransformer();
    // Apply new auto-pan values to private fields if provided
    if (typeof patch.autoPanEdgePx === 'number') this._autoPanEdgePx = patch.autoPanEdgePx;
    if (typeof patch.autoPanMaxSpeedPx === 'number')
      this._autoPanMaxSpeedPx = patch.autoPanMaxSpeedPx;
    // If auto-pan was disabled — stop the loop
    if (patch.autoPanEnabled === false) this._stopAutoPanLoop();
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    // Initialize temporary multi-group controller proxying private methods
    this._multiCtrl = new MultiGroupController({
      ensureTempMulti: (nodes) => {
        this._ensureTempMulti(nodes);
      },
      destroyTempMulti: () => {
        this._destroyTempMulti();
      },
      commitTempMultiToGroup: () => {
        this._commitTempMultiToGroup();
      },
      isActive: () => !!this._tempMultiGroup,
      isInsideTempByTarget: (target: Konva.Node) => {
        if (!this._tempMultiGroup) return false;
        let cur: Konva.Node | null = target;
        while (cur) {
          if (cur === this._tempMultiGroup) return true;
          cur = cur.getParent();
        }
        return false;
      },
      forceUpdate: () => {
        this._tempMultiTr?.forceUpdate();
        this._updateTempMultiSizeLabel();
        this._updateTempMultiHitRect();
        this._updateTempRotateHandlesPosition();
        this._scheduleBatchDraw();
      },
      onWorldChanged: () => {
        // Coalesce as in main world handler
        this._tempMultiTr?.forceUpdate();
        this._updateTempMultiSizeLabel();
        this._updateTempMultiHitRect();
        this._updateTempRotateHandlesPosition();
        this._scheduleBatchDraw();
        this._destroyHoverTr();
      },
    });

    // Attach handlers to stage (namespace .selection)
    const stage = core.stage;
    stage.on('mousedown.selection', this._onMouseDown);

    stage.on('click.selection', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      const stage = this._core.stage;
      const layer = this._core.nodes.layer;

      // Left mouse button only
      if (e.evt.button !== 0) return;

      if (e.target === stage || e.target.getLayer() !== layer) {
        if (this._options.deselectOnEmptyClick) {
          this._destroyTempMulti();
          this._clearSelection();
        }
        return;
      }

      // Normal node selection (for group — group will be selected)
      const target = e.target;
      if (!this._options.selectablePredicate(target)) return;

      // Shift+Click or Ctrl+Click: create temporary group (multi-selection)
      if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
        const base = this._findBaseNodeByTarget(target);
        if (!base) return;

        // If node is in a group, ignore (group protection)
        const nodeKonva = base.getNode();
        const parent = nodeKonva.getParent();
        if (parent && parent instanceof Konva.Group && parent !== this._core.nodes.world) {
          // Node in group - don't add to multi-selection
          return;
        }

        if (this._tempMultiSet.size === 0 && this._selected && this._selected !== base) {
          // Move current selected node to set and remove its single overlays
          this._tempMultiSet.add(this._selected);
          if (this._transformer) {
            this._transformer.destroy();
            this._transformer = null;
          }
          this._destroyCornerRadiusHandles();
          this._destroyRotateHandles();
          this._destroySizeLabel();
          this._selected = null;
        }

        if (Array.from(this._tempMultiSet).includes(base)) this._tempMultiSet.delete(base);
        else this._tempMultiSet.add(base);

        if (this._tempMultiSet.size === 0) {
          this._destroyTempMulti();
          this._clearSelection();
          return;
        }
        if (this._tempMultiSet.size === 1) {
          const iter = this._tempMultiSet.values();
          const step = iter.next();
          const only = step.done ? null : step.value;
          if (!only) return;
          this._destroyTempMulti();
          this._select(only);
          this._scheduleBatchDraw();
          return;
        }
        this._ensureTempMulti(Array.from(this._tempMultiSet));
        this._scheduleBatchDraw();
        return;
      }

      const baseNode = this._findBaseNodeByTarget(target);
      if (!baseNode) return;

      // Normal click — destroy temporary group and select single node
      this._destroyTempMulti();
      this._select(baseNode);
      this._scheduleBatchDraw();
    });

    // Double click: "drill down" one level in group hierarchy
    stage.on('dblclick.selection', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      const layer = this._core.nodes.layer;
      if (e.target === stage || e.target.getLayer() !== layer) return;

      if (e.evt.button !== 0) return;

      if (!this._selected) return;

      const selectedNode = this._selected.getNode();
      if (
        selectedNode instanceof Konva.Group &&
        typeof selectedNode.isAncestorOf === 'function' &&
        selectedNode.isAncestorOf(e.target)
      ) {
        e.cancelBubble = true;

        // Find closest registered group between selectedNode and target
        // If no group - select the node itself
        let nextLevel: BaseNode | null = null;

        for (const n of this._core.nodes.list()) {
          const node = n.getNode() as unknown as Konva.Node;

          // Check that node is descendant of selectedNode
          if (
            typeof selectedNode.isAncestorOf === 'function' &&
            selectedNode.isAncestorOf(node) &&
            node !== selectedNode
          ) {
            // Check that node is ancestor of target (but not equal to target if not a group)
            if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(e.target)) {
              // Check that this is the closest ancestor (no intermediate registered nodes)
              let isClosest = true;
              for (const other of this._core.nodes.list()) {
                if (other === n) continue;
                const otherNode = other.getNode() as unknown as Konva.Node;
                if (
                  typeof selectedNode.isAncestorOf === 'function' &&
                  selectedNode.isAncestorOf(otherNode) &&
                  typeof node.isAncestorOf === 'function' &&
                  node.isAncestorOf(otherNode) &&
                  typeof otherNode.isAncestorOf === 'function' &&
                  otherNode.isAncestorOf(e.target)
                ) {
                  isClosest = false;
                  break;
                }
              }
              if (isClosest) {
                nextLevel = n;
                break;
              }
            }
          }
        }

        // If no intermediate group found, search for target node itself
        nextLevel ??= this._core.nodes.list().find((n) => n.getNode() === e.target) ?? null;

        if (nextLevel) {
          this._select(nextLevel);
          const node = nextLevel.getNode();
          // Enable dragging for selected node
          if (typeof node.draggable === 'function') node.draggable(true);
          // Temporarily disable dragging for parent group
          if (selectedNode instanceof Konva.Group) {
            this._parentGroupDuringChildEdit = selectedNode;
            this._parentGroupPrevDraggable =
              typeof selectedNode.draggable === 'function' ? selectedNode.draggable() : null;
            if (typeof selectedNode.draggable === 'function') selectedNode.draggable(false);
          }
          this._core.stage.batchDraw();
        }
      }
    });

    // React to node removal — deselect if selected node was removed
    core.eventBus.on('node:removed', this._onNodeRemoved);

    stage.on('mousemove.hover', this._onHoverMoveThrottled);
    stage.on('mouseleave.hover', this._onHoverLeave);
    stage.on('mousedown.hover', this._onHoverDown);
    stage.on('mouseup.hover', this._onHoverUp);
    stage.on('touchstart.hover', this._onHoverDown);
    stage.on('touchend.hover', this._onHoverUp);
    // Hide overlay during drag too
    this._core.nodes.layer.on('dragstart.hover', () => {
      this._destroyHoverTr();
    });
    this._core.nodes.layer.on('dragmove.hover', () => {
      this._destroyHoverTr();
    });

    // Auto-pan: start on first drag, even if node wasn't selected yet
    const layer = this._core.nodes.layer;
    layer.on('dragstart.selectionAutoPan', (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!this._options.autoPanEnabled) return;
      const target = e.target as Konva.Node;
      // Consider custom selectability filter to avoid reacting to service nodes
      if (!this._options.selectablePredicate(target)) return;
      this._draggingNode = target;
      this._startAutoPanLoop();
    });
    layer.on('dragend.selectionAutoPan', () => {
      this._draggingNode = null;
      this._stopAutoPanLoop();
    });

    // When camera pans via world movement, need to sync all overlays
    const world = this._core.nodes.world;
    const syncOverlaysOnWorldChange = () => {
      if (!this._core) return;
      // Coalesce multiple events (scale, x, y) into one update per frame
      if (this._worldSyncRafId != null) return;
      this._worldSyncRafId = globalThis.requestAnimationFrame(() => {
        this._worldSyncRafId = null;
        if (!this._core) return;
        if (
          this._transformer ||
          this._cornerHandlesGroup ||
          this._rotateHandlesGroup ||
          this._sizeLabel ||
          this._tempMultiGroup
        ) {
          // Recalculate attachment and all custom overlays in screen coordinates
          this._transformer?.forceUpdate();
          this._hoverTr?.forceUpdate();
          this._restyleSideAnchors();
          this._updateCornerRadiusHandlesPosition();
          this._updateRotateHandlesPosition();
          this._updateSizeLabel();
          // Update corner radius handles visibility based on zoom
          this._updateCornerRadiusHandlesVisibility();
          this._tempOverlay?.forceUpdate();
          // OPTIMIZATION: use scheduleBatchDraw instead of direct call
          this._scheduleBatchDraw();
        }
        // Remove hover overlay until next mousemove to avoid flickering
        this._destroyHoverTr();
      });
    };
    world.on(
      'xChange.selectionCamera yChange.selectionCamera scaleXChange.selectionCamera scaleYChange.selectionCamera',
      syncOverlaysOnWorldChange,
    );
    // Listen to camera events for zoom (CameraManager)
    this._onCameraZoomEvent = () => {
      syncOverlaysOnWorldChange();
    };
    core.eventBus.on('camera:zoom', this._onCameraZoomEvent as unknown as (p: unknown) => void);
    core.eventBus.on('camera:setZoom', this._onCameraZoomEvent as unknown as (p: unknown) => void);
    core.eventBus.on('camera:reset', this._onCameraZoomEvent as unknown as () => void);

    // Global listeners for Shift (proportional resize only for corner anchors)
    this._onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this._ratioKeyPressed = true;
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+G — commit temporary group to permanent (by key code, layout-independent)
      if (ctrl && !e.shiftKey && e.code === 'KeyG') {
        e.preventDefault();
        this._commitTempMultiToGroup();
      }
      // Ctrl+Shift+G — ungroup selected permanent group (by key code)
      if (ctrl && e.shiftKey && e.code === 'KeyG') {
        e.preventDefault();
        this._tryUngroupSelectedGroup();
      }
    };
    this._onGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this._ratioKeyPressed = false;
    };
    globalThis.addEventListener('keydown', this._onGlobalKeyDown);
    globalThis.addEventListener('keyup', this._onGlobalKeyUp);
  }

  protected onDetach(core: CoreEngine): void {
    // Deselect and clean states
    this._destroyTempMulti();
    this._clearSelection();

    // Unsubscribe
    core.stage.off('.selection');
    core.stage.off('.hover');
    this._core?.nodes.layer.off('.hover');
    // Remove world listeners and cancel pending RAF
    this._core?.nodes.world.off('.selectionCamera');
    // Remove layer-level auto-pan handlers
    this._core?.nodes.layer.off('.selectionAutoPan');
    // Cancel pending RAF if any
    if (this._worldSyncRafId != null) {
      globalThis.cancelAnimationFrame(this._worldSyncRafId);
      this._worldSyncRafId = null;
    }
    // Remove camera event listeners
    if (this._onCameraZoomEvent) {
      core.eventBus.off('camera:zoom', this._onCameraZoomEvent as unknown as (p: unknown) => void);
      core.eventBus.off(
        'camera:setZoom',
        this._onCameraZoomEvent as unknown as (p: unknown) => void,
      );
      core.eventBus.off('camera:reset', this._onCameraZoomEvent as unknown as () => void);
      this._onCameraZoomEvent = null;
    }
    core.eventBus.off('node:removed', this._onNodeRemoved);

    // Remove hover overlay
    this._destroyHoverTr();

    // Remove global key listeners
    if (this._onGlobalKeyDown) globalThis.removeEventListener('keydown', this._onGlobalKeyDown);
    if (this._onGlobalKeyUp) globalThis.removeEventListener('keyup', this._onGlobalKeyUp);
    this._onGlobalKeyDown = null;
    this._onGlobalKeyUp = null;
  }

  // ===================== Selection logic =====================
  private _onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core) return;
    // Left mouse button only
    if (e.evt.button !== 0) return;

    const stage = this._core.stage;
    const layer = this._core.nodes.layer;

    // Click on empty area
    if (e.target === stage || e.target.getLayer() !== layer) {
      let insideHandled = false;
      if (this._selected) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const selKonva = this._selected.getNode() as unknown as Konva.Node;
          const bbox = selKonva.getClientRect({ skipShadow: true, skipStroke: false });
          const inside =
            pos.x >= bbox.x &&
            pos.x <= bbox.x + bbox.width &&
            pos.y >= bbox.y &&
            pos.y <= bbox.y + bbox.height;
          if (inside) {
            insideHandled = true;
            if (typeof selKonva.startDrag === 'function') {
              const dnode = selKonva as DraggableNode;
              const threshold = 3;
              const startX = e.evt.clientX;
              const startY = e.evt.clientY;
              const prevNodeDraggable =
                typeof dnode.draggable === 'function' ? dnode.draggable() : false;
              const prevStageDraggable = stage.draggable();
              let dragStarted = false;

              const onMove = (ev: Konva.KonvaEventObject<MouseEvent>) => {
                const dx = Math.abs(ev.evt.clientX - startX);
                const dy = Math.abs(ev.evt.clientY - startY);
                if (!dragStarted && (dx > threshold || dy > threshold)) {
                  dragStarted = true;
                  if (typeof dnode.draggable === 'function' && !prevNodeDraggable)
                    dnode.draggable(true);
                  selKonva.on('dragstart.selection-once-bbox', () => {
                    stage.draggable(false);
                  });
                  selKonva.on('dragend.selection-once-bbox', () => {
                    stage.draggable(prevStageDraggable);
                    if (typeof dnode.draggable === 'function') {
                      dnode.draggable(this._options.dragEnabled ? true : prevNodeDraggable);
                    }
                    // Restore frame after drag
                    if (this._selected) {
                      this._refreshTransformer();
                      this._core?.nodes.layer.batchDraw();
                    }
                    selKonva.off('.selection-once-bbox');
                  });
                  selKonva.startDrag();
                  e.cancelBubble = true;
                }
              };
              const onUp = () => {
                // If drag didn't start — it's a click: only then deselect
                if (!dragStarted && this._options.deselectOnEmptyClick) this._clearSelection();
                stage.off('mousemove.selection-once-bbox');
                stage.off('mouseup.selection-once-bbox');
              };
              stage.on('mousemove.selection-once-bbox', onMove);
              stage.on('mouseup.selection-once-bbox', onUp);
            }
          }
        }
      }
      // If click came OUTSIDE bbox — deselect immediately
      if (!insideHandled) {
        if (this._options.deselectOnEmptyClick) this._clearSelection();
      }
      return;
    }

    const target = e.target;
    if (!this._options.selectablePredicate(target)) return;

    // Basic search (usually group)
    let baseNode = this._findBaseNodeByTarget(target);
    if (!baseNode) return;

    // If there's selection and click came inside already selected node — drag it
    if (this._selected) {
      const selKonva = this._selected.getNode() as unknown as Konva.Node;
      const isAncestor = (a: Konva.Node, b: Konva.Node): boolean => {
        let cur: Konva.Node | null = b;
        while (cur) {
          if (cur === a) return true;
          cur = cur.getParent();
        }
        return false;
      };
      if (isAncestor(selKonva, target)) {
        baseNode = this._selected;
      }
      // Otherwise — remains group (baseNode found above)
    }

    // Start dragging immediately, without visual selection until drag ends
    const konvaNode = baseNode.getNode();

    // Threshold for "intentional" movement to not interfere with dblclick
    const threshold = 3;
    const startX = e.evt.clientX;
    const startY = e.evt.clientY;
    let startedByMove = false;

    const onMove = (ev: Konva.KonvaEventObject<MouseEvent>) => {
      if (startedByMove) return;
      const dx = Math.abs(ev.evt.clientX - startX);
      const dy = Math.abs(ev.evt.clientY - startY);
      if (dx > threshold || dy > threshold) {
        startedByMove = true;
        if (typeof konvaNode.startDrag === 'function') {
          konvaNode.startDrag();
        }
        this._core?.stage.off('mousemove.selection-once');
        this._core?.stage.off('mouseup.selection-once');
      }
    };

    const onUp = () => {
      this._core?.stage.off('mousemove.selection-once');
      this._core?.stage.off('mouseup.selection-once');
    };

    this._core.stage.on('mousemove.selection-once', onMove);
    this._core.stage.on('mouseup.selection-once', onUp);

    // If already dragging — do nothing
    if (typeof konvaNode.isDragging === 'function' && konvaNode.isDragging()) {
      return;
    }

    const hasDraggable = typeof konvaNode.draggable === 'function';
    const prevNodeDraggable = hasDraggable ? konvaNode.draggable() : false;
    const prevStageDraggable = stage.draggable();

    // Make node draggable during drag
    if (hasDraggable) {
      konvaNode.draggable(true);
    }

    // Disable stage pan on drag start
    konvaNode.on('dragstart.selection-once', () => {
      stage.draggable(false);
    });

    // On drag end: restore stage/node state and select node
    konvaNode.on('dragend.selection-once', () => {
      stage.draggable(prevStageDraggable);
      if (hasDraggable) {
        if (this._options.dragEnabled) {
          konvaNode.draggable(true);
        } else {
          konvaNode.draggable(prevNodeDraggable);
        }
      }
      // After drag completion — restore visual selection
      this._select(baseNode);
    });
  };

  private _select(node: BaseNode) {
    if (!this._core) return;
    const core = this._core;

    // Clear previous selection
    this._clearSelection();

    // Save and enable draggable for the selected node (if enabled)
    const konvaNode = node.getNode();
    this._prevDraggable = konvaNode.draggable();
    if (this._options.dragEnabled && typeof konvaNode.draggable === 'function') {
      konvaNode.draggable(true);
    }

    // Visual transformer (optional)
    this._selected = node;
    this._refreshTransformer();

    // Emit selection event
    core.eventBus.emit('node:selected', node);

    // Dragging is handled by Konva Node when draggable(true)
    // Hide/show the frame and corner-radius handles during drag
    konvaNode.on('dragstart.selection', () => {
      // Remember active node for offset compensation during auto-pan
      this._draggingNode = konvaNode;
      if (this._transformer) {
        this._transformerWasVisibleBeforeDrag = this._transformer.visible();
        this._transformer.visible(false);
      }
      if (this._cornerHandlesGroup) {
        this._cornerHandlesWereVisibleBeforeDrag = this._cornerHandlesGroup.visible();
        this._cornerHandlesGroup.visible(false);
      }
      if (this._rotateHandlesGroup) {
        this._rotateHandlesWereVisibleBeforeDrag = this._rotateHandlesGroup.visible();
        this._rotateHandlesGroup.visible(false);
      }
      if (this._sizeLabel) {
        this._sizeLabelWasVisibleBeforeDrag = this._sizeLabel.visible();
        this._sizeLabel.visible(false);
      }
      this._core?.stage.batchDraw();
      // Start auto-pan during dragging
      this._startAutoPanLoop();
    });
    konvaNode.on('dragmove.selection', () => {
      // Optimization: throttling for dragmove
      if (this._dragMoveScheduled) return;

      this._dragMoveScheduled = true;
      const raf = globalThis.requestAnimationFrame;
      raf(() => {
        this._dragMoveScheduled = false;
        this._scheduleBatchDraw();
      });
    });

    // Emit changes after drag completion
    konvaNode.on('dragend.selection', () => {
      const changes: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
        scaleX?: number;
        scaleY?: number;
      } = {};
      if (typeof (konvaNode as unknown as { x?: () => number }).x === 'function')
        changes.x = (konvaNode as unknown as { x: () => number }).x();
      if (typeof (konvaNode as unknown as { y?: () => number }).y === 'function')
        changes.y = (konvaNode as unknown as { y: () => number }).y();
      if (typeof (konvaNode as unknown as { width?: () => number }).width === 'function')
        changes.width = (konvaNode as unknown as { width: () => number }).width();
      if (typeof (konvaNode as unknown as { height?: () => number }).height === 'function')
        changes.height = (konvaNode as unknown as { height: () => number }).height();
      if (typeof (konvaNode as unknown as { rotation?: () => number }).rotation === 'function')
        changes.rotation = (konvaNode as unknown as { rotation: () => number }).rotation();
      if (typeof (konvaNode as unknown as { scaleX?: () => number }).scaleX === 'function')
        changes.scaleX = (konvaNode as unknown as { scaleX: () => number }).scaleX();
      if (typeof (konvaNode as unknown as { scaleY?: () => number }).scaleY === 'function')
        changes.scaleY = (konvaNode as unknown as { scaleY: () => number }).scaleY();
      core.eventBus.emit('node:transformed', node, changes);
    });

    // Emit changes after transformation completion (resize/rotate/scale)
    konvaNode.on('transformend.selection', () => {
      const changes: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
        scaleX?: number;
        scaleY?: number;
      } = {};
      if (typeof (konvaNode as unknown as { x?: () => number }).x === 'function')
        changes.x = (konvaNode as unknown as { x: () => number }).x();
      if (typeof (konvaNode as unknown as { y?: () => number }).y === 'function')
        changes.y = (konvaNode as unknown as { y: () => number }).y();
      if (typeof (konvaNode as unknown as { width?: () => number }).width === 'function')
        changes.width = (konvaNode as unknown as { width: () => number }).width();
      if (typeof (konvaNode as unknown as { height?: () => number }).height === 'function')
        changes.height = (konvaNode as unknown as { height: () => number }).height();
      if (typeof (konvaNode as unknown as { rotation?: () => number }).rotation === 'function')
        changes.rotation = (konvaNode as unknown as { rotation: () => number }).rotation();
      if (typeof (konvaNode as unknown as { scaleX?: () => number }).scaleX === 'function')
        changes.scaleX = (konvaNode as unknown as { scaleX: () => number }).scaleX();
      if (typeof (konvaNode as unknown as { scaleY?: () => number }).scaleY === 'function')
        changes.scaleY = (konvaNode as unknown as { scaleY: () => number }).scaleY();
      this._core?.eventBus.emit('node:transformed', node, changes);
    });
    konvaNode.on('dragend.selection', () => {
      // Reset active node reference
      this._draggingNode = null;
      if (this._transformer) {
        if (this._transformerWasVisibleBeforeDrag) {
          this._transformer.visible(true);
        }
        this._transformerWasVisibleBeforeDrag = false;
      }
      if (this._cornerHandlesGroup) {
        if (this._cornerHandlesWereVisibleBeforeDrag) {
          this._cornerHandlesGroup.visible(true);
        }
        this._cornerHandlesWereVisibleBeforeDrag = false;
      }
      if (this._rotateHandlesGroup) {
        if (this._rotateHandlesWereVisibleBeforeDrag) {
          this._rotateHandlesGroup.visible(true);
        }
        this._rotateHandlesWereVisibleBeforeDrag = false;
      }
      if (this._sizeLabel) {
        if (this._sizeLabelWasVisibleBeforeDrag) {
          this._sizeLabel.visible(true);
        }
        this._sizeLabelWasVisibleBeforeDrag = false;
      }
      // Stop auto-pan
      this._stopAutoPanLoop();
      this._select(node);
      this._core?.stage.batchDraw();
    });

    // >>> ADD: stage panning with middle/right button if node is already selected
    konvaNode.on('mousedown.selection', (e: Konva.KonvaEventObject<MouseEvent>) => {
      const btn = e.evt.button;
      if (btn === 1 || btn === 2) {
        const hasDraggable = typeof konvaNode.draggable === 'function';
        if (hasDraggable) konvaNode.draggable(false);
      }
    });
  }

  private _clearSelection() {
    if (!this._selected) return;

    const selectedNode = this._selected;
    const node = this._selected.getNode();

    // Restore previous draggable state
    if (typeof node.draggable === 'function' && this._prevDraggable !== null) {
      node.draggable(this._prevDraggable);
    }
    this._prevDraggable = null;

    // Restore draggable state of parent group if we were in child node edit mode
    if (this._parentGroupDuringChildEdit) {
      const grp = this._parentGroupDuringChildEdit;
      if (typeof grp.draggable === 'function' && this._parentGroupPrevDraggable !== null) {
        grp.draggable(this._parentGroupPrevDraggable);
      }
      this._parentGroupDuringChildEdit = null;
      this._parentGroupPrevDraggable = null;
    }

    // Remove drag listeners with namespace
    node.off('.selection');
    node.off('.selection-once');

    // Remove custom radius handles
    this._destroyCornerRadiusHandles();
    // Remove rotation handles
    this._destroyRotateHandles();

    // Remove size label
    this._destroySizeLabel();

    // Remove transformer if exists
    if (this._transformer) {
      this._transformer.destroy();
      this._transformer = null;
    }

    this._selected = null;

    // Emit deselection events
    if (this._core) {
      this._core.eventBus.emit('node:deselected', selectedNode);
      this._core.eventBus.emit('selection:cleared');
    }

    this._core?.stage.batchDraw();
  }

  // ===== Helpers: temporary multi-group =====
  private _ensureTempMulti(nodes: BaseNode[]) {
    if (!this._core) return;
    const world = this._core.nodes.world;
    // Fill set for correct size check on commit (important for lasso)
    this._tempMultiSet.clear();
    for (const b of nodes) this._tempMultiSet.add(b);

    if (!this._tempMultiGroup) {
      const grp = new Konva.Group({ name: 'temp-multi-group' });
      world.add(grp);
      this._tempMultiGroup = grp;
      this._tempPlacement.clear();
      for (const b of nodes) {
        const kn = b.getNode() as unknown as Konva.Node;
        const parent = kn.getParent();
        if (!parent) continue;
        // FIX: save position in parent's children array
        const indexInParent = kn.zIndex();
        const abs = kn.getAbsolutePosition();
        const prevDraggable =
          typeof (kn as unknown as { draggable?: (v?: boolean) => boolean }).draggable ===
          'function'
            ? (kn as unknown as { draggable: (v?: boolean) => boolean }).draggable()
            : null;
        this._tempPlacement.set(kn, { parent, indexInParent, abs, prevDraggable });
        grp.add(kn as unknown as Konva.Group | Konva.Shape);
        kn.setAbsolutePosition(abs);
        if (
          typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
        )
          (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(false);
        // Block drag on children and redirect to group
        kn.off('.tempMultiChild');
        kn.on('dragstart.tempMultiChild', (ev: Konva.KonvaEventObject<DragEvent>) => {
          ev.cancelBubble = true;
          const anyKn = kn as unknown as { stopDrag?: () => void };
          if (typeof anyKn.stopDrag === 'function') anyKn.stopDrag();
        });
        kn.on('mousedown.tempMultiChild', (ev: Konva.KonvaEventObject<MouseEvent>) => {
          if (ev.evt.button !== 0) return;
          ev.cancelBubble = true;
          const anyGrp = grp as unknown as { startDrag?: () => void };
          if (typeof anyGrp.startDrag === 'function') anyGrp.startDrag();
        });
      }
      // Unified overlay manager for temporary group
      this._tempOverlay ??= new OverlayFrameManager(this._core);
      this._tempOverlay.attach(grp, { keepRatioCornerOnlyShift: () => this._ratioKeyPressed });
      // Behavior like a regular group: drag group, without scene panning
      const stage = this._core.stage;
      const prevStageDraggable = stage.draggable();
      grp.draggable(true);
      const forceUpdate = () => {
        this._tempOverlay?.forceUpdate();
        this._scheduleBatchDraw();
      };
      grp.on('dragstart.tempMulti', () => {
        stage.draggable(false);
        this._draggingNode = grp;
        this._startAutoPanLoop();
        // Hide frame/label/handles of temporary group during dragging
        this._tempOverlay?.hideOverlaysForDrag();
        forceUpdate();
      });
      grp.on('dragmove.tempMulti', forceUpdate);
      grp.on('transform.tempMulti', forceUpdate);
      grp.on('dragend.tempMulti', () => {
        stage.draggable(prevStageDraggable);
        this._draggingNode = null;
        this._stopAutoPanLoop();
        // Restore frame/label/handles after dragging
        this._tempOverlay?.restoreOverlaysAfterDrag();
        forceUpdate();
      });

      // Event: temporary multi-selection created
      this._core.eventBus.emit('selection:multi:created', nodes);
      return;
    }
    // Update composition
    const curr = [...this._tempMultiGroup.getChildren()];
    const want = nodes.map((b) => b.getNode() as unknown as Konva.Node);
    const same = curr.length === want.length && want.every((n) => curr.includes(n as Konva.Group));
    if (same) return;
    this._destroyTempMulti();
    this._ensureTempMulti(nodes);
  }

  private _destroyTempMulti() {
    if (!this._core) return;
    if (!this._tempMultiGroup && this._tempMultiSet.size === 0) return;
    // Detach unified overlay manager (removes transformer/label/rotate/hit)
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }
    if (this._tempMultiGroup) {
      this._tempMultiGroup.off('.tempMulti');
      const children = [...this._tempMultiGroup.getChildren()];
      for (const kn of children) {
        // Remove child intercepts
        kn.off('.tempMultiChild');
        const info = this._tempPlacement.get(kn);
        // Store child's absolute transform (position/scale/rotation)
        const absBefore = kn.getAbsoluteTransform().copy();
        // Destination parent: saved one or world
        const dstParent = info?.parent ?? this._core.nodes.world;
        // Move to destination parent
        kn.moveTo(dstParent);
        // Compute local transform equivalent to the previous absolute transform
        const parentAbs = dstParent.getAbsoluteTransform().copy();
        parentAbs.invert();
        const local = parentAbs.multiply(absBefore);
        const d = local.decompose();
        // Apply local x/y/rotation/scale to preserve the visual result
        if (
          typeof (kn as unknown as { position?: (p: Konva.Vector2d) => void }).position ===
          'function'
        ) {
          (kn as unknown as { position: (p: Konva.Vector2d) => void }).position({ x: d.x, y: d.y });
        } else {
          kn.setAbsolutePosition({ x: d.x, y: d.y });
        }
        if (typeof (kn as unknown as { rotation?: (r: number) => void }).rotation === 'function') {
          (kn as unknown as { rotation: (r: number) => void }).rotation(d.rotation);
        }
        if (
          typeof (kn as unknown as { scale?: (p: Konva.Vector2d) => void }).scale === 'function'
        ) {
          (kn as unknown as { scale: (p: Konva.Vector2d) => void }).scale({
            x: d.scaleX,
            y: d.scaleY,
          });
        }
        // Restore order and draggable
        if (info) {
          // FIX: restore position via moveUp/moveDown
          const currentIndex = kn.zIndex();
          const targetIndex = info.indexInParent;

          if (currentIndex !== targetIndex) {
            const diff = targetIndex - currentIndex;
            if (diff > 0) {
              // Need to move up
              for (let i = 0; i < diff && kn.zIndex() < info.parent.children.length - 1; i++) {
                kn.moveUp();
              }
            } else if (diff < 0) {
              // Need to move down
              for (let i = 0; i < Math.abs(diff) && kn.zIndex() > 0; i++) {
                kn.moveDown();
              }
            }
          }

          if (
            typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable ===
              'function' &&
            info.prevDraggable !== null
          ) {
            (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(info.prevDraggable);
          }
        }
      }
      this._tempMultiGroup.destroy();
      this._tempMultiGroup = null;
    }
    this._tempPlacement.clear();
    this._tempMultiSet.clear();

    // Event: temporary multi-selection destroyed
    this._core.eventBus.emit('selection:multi:destroyed');
  }

  private _updateTempRotateHandlesPosition() {
    if (!this._core || !this._tempMultiGroup || !this._tempRotateHandlesGroup) return;
    const grp = this._tempMultiGroup;
    const local = grp.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: false });
    const width = local.width;
    const height = local.height;
    if (width <= 0 || height <= 0) return;
    const tr = grp.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);
    const offset = 12;
    const centerAbs = mapAbs({ x: local.x + width / 2, y: local.y + height / 2 });
    const c0 = mapAbs({ x: local.x, y: local.y });
    const c1 = mapAbs({ x: local.x + width, y: local.y });
    const c2 = mapAbs({ x: local.x + width, y: local.y + height });
    const c3 = mapAbs({ x: local.x, y: local.y + height });
    const dir = (c: { x: number; y: number }) => {
      const vx = c.x - centerAbs.x;
      const vy = c.y - centerAbs.y;
      const len = Math.hypot(vx, vy) || 1;
      return { x: vx / len, y: vy / len };
    };
    const d0 = dir(c0),
      d1 = dir(c1),
      d2 = dir(c2),
      d3 = dir(c3);
    const p0 = { x: c0.x + d0.x * offset, y: c0.y + d0.y * offset };
    const p1 = { x: c1.x + d1.x * offset, y: c1.y + d1.y * offset };
    const p2 = { x: c2.x + d2.x * offset, y: c2.y + d2.y * offset };
    const p3 = { x: c3.x + d3.x * offset, y: c3.y + d3.y * offset };
    if (this._tempRotateHandles.tl) this._tempRotateHandles.tl.absolutePosition(p0);
    if (this._tempRotateHandles.tr) this._tempRotateHandles.tr.absolutePosition(p1);
    if (this._tempRotateHandles.br) this._tempRotateHandles.br.absolutePosition(p2);
    if (this._tempRotateHandles.bl) this._tempRotateHandles.bl.absolutePosition(p3);
    this._tempRotateHandlesGroup.moveToTop();
  }

  private _updateTempMultiSizeLabel() {
    if (!this._core || !this._tempMultiGroup || !this._tempMultiSizeLabel) return;
    const world = this._core.nodes.world;
    // Visual bbox WITHOUT stroke (and thus without selection frame)
    const bbox = this._tempMultiGroup.getClientRect({ skipShadow: true, skipStroke: true });
    const logicalW = bbox.width / Math.max(1e-6, world.scaleX());
    const logicalH = bbox.height / Math.max(1e-6, world.scaleY());
    const w = Math.max(0, Math.round(logicalW));
    const h = Math.max(0, Math.round(logicalH));
    const text = this._tempMultiSizeLabel.getText();
    text.text(String(w) + ' × ' + String(h));
    const offset = 8;
    const bottomX = bbox.x + bbox.width / 2;
    const bottomY = bbox.y + bbox.height + offset;
    const labelRect = this._tempMultiSizeLabel.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const labelW = labelRect.width;
    this._tempMultiSizeLabel.setAttrs({ x: bottomX - labelW / 2, y: bottomY });
    this._tempMultiSizeLabel.moveToTop();
  }

  // Update/create an invisible hit zone matching the group's bbox (for dragging in empty areas)
  private _updateTempMultiHitRect() {
    if (!this._core || !this._tempMultiGroup) return;
    const layer = this._core.nodes.layer;
    // Group's local bbox (no transform) so the rect aligns correctly at any rotation/scale
    const local = this._tempMultiGroup.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const topLeft = { x: local.x, y: local.y };
    const w = local.width;
    const h = local.height;
    if (!this._tempMultiHitRect) {
      const rect = new Konva.Rect({
        name: 'temp-multi-hit',
        x: topLeft.x,
        y: topLeft.y,
        width: w,
        height: h,
        fill: 'rgba(0,0,0,0.001)', // almost invisible but participates in hit-test
        listening: true,
        perfectDrawEnabled: false,
      });
      // Allow group drag on mousedown in empty area
      rect.on('mousedown.tempMultiHit', (ev: Konva.KonvaEventObject<MouseEvent>) => {
        if (ev.evt.button !== 0) return;
        ev.cancelBubble = true;
        const anyGrp = this._tempMultiGroup as unknown as { startDrag?: () => void };
        if (typeof anyGrp.startDrag === 'function') anyGrp.startDrag();
      });
      // Add to the group and keep at the back
      this._tempMultiGroup.add(rect);
      rect.moveToBottom();
      this._tempMultiHitRect = rect;
      layer.batchDraw();
      return;
    }
    // Update geometry of the existing rectangle
    this._tempMultiHitRect.position(topLeft);
    this._tempMultiHitRect.size({ width: w, height: h });
    this._tempMultiHitRect.moveToBottom();
  }

  private _commitTempMultiToGroup() {
    if (!this._core) return;
    if (!this._tempMultiGroup || this._tempMultiSet.size < 2) return;
    const nm = this._core.nodes;
    const pos = this._tempMultiGroup.getAbsolutePosition();
    const newGroup = nm.addGroup({ x: pos.x, y: pos.y, draggable: true });
    const g = newGroup.getNode();
    const children = [...this._tempMultiGroup.getChildren()];
    const groupedBaseNodes: BaseNode[] = [];

    // FIX: Sort nodes by their current z-index in the world BEFORE adding to the group
    // This preserves their relative render order
    const sortedChildren = children.sort((a, b) => {
      return a.zIndex() - b.zIndex();
    });

    // Find the maximum z-index to position the group itself in the world
    const maxZIndex = Math.max(...sortedChildren.map((kn) => kn.zIndex()));

    for (const kn of sortedChildren) {
      // Remove temporary group intercepts from children
      kn.off('.tempMultiChild');
      const abs = kn.getAbsolutePosition();
      g.add(kn as unknown as Konva.Group | Konva.Shape);
      kn.setAbsolutePosition(abs);

      // FIX: Do NOT set z-index on children!
      // Konva will automatically set order when added to the group
      // Add order (sortedChildren) = render order

      if (
        typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
      )
        (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(false);

      // Collect BaseNodes corresponding to the Konva nodes
      const base = this._core.nodes
        .list()
        .find((b) => b.getNode() === (kn as unknown as Konva.Node));
      if (base) groupedBaseNodes.push(base);
    }

    // FIX: Position the group itself in the world with the correct z-index
    // Use moveUp/moveDown instead of setting zIndex(value) directly
    const world = this._core.nodes.world;
    const currentGroupIndex = g.zIndex();
    const targetIndex = maxZIndex;

    // Move the group to the maximum children's z-index position
    if (currentGroupIndex < targetIndex) {
      const diff = targetIndex - currentGroupIndex;
      for (let i = 0; i < diff && g.zIndex() < world.children.length - 1; i++) {
        g.moveUp();
      }
    }

    if (this._tempMultiTr) {
      this._tempMultiTr.destroy();
      this._tempMultiTr = null;
    }
    // Detach the unified overlay manager for the temporary group to prevent UI elements from remaining
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }
    // Remove .tempMulti handlers from the temporary group before destruction
    this._tempMultiGroup.off('.tempMulti');
    this._tempMultiGroup.destroy();
    this._tempMultiGroup = null;
    this._tempPlacement.clear();
    this._tempMultiSet.clear();
    // Explicitly enable draggable for the created group (in case downstream logic changes options)
    if (typeof g.draggable === 'function') g.draggable(true);

    // Event: group created
    this._core.eventBus.emit('group:created', newGroup, groupedBaseNodes);
    this._select(newGroup);
    this._core.stage.batchDraw();
  }

  private _tryUngroupSelectedGroup() {
    if (!this._core) return;
    if (!this._selected) return;
    const node = this._selected.getNode();
    if (!(node instanceof Konva.Group)) return;
    const children = [...node.getChildren()];
    const world = this._core.nodes.world;

    for (const kn of children) {
      // Save the full absolute transform of the child (position + scale + rotation)
      const absBefore = kn.getAbsoluteTransform().copy();

      // Move to world
      world.add(kn as unknown as Konva.Group | Konva.Shape);

      // Calculate local transform equivalent to the previous absolute transform
      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();
      const local = worldAbs.multiply(absBefore);
      const d = local.decompose();

      // Apply local x/y/rotation/scale to preserve the visual result
      if (
        typeof (kn as unknown as { position?: (p: Konva.Vector2d) => void }).position === 'function'
      ) {
        (kn as unknown as { position: (p: Konva.Vector2d) => void }).position({ x: d.x, y: d.y });
      } else {
        kn.setAbsolutePosition({ x: d.x, y: d.y });
      }
      if (typeof (kn as unknown as { rotation?: (r: number) => void }).rotation === 'function') {
        (kn as unknown as { rotation: (r: number) => void }).rotation(d.rotation);
      }
      if (typeof (kn as unknown as { scale?: (p: Konva.Vector2d) => void }).scale === 'function') {
        (kn as unknown as { scale: (p: Konva.Vector2d) => void }).scale({
          x: d.scaleX,
          y: d.scaleY,
        });
      }

      // Enable draggable for ungrouped nodes
      if (
        typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
      ) {
        (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(true);
      }
    }

    const sel = this._selected;
    this._selected = null;
    this._transformer?.destroy();
    this._transformer = null;
    // Remove size label of the group on ungrouping
    this._destroySizeLabel();
    this._core.nodes.remove(sel);
    this._core.stage.batchDraw();
  }

  // ===================== Hover (minimal) =====================
  private _ensureHoverTr(): Konva.Transformer {
    if (!this._core) throw new Error('Core is not attached');
    if (this._hoverTr?.getParent()) return this._hoverTr;
    const tr = new Konva.Transformer({
      rotateEnabled: false,
      enabledAnchors: [],
      rotationSnaps: [
        0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285,
        300, 315, 330, 345, 360,
      ],
      borderEnabled: true,
      borderStroke: '#2b83ff',
      borderStrokeWidth: 1.5,
      listening: false,
      name: 'hover-transformer',
    });
    this._core.nodes.layer.add(tr);
    this._hoverTr = tr;
    return tr;
  }

  private _destroyHoverTr() {
    if (this._hoverTr) {
      this._hoverTr.destroy();
      this._hoverTr = null;
    }
  }

  // OPTIMIZATION: Throttled version of _onHoverMove
  private _onHoverMoveThrottled = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._hoverThrottle.shouldExecute()) return;
    this._onHoverMove(e);
  };

  private _onHoverMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core) return;
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const target = e.target;
    // If there's a temporary group (ours or area-temp-group) and pointer is inside it — suppress hover
    const isInsideTemp = (() => {
      const hasTemp = !!this._tempMultiGroup;
      if (!hasTemp) {
        // Check if inside area-temp-group
        let cur: Konva.Node | null = target;
        while (cur) {
          if (cur instanceof Konva.Group && typeof cur.name === 'function') {
            const nm = cur.name();
            if (
              typeof nm === 'string' &&
              (nm.includes('temp-multi-group') || nm.includes('area-temp-group'))
            )
              return true;
          }
          cur = cur.getParent();
        }
        return false;
      }
      let cur: Konva.Node | null = target;
      while (cur) {
        if (cur === this._tempMultiGroup) return true;
        cur = cur.getParent();
      }
      return false;
    })();
    if (isInsideTemp) {
      this._destroyHoverTr();
      return;
    }
    // If mouse button is pressed — do not show hover
    const buttons = typeof e.evt.buttons === 'number' ? e.evt.buttons : 0;
    if (this._isPointerDown || buttons & 1) {
      this._destroyHoverTr();
      return;
    }
    // If hover is outside the working layer — hide
    if (target === stage || target.getLayer() !== layer) {
      this._destroyHoverTr();
      return;
    }
    // Find the "owner":
    // - by default, the nearest registered group;
    // - if none, the nearest registered ancestor (including the target itself);
    // - HOWEVER: if there is a selected node in this same group and hover over another node from the group — highlight this node specifically.
    const registeredArr = this._core.nodes.list().map((n) => n.getNode() as unknown as Konva.Node);
    const registered = new Set<Konva.Node>(registeredArr);

    const findNearestRegistered = (start: Konva.Node): Konva.Node | null => {
      let cur: Konva.Node | null = start;
      while (cur) {
        if (registered.has(cur)) return cur;
        cur = cur.getParent();
      }
      return null;
    };

    const findNearestRegisteredGroup = (start: Konva.Node): Konva.Node | null => {
      let cur: Konva.Node | null = start;
      let lastGroup: Konva.Node | null = null;
      // Find the highest (outermost) registered group
      while (cur) {
        if (registered.has(cur) && cur instanceof Konva.Group) {
          lastGroup = cur;
        }
        cur = cur.getParent();
      }
      return lastGroup;
    };

    const targetOwnerGroup = findNearestRegisteredGroup(target);
    const targetOwnerNode = findNearestRegistered(target);

    const ctrlPressed = e.evt.ctrlKey;
    // With Ctrl pressed — always highlight the leaf node (if it is registered)
    let owner: Konva.Node | null = ctrlPressed
      ? (targetOwnerNode ?? targetOwnerGroup)
      : (targetOwnerGroup ?? targetOwnerNode);

    // Special rule (without Ctrl): if a NODE (not a group) is selected inside a group and hover over another node from the group — highlight this node specifically
    if (
      !ctrlPressed &&
      this._selected &&
      targetOwnerNode &&
      !(this._selected.getNode() instanceof Konva.Group)
    ) {
      const selectedNode = this._selected.getNode() as unknown as Konva.Node;
      const inSameGroup = (nodeA: Konva.Node, nodeB: Konva.Node, group: Konva.Node | null) => {
        if (!group) return false;
        const isDesc = (root: Konva.Node, child: Konva.Node): boolean => {
          let cur: Konva.Node | null = child;
          while (cur) {
            if (cur === root) return true;
            cur = cur.getParent();
          }
          return false;
        };
        return isDesc(group, nodeA) && isDesc(group, nodeB);
      };
      // If we have a hover group and both nodes are under it, and the hover is not the selected node — select targetOwnerNode
      if (
        targetOwnerGroup &&
        inSameGroup(selectedNode, targetOwnerNode, targetOwnerGroup) &&
        selectedNode !== targetOwnerNode
      ) {
        owner = targetOwnerNode;
      }
    }
    // If not found — hide
    if (!owner) {
      this._destroyHoverTr();
      return;
    }
    // Consider the user predicate already by owner
    if (!this._options.selectablePredicate(owner)) {
      this._destroyHoverTr();
      return;
    }

    // If we hover over the already selected node/branch — do not duplicate the frame
    if (this._selected) {
      const selectedNode = this._selected.getNode() as unknown as Konva.Node;
      const isAncestor = (a: Konva.Node, b: Konva.Node): boolean => {
        // true, if a is an ancestor of b
        let cur: Konva.Node | null = b;
        while (cur) {
          if (cur === a) return true;
          cur = cur.getParent();
        }
        return false;
      };
      // Hide hover only if it is the same node or if selectedNode is an ancestor of owner
      // Do not hide if owner is an ancestor of selectedNode (this means that owner is a higher group)
      const shouldSuppress = ctrlPressed
        ? owner === selectedNode
        : owner === selectedNode || isAncestor(selectedNode, owner);
      if (shouldSuppress) {
        this._destroyHoverTr();
        return;
      }
    }

    const tr = this._ensureHoverTr();
    tr.nodes([owner]);
    tr.visible(true);
    tr.moveToTop();
    layer.batchDraw();
  };

  private _onHoverDown = () => {
    this._isPointerDown = true;
    this._destroyHoverTr();
  };

  private _onHoverUp = () => {
    this._isPointerDown = false;
  };

  private _onHoverLeave = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    this._destroyHoverTr();
  };

  private _refreshTransformer() {
    if (!this._core) return;

    // Clear the previous one
    if (this._transformer) {
      this._transformer.destroy();
      this._transformer = null;
    }

    if (!this._options.enableTransformer || !this._selected) return;

    const layer = this._core.nodes.layer;
    const transformer = new Konva.Transformer({
      rotateEnabled: false,
      rotationSnapTolerance: 15,
      flipEnabled: false,
      keepRatio: false,
      rotationSnaps: [
        0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285,
        300, 315, 330, 345, 360,
      ],
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'bottom-right',
        'bottom-center',
        'bottom-left',
        'middle-left',
      ],
    });
    layer.add(transformer);
    transformer.nodes([this._selected.getNode() as unknown as Konva.Node]);
    // Global size constraint: do not allow collapsing to 0 and fix the opposite angle
    transformer.boundBoxFunc((_, newBox) => {
      const MIN = 1; // px
      let w = newBox.width;
      let h = newBox.height;
      let x = newBox.x;
      let y = newBox.y;

      // Clamp sizes to MIN, without moving the position
      // (fixing the opposite angle is done in transform.corner-sync)
      if (w < 0) {
        w = MIN;
      } else if (w < MIN) {
        w = MIN;
      }

      if (h < 0) {
        h = MIN;
      } else if (h < MIN) {
        h = MIN;
      }

      return { ...newBox, x, y, width: w, height: h };
    });
    this._transformer = transformer;
    // Stretch anchors to the full side and hide them visually (leaving hit-area)
    this._restyleSideAnchors();
    // Add corner radius handlers if supported
    this._setupCornerRadiusHandles(false);
    // Add rotation handlers
    this._setupRotateHandles();
    // Add/Update size label
    this._setupSizeLabel();
    // During transformation (resize/scale) synchronize positions of all overlays
    const updateKeepRatio = () => {
      const active =
        typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
      const isCorner =
        active === 'top-left' ||
        active === 'top-right' ||
        active === 'bottom-left' ||
        active === 'bottom-right';
      transformer.keepRatio(isCorner && this._ratioKeyPressed);
    };
    transformer.on('transformstart.keepratio', () => {
      updateKeepRatio();
      // Hide corner-radius handlers during transformation
      this._cornerHandlesSuppressed = true;
      this._cornerHandlesGroup?.visible(false);
      this._hideRadiusLabel();

      // Save the absolute position of the opposite corner for fixing origin
      // ONLY for corner anchors (for all node types, including groups)
      const node = this._selected?.getNode() as unknown as Konva.Node | undefined;
      const activeAnchor =
        typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
      const isCornerAnchor =
        activeAnchor === 'top-left' ||
        activeAnchor === 'top-right' ||
        activeAnchor === 'bottom-left' ||
        activeAnchor === 'bottom-right';

      // Apply fixing for corner anchors (including groups)
      if (node && isCornerAnchor) {
        // For groups use clientRect, for single nodes — width/height
        const isGroup = node instanceof Konva.Group;
        let width: number;
        let height: number;
        let localX = 0;
        let localY = 0;

        if (isGroup) {
          // For groups use clientRect, for single nodes — width/height
          const clientRect = node.getClientRect({
            skipTransform: true,
            skipShadow: true,
            skipStroke: false,
          });
          width = clientRect.width;
          height = clientRect.height;
          localX = clientRect.x;
          localY = clientRect.y;
        } else {
          // For single nodes use width/height
          width = node.width();
          height = node.height();
        }

        const absTransform = node.getAbsoluteTransform();

        // Determine the local coordinates of the opposite corner
        let oppositeX = 0;
        let oppositeY = 0;

        if (activeAnchor === 'top-left') {
          oppositeX = localX + width;
          oppositeY = localY + height;
        } else if (activeAnchor === 'top-right') {
          oppositeX = localX;
          oppositeY = localY + height;
        } else if (activeAnchor === 'bottom-right') {
          oppositeX = localX;
          oppositeY = localY;
        } else {
          // bottom-left
          oppositeX = localX + width;
          oppositeY = localY;
        }

        // Convert to absolute coordinates
        this._transformOppositeCorner = absTransform.point({ x: oppositeX, y: oppositeY });
      } else {
        // For side anchors do not fix the angle
        this._transformOppositeCorner = null;
      }
    });
    transformer.on('transform.keepratio', updateKeepRatio);

    transformer.on('transform.corner-sync', () => {
      // «Incorporate» non-uniform scaling into width/height for Rect,
      const n = this._selected?.getNode() as unknown as Konva.Node | undefined;
      if (n) {
        this._bakeRectScale(n);

        // Correct the node position to keep the opposite angle in place
        if (this._transformOppositeCorner) {
          const activeAnchor =
            typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
          const absTransform = n.getAbsoluteTransform();

          // For groups use clientRect, for single nodes use width/height
          const isGroup = n instanceof Konva.Group;
          let width: number;
          let height: number;
          let localX = 0;
          let localY = 0;

          if (isGroup) {
            // For groups use clientRect, for single nodes use width/height
            const clientRect = n.getClientRect({
              skipTransform: true,
              skipShadow: true,
              skipStroke: false,
            });
            width = clientRect.width;
            height = clientRect.height;
            localX = clientRect.x;
            localY = clientRect.y;
          } else {
            // For single nodes use width/height
            width = n.width();
            height = n.height();
          }

          // Determine the local coordinates of the opposite corner
          let oppositeX = 0;
          let oppositeY = 0;

          if (activeAnchor === 'top-left') {
            oppositeX = localX + width;
            oppositeY = localY + height;
          } else if (activeAnchor === 'top-right') {
            oppositeX = localX;
            oppositeY = localY + height;
          } else if (activeAnchor === 'bottom-right') {
            oppositeX = localX;
            oppositeY = localY;
          } else if (activeAnchor === 'bottom-left') {
            oppositeX = localX + width;
            oppositeY = localY;
          }

          // Current absolute position of the opposite corner
          const currentOpposite = absTransform.point({ x: oppositeX, y: oppositeY });

          // Calculate the offset
          const dx = this._transformOppositeCorner.x - currentOpposite.x;
          const dy = this._transformOppositeCorner.y - currentOpposite.y;

          // Correct the node position in local coordinates of the parent
          const parent = n.getParent();
          if (parent && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
            const parentInv = parent.getAbsoluteTransform().copy().invert();
            const currentPosAbs = n.getAbsolutePosition();
            const newPosAbs = { x: currentPosAbs.x + dx, y: currentPosAbs.y + dy };
            const newPosLocal = parentInv.point(newPosAbs);
            n.position(newPosLocal);
          }
        }
      }
      this._restyleSideAnchors();
      // OPTIMIZATION: use debounced UI update
      this._scheduleUIUpdate();
      // Temporary group: update rotation handles position
      this._updateTempRotateHandlesPosition();
      this._core?.nodes.layer.batchDraw();
    });
    transformer.on('transformend.corner-sync', () => {
      // Reset the flag suppressing corner-radius handlers and saved angle
      this._cornerHandlesSuppressed = false;
      this._transformOppositeCorner = null;
      this._restyleSideAnchors();
      // OPTIMIZATION: use debounced UI update
      this._scheduleUIUpdate();
      this._core?.nodes.layer.batchDraw();
    });
    // Listen to attribute changes of the selected node, if size/position changes programmatically
    const selNode = this._selected.getNode() as unknown as Konva.Node;
    // Remove previous handlers if any, then attach new ones with namespace
    selNode.off('.overlay-sync');
    const syncOverlays = () => {
      this._restyleSideAnchors();
      // OPTIMIZATION: use debounced UI update
      this._scheduleUIUpdate();
      this._scheduleBatchDraw();
    };
    selNode.on(
      'widthChange.overlay-sync heightChange.overlay-sync scaleXChange.overlay-sync scaleYChange.overlay-sync rotationChange.overlay-sync xChange.overlay-sync yChange.overlay-sync',
      syncOverlays,
    );
    this._scheduleBatchDraw();
  }

  // Restyle side-anchors (top/right/bottom/left) to fill the side of the selected node
  private _restyleSideAnchors() {
    if (!this._core || !this._selected || !this._transformer) return;
    const node = this._selected.getNode() as unknown as Konva.Node;
    restyleSideAnchorsUtil(this._core, this._transformer, node);
  }

  // ===================== Rotate Handles (four corners) =====================
  private _setupRotateHandles() {
    if (!this._core || !this._selected) return;
    const layer = this._core.nodes.layer;
    this._destroyRotateHandles();
    const group = new Konva.Group({ name: 'rotate-handles-group', listening: true });
    layer.add(group);
    group.moveToTop();
    this._rotateHandlesGroup = group;
    const tl = makeRotateHandle('rotate-tl');
    const tr = makeRotateHandle('rotate-tr');
    const br = makeRotateHandle('rotate-br');
    const bl = makeRotateHandle('rotate-bl');
    // Add one by one to exclude runtime/type issues with varargs
    group.add(tl);
    group.add(tr);
    group.add(br);
    group.add(bl);
    this._rotateHandles = { tl, tr, br, bl };

    const bindRotate = (h: Konva.Circle) => {
      h.on('dragstart.rotate', () => {
        if (!this._selected) return;
        const node = this._selected.getNode() as unknown as Konva.Node;
        const dec = node.getAbsoluteTransform().decompose();
        const center = this._getNodeCenterAbs(node);
        this._rotateCenterAbsStart = center;
        const p = this._core?.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const start = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
        this._rotateDragState = { base: dec.rotation || 0, start };
        // Save the current state of stage.draggable before disabling
        if (this._core) this._prevStageDraggableBeforeRotate = this._core.stage.draggable();
        // Disable drag on the stage and the node
        if (typeof node.draggable === 'function') node.draggable(false);
        this._core?.stage.draggable(false);
        // Cursor: show 'grabbing' during rotation
        if (this._core) this._core.stage.container().style.cursor = 'grabbing';
      });
      h.on('dragmove.rotate', (e: Konva.KonvaEventObject<DragEvent>) => {
        if (!this._core || !this._selected || !this._rotateDragState) return;
        const node = this._selected.getNode() as unknown as Konva.Node;
        // Use fixed center if available to prevent drift
        const centerRef = this._rotateCenterAbsStart ?? this._getNodeCenterAbs(node);
        const pointer = this._core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const curr = (Math.atan2(pointer.y - centerRef.y, pointer.x - centerRef.x) * 180) / Math.PI;
        let rot = this._rotateDragState.base + (curr - this._rotateDragState.start);
        // Snapping as in Transformer, but with correct angle normalization
        const norm = (deg: number) => {
          let x = deg % 360;
          if (x < 0) x += 360;
          return x;
        };
        const angDiff = (a: number, b: number) => {
          // minimum signed difference between a and b modulo 360 in range [-180, 180)
          let d = norm(a - b + 180) - 180;
          return d;
        };
        // Snap only when Shift is pressed. Free rotation without Shift
        if (e.evt.shiftKey) {
          const tr = this._transformer;
          let snaps: number[] | undefined;
          let tol = 5;
          if (tr) {
            const s = tr.rotationSnaps();
            if (Array.isArray(s)) snaps = s.map((v) => norm(v));
            const t = tr.rotationSnapTolerance();
            if (typeof t === 'number') tol = t;
          }
          if (snaps?.length) {
            const rotN = norm(rot);
            let best = rot;
            let bestDiff = Infinity;
            for (const a of snaps) {
              const d = Math.abs(angDiff(rotN, a));
              if (d < bestDiff && d <= tol) {
                best = a; // use normalized snap angle
                bestDiff = d;
              }
            }
            if (bestDiff !== Infinity) rot = best;
          }
        }
        node.rotation(rot);
        // Compensation for position: keep the center unchanged
        if (this._rotateCenterAbsStart) {
          const centerAfter = this._getNodeCenterAbs(node);
          const dxAbs = this._rotateCenterAbsStart.x - centerAfter.x;
          const dyAbs = this._rotateCenterAbsStart.y - centerAfter.y;
          const parent = node.getParent();
          if (parent) {
            const inv = parent.getAbsoluteTransform().copy().invert();
            const from = inv.point({ x: centerAfter.x, y: centerAfter.y });
            const to = inv.point({ x: centerAfter.x + dxAbs, y: centerAfter.y + dyAbs });
            const nx = node.x() + (to.x - from.x);
            const ny = node.y() + (to.y - from.y);
            if (typeof node.position === 'function') node.position({ x: nx, y: ny });
          }
        }
        this._transformer?.forceUpdate();
        this._restyleSideAnchors();
        this._core.nodes.layer.batchDraw();
        // OPTIMIZATION: use debounced UI update
        this._scheduleUIUpdate();
      });
      h.on('dragend.rotate', () => {
        this._rotateDragState = null;
        this._rotateCenterAbsStart = null;
        // Restore scene pan, draggable node — according to settings
        if (this._selected) {
          const node = this._selected.getNode() as unknown as Konva.Node;
          if (this._options.dragEnabled && typeof node.draggable === 'function') {
            node.draggable(true);
          }
        }
        // Restore previous state of stage.draggable instead of unconditional true
        if (this._core && this._prevStageDraggableBeforeRotate !== null) {
          this._core.stage.draggable(this._prevStageDraggableBeforeRotate);
          this._prevStageDraggableBeforeRotate = null;
        }
        // Final recalculation of custom middle‑handlers
        this._restyleSideAnchors();
        // OPTIMIZATION: use debounced UI update
        this._scheduleUIUpdate();
        this._core?.nodes.layer.batchDraw();
        // Restore cursor to 'grab' after rotation handler drag end
        if (this._core) this._core.stage.container().style.cursor = 'grab';
      });
    };

    bindRotate(tl);
    bindRotate(tr);
    bindRotate(br);
    bindRotate(bl);

    // Hover cursors for rotation handles
    const setCursor = (c: string) => {
      if (this._core) this._core.stage.container().style.cursor = c;
    };
    if (this._rotateHandles.tl) {
      this._rotateHandles.tl.on('mouseenter.rotate-cursor', () => {
        setCursor('pointer');
      });
      this._rotateHandles.tl.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.tr) {
      this._rotateHandles.tr.on('mouseenter.rotate-cursor', () => {
        setCursor('pointer');
      });
      this._rotateHandles.tr.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.br) {
      this._rotateHandles.br.on('mouseenter.rotate-cursor', () => {
        setCursor('pointer');
      });
      this._rotateHandles.br.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.bl) {
      this._rotateHandles.bl.on('mouseenter.rotate-cursor', () => {
        setCursor('pointer');
      });
      this._rotateHandles.bl.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }

    this._updateRotateHandlesPosition();
  }

  private _destroyRotateHandles() {
    if (this._rotateHandlesGroup) {
      this._rotateHandlesGroup.destroy();
      this._rotateHandlesGroup = null;
    }
    this._rotateHandles = { tl: null, tr: null, br: null, bl: null };
    this._rotateDragState = null;
  }

  private _getNodeCenterAbs(node: Konva.Node) {
    const tr = node.getAbsoluteTransform().copy();
    const local = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: false });
    return tr.point({ x: local.x + local.width / 2, y: local.y + local.height / 2 });
  }

  private _updateRotateHandlesPosition() {
    if (!this._core || !this._selected || !this._rotateHandlesGroup) return;
    const node = this._selected.getNode() as unknown as Konva.Node;
    const local = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: false });
    const width = local.width;
    const height = local.height;
    if (width <= 0 || height <= 0) return;
    const tr = node.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);
    const offset = 12;
    const centerAbs = mapAbs({ x: local.x + width / 2, y: local.y + height / 2 });
    const c0 = mapAbs({ x: local.x, y: local.y });
    const c1 = mapAbs({ x: local.x + width, y: local.y });
    const c2 = mapAbs({ x: local.x + width, y: local.y + height });
    const c3 = mapAbs({ x: local.x, y: local.y + height });
    const dir = (c: { x: number; y: number }) => {
      const vx = c.x - centerAbs.x;
      const vy = c.y - centerAbs.y;
      const len = Math.hypot(vx, vy) || 1;
      return { x: vx / len, y: vy / len };
    };
    const d0 = dir(c0),
      d1 = dir(c1),
      d2 = dir(c2),
      d3 = dir(c3);
    const p0 = { x: c0.x + d0.x * offset, y: c0.y + d0.y * offset };
    const p1 = { x: c1.x + d1.x * offset, y: c1.y + d1.y * offset };
    const p2 = { x: c2.x + d2.x * offset, y: c2.y + d2.y * offset };
    const p3 = { x: c3.x + d3.x * offset, y: c3.y + d3.y * offset };

    if (this._rotateHandles.tl) this._rotateHandles.tl.absolutePosition(p0);
    if (this._rotateHandles.tr) this._rotateHandles.tr.absolutePosition(p1);
    if (this._rotateHandles.br) this._rotateHandles.br.absolutePosition(p2);
    if (this._rotateHandles.bl) this._rotateHandles.bl.absolutePosition(p3);

    const parent = this._rotateHandlesGroup.getParent();
    if (parent) {
      const pd = parent.getAbsoluteTransform().decompose();
      const invX = 1 / (Math.abs(pd.scaleX) || 1);
      const invY = 1 / (Math.abs(pd.scaleY) || 1);
      if (this._rotateHandles.tl) this._rotateHandles.tl.scale({ x: invX, y: invY });
      if (this._rotateHandles.tr) this._rotateHandles.tr.scale({ x: invX, y: invY });
      if (this._rotateHandles.br) this._rotateHandles.br.scale({ x: invX, y: invY });
      if (this._rotateHandles.bl) this._rotateHandles.bl.scale({ x: invX, y: invY });
    }
    this._rotateHandlesGroup.moveToTop();
  }

  // ===================== Size Label (width × height) =====================
  private _setupSizeLabel() {
    if (!this._core || !this._selected) return;
    const layer = this._core.nodes.layer;
    this._destroySizeLabel();
    const label = new Konva.Label({ listening: false, opacity: 0.95 });
    const tag = new Konva.Tag({
      fill: '#2b83ff',
      cornerRadius: 4,
      shadowColor: '#000',
      shadowBlur: 6,
      shadowOpacity: 0.25,
    } as Konva.TagConfig);
    const text = new Konva.Text({
      text: '',
      fontFamily: 'Inter, Calibri, Arial, sans-serif',
      fontSize: 12,
      padding: 4,
      fill: '#ffffff',
    } as Konva.TextConfig);
    label.add(tag);
    label.add(text);
    layer.add(label);
    this._sizeLabel = label;
    this._updateSizeLabel();
  }

  // OPTIMIZATION: Debounced UI update
  private _scheduleUIUpdate() {
    this._uiUpdateDebounce.schedule(() => {
      this._updateSizeLabel();
      this._updateRotateHandlesPosition();
      this._updateCornerRadiusHandlesPosition();
    });
  }

  private _updateSizeLabel() {
    if (!this._core || !this._selected || !this._sizeLabel) return;
    const node = this._selected.getNode();
    const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
    const localRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const nodeDec = node.getAbsoluteTransform().decompose();
    const worldDec = this._core.nodes.world.getAbsoluteTransform().decompose();
    const nodeAbsX = Math.abs(nodeDec.scaleX) || 1;
    const nodeAbsY = Math.abs(nodeDec.scaleY) || 1;
    const worldAbsX = Math.abs(worldDec.scaleX) || 1;
    const worldAbsY = Math.abs(worldDec.scaleY) || 1;
    const logicalW = localRect.width * (nodeAbsX / worldAbsX);
    const logicalH = localRect.height * (nodeAbsY / worldAbsY);
    const w = Math.max(0, Math.round(logicalW));
    const h = Math.max(0, Math.round(logicalH));

    const text = this._sizeLabel.getText();
    text.text(String(w) + ' × ' + String(h));

    const offset = 8;
    const centerX = bbox.x + bbox.width / 2;
    const bottomY = bbox.y + bbox.height + offset;

    const labelRect = this._sizeLabel.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const labelW = labelRect.width;
    this._sizeLabel.absolutePosition({ x: centerX, y: bottomY });
    this._sizeLabel.offsetX(labelW / 2);
    this._sizeLabel.offsetY(0);
    const parent = this._sizeLabel.getParent();
    if (parent) {
      const pDec = parent.getAbsoluteTransform().decompose();
      const invScaleX = 1 / (Math.abs(pDec.scaleX) || 1);
      const invScaleY = 1 / (Math.abs(pDec.scaleY) || 1);
      this._sizeLabel.scale({ x: invScaleX, y: invScaleY });
    }
    this._sizeLabel.moveToTop();
    if (this._transformer) this._transformer.moveToTop();
    if (this._cornerHandlesGroup) this._cornerHandlesGroup.moveToTop();
  }

  private _destroySizeLabel() {
    if (this._sizeLabel) {
      this._sizeLabel.destroy();
      this._sizeLabel = null;
    }
  }

  // ===================== Corner Radius Handles =====================
  private _isCornerRadiusSupported(konvaNode: Konva.Node): konvaNode is Konva.Rect {
    return konvaNode instanceof Konva.Rect;
  }

  private _getCornerRadiusArray(konvaNode: Konva.Rect): [number, number, number, number] {
    const val = konvaNode.cornerRadius();
    if (Array.isArray(val)) {
      const [tl = 0, tr = 0, br = 0, bl = 0] = val;
      return [tl || 0, tr || 0, br || 0, bl || 0];
    }
    const num = typeof val === 'number' ? val : 0;
    return [num, num, num, num];
  }

  private _setCornerRadiusArray(konvaNode: Konva.Rect, arr: [number, number, number, number]) {
    const [a, b, c, d] = arr;
    if (a === b && b === c && c === d) {
      konvaNode.cornerRadius(a);
    } else {
      konvaNode.cornerRadius(arr);
    }
  }

  private _setupCornerRadiusHandles(showCornerPerimeters = false) {
    if (!this._core || !this._selected) return;
    const node = this._selected.getNode() as unknown as Konva.Node;
    if (!this._isCornerRadiusSupported(node)) return;

    const layer = this._core.nodes.layer;
    const stage = this._core.stage;

    // Снести предыдущие
    this._destroyCornerRadiusHandles();

    const group = new Konva.Group({ name: 'corner-radius-handles-group', listening: true });
    layer.add(group);
    group.moveToTop();
    group.visible(false);
    this._cornerHandlesGroup = group;

    node.off('.cornerRadiusHover');
    node.on('mouseenter.cornerRadiusHover', () => {
      if (!this._core || !this._cornerHandlesGroup) return;
      const world = this._core.nodes.world;
      const currentZoom = world.scaleX();
      if (currentZoom < 0.3) return;
      this._cornerHandlesGroup.visible(true);
    });
    node.on('mouseleave.cornerRadiusHover', () => {
      if (!this._cornerHandlesGroup) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        this._cornerHandlesGroup.visible(false);
        return;
      }
      const shapes = layer.getIntersection(pointer);
      if (shapes && this._cornerHandlesGroup.isAncestorOf(shapes)) {
        return;
      }
      this._cornerHandlesGroup.visible(false);
    });

    group.on('mouseenter.cornerRadiusHover', () => {
      if (!this._core || !this._cornerHandlesGroup) return;
      const world = this._core.nodes.world;
      const currentZoom = world.scaleX();
      if (currentZoom < 0.3) return;
      this._cornerHandlesGroup.visible(true);
    });
    group.on('mouseleave.cornerRadiusHover', () => {
      if (this._cornerHandlesGroup) this._cornerHandlesGroup.visible(false);
    });

    const pointer = stage.getPointerPosition();
    if (pointer) {
      const world = this._core.nodes.world;
      const currentZoom = world.scaleX();
      if (currentZoom >= 0.3) {
        const shapes = layer.getIntersection(pointer);
        if (shapes && (shapes === node || node.isAncestorOf(shapes))) {
          this._cornerHandlesGroup.visible(true);
        }
      }
    }

    const computeCornerSquares = () => {
      const width = node.width();
      const height = node.height();

      const absScale = node.getAbsoluteScale();
      const invX = 1 / (Math.abs(absScale.x) || 1);
      const invY = 1 / (Math.abs(absScale.y) || 1);
      const ox = 12 * invX;
      const oy = 12 * invY;

      const dxToCenter = Math.max(0, width / 2 - ox);
      const dyToCenter = Math.max(0, height / 2 - oy);
      const side = Math.min(dxToCenter, dyToCenter);

      return {
        tl: { corner: { x: ox, y: oy }, sign: { x: 1, y: 1 }, side },
        tr: { corner: { x: width - ox, y: oy }, sign: { x: -1, y: 1 }, side },
        br: { corner: { x: width - ox, y: height - oy }, sign: { x: -1, y: -1 }, side },
        bl: { corner: { x: ox, y: height - oy }, sign: { x: 1, y: -1 }, side },
      } as const;
    };

    const snapToCornerDiagonal = (absPos: Konva.Vector2d, key: 'tl' | 'tr' | 'br' | 'bl') => {
      const nodeAbsT = node.getAbsoluteTransform().copy();
      const toLocal = (p: Konva.Vector2d) => nodeAbsT.copy().invert().point(p);
      const toAbs = (p: Konva.Vector2d) => nodeAbsT.point(p);

      const squares = computeCornerSquares();
      const s = squares[key];

      const pL = toLocal(absPos);
      const dx = pL.x - s.corner.x;
      const dy = pL.y - s.corner.y;

      let t = (s.sign.x * dx + s.sign.y * dy) / 2;
      t = Math.max(0, Math.min(s.side, t));

      const snappedLocal: Konva.Vector2d = {
        x: s.corner.x + s.sign.x * t,
        y: s.corner.y + s.sign.y * t,
      };
      const snappedAbs = toAbs(snappedLocal) as Konva.Vector2d;
      return { snappedAbs, r: t, meta: s };
    };

    const makeSquare = (name: string): Konva.Line =>
      new Konva.Line({
        name,
        points: [],
        stroke: showCornerPerimeters ? '#4a90e2' : '',
        strokeWidth: showCornerPerimeters ? 1 : 0,
        dash: showCornerPerimeters ? [4, 4] : [],
        closed: true,
        listening: false,
      });

    const sqTL = makeSquare('corner-square-tl');
    const sqTR = makeSquare('corner-square-tr');
    const sqBR = makeSquare('corner-square-br');
    const sqBL = makeSquare('corner-square-bl');
    group.add(sqTL, sqTR, sqBR, sqBL);

    // ===== Хэндлеры =====
    const makeHandle = (name: string): Konva.Circle => {
      const handle = new Konva.Circle({
        name,
        radius: 4,
        fill: '#ffffff',
        stroke: '#4a90e2',
        strokeWidth: 1.5,
        draggable: true,
        dragOnTop: true,
        hitStrokeWidth: 16,
      });
      handle.on('mouseenter.corner-radius', () => {
        if (this._core) this._core.stage.container().style.cursor = 'default';
      });
      return handle;
    };

    const tl = makeHandle('corner-radius-tl');
    const tr = makeHandle('corner-radius-tr');
    const br = makeHandle('corner-radius-br');
    const bl = makeHandle('corner-radius-bl');
    group.add(tl, tr, br, bl);
    this._cornerHandles = { tl, tr, br, bl };

    type Key = 'tl' | 'tr' | 'br' | 'bl';
    const keyToIndex: Record<Key, 0 | 1 | 2 | 3> = { tl: 0, tr: 1, br: 2, bl: 3 };
    let routeEnabled = false;
    let routeActive: Key | null = null;
    let lastAltOnly = false;

    const getCenterAbs = () => {
      const absT = node.getAbsoluteTransform().copy();
      const w = node.width();
      const h = node.height();
      return absT.point({ x: w / 2, y: h / 2 });
    };

    const getAllHandleAbs = () => {
      const res: Partial<Record<Key, Konva.Vector2d>> = {};
      if (this._cornerHandles.tl) res.tl = this._cornerHandles.tl.getAbsolutePosition();
      if (this._cornerHandles.tr) res.tr = this._cornerHandles.tr.getAbsolutePosition();
      if (this._cornerHandles.br) res.br = this._cornerHandles.br.getAbsolutePosition();
      if (this._cornerHandles.bl) res.bl = this._cornerHandles.bl.getAbsolutePosition();
      return res;
    };

    const isNearCenterPoint = (p: Konva.Vector2d, epsPx = 8) => {
      const c = getCenterAbs();
      return Math.hypot(p.x - c.x, p.y - c.y) <= epsPx;
    };
    const isNearCenterLine = (p: Konva.Vector2d, epsPx = 6) => {
      const c = getCenterAbs();
      return Math.min(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) <= epsPx;
    };
    const anyHandlesOverlapNear = (start: Konva.Vector2d, epsPx = 8) => {
      const all = getAllHandleAbs();
      let countNear = 0;
      (['tl', 'tr', 'br', 'bl'] as Key[]).forEach((k) => {
        const hp = all[k];
        if (hp && Math.hypot(hp.x - start.x, hp.y - start.y) <= epsPx) countNear++;
      });
      return countNear >= 2;
    };

    const pickRouteByAbsPos = (posAbs: Konva.Vector2d) => {
      if (!routeEnabled || routeActive) return;
      const c = getCenterAbs();
      let vx = posAbs.x - c.x,
        vy = posAbs.y - c.y;
      const mag = Math.hypot(vx, vy);
      if (mag < 0.1) return;
      vx /= mag;
      vy /= mag;

      const absT = node.getAbsoluteTransform().copy();
      const squares = computeCornerSquares();
      const diag: Record<Key, { x: number; y: number }> = (
        ['tl', 'tr', 'br', 'bl'] as Key[]
      ).reduce(
        (acc, k) => {
          const s = squares[k];
          const cornerAbs = absT.point(s.corner);
          const dx = cornerAbs.x - c.x;
          const dy = cornerAbs.y - c.y;
          const len = Math.hypot(dx, dy) || 1;
          acc[k] = { x: dx / len, y: dy / len };
          return acc;
        },
        {} as Record<Key, { x: number; y: number }>,
      );

      let best: Key = 'tl',
        bestDot = -Infinity;
      (['tl', 'tr', 'br', 'bl'] as Key[]).forEach((k) => {
        const d = diag[k];
        const dot = vx * d.x + vy * d.y;
        if (dot > bestDot) {
          bestDot = dot;
          best = k;
        }
      });
      routeActive = best;
    };

    const makeBound = (defKey: Key) => (pos: Konva.Vector2d) => {
      pickRouteByAbsPos(pos);
      const key = routeActive ?? defKey;

      const { snappedAbs, r: t, meta: s } = snapToCornerDiagonal(pos, key);

      const w = node.width();
      const hgt = node.height();
      const maxR = Math.max(0, Math.min(w, hgt) / 2);
      const percent = s.side > 0 ? t / s.side : 0;
      let rPix = Math.round(percent * maxR);
      rPix = Math.max(0, Math.min(rPix, maxR));

      const arr = this._getCornerRadiusArray(node);
      const idx = keyToIndex[key];
      if (lastAltOnly) {
        arr[idx] = rPix;
      } else {
        arr[0] = rPix;
        arr[1] = rPix;
        arr[2] = rPix;
        arr[3] = rPix;
      }
      this._setCornerRadiusArray(node, arr);

      this._showRadiusLabelForCorner(idx);
      updatePositions();
      this._core?.nodes.layer.batchDraw();

      return snappedAbs;
    };

    tl.dragBoundFunc(makeBound('tl'));
    tr.dragBoundFunc(makeBound('tr'));
    br.dragBoundFunc(makeBound('br'));
    bl.dragBoundFunc(makeBound('bl'));

    const updatePositions = () => {
      const { tl, tr, br, bl } = this._cornerHandles;
      if (!tl || !tr || !br || !bl) return;

      if (this._cornerHandlesSuppressed) {
        this._cornerHandlesGroup?.visible(false);
        this._radiusLabel?.visible(false);
        return;
      }
      if (this._core && this._cornerHandlesGroup && this._radiusLabel) {
        const world = this._core.nodes.world;
        const currentZoom = world.scaleX();
        if (currentZoom < 0.3) {
          this._cornerHandlesGroup.visible(false);
          this._radiusLabel.visible(false);
          return;
        }
        this._cornerHandlesGroup.visible(true);
      }

      const nodeAbsT = node.getAbsoluteTransform().copy();
      const layerInvAbsT = layer.getAbsoluteTransform().copy().invert();
      const toAbs = (p: { x: number; y: number }) => nodeAbsT.point(p);
      const toLayer = (p: { x: number; y: number }) => layerInvAbsT.point(nodeAbsT.point(p));

      const squares = computeCornerSquares();
      const radii = this._getCornerRadiusArray(node);

      const placeHandle = (key: Key, idx: 0 | 1 | 2 | 3, h: Konva.Circle) => {
        const s = squares[key];
        const w = node.width();
        const hgt = node.height();
        const maxR = Math.max(0, Math.min(w, hgt) / 2);

        const rPix = Math.max(0, Math.min(maxR, radii[idx] || 0));
        const percent = maxR > 0 ? rPix / maxR : 0;
        const t = Math.max(0, Math.min(s.side, percent * s.side));

        const pLocal = {
          x: s.corner.x + s.sign.x * t,
          y: s.corner.y + s.sign.y * t,
        };
        h.absolutePosition(toAbs(pLocal));
      };

      const placeSquare = (key: Key, line: Konva.Line) => {
        const s = squares[key];
        const c = s.corner;
        const e = { x: s.corner.x + s.sign.x * s.side, y: s.corner.y + s.sign.y * s.side };

        const p1 = toLayer({ x: c.x, y: c.y });
        const p2 = toLayer({ x: e.x, y: c.y });
        const p3 = toLayer({ x: e.x, y: e.y });
        const p4 = toLayer({ x: c.x, y: e.y });

        line.points([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y]);
      };

      placeSquare('tl', sqTL);
      placeSquare('tr', sqTR);
      placeSquare('br', sqBR);
      placeSquare('bl', sqBL);

      placeHandle('tl', 0, tl);
      placeHandle('tr', 1, tr);
      placeHandle('br', 2, br);
      placeHandle('bl', 3, bl);

      const grpParent = this._cornerHandlesGroup?.getParent();
      if (grpParent) {
        const pd = grpParent.getAbsoluteTransform().decompose();
        const invX = 1 / (Math.abs(pd.scaleX) || 1);
        const invY = 1 / (Math.abs(pd.scaleY) || 1);
        tl.scale({ x: invX, y: invY });
        tr.scale({ x: invX, y: invY });
        br.scale({ x: invX, y: invY });
        bl.scale({ x: invX, y: invY });
      }
      this._cornerHandlesGroup?.moveToTop();
    };
    this._updateCornerRadiusHandlesPosition = updatePositions;

    const onDragStartRoute = (h: Konva.Circle, ev?: Konva.KonvaEventObject<DragEvent>) => {
      lastAltOnly = !!(ev?.evt as MouseEvent | undefined)?.altKey;
      const startAbs = h.getAbsolutePosition();
      routeEnabled =
        isNearCenterPoint(startAbs, 8) ||
        isNearCenterLine(startAbs, 6) ||
        anyHandlesOverlapNear(startAbs, 8);

      routeActive = null;

      if (routeEnabled) {
        const p = this._core?.stage.getPointerPosition() ?? startAbs;
        pickRouteByAbsPos(p);
      }
    };

    const dragHandler =
      (_defaultKey: Key, _defaultIndex: 0 | 1 | 2 | 3) =>
      (e: Konva.KonvaEventObject<DragEvent>) => {
        lastAltOnly = (e.evt as MouseEvent).altKey;
      };

    const dragEndReset = () => {
      routeEnabled = false;
      routeActive = null;
      lastAltOnly = false;
    };

    tl.on('dragstart.corner-radius', (ev) => {
      onDragStartRoute(tl, ev);
    });
    tr.on('dragstart.corner-radius', (ev) => {
      onDragStartRoute(tr, ev);
    });
    br.on('dragstart.corner-radius', (ev) => {
      onDragStartRoute(br, ev);
    });
    bl.on('dragstart.corner-radius', (ev) => {
      onDragStartRoute(bl, ev);
    });

    tl.on('dragmove.corner-radius', dragHandler('tl', 0));
    tr.on('dragmove.corner-radius', dragHandler('tr', 1));
    br.on('dragmove.corner-radius', dragHandler('br', 2));
    bl.on('dragmove.corner-radius', dragHandler('bl', 3));

    tl.on('dragend.corner-radius', dragEndReset);
    tr.on('dragend.corner-radius', dragEndReset);
    br.on('dragend.corner-radius', dragEndReset);
    bl.on('dragend.corner-radius', dragEndReset);

    const showRadius = (cornerIndex: 0 | 1 | 2 | 3) => () => {
      this._showRadiusLabelForCorner(cornerIndex);
    };
    const hideRadius = () => {
      this._hideRadiusLabel();
    };
    const updateDuringDrag = (cornerIndex: 0 | 1 | 2 | 3) => () => {
      this._showRadiusLabelForCorner(cornerIndex);
    };

    tl.on('mouseenter.corner-radius', showRadius(0));
    tr.on('mouseenter.corner-radius', showRadius(1));
    br.on('mouseenter.corner-radius', showRadius(2));
    bl.on('mouseenter.corner-radius', showRadius(3));
    tl.on('mouseleave.corner-radius', hideRadius);
    tr.on('mouseleave.corner-radius', hideRadius);
    br.on('mouseleave.corner-radius', hideRadius);
    bl.on('mouseleave.corner-radius', hideRadius);

    tl.on('dragstart.corner-radius', showRadius(0));
    tr.on('dragstart.corner-radius', showRadius(1));
    br.on('dragstart.corner-radius', showRadius(2));
    bl.on('dragstart.corner-radius', showRadius(3));
    tl.on('dragmove.corner-radius', updateDuringDrag(0));
    tr.on('dragmove.corner-radius', updateDuringDrag(1));
    br.on('dragmove.corner-radius', updateDuringDrag(2));
    bl.on('dragmove.corner-radius', updateDuringDrag(3));
    tl.on('dragend.corner-radius', hideRadius);
    tr.on('dragend.corner-radius', hideRadius);
    br.on('dragend.corner-radius', hideRadius);
    bl.on('dragend.corner-radius', hideRadius);

    const onDown = () => {
      if (!this._selected) return;
      const n = this._selected.getNode() as unknown as Konva.Node;
      n.draggable(false);
    };
    const onUp = () => {
      if (!this._selected) return;
      const n = this._selected.getNode() as unknown as Konva.Node;
      if (this._options.dragEnabled) n.draggable(true);
    };
    tl.on('mousedown.corner-radius touchstart.corner-radius', onDown);
    tr.on('mousedown.corner-radius touchstart.corner-radius', onDown);
    br.on('mousedown.corner-radius touchstart.corner-radius', onDown);
    bl.on('mousedown.corner-radius touchstart.corner-radius', onDown);
    tl.on('mouseup.corner-radius touchend.corner-radius', onUp);
    tr.on('mouseup.corner-radius touchend.corner-radius', onUp);
    br.on('mouseup.corner-radius touchend.corner-radius', onUp);
    bl.on('mouseup.corner-radius touchend.corner-radius', onUp);

    const ns = '.corner-squares';
    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      Konva.Util.requestAnimFrame(() => {
        pending = false;
        updatePositions();
        this._core?.nodes.layer.batchDraw();
      });
    };
    stage.on(
      [
        'wheel',
        'resize',
        'xChange',
        'yChange',
        'positionChange',
        'scaleXChange',
        'scaleYChange',
        'scaleChange',
      ]
        .map((e) => e + ns)
        .join(' '),
      schedule,
    );
    layer.on(
      ['xChange', 'yChange', 'positionChange', 'scaleXChange', 'scaleYChange', 'scaleChange']
        .map((e) => e + ns)
        .join(' '),
      schedule,
    );
    node.on(
      [
        'dragmove',
        'transform',
        'xChange',
        'yChange',
        'widthChange',
        'heightChange',
        'rotationChange',
        'scaleXChange',
        'scaleYChange',
        'positionChange',
        'scaleChange',
      ]
        .map((e) => e + ns)
        .join(' '),
      schedule,
    );
    if (this._transformer) {
      this._transformer.on('transformstart' + ns, () => {
        this._cornerHandlesSuppressed = true;
        this._cornerHandlesGroup?.visible(false);
        this._hideRadiusLabel();
        this._core?.nodes.layer.batchDraw();
      });
      this._transformer.on('transform' + ns, () => {
        updatePositions();
        this._core?.nodes.layer.batchDraw();
      });
      this._transformer.on('transformend' + ns, () => {
        this._cornerHandlesSuppressed = false;
        schedule();
      });
    }
    group.on('destroy' + ns, () => {
      stage.off(ns);
      layer.off(ns);
      node.off(ns);
      this._transformer?.off(ns);
    });

    // Инициализация
    updatePositions();
    layer.batchDraw();
  }

  private _destroyCornerRadiusHandles() {
    if (this._cornerHandlesGroup) {
      this._cornerHandlesGroup.destroy();
      this._cornerHandlesGroup = null;
    }
    this._cornerHandles = { tl: null, tr: null, br: null, bl: null };
    if (this._core) this._core.stage.container().style.cursor = 'default';
    this._destroyRadiusLabel();
    if (this._selected) {
      const n = this._selected.getNode() as unknown as Konva.Node;
      n.off('.overlay-sync');
    }
  }

  private _bakeRectScale(node: Konva.Node) {
    if (!(node instanceof Konva.Rect)) return;
    const sx = node.scaleX();
    const sy = node.scaleY();
    if (sx === 1 && sy === 1) return;
    const absBefore = node.getAbsolutePosition();
    const w = node.width();
    const h = node.height();
    const nx = Math.abs(sx) * w;
    const ny = Math.abs(sy) * h;
    node.width(nx);
    node.height(ny);
    node.scaleX(1);
    node.scaleY(1);
    node.setAbsolutePosition(absBefore);
  }

  private _updateCornerRadiusHandlesPosition() {
    if (!this._core || !this._selected || !this._cornerHandlesGroup) return;
    const nodeRaw = this._selected.getNode() as unknown as Konva.Node;
    if (!this._isCornerRadiusSupported(nodeRaw)) return;
    const node = nodeRaw;

    const local = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
    const width = local.width;
    const height = local.height;
    if (width <= 0 || height <= 0) return;

    const tr = node.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);

    const absScale = node.getAbsoluteScale();
    const invX = 1 / (Math.abs(absScale.x) || 1);
    const invY = 1 / (Math.abs(absScale.y) || 1);
    const offXLocal = 12 * invX;
    const offYLocal = 12 * invY;

    const radii = this._getCornerRadiusArray(node);
    const maxR = Math.min(width, height) / 2 || 1;
    const normalize = (v: { x: number; y: number }) => {
      const len = Math.hypot(v.x, v.y) || 1;
      return { x: v.x / len, y: v.y / len };
    };
    const dirLocal = [
      normalize({ x: width / 2 - offXLocal, y: height / 2 - offYLocal }), // tl -> center
      normalize({ x: -(width / 2 - offXLocal), y: height / 2 - offYLocal }), // tr -> center
      normalize({ x: -(width / 2 - offXLocal), y: -(height / 2 - offYLocal) }), // br -> center
      normalize({ x: width / 2 - offXLocal, y: -(height / 2 - offYLocal) }), // bl -> center
    ] as const;

    const p0 = mapAbs({
      x: local.x + offXLocal + dirLocal[0].x * Math.min(maxR, radii[0]),
      y: local.y + offYLocal + dirLocal[0].y * Math.min(maxR, radii[0]),
    });
    const p1 = mapAbs({
      x: local.x + width - offXLocal + dirLocal[1].x * Math.min(maxR, radii[1]),
      y: local.y + offYLocal + dirLocal[1].y * Math.min(maxR, radii[1]),
    });
    const p2 = mapAbs({
      x: local.x + width - offXLocal + dirLocal[2].x * Math.min(maxR, radii[2]),
      y: local.y + height - offYLocal + dirLocal[2].y * Math.min(maxR, radii[2]),
    });
    const p3 = mapAbs({
      x: local.x + offXLocal + dirLocal[3].x * Math.min(maxR, radii[3]),
      y: local.y + height - offYLocal + dirLocal[3].y * Math.min(maxR, radii[3]),
    });

    if (this._cornerHandles.tl) this._cornerHandles.tl.absolutePosition(p0);
    if (this._cornerHandles.tr) this._cornerHandles.tr.absolutePosition(p1);
    if (this._cornerHandles.br) this._cornerHandles.br.absolutePosition(p2);
    if (this._cornerHandles.bl) this._cornerHandles.bl.absolutePosition(p3);

    const grpParent = this._cornerHandlesGroup.getParent();
    if (grpParent) {
      const pd = grpParent.getAbsoluteTransform().decompose();
      const invPX = 1 / (Math.abs(pd.scaleX) || 1);
      const invPY = 1 / (Math.abs(pd.scaleY) || 1);
      if (this._cornerHandles.tl) this._cornerHandles.tl.scale({ x: invPX, y: invPY });
      if (this._cornerHandles.tr) this._cornerHandles.tr.scale({ x: invPX, y: invPY });
      if (this._cornerHandles.br) this._cornerHandles.br.scale({ x: invPX, y: invPY });
      if (this._cornerHandles.bl) this._cornerHandles.bl.scale({ x: invPX, y: invPY });
    }
    this._cornerHandlesGroup.moveToTop();
  }

  private _updateCornerRadiusHandlesVisibility() {
    if (!this._core || !this._selected || !this._cornerHandlesGroup) return;

    const world = this._core.nodes.world;
    const currentZoom = world.scaleX();
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const node = this._selected.getNode() as unknown as Konva.Node;

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      if (currentZoom < 0.3) {
        this._cornerHandlesGroup.visible(false);
      }
      return;
    }

    // Проверяем зум
    if (currentZoom < 0.3) {
      // При малом зуме всегда скрываем
      this._cornerHandlesGroup.visible(false);
      return;
    }

    const shapes = layer.getIntersection(pointer);
    if (shapes) {
      const isOverNode = shapes === node || node.isAncestorOf(shapes);
      const isOverHandles = this._cornerHandlesGroup.isAncestorOf(shapes);

      if (isOverNode || isOverHandles) {
        this._cornerHandlesGroup.visible(true);
      } else {
        this._cornerHandlesGroup.visible(false);
      }
    } else {
      this._cornerHandlesGroup.visible(false);
    }
  }

  private _ensureRadiusLabel(): Konva.Label | null {
    if (!this._core) return null;
    if (this._radiusLabel) return this._radiusLabel;
    const layer = this._core.nodes.layer;
    const label = new Konva.Label({ listening: false, opacity: 0.95 });
    const tag = new Konva.Tag({
      fill: '#2b83ff',
      cornerRadius: 4,
      shadowColor: '#000',
      shadowBlur: 6,
      shadowOpacity: 0.25,
    } as Konva.TagConfig);
    const text = new Konva.Text({
      text: '',
      fontFamily: 'Inter, Calibri, Arial, sans-serif',
      fontSize: 12,
      padding: 4,
      fill: '#ffffff',
    } as Konva.TextConfig);
    label.add(tag);
    label.add(text);
    label.visible(false);
    layer.add(label);
    this._radiusLabel = label;
    return label;
  }

  private _updateRadiusLabelAt(absPt: { x: number; y: number }, textStr: string) {
    const lbl = this._ensureRadiusLabel();
    if (!lbl) return;
    const text = lbl.getText();
    text.text(textStr);
    const labelRect = lbl.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const labelW = labelRect.width;
    const offset = { x: 8, y: 8 };
    lbl.absolutePosition({ x: absPt.x - offset.x, y: absPt.y + offset.y });
    lbl.offsetX(labelW);
    lbl.offsetY(0);
    const parent = lbl.getParent();
    if (parent) {
      const pDec = parent.getAbsoluteTransform().decompose();
      const invScaleX = 1 / (Math.abs(pDec.scaleX) || 1);
      const invScaleY = 1 / (Math.abs(pDec.scaleY) || 1);
      lbl.scale({ x: invScaleX, y: invScaleY });
    }
    lbl.visible(true);
    lbl.moveToTop();
    if (this._transformer) this._transformer.moveToTop();
  }

  private _showRadiusLabelForCorner(cornerIndex: 0 | 1 | 2 | 3) {
    if (!this._core || !this._selected) return;
    const nodeRaw = this._selected.getNode() as unknown as Konva.Node;
    if (!this._isCornerRadiusSupported(nodeRaw)) return;
    const node = nodeRaw;
    const radii = this._getCornerRadiusArray(node);
    const r = Math.round(radii[cornerIndex]);
    const handle =
      cornerIndex === 0
        ? this._cornerHandles.tl
        : cornerIndex === 1
          ? this._cornerHandles.tr
          : cornerIndex === 2
            ? this._cornerHandles.br
            : this._cornerHandles.bl;
    if (!handle) return;
    const p = handle.getAbsolutePosition();
    this._updateRadiusLabelAt(p, 'Radius ' + String(r));
  }

  private _hideRadiusLabel() {
    if (this._radiusLabel) this._radiusLabel.visible(false);
  }

  private _destroyRadiusLabel() {
    if (this._radiusLabel) {
      this._radiusLabel.destroy();
      this._radiusLabel = null;
    }
  }

  // ===================== Helpers =====================
  private _findBaseNodeByTarget(target: Konva.Node): BaseNode | null {
    if (!this._core) return null;
    if (this._selected) {
      const selectedKonva = this._selected.getNode() as unknown as Konva.Node;
      if (selectedKonva === target) return this._selected;
      if (typeof selectedKonva.isAncestorOf === 'function' && selectedKonva.isAncestorOf(target)) {
        return this._selected;
      }
    }
    let topMostAncestor: BaseNode | null = null;
    for (const n of this._core.nodes.list()) {
      const node = n.getNode() as unknown as Konva.Node;
      if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(target)) {
        let isTopMost = true;
        for (const other of this._core.nodes.list()) {
          if (other === n) continue;
          const otherNode = other.getNode() as unknown as Konva.Node;
          if (typeof otherNode.isAncestorOf === 'function' && otherNode.isAncestorOf(node)) {
            isTopMost = false;
            break;
          }
        }
        if (isTopMost) {
          topMostAncestor = n;
        }
      }
    }
    if (topMostAncestor) return topMostAncestor;

    for (const n of this._core.nodes.list()) {
      if (n.getNode() === target) return n;
    }
    return null;
  }

  private _onNodeRemoved = (removed: BaseNode) => {
    if (this._selected && this._selected === removed) {
      this._clearSelection();
    }
  };
}
