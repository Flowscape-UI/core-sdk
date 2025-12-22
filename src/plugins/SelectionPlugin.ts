import Konva from 'konva';

import { VideoOverlayAddon, type VideoOverlayAddonOptions } from '../addons/VideoOverlayAddon';
import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import { FrameNode } from '../nodes/FrameNode';
import { DebounceHelper } from '../utils/DebounceHelper';
import { MultiGroupController } from '../utils/MultiGroupController';
import {
  getLocalRectForNode,
  getResizeReferencePoint,
  restyleSideAnchorsForTr as restyleSideAnchorsUtil,
} from '../utils/OverlayAnchors';
import { OverlayFrameManager } from '../utils/OverlayFrameManager';
import { makeRotateHandle } from '../utils/RotateHandleFactory';
import { ThrottleHelper } from '../utils/ThrottleHelper';

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

  // Enable DOM video controls overlay for VideoNode on selection
  enableVideoOverlay?: boolean | VideoOverlayAddonOptions;
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
  // True while Transformer-based resize/transform is active (not node drag)
  private _isTransforming = false;
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
  // Handler for FrameNode children changes (enter/leave), used to adjust
  // selection/drag state when frames become non-empty or empty again.
  // Stored as a generic (...args) handler to satisfy the loosely-typed
  // eventBus.on/off signatures.
  private _onFrameChildrenChangedBound: ((...args: unknown[]) => void) | null = null;
  private _onFrameLabelClickedBound: ((...args: unknown[]) => void) | null = null;

  // Minimal hover frame (blue border on hover)
  private _hoverTr: Konva.Transformer | null = null;
  private _isPointerDown = false;

  // Auto-pan world when dragging near screen edges
  private _autoPanRafId: number | null = null;
  private _autoPanActive = false;
  private _autoPanEdgePx: number; // edge zone width (px)
  private _autoPanMaxSpeedPx: number; // max auto-pan speed in px/frame
  private _draggingNode: Konva.Node | null = null; // current node being dragged

  // Temp-multi: while transforming overlay group we must keep initial transform in sync with auto-pan
  private _tempMultiTransformingGroup: Konva.Group | null = null;

  // --- Proportional resize with Shift for corner handles ---
  private _ratioKeyPressed = false;
  private _onGlobalKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onGlobalKeyUp: ((e: KeyboardEvent) => void) | null = null;

  // Temporary multi-group (Shift+Click) - overlay-only approach
  private _tempMultiSet = new Set<BaseNode>();
  // Overlay-only: list of nodes in temporary multi-selection (no reparenting)
  private _tempMultiNodes: Konva.Node[] = [];
  // Store initial absolute transforms for matrix-based transformations
  private _tempMultiInitialTransforms = new Map<Konva.Node, Konva.Transform>();
  private _tempMultiGroup: Konva.Group | null = null;
  private _tempOverlay: OverlayFrameManager | null = null;

  /**
   * Public readonly access to the currently selected BaseNode
   * (or null if there is no selection). Mutable selection logic
   * still lives inside SelectionPlugin; this method is used only
   * for safe inspection from other plugins.
   */
  public getSelected(): BaseNode | null {
    return this._selected;
  }

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
          const pos = world.position();
          this._core.eventBus.emit('camera:pan', {
            dx: -vx,
            dy: -vy,
            position: { x: pos.x, y: pos.y },
          });
          // If auto-pan is running during Transformer-based resize, keep the saved
          // reference point in sync with the world shift. Otherwise corner-sync will
          // start compensating position and cause jumps.
          if (this._isTransforming && this._transformOppositeCorner) {
            this._transformOppositeCorner = {
              x: this._transformOppositeCorner.x - vx,
              y: this._transformOppositeCorner.y - vy,
            };
          }

          // Temp-multi overlay resize uses its own transformer (OverlayFrameManager) and its own
          // delta math based on overlayInitialTransform. Auto-pan changes world transform, so we need
          // to keep both the overlay reference point and overlayInitialTransform consistent.
          if (this._tempMultiTransformingGroup && this._tempOverlay) {
            this._tempOverlay.shiftTransformReferencePoint(-vx, -vy);
          }
          // Compensation for dragged node: keep under cursor
          if (this._draggingNode && typeof this._draggingNode.setAbsolutePosition === 'function') {
            const abs = this._draggingNode.getAbsolutePosition();
            this._draggingNode.setAbsolutePosition({ x: abs.x + vx, y: abs.y + vy });
            this._transformer?.forceUpdate();
          }

          if (this._isTransforming) {
            const p = stage.getPointerPosition();
            if (p) {
              const c = stage.container();
              const r = c.getBoundingClientRect();
              try {
                c.dispatchEvent(
                  new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    clientX: r.left + p.x,
                    clientY: r.top + p.y,
                  }),
                );
              } catch {
                // ignore
              }
            }
          }

          // Same idea for temp-multi: keep transformer updating while pointer is at edge.
          if (this._tempMultiTransformingGroup) {
            const p = stage.getPointerPosition();
            if (p) {
              const c = stage.container();
              const r = c.getBoundingClientRect();
              try {
                c.dispatchEvent(
                  new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    clientX: r.left + p.x,
                    clientY: r.top + p.y,
                  }),
                );
              } catch {
                // ignore
              }
            }
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

    const userSelectablePredicate = selectablePredicate ?? (() => true);

    this._options = {
      dragEnabled,
      enableTransformer,
      deselectOnEmptyClick,
      selectablePredicate: (node: Konva.Node) => {
        if (!userSelectablePredicate(node)) return false;
        return this._isSelectableByFrameRules(node);
      },
      autoPanEnabled: options.autoPanEnabled ?? true,
      autoPanEdgePx: options.autoPanEdgePx ?? 40,
      autoPanMaxSpeedPx: options.autoPanMaxSpeedPx ?? 24,
      enableVideoOverlay: options.enableVideoOverlay ?? false,
    };

    if (options.enableVideoOverlay) {
      const addonOptions =
        typeof options.enableVideoOverlay === 'object' ? options.enableVideoOverlay : {};
      this.addons.add(new VideoOverlayAddon(addonOptions));
    }

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

  /**
   * Select a single node from area (lasso) selection, without creating temp-multi.
   * Used by AreaSelectionPlugin so that single-node selection (including FrameNode)
   * reuses the same transformer and resize logic as обычный клик.
   */
  public selectSingleFromArea(node: BaseNode): void {
    this._destroyTempMulti();
    this._select(node);
    this._scheduleBatchDraw();
  }

  /**
   * Clear current selection (single + temp-multi) when starting lasso
   * in special cases (e.g. inside FrameNode background) to mirror
   * behavior of clicking on empty space in world.
   */
  public clearSelectionFromAreaLasso(): void {
    this._destroyTempMulti();
    this._clearSelection();
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    // MultiGroupController will be lazily initialized in getMultiGroupController()

    // Attach handlers to stage (namespace .selection)
    const stage = core.stage;
    stage.on('mousedown.selection', this._onMouseDown);

    stage.on('click.selection', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      const stage = this._core.stage;
      const layer = this._core.nodes.layer;

      // Suppress first click immediately after lasso/marquee drag (AreaSelectionPlugin)
      // regardless of where it lands (empty stage, FrameNode background, etc.).
      // AreaSelectionPlugin sets stage._skipSelectionEmptyClickOnce when finishing
      // a non-trivial drag; here we consume that one click so it doesn't clear
      // or change selection in SelectionPlugin.
      const skipOnce = !!stage.getAttr('_skipSelectionEmptyClickOnce');
      if (skipOnce) {
        stage.setAttr('_skipSelectionEmptyClickOnce', false);
        e.cancelBubble = true;
        return;
      }

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
      if (!this._options.selectablePredicate(target)) {
        // Click on a node that is not selectable by current rules
        // should behave like click on empty space: clear selection
        if (this._options.deselectOnEmptyClick) {
          this._destroyTempMulti();
          this._clearSelection();
        }
        return;
      }

      // Shift+Click or Ctrl+Click: create temporary group (multi-selection)
      if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
        const base = this._findBaseNodeByTarget(target);

        if (!base) return;

        // If node is in a group, ignore (group protection),
        // НО: contentGroup FrameNode не считаем пользовательской группой, иначе
        // внутри фрейма полностью ломается мультивыделение по Shift+Click.
        const nodeKonva = base.getKonvaNode();
        const parent = nodeKonva.getParent();
        if (parent && parent instanceof Konva.Group) {
          const world = this._core.nodes.world;
          if (parent !== world) {
            // Проверим, не является ли parent contentGroup какого‑то FrameNode
            const frames = this._core.nodes.list().filter((bn) => bn instanceof FrameNode);
            const isFrameContentGroup = frames.some((fr) => {
              const cg = fr.getContentGroup();
              return cg === parent;
            });

            if (!isFrameContentGroup) {
              // Node in non-world, non-frame-content group - don't add to multi-selection
              return;
            }
          }
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
          const only: BaseNode | undefined = step.done ? undefined : step.value;
          if (only) {
            this._destroyTempMulti();
            this._select(only);
            this._scheduleBatchDraw();
          }
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

      const selectedNode = this._selected.getKonvaNode();
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
          const node = n.getKonvaNode() as unknown as Konva.Node;

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
                const otherNode = other.getKonvaNode() as unknown as Konva.Node;
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
        nextLevel ??= this._core.nodes.list().find((n) => n.getKonvaNode() === e.target) ?? null;

        if (nextLevel) {
          this._select(nextLevel);
          const node = nextLevel.getKonvaNode();
          // Enable dragging for selected node (never override FrameNode draggable)
          if (!(nextLevel instanceof FrameNode)) {
            if (
              typeof (node as unknown as { draggable?: (v: boolean) => boolean }).draggable ===
              'function'
            ) {
              (node as unknown as { draggable: (v: boolean) => boolean }).draggable(true);
            }
          }
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

      const parent = target.getParent();
      const getName = (n: Konva.Node | null) =>
        n && typeof (n as unknown as { name?: () => string }).name === 'function'
          ? (n as unknown as { name: () => string }).name() || ''
          : '';
      const targetName = getName(target);
      const parentName = getName(parent);
      if (targetName.startsWith('rotate-') || parentName === 'rotate-handles-group') return;

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

    // Следим за изменением состава детей во фреймах, чтобы, например, снять
    // выделение с фрейма, который стал непустым, и не оставлять его draggable.
    this._onFrameChildrenChangedBound = (frameRaw: unknown, hasChildrenRaw: unknown) => {
      const frame = frameRaw as FrameNode;
      const hasChildren = !!hasChildrenRaw;

      // Нас интересует только случай, когда выбран именно этот фрейм.
      if (!this._selected) return;
      if (this._selected !== frame) return;

      const node = this._selected.getKonvaNode();
      if (typeof node.draggable === 'function') {
        // Обновляем _prevDraggable перед _clearSelection, чтобы сохранить
        // актуальное значение, выставленное NodeManager (обычно false).
        this._prevDraggable = node.draggable();
      }

      // Как только во фрейме появляются дети, он больше не должен быть
      // напрямую selectable/dragable. Снимаем текущее выделение.
      if (hasChildren) {
        this._clearSelection();
      }
    };
    (
      core.eventBus as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on('frame:children-changed', this._onFrameChildrenChangedBound);

    this._onFrameLabelClickedBound = (frameRaw: unknown) => {
      const frame = frameRaw as FrameNode;
      this._destroyTempMulti();
      this._select(frame);
      this._scheduleBatchDraw();
    };
    (
      core.eventBus as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on('frame:label-clicked', this._onFrameLabelClickedBound);

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
    if (this._onFrameChildrenChangedBound) {
      (
        core.eventBus as unknown as {
          off: (event: string, handler: (...args: unknown[]) => void) => void;
        }
      ).off('frame:children-changed', this._onFrameChildrenChangedBound);
      this._onFrameChildrenChangedBound = null;
    }
    if (this._onFrameLabelClickedBound) {
      (
        core.eventBus as unknown as {
          off: (event: string, handler: (...args: unknown[]) => void) => void;
        }
      ).off('frame:label-clicked', this._onFrameLabelClickedBound);
      this._onFrameLabelClickedBound = null;
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
          const selKonva = this._selected.getKonvaNode() as unknown as Konva.Node;
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
                  // Для FrameNode draggable контролирует NodeManager, поэтому не включаем
                  // его здесь. Для остальных нод оставляем старое поведение.
                  if (!(this._selected instanceof FrameNode)) {
                    if (typeof dnode.draggable === 'function' && !prevNodeDraggable)
                      dnode.draggable(true);
                  }
                  selKonva.on('dragstart.selection-once-bbox', () => {
                    stage.draggable(false);
                  });
                  selKonva.on('dragend.selection-once-bbox', () => {
                    stage.draggable(prevStageDraggable);
                    if (!(this._selected instanceof FrameNode)) {
                      if (typeof dnode.draggable === 'function') {
                        dnode.draggable(this._options.dragEnabled ? true : prevNodeDraggable);
                      }
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
    // If target itself is not selectable (e.g. FrameNode background), but we already have
    // a selected node and click is inside its bbox, treat this like empty-area drag on
    // selected node: allow dragging selected node instead of doing nothing.
    if (!this._options.selectablePredicate(target)) {
      if (this._selected) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const selKonva = this._selected.getKonvaNode() as unknown as Konva.Node;
          const bbox = selKonva.getClientRect({ skipShadow: true, skipStroke: false });
          const inside =
            pos.x >= bbox.x &&
            pos.x <= bbox.x + bbox.width &&
            pos.y >= bbox.y &&
            pos.y <= bbox.y + bbox.height;
          if (inside && typeof selKonva.startDrag === 'function') {
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
                // Для FrameNode draggable контролирует NodeManager, поэтому не включаем
                // его здесь. Для остальных нод оставляем старое поведение.
                if (!(this._selected instanceof FrameNode)) {
                  if (typeof dnode.draggable === 'function' && !prevNodeDraggable)
                    dnode.draggable(true);
                }
                selKonva.on('dragstart.selection-once-bbox2', () => {
                  stage.draggable(false);
                });
                selKonva.on('dragend.selection-once-bbox2', () => {
                  stage.draggable(prevStageDraggable);
                  if (!(this._selected instanceof FrameNode)) {
                    if (typeof dnode.draggable === 'function') {
                      dnode.draggable(this._options.dragEnabled ? true : prevNodeDraggable);
                    }
                  }
                  if (this._selected) {
                    this._refreshTransformer();
                    this._core?.nodes.layer.batchDraw();
                  }
                  selKonva.off('.selection-once-bbox2');
                });
                selKonva.startDrag();
                e.cancelBubble = true;
              }
            };
            const onUp = () => {
              if (!dragStarted && this._options.deselectOnEmptyClick) this._clearSelection();
              stage.off('mousemove.selection-once-bbox2');
              stage.off('mouseup.selection-once-bbox2');
            };
            stage.on('mousemove.selection-once-bbox2', onMove);
            stage.on('mouseup.selection-once-bbox2', onUp);
          }
        }
      }
      return;
    }

    // Basic search (usually group)
    const foundBaseNode = this._findBaseNodeByTarget(target);
    if (!foundBaseNode) return;
    let baseNode = foundBaseNode;

    // If there's selection and click came inside already selected node — drag it
    const selected = this._selected;
    if (selected) {
      const selKonva = selected.getKonvaNode() as unknown as Konva.Node;
      const isAncestor = (a: Konva.Node, b: Konva.Node): boolean => {
        let cur: Konva.Node | null = b;
        while (cur) {
          if (cur === a) return true;
          cur = cur.getParent();
        }
        return false;
      };
      if (isAncestor(selKonva, target)) {
        baseNode = selected;
      }
      // Otherwise — remains group (baseNode found above)
    }

    // Start dragging immediately, without visual selection until drag ends
    const konvaNode = baseNode.getKonvaNode();
    if (konvaNode instanceof Konva.Group) {
      this._disableGroupChildrenDragging(konvaNode);
    }

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

    const isFrame = baseNode instanceof FrameNode;
    // Для FrameNode draggable контролирует NodeManager, поэтому в режиме
    // "startDragOnce" мы не включаем/выключаем draggable для фреймов.
    const hasDraggable = typeof konvaNode.draggable === 'function' && !isFrame;
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
    const konvaNode = node.getKonvaNode();
    this._prevDraggable = konvaNode.draggable();
    if (this._options.dragEnabled && typeof konvaNode.draggable === 'function') {
      konvaNode.draggable(true);
    }
    if (konvaNode instanceof Konva.Group) {
      this._disableGroupChildrenDragging(konvaNode);
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
    const node = this._selected.getKonvaNode();

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
  /**
   * Apply transformation from overlay group to actual nodes using matrix math.
   * Each node's transform is updated to match the overlay group's transformation,
   * while staying in its original parent.
   */
  private _applyOverlayTransformToNodes(
    overlayGroup: Konva.Group,
    overlayInitialTransform: Konva.Transform,
  ): void {
    if (!this._core) return;

    // Compute delta in WORLD-local coordinates so that camera pan/zoom doesn't leak into node transforms.
    // This is critical for temp-multi overlay because auto-pan changes world transform while resizing.
    const world = this._core.nodes.world;
    const worldAbsNow = world.getAbsoluteTransform().copy();
    const worldInvNow = worldAbsNow.copy().invert();

    // Compute delta: how overlay group transformed from initial state (WORLD-local)
    const overlayCurrentWorld = worldInvNow.multiply(overlayGroup.getAbsoluteTransform().copy());
    const overlayInitialWorldInv = overlayInitialTransform.copy();
    overlayInitialWorldInv.invert();
    const overlayDeltaWorld = overlayCurrentWorld.multiply(overlayInitialWorldInv);

    // Apply delta to each node
    for (const kn of this._tempMultiNodes) {
      const initialTransform = this._tempMultiInitialTransforms.get(kn);
      if (!initialTransform) continue;

      // Compute new WORLD-local transform: deltaWorld * initialWorld
      const newWorldTransform = overlayDeltaWorld.copy().multiply(initialTransform);
      // Back to ABS coordinates using current world transform
      const newAbsTransform = worldAbsNow.copy().multiply(newWorldTransform);

      // Convert to parent-local coordinates
      const parent = kn.getParent();
      if (!parent) continue;

      const parentAbs = parent.getAbsoluteTransform().copy();
      parentAbs.invert();
      const localTransform = parentAbs.multiply(newAbsTransform);
      const decomposed = localTransform.decompose();

      // Apply to node
      if (typeof (kn as { position?: (p: Konva.Vector2d) => void }).position === 'function') {
        (kn as { position: (p: Konva.Vector2d) => void }).position({
          x: decomposed.x,
          y: decomposed.y,
        });
      }
      if (typeof (kn as { rotation?: (r: number) => void }).rotation === 'function') {
        (kn as { rotation: (r: number) => void }).rotation(decomposed.rotation);
      }
      if (typeof (kn as { scale?: (s: Konva.Vector2d) => void }).scale === 'function') {
        (kn as { scale: (s: Konva.Vector2d) => void }).scale({
          x: decomposed.scaleX,
          y: decomposed.scaleY,
        });
      }
    }
  }

  /**
   * Update overlay group bbox to match current positions of selected nodes.
   * Must be called after drag/transform when nodes change position.
   */
  private _updateTempMultiOverlayBBox(): void {
    if (!this._core || !this._tempMultiGroup) return;

    // Get bbox in world-local coordinates
    const bbox = this._computeUnionBBox(Array.from(this._tempMultiSet));
    if (!bbox) return;

    // Update overlay group position (bbox is already in world-local coords)
    this._tempMultiGroup.position({ x: bbox.x, y: bbox.y });

    // Update rect size
    const rect = this._tempMultiGroup.findOne<Konva.Rect>('.temp-multi-overlay-rect');
    if (rect) {
      rect.size({ width: bbox.width, height: bbox.height });
    }
  }

  /**
   * Compute union bounding box for multiple nodes in world-local coordinates.
   * Used for overlay-only temporary multi-group.
   * Returns bbox that doesn't change when world transform (zoom/pan) changes.
   */
  private _computeUnionBBox(nodes: BaseNode[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (nodes.length === 0 || !this._core) return null;

    const world = this._core.nodes.world;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const bn of nodes) {
      const kn = bn.getKonvaNode() as unknown as Konva.Node;
      // Get bbox in absolute (canvas) coordinates
      const bboxAbs = kn.getClientRect({ skipShadow: true, skipStroke: false });

      // Convert all 4 corners from absolute to world-local coordinates
      const worldInv = world.getAbsoluteTransform().copy().invert();
      const corners = [
        worldInv.point({ x: bboxAbs.x, y: bboxAbs.y }),
        worldInv.point({ x: bboxAbs.x + bboxAbs.width, y: bboxAbs.y }),
        worldInv.point({ x: bboxAbs.x + bboxAbs.width, y: bboxAbs.y + bboxAbs.height }),
        worldInv.point({ x: bboxAbs.x, y: bboxAbs.y + bboxAbs.height }),
      ];

      // Find min/max in world-local space
      for (const corner of corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private _ensureTempMulti(nodes: BaseNode[]) {
    if (!this._core) return;
    const world = this._core.nodes.world;
    const layer = this._core.nodes.layer;

    // Fill set for correct size check on commit (important for lasso)
    // IMPORTANT: do not lose the set when we need to recreate overlay due to composition change
    this._tempMultiSet.clear();
    for (const b of nodes) this._tempMultiSet.add(b);

    // Compute list of Konva nodes
    const konvaNodes = nodes.map((b) => b.getKonvaNode() as unknown as Konva.Node);

    // Check if composition changed
    if (this._tempMultiGroup && this._tempMultiNodes.length > 0) {
      const same =
        this._tempMultiNodes.length === konvaNodes.length &&
        konvaNodes.every((n) => this._tempMultiNodes.includes(n));
      if (same) return; // No change in composition
      // Composition changed — destroy and recreate
      this._destroyTempMultiOverlayOnly();
      // Restore set because overlay-only destroy should not affect it, but keep it safe
      this._tempMultiSet.clear();
      for (const b of nodes) this._tempMultiSet.add(b);
    }

    // Compute union bounding box in world-local coordinates
    const bbox = this._computeUnionBBox(nodes);
    if (!bbox) return;

    // Store nodes list (without reparenting)
    this._tempMultiNodes = konvaNodes;

    // Create overlay group with invisible rect (bbox is already in world-local coords)
    const overlayGrp = new Konva.Group({
      name: 'temp-multi-overlay',
      x: bbox.x,
      y: bbox.y,
    });
    world.add(overlayGrp);
    this._tempMultiGroup = overlayGrp;

    // Create invisible rect at (0,0) inside group with bbox dimensions
    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: bbox.width,
      height: bbox.height,
      fill: 'rgba(0,0,0,0.001)', // almost invisible but participates in hit-test
      listening: false,
      name: 'temp-multi-overlay-rect',
    });
    overlayGrp.add(rect);

    // Attach OverlayFrameManager to show visual frame/transformer
    this._tempOverlay ??= new OverlayFrameManager(this._core);
    this._tempOverlay.attach(overlayGrp, { keepRatioCornerOnlyShift: () => this._ratioKeyPressed });
    this._tempOverlay.forceUpdate();

    // Enable dragging on overlay group
    const stage = this._core.stage;
    const prevStageDraggable = stage.draggable();
    overlayGrp.draggable(true);

    // Store initial transform of overlay group for matrix calculations
    let overlayInitialTransform: Konva.Transform | null = null;

    // Drag handlers
    overlayGrp.on('dragstart.tempMulti', () => {
      // Save initial transforms for all nodes
      this._tempMultiInitialTransforms.clear();
      const worldInvStart = this._core?.nodes.world.getAbsoluteTransform().copy().invert();
      for (const kn of this._tempMultiNodes) {
        if (worldInvStart) {
          const initialWorld = worldInvStart.copy().multiply(kn.getAbsoluteTransform().copy());
          this._tempMultiInitialTransforms.set(kn, initialWorld);
        } else {
          this._tempMultiInitialTransforms.set(kn, kn.getAbsoluteTransform().copy());
        }
      }
      overlayInitialTransform = worldInvStart
        ? worldInvStart.copy().multiply(overlayGrp.getAbsoluteTransform().copy())
        : overlayGrp.getAbsoluteTransform().copy();

      stage.draggable(false);
      this._draggingNode = overlayGrp;
      // Treat temp-multi drag the same as transform for auto-pan purposes,
      // so that auto-pan loop dispatches synthetic mousemove events and keeps
      // drag updates flowing even when the cursor is held at the edge.
      this._tempMultiTransformingGroup = overlayGrp;
      this._startAutoPanLoop();
      this._tempOverlay?.hideOverlaysForDrag();
    });

    overlayGrp.on('dragmove.tempMulti', () => {
      if (!overlayInitialTransform) return;
      // Apply overlay transformation to all nodes
      this._applyOverlayTransformToNodes(overlayGrp, overlayInitialTransform);

      // FRAME-SPECIFIC: во время drag временной группы сразу обновляем
      // принадлежность нод к FrameNode/миру, чтобы при пересечении границы
      // фрейма ноды визуально выходили из-под clip, а не "выныривали" только
      // на dragend. Вне FrameNode это никак не влияет.
      this._autogroupTempMultiInFrames();

      this._tempOverlay?.forceUpdate();
      this._scheduleBatchDraw();
    });
    // Rotation via OverlayFrameManager's RotateHandlesController does not
    // go through Konva.Transformer's transform events. Instead, the overlay
    // group receives custom rotate:* events that we use to apply the same
    // matrix-based temp-multi transform logic.

    overlayGrp.on('rotate:start.tempMulti', () => {
      // Save initial transforms for all nodes, identical to transformstart
      this._tempMultiInitialTransforms.clear();
      const worldInvStart = this._core?.nodes.world.getAbsoluteTransform().copy().invert();
      for (const kn of this._tempMultiNodes) {
        if (worldInvStart) {
          const initialWorld = worldInvStart.copy().multiply(kn.getAbsoluteTransform().copy());
          this._tempMultiInitialTransforms.set(kn, initialWorld);
        } else {
          this._tempMultiInitialTransforms.set(kn, kn.getAbsoluteTransform().copy());
        }
      }
      overlayInitialTransform = worldInvStart
        ? worldInvStart.copy().multiply(overlayGrp.getAbsoluteTransform().copy())
        : overlayGrp.getAbsoluteTransform().copy();

      // During rotation we explicitly do NOT start auto-pan loop — rotating
      // should not move the camera automatically.
    });

    overlayGrp.on('rotate:move.tempMulti', () => {
      if (!overlayInitialTransform) return;
      this._applyOverlayTransformToNodes(overlayGrp, overlayInitialTransform);
      this._tempOverlay?.forceUpdate();
      this._scheduleBatchDraw();
    });

    overlayGrp.on('rotate:end.tempMulti', () => {
      // Reuse the same finalize logic as for resize: emit node:transformed,
      // normalize overlay transform, recompute bbox and reattach overlay.
      overlayGrp.fire('transformend.tempMulti');
    });

    overlayGrp.on('dragend.tempMulti', () => {
      stage.draggable(prevStageDraggable);
      this._draggingNode = null;
      this._stopAutoPanLoop();
      this._tempMultiTransformingGroup = null;
      this._tempOverlay?.restoreOverlaysAfterDrag();

      // Reset overlay transform to avoid accumulation between operations
      overlayGrp.scale({ x: 1, y: 1 });
      overlayGrp.rotation(0);
      overlayGrp.skew({ x: 0, y: 0 });

      // Emit node:transformed for each node
      if (this._core) {
        const world = this._core.nodes.world;
        const worldInvTransform = world.getAbsoluteTransform().copy().invert();
        for (const baseNode of this._tempMultiSet) {
          const konvaNode = baseNode.getKonvaNode() as unknown as Konva.Node;
          const absTransform = konvaNode.getAbsoluteTransform().copy();
          const localTransform = worldInvTransform.copy().multiply(absTransform);
          const d = localTransform.decompose();
          this._core.eventBus.emit('node:transformed', baseNode, {
            x: d.x,
            y: d.y,
            rotation: d.rotation,
            scaleX: d.scaleX,
            scaleY: d.scaleY,
          });
        }

        // FRAME-SPECIFIC: после окончания drag временной группы повторяем для
        // каждого её участника автогруппировку по FrameNode аналогично
        // NodeManager._attachFrameAutogroupHandlers — ноды, центр которых
        // оказался внутри фрейма, попадают в его contentGroup, а покинувшие
        // фрейм возвращаются в world. Остальное поведение world не трогаем.
        this._autogroupTempMultiInFrames();
      }

      // Update overlay bbox to match new node positions (after reset transform)
      this._updateTempMultiOverlayBBox();

      this._tempMultiInitialTransforms.clear();
      this._tempMultiTransformingGroup = null;
      this._stopAutoPanLoop();
      this._tempOverlay?.forceUpdate();
      this._scheduleBatchDraw();
    });

    // Transform handlers
    overlayGrp.on('transformstart.tempMulti', () => {
      // Save initial transforms for all nodes
      this._tempMultiInitialTransforms.clear();
      const worldInvStart = this._core?.nodes.world.getAbsoluteTransform().copy().invert();
      for (const kn of this._tempMultiNodes) {
        if (worldInvStart) {
          const initialWorld = worldInvStart.copy().multiply(kn.getAbsoluteTransform().copy());
          this._tempMultiInitialTransforms.set(kn, initialWorld);
        } else {
          this._tempMultiInitialTransforms.set(kn, kn.getAbsoluteTransform().copy());
        }
      }
      overlayInitialTransform = worldInvStart
        ? worldInvStart.copy().multiply(overlayGrp.getAbsoluteTransform().copy())
        : overlayGrp.getAbsoluteTransform().copy();

      // Enable resize auto-pan for temp multi as well
      this._tempMultiTransformingGroup = overlayGrp;
      this._startAutoPanLoop();
    });

    overlayGrp.on('transform.tempMulti', () => {
      if (!overlayInitialTransform) return;
      // Apply overlay transformation to all nodes
      this._applyOverlayTransformToNodes(overlayGrp, overlayInitialTransform);
      this._tempOverlay?.forceUpdate();
      this._scheduleBatchDraw();
    });

    overlayGrp.on('transformend.tempMulti', () => {
      // Emit node:transformed for each node
      if (this._core) {
        const world = this._core.nodes.world;
        const worldInvTransform = world.getAbsoluteTransform().copy().invert();
        for (const baseNode of this._tempMultiSet) {
          const konvaNode = baseNode.getKonvaNode() as unknown as Konva.Node;
          const absTransform = konvaNode.getAbsoluteTransform().copy();
          const localTransform = worldInvTransform.copy().multiply(absTransform);
          const d = localTransform.decompose();
          this._core.eventBus.emit('node:transformed', baseNode, {
            x: d.x,
            y: d.y,
            rotation: d.rotation,
            scaleX: d.scaleX,
            scaleY: d.scaleY,
          });
        }
      }

      // IMPORTANT (temp-multi only): Transformer finalizes geometry on transformend.
      // If we immediately reset overlayGrp transform and recompute bbox while the Transformer is still attached,
      // frame may jump (especially on shrink). Detach overlays first, then normalize in the next frame.
      const overlayRef = this._tempOverlay;
      overlayRef?.detach();

      // Reset overlay transform to avoid accumulation between operations
      globalThis.requestAnimationFrame(() => {
        if (!this._core) return;
        if (!this._tempMultiGroup || this._tempMultiGroup !== overlayGrp) return;

        overlayGrp.scale({ x: 1, y: 1 });
        overlayGrp.rotation(0);
        overlayGrp.skew({ x: 0, y: 0 });

        // Update overlay bbox to match new node positions (after reset transform)
        this._updateTempMultiOverlayBBox();

        // Re-attach overlay manager
        const mgr = overlayRef ?? (this._tempOverlay ??= new OverlayFrameManager(this._core));
        mgr.attach(overlayGrp, { keepRatioCornerOnlyShift: () => this._ratioKeyPressed });
        mgr.forceUpdate();
        this._scheduleBatchDraw();
      });

      overlayInitialTransform = null;
      this._tempMultiInitialTransforms.clear();
      this._tempMultiTransformingGroup = null;
      this._stopAutoPanLoop();
      this._tempOverlay?.forceUpdate();
      this._scheduleBatchDraw();
    });

    layer.batchDraw();

    // Event: temporary multi-selection created
    this._core.eventBus.emit('selection:multi:created', nodes);
  }

  private _destroyTempMultiOverlayOnly() {
    if (!this._core) return;
    if (!this._tempMultiGroup) return;

    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }

    this._tempMultiGroup.off('.tempMulti');
    this._tempMultiGroup.destroy();
    this._tempMultiGroup = null;

    this._tempMultiNodes = [];
    this._tempMultiInitialTransforms.clear();

    this._core.nodes.layer.batchDraw();

    this._core.eventBus.emit('selection:multi:destroyed');
  }

  private _destroyTempMulti() {
    if (!this._core) return;
    if (!this._tempMultiGroup && this._tempMultiSet.size === 0) return;

    // Detach overlay manager (removes transformer/label/rotate/hit)
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }

    // Destroy overlay group (no children to reparent back)
    if (this._tempMultiGroup) {
      this._tempMultiGroup.off('.tempMulti');
      this._tempMultiGroup.destroy();
      this._tempMultiGroup = null;
    }

    // Clear state
    this._tempMultiNodes = [];
    this._tempMultiInitialTransforms.clear();
    this._tempMultiSet.clear();

    this._core.nodes.layer.batchDraw();

    // Event: temporary multi-selection destroyed
    this._core.eventBus.emit('selection:multi:destroyed');
  }

  /**
   * FRAME-SPECIFIC: автогруппировка для временной multi-группы.
   * Для каждой ноды из tempMultiSet повторяет логику
   * NodeManager._attachFrameAutogroupHandlers:
   * - если нода была внутри FrameNode и вышла за его пределы, возвращаем её в world;
   * - если нода была в world и её центр оказался внутри фрейма, переносим в contentGroup.
   * Поведение вне FrameNode остаётся без изменений.
   */
  private _autogroupTempMultiInFrames() {
    if (!this._core) return;
    if (this._tempMultiSet.size === 0) return;

    const nm = this._core.nodes;
    const world = nm.world;

    const frames = nm.list().filter((n): n is FrameNode => n instanceof FrameNode);
    if (frames.length === 0) return;

    for (const baseNode of this._tempMultiSet) {
      if (baseNode instanceof FrameNode) continue;

      const kn = baseNode.getKonvaNode();
      let currentParent = kn.getParent();
      if (!currentParent) continue;

      // Определяем, находится ли нода уже внутри какого-либо фрейма
      let currentFrame: FrameNode | null = null;
      outerCurrent: for (const frame of frames) {
        let parent: Konva.Node | null = currentParent;
        const contentGroup = frame.getContentGroup();
        while (parent && parent !== world) {
          if (parent === contentGroup) {
            currentFrame = frame;
            break outerCurrent;
          }
          parent = parent.getParent();
        }
      }

      // Ищем фрейм под центром ноды (по финальному bbox после drag)
      let targetFrame: FrameNode | null = null;
      const bbox = kn.getClientRect({ skipShadow: true, skipStroke: true });
      const center = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
      };
      for (const frame of frames) {
        const rect = frame.getRect();
        const r = rect.getClientRect({ skipShadow: true, skipStroke: true });
        const inside =
          center.x >= r.x &&
          center.x <= r.x + r.width &&
          center.y >= r.y &&
          center.y <= r.y + r.height;
        if (inside) {
          targetFrame = frame;
          break;
        }
      }

      // Уже внутри какого-то фрейма
      if (currentFrame) {
        if (!targetFrame || targetFrame !== currentFrame) {
          // Покидаем фрейм -> возвращаем ноду в world
          const absPos = kn.getAbsolutePosition();
          world.add(kn as Konva.Shape | Konva.Group);
          kn.setAbsolutePosition(absPos);

          // Если во фрейме больше не осталось детей — разрешаем его drag/select по клику
          const contentGroup = currentFrame.getContentGroup();
          const hasChildren = contentGroup.getChildren().length > 0;
          const frameKn = currentFrame.getKonvaNode() as unknown as Konva.Node & {
            draggable?: (value?: boolean) => boolean;
          };
          if (typeof frameKn.draggable === 'function') {
            frameKn.draggable(!hasChildren);
          }
        }
        continue;
      }

      // Нода не во фрейме, но её центр внутри фрейма -> перемещаем в contentGroup
      if (targetFrame && currentParent !== targetFrame.getContentGroup()) {
        const absPos = kn.getAbsolutePosition();
        const contentGroup = targetFrame.getContentGroup();
        contentGroup.add(kn as unknown as Konva.Shape | Konva.Group);
        kn.setAbsolutePosition(absPos);

        // Как только во фрейме появляется хотя бы один ребёнок — запрещаем drag самого фрейма
        const hasChildren = contentGroup.getChildren().length > 0;
        const frameKn = targetFrame.getKonvaNode() as unknown as Konva.Node & {
          draggable?: (value?: boolean) => boolean;
        };
        if (typeof frameKn.draggable === 'function') {
          frameKn.draggable(!hasChildren);
        }
      }
    }
  }

  private _commitTempMultiToGroup() {
    if (!this._core) return;
    if (!this._tempMultiGroup || this._tempMultiSet.size < 2) return;
    const nodesArray = Array.from(this._tempMultiSet);
    const hasFrame = nodesArray.some((bn) => bn instanceof FrameNode);
    const hasNonFrame = nodesArray.some((bn) => !(bn instanceof FrameNode));
    if (hasFrame) {
      if (hasNonFrame) {
        // Attempt to group FrameNode together with non-frame nodes is forbidden
        globalThis.console.warn(
          '[SelectionPlugin] Grouping FrameNode with other nodes is not allowed. Operation is ignored.',
        );
      } else {
        // Attempt to group only FrameNode instances is also forbidden
        globalThis.console.warn(
          '[SelectionPlugin] Grouping FrameNode instances into a permanent group is not allowed. Operation is ignored.',
        );
      }
      return;
    }
    const nm = this._core.nodes;
    const world = nm.world;

    // Compute union bbox for positioning the new group
    const bbox = this._computeUnionBBox(nodesArray);
    if (!bbox) return;

    // FRAME-AWARE GROUPING:
    // If all nodes being grouped are currently inside the same FrameNode contentGroup,
    // we want the resulting permanent group to live inside that frame (logically and
    // structurally), not in the world. This keeps FrameNode non-selectable when it has
    // children and delegates selection/drag to the inner group, matching expected
    // behavior inside frames while leaving world behavior unchanged.

    // Detect common owning FrameNode (by walking parent chain up to world)
    const allFrames = nm.list().filter((bn) => bn instanceof FrameNode) as unknown as FrameNode[];

    let commonFrame: FrameNode | null = null;
    outerFrames: for (const bn of nodesArray) {
      const kn = bn.getKonvaNode() as unknown as Konva.Node;
      let frameForNode: FrameNode | null = null;
      let parent: Konva.Node | null = kn.getParent();
      while (parent && parent !== (world as unknown as Konva.Node)) {
        for (const fr of allFrames) {
          const contentGroup = fr.getContentGroup() as unknown as Konva.Node;
          if (parent === contentGroup) {
            frameForNode = fr;
            break;
          }
        }
        if (frameForNode) break;
        parent = parent.getParent();
      }

      // Node is not inside any frame contentGroup -> no common frame case
      if (!frameForNode) {
        commonFrame = null;
        break outerFrames;
      }

      if (!commonFrame) commonFrame = frameForNode;
      else if (commonFrame !== frameForNode) {
        // Nodes belong to different frames -> do not treat as frame-scoped grouping
        commonFrame = null;
        break outerFrames;
      }
    }

    const newGroup = nm.addGroup({ x: bbox.x, y: bbox.y, draggable: true });
    const g = newGroup.getKonvaNode() as unknown as Konva.Group;

    // If all nodes were inside a single frame, move the created group under that
    // frame's contentGroup while preserving absolute position. This keeps the
    // logical ownership of nodes inside the frame.
    if (commonFrame) {
      const abs = g.getAbsolutePosition();
      const contentGroup = commonFrame.getContentGroup() as unknown as Konva.Group;
      contentGroup.add(g as unknown as Konva.Group);
      g.setAbsolutePosition(abs);
    }
    const groupedBaseNodes: BaseNode[] = [];

    // Sort nodes by their current z-index to preserve relative render order
    const sortedNodes = [...this._tempMultiNodes].sort((a, b) => {
      return a.zIndex() - b.zIndex();
    });

    // Find the maximum z-index to position the group itself in the world
    const maxZIndex = Math.max(...sortedNodes.map((kn) => kn.zIndex()));

    for (const kn of sortedNodes) {
      const abs = kn.getAbsolutePosition();
      g.add(kn as unknown as Konva.Group | Konva.Shape);
      kn.setAbsolutePosition(abs);

      // Disable draggable on children (group handles drag now)
      if (
        typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
      )
        (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(false);

      // Collect BaseNodes corresponding to the Konva nodes
      const base = this._core.nodes
        .list()
        .find((b) => b.getKonvaNode() === (kn as unknown as Konva.Node));
      if (base) groupedBaseNodes.push(base);
    }

    // Position the group itself in the world with the correct z-index
    const currentGroupIndex = g.zIndex();
    const targetIndex = maxZIndex;

    if (currentGroupIndex < targetIndex) {
      const diff = targetIndex - currentGroupIndex;
      for (let i = 0; i < diff && g.zIndex() < world.children.length - 1; i++) {
        g.moveUp();
      }
    }

    // Detach overlay manager
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }
    // Destroy overlay group
    this._tempMultiGroup.off('.tempMulti');
    this._tempMultiGroup.destroy();
    this._tempMultiGroup = null;
    // Clear state
    this._tempMultiNodes = [];
    this._tempMultiSet.clear();

    // Explicitly enable draggable for the created group
    if (typeof g.draggable === 'function') g.draggable(true);

    // Event: group created
    this._core.eventBus.emit('group:created', newGroup as unknown as BaseNode, groupedBaseNodes);
    this._select(newGroup as unknown as BaseNode);
    this._core.stage.batchDraw();
  }

  private _tryUngroupSelectedGroup() {
    if (!this._core) return;
    if (!this._selected) return;
    const node = this._selected.getKonvaNode();
    if (!(node instanceof Konva.Group)) return;
    const children = [...node.getChildren()];
    const world = this._core.nodes.world;

    // FRAME-AWARE UNGROUP:
    // Если группа находится внутри contentGroup какого-либо FrameNode,
    // при расформировании возвращаем её детей в этот же contentGroup,
    // а не в world. Это сохраняет принадлежность нод фрейму и не делает
    // сам FrameNode вновь draggable. В world поведение остаётся прежним.
    const nm = this._core.nodes;
    const frames = nm.list().filter((n): n is FrameNode => n instanceof FrameNode);
    let parentFrame: FrameNode | null = null;
    if (frames.length > 0) {
      outerFrame: for (const frame of frames) {
        const contentGroup = frame.getContentGroup();
        let p: Konva.Node | null = node.getParent();
        while (p && p !== world) {
          if (p === contentGroup) {
            parentFrame = frame;
            break outerFrame;
          }
          p = p.getParent();
        }
      }
    }

    // Collect BaseNode references for ungrouped children (for event)
    const ungroupedBaseNodes: BaseNode[] = [];

    for (const kn of children) {
      // Save the full absolute transform of the child (position + scale + rotation)
      const absBefore = kn.getAbsoluteTransform().copy();

      // Move to target root: world (обычный случай) или frame contentGroup
      const targetRoot: Konva.Container = parentFrame ? parentFrame.getContentGroup() : world;
      targetRoot.add(kn as unknown as Konva.Group | Konva.Shape);

      // Calculate local transform equivalent to the previous absolute transform
      const rootAbs = targetRoot.getAbsoluteTransform().copy();
      rootAbs.invert();
      const local = rootAbs.multiply(absBefore);
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

      // Find BaseNode for this Konva node and enable draggable if it's not a FrameNode
      let isFrame = false;
      for (const bn of this._core.nodes.list()) {
        if (bn.getKonvaNode() === kn) {
          if (bn instanceof FrameNode) isFrame = true;
          ungroupedBaseNodes.push(bn);
          break;
        }
      }
      if (
        !isFrame &&
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

    // Event: group ungrouped (before removing the group)
    this._core.eventBus.emit('group:ungrouped', sel, ungroupedBaseNodes);

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

  /**
   * Frame-specific selectability rules for direct clicks/hover:
   * - If the owning BaseNode is a FrameNode and it has at least one child inside contentGroup,
   *   the frame is not directly selectable/hoverable (selection only via lasso).
   * - Empty frames and all other nodes remain selectable.
   */
  private _isSelectableByFrameRules(target: Konva.Node): boolean {
    // Try to map the visual target (or its ancestor) to a BaseNode
    const owner = this._findBaseNodeByTarget(target);
    if (!owner) return true;

    if (owner instanceof FrameNode) {
      const contentGroup = owner.getContentGroup();
      const hasChildren = contentGroup.getChildren().length > 0;
      // Non-empty frames are not directly selectable/hoverable by click; only via lasso
      return !hasChildren;
    }

    return true;
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
    const registeredArr = this._core.nodes
      .list()
      .map((n) => n.getKonvaNode() as unknown as Konva.Node);
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

    // SAFETY: мировое поведение оставляем как есть. Дополнительно обрабатываем
    // только случай, когда курсор внутри contentGroup какого‑то FrameNode:
    // там мы хотим применять те же правила выбора outermost группы, что и в
    // world, но при этом полностью исключить сам FrameNode из кандидатов.
    {
      const frameBaseNodes = this._core.nodes
        .list()
        .filter((bn): bn is FrameNode => bn instanceof FrameNode);
      let insideFrameContent = false;
      for (const frame of frameBaseNodes) {
        const contentGroup = frame.getContentGroup();
        if (
          target === contentGroup ||
          (typeof contentGroup.isAncestorOf === 'function' && contentGroup.isAncestorOf(target))
        ) {
          insideFrameContent = true;
          break;
        }
      }

      if (insideFrameContent) {
        // Построим отдельный набор зарегистрированных Konva-нодатель, в который
        // не попадают FrameNode. Для вложенных групп внутри фрейма это даст
        // тот же эффект, что и в world: hover по дочке будет подсвечивать
        // самую внешнюю (outermost) группу, но никогда не сам фрейм.
        const registeredNonFrameArr = this._core.nodes
          .list()
          .filter((bn) => !(bn instanceof FrameNode))
          .map((n) => n.getKonvaNode() as unknown as Konva.Node);
        const registeredNonFrame = new Set<Konva.Node>(registeredNonFrameArr);

        const findNearestRegisteredNonFrame = (start: Konva.Node): Konva.Node | null => {
          let cur: Konva.Node | null = start;
          while (cur) {
            if (registeredNonFrame.has(cur)) return cur;
            cur = cur.getParent();
          }
          return null;
        };

        const findNearestRegisteredGroupNonFrame = (start: Konva.Node): Konva.Node | null => {
          let cur: Konva.Node | null = start;
          let lastGroup: Konva.Node | null = null;
          while (cur) {
            if (registeredNonFrame.has(cur) && cur instanceof Konva.Group) {
              lastGroup = cur;
            }
            cur = cur.getParent();
          }
          return lastGroup;
        };

        const nonFrameGroup = findNearestRegisteredGroupNonFrame(target);
        const nonFrameNode = findNearestRegisteredNonFrame(target);
        owner = ctrlPressed ? (nonFrameNode ?? nonFrameGroup) : (nonFrameGroup ?? nonFrameNode);
      }
    }

    // Special rule (without Ctrl): if a NODE (not a group) is selected inside a group and hover over another node from the group — highlight this node specifically
    if (
      !ctrlPressed &&
      this._selected &&
      targetOwnerNode &&
      !(this._selected.getKonvaNode() instanceof Konva.Group)
    ) {
      const selectedNode = this._selected.getKonvaNode() as unknown as Konva.Node;
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
      const selectedNode = this._selected.getKonvaNode() as unknown as Konva.Node;
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
    transformer.nodes([this._selected.getKonvaNode() as unknown as Konva.Node]);
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
      // Mark transformer-based resize active (affects auto-pan and corner-sync logic)
      this._isTransforming = true;
      // Start auto-pan during resize
      this._startAutoPanLoop();

      // Save the absolute position of a reference point on the opposite corner/edge
      const node = this._selected?.getKonvaNode() as unknown as Konva.Node | undefined;
      const rawAnchor =
        typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
      const activeAnchor = rawAnchor ?? '';

      if (!node) {
        this._transformOppositeCorner = null;
        this._isTransforming = false;
        return;
      }

      const rect = getLocalRectForNode(node);
      const refPoint = getResizeReferencePoint(activeAnchor, rect);
      if (!refPoint) {
        this._transformOppositeCorner = null;
        this._isTransforming = false;
        return;
      }

      const absTransform = node.getAbsoluteTransform();
      this._transformOppositeCorner = absTransform.point({ x: refPoint.x, y: refPoint.y });
    });
    transformer.on('transform.keepratio', updateKeepRatio);

    transformer.on('transform.corner-sync', () => {
      // Для обычных нод: «Incorporate» non-uniform scaling into width/height for Rect.
      // Для FrameNode: изменяем только визуальный rect/clip, не трогая детей.
      const selected = this._selected;
      const n = selected?.getKonvaNode() as unknown as Konva.Node | undefined;
      if (n) {
        if (selected instanceof FrameNode) {
          const frame = selected;

          // Текущий масштаб группы (фрейма) после действия трансформера
          const sx = Math.abs((n as unknown as { scaleX?: () => number }).scaleX?.() ?? 1);
          const sy = Math.abs((n as unknown as { scaleY?: () => number }).scaleY?.() ?? 1);

          const rect = frame.getRect();
          const baseW = rect.width();
          const baseH = rect.height();

          const newW = baseW * sx;
          const newH = baseH * sy;

          // Меняем только размер фрейма и clip, дети не трогаются
          frame.resize(newW, newH);

          // Сбрасываем масштаб группы обратно в 1, чтобы дети не были заскейлены
          if (typeof (n as unknown as { scaleX?: (v: number) => void }).scaleX === 'function') {
            (n as unknown as { scaleX: (v: number) => void }).scaleX(1);
          }
          if (typeof (n as unknown as { scaleY?: (v: number) => void }).scaleY === 'function') {
            (n as unknown as { scaleY: (v: number) => void }).scaleY(1);
          }
        } else {
          this._bakeRectScale(n);
        }

        // Correct the node position to keep the reference point (corner/edge center) in place.
        // This is required for stable resize (including with auto-pan). The saved reference point
        // is updated during auto-pan ticks.
        if (this._transformOppositeCorner) {
          const rawAnchor =
            typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
          const activeAnchor = rawAnchor ?? '';
          const absTransform = n.getAbsoluteTransform();

          const rect = getLocalRectForNode(n);
          const refPoint = getResizeReferencePoint(activeAnchor, rect);
          if (!refPoint) return;

          // Current absolute position of the reference point
          const currentOpposite = absTransform.point({ x: refPoint.x, y: refPoint.y });

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
      this._core?.nodes.layer.batchDraw();
    });
    transformer.on('transformend.corner-sync', () => {
      // Reset the flag suppressing corner-radius handlers and saved angle
      this._cornerHandlesSuppressed = false;
      this._transformOppositeCorner = null;
      this._isTransforming = false;
      this._restyleSideAnchors();
      // Stop auto-pan after resize
      this._stopAutoPanLoop();
      // OPTIMIZATION: use debounced UI update
      this._scheduleUIUpdate();
      this._core?.nodes.layer.batchDraw();
    });
    // Listen to attribute changes of the selected node, if size/position changes programmatically
    const selNode = this._selected.getKonvaNode() as unknown as Konva.Node;
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
    const node = this._selected.getKonvaNode() as unknown as Konva.Node;
    restyleSideAnchorsUtil(this._core, this._transformer, node);
  }

  // ===================== Rotate Handles (four corners) =====================
  private _setupRotateHandles() {
    if (!this._core || !this._selected) return;
    const layer = this._core.nodes.layer;
    this._destroyRotateHandles();
    const group = new Konva.Group({ name: 'rotate-handles-group', listening: true });
    layer.add(group);
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
        const node = this._selected.getKonvaNode() as unknown as Konva.Node;
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
        // Set initial cursor rotation based on current angle
        const cursorAngle = start + 90;
        this._applyRotatedCursor(cursorAngle);
      });
      h.on('dragmove.rotate', (e: Konva.KonvaEventObject<DragEvent>) => {
        if (!this._core || !this._selected || !this._rotateDragState) return;
        const node = this._selected.getKonvaNode() as unknown as Konva.Node;
        // Use fixed center if available to prevent drift
        const centerRef = this._rotateCenterAbsStart ?? this._getNodeCenterAbs(node);
        const pointer = this._core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const curr = (Math.atan2(pointer.y - centerRef.y, pointer.x - centerRef.x) * 180) / Math.PI;
        let rot = this._rotateDragState.base + (curr - this._rotateDragState.start);

        // Update cursor rotation dynamically during drag
        const cursorAngle = curr + 45;
        this._applyRotatedCursor(cursorAngle);
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
          const base = this._selected;
          const node = base.getKonvaNode() as unknown as Konva.Node;
          if (
            !(base instanceof FrameNode) &&
            this._options.dragEnabled &&
            typeof (node as unknown as { draggable?: (v: boolean) => boolean }).draggable ===
              'function'
          ) {
            (node as unknown as { draggable: (v: boolean) => boolean }).draggable(true);
          }
          // Emit node:transformed event for rotation
          const changes: {
            x?: number;
            y?: number;
            rotation?: number;
          } = {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          };
          this._core?.eventBus.emit('node:transformed', this._selected, changes);
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

    // Hover cursors for rotation handles with dynamic rotation
    const setCursor = (c: string) => {
      if (this._core) this._core.stage.container().style.cursor = c;
    };

    // Helper to calculate cursor angle based on handle position relative to node center
    const setupRotateCursorForHandle = (handle: Konva.Circle) => {
      handle.on('mouseenter.rotate-cursor', () => {
        if (!this._core || !this._selected) return;
        const node = this._selected.getKonvaNode() as unknown as Konva.Node;
        const center = this._getNodeCenterAbs(node);
        const handlePos = handle.getAbsolutePosition();

        // Calculate angle from center to handle (in degrees)
        const dx = handlePos.x - center.x;
        const dy = handlePos.y - center.y;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Adjust angle to point cursor toward handle (add 90 degrees for proper orientation)
        const cursorAngle = angleDeg + 45;

        this._setRotateCursor(cursorAngle);
      });

      handle.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    };

    if (this._rotateHandles.tl) setupRotateCursorForHandle(this._rotateHandles.tl);
    if (this._rotateHandles.tr) setupRotateCursorForHandle(this._rotateHandles.tr);
    if (this._rotateHandles.br) setupRotateCursorForHandle(this._rotateHandles.br);
    if (this._rotateHandles.bl) setupRotateCursorForHandle(this._rotateHandles.bl);

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

  /**
   * Set custom rotation cursor with dynamic angle based on handle position
   */
  private _setRotateCursor(angle: number) {
    if (!this._core) return;
    this._applyRotatedCursor(angle);
  }

  /**
   * Apply rotated cursor by creating a rotated SVG data URL
   */
  private _applyRotatedCursor(angle: number) {
    if (!this._core) return;
    // Create rotated SVG cursor
    const svg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${angle.toString()} 12 12)">
          <g clip-path="url(#clip0_36_31)">
            <g filter="url(#filter0_d_36_31)">
              <path d="M4 6.15927C4 6.15927 9.71429 2.49547 15.4286 8.19463C21.1429 13.8938 18.2857 20 18.2857 20" stroke="white" stroke-width="2"/>
            </g>
            <g filter="url(#filter1_d_36_31)">
              <path d="M0.724195 7.73427L3.27834 2.11403L6.69072 9.31897L0.724195 7.73427Z" fill="black"/>
              <path d="M3.28396 2.82664L6.14311 8.86349L1.1435 7.53589L3.28396 2.82664Z" stroke="white" stroke-width="0.6"/>
            </g>
            <g filter="url(#filter2_d_36_31)">
              <path d="M17.26 22.5868L15.3995 16.7004L22.7553 19.774L17.26 22.5868Z" fill="black"/>
              <path d="M15.8803 17.2264L22.0436 19.8017L17.439 22.1588L15.8803 17.2264Z" stroke="white" stroke-width="0.6"/>
            </g>
            <path d="M4 6.15927C4 6.15927 9.71429 2.49547 15.4286 8.19463C21.1429 13.8938 18.2857 20 18.2857 20" stroke="black"/>
          </g>
          <defs>
            <filter id="filter0_d_36_31" x="-0.539062" y="2" width="22.5391" height="22.4229" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="-1" dy="1"/>
              <feGaussianBlur stdDeviation="1.5"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <filter id="filter1_d_36_31" x="-0.275879" y="2.11426" width="9.96631" height="11.2046" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="1" dy="2"/>
              <feGaussianBlur stdDeviation="1"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <filter id="filter2_d_36_31" x="12.3994" y="15.7002" width="11.3555" height="9.88672" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="-1" dy="1"/>
              <feGaussianBlur stdDeviation="1"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <clipPath id="clip0_36_31">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </g>
      </svg>
    `.trim();

    const encoded = encodeURIComponent(svg);
    const dataUrl = `data:image/svg+xml,${encoded}`;
    const container = this._core.stage.container();
    container.style.cursor = `url("${dataUrl}") 12 12, grab`;
  }

  private _updateRotateHandlesPosition() {
    if (!this._core || !this._selected || !this._rotateHandlesGroup) return;
    const node = this._selected.getKonvaNode() as unknown as Konva.Node;
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
    } as Konva.TagConfig);
    const text = new Konva.Text({
      text: '',
      fontFamily: 'Inter, Calibri, Arial, sans-serif',
      fontSize: 12,
      padding: 6,
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
    const node = this._selected.getKonvaNode();
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
    return konvaNode instanceof Konva.Rect || konvaNode instanceof Konva.Image;
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
    const node = this._selected.getKonvaNode() as unknown as Konva.Node;
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
      // Emit node:transformed event for cornerRadius change
      if (this._selected && this._core) {
        const konvaNode = this._selected.getKonvaNode() as unknown as Konva.Node;
        const changes: {
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        } = {
          x: konvaNode.x(),
          y: konvaNode.y(),
        };
        if (typeof konvaNode.width === 'function') changes.width = konvaNode.width();
        if (typeof konvaNode.height === 'function') changes.height = konvaNode.height();
        this._core.eventBus.emit('node:transformed', this._selected, changes);
      }
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
      const n = this._selected.getKonvaNode() as unknown as Konva.Node;
      n.draggable(false);
      // Repaint side anchors after draggable change
      this._restyleSideAnchors();
    };
    const onUp = () => {
      if (!this._selected) return;
      const base = this._selected;
      const n = base.getKonvaNode() as unknown as Konva.Node;
      if (
        this._options.dragEnabled &&
        !(base instanceof FrameNode) &&
        typeof (n as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
      ) {
        (n as unknown as { draggable: (v: boolean) => boolean }).draggable(true);
      }
      // Repaint side anchors after draggable change
      this._restyleSideAnchors();
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
      const n = this._selected.getKonvaNode() as unknown as Konva.Node;
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
    const nodeRaw = this._selected.getKonvaNode() as unknown as Konva.Node;
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
    const node = this._selected.getKonvaNode() as unknown as Konva.Node;

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
    const nodeRaw = this._selected.getKonvaNode() as unknown as Konva.Node;
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
      const selectedKonva = this._selected.getKonvaNode() as unknown as Konva.Node;
      if (selectedKonva === target) return this._selected;
      if (typeof selectedKonva.isAncestorOf === 'function' && selectedKonva.isAncestorOf(target)) {
        return this._selected;
      }
    }

    // Специальный случай для FrameNode: если target находится внутри contentGroup какого‑то фрейма,
    // стараемся выбрать ближайший (по иерархии Konva) BaseNode, который НЕ является самим FrameNode.
    // Это позволяет нормально кликать/hover'ить дочерние ноды внутри фрейма, не блокируя правило
    // "непустой фрейм по клику не выбирается" (оно по‑прежнему реализовано в _isSelectableByFrameRules).
    const allBaseNodes: BaseNode[] = this._core.nodes.list();
    const frameBaseNodes = allBaseNodes.filter((bn): bn is FrameNode => bn instanceof FrameNode);

    let isInsideAnyFrameContent = false;
    for (const frame of frameBaseNodes) {
      const contentGroup = frame.getContentGroup();
      if (
        target === contentGroup ||
        (typeof contentGroup.isAncestorOf === 'function' && contentGroup.isAncestorOf(target))
      ) {
        isInsideAnyFrameContent = true;
        break;
      }
    }

    if (isInsideAnyFrameContent) {
      // Внутри FrameNode хотим поведение как в world: по клику выбирается
      // "внешняя" (outermost) нода/группа под курсором, но при этом сам
      // FrameNode не может стать владельцем. Поэтому ищем top-most ancestor
      // среди всех BaseNode, КРОМЕ FrameNode.

      const nonFrameBaseNodes = allBaseNodes.filter((bn) => !(bn instanceof FrameNode));

      let topMostNonFrame: BaseNode | null = null;
      for (const n of nonFrameBaseNodes) {
        const node = n.getKonvaNode() as unknown as Konva.Node;
        if (typeof node.isAncestorOf !== 'function' || !node.isAncestorOf(target)) continue;

        let isTopMost = true;
        for (const other of nonFrameBaseNodes) {
          if (other === n) continue;
          const otherNode = other.getKonvaNode() as unknown as Konva.Node;
          if (typeof otherNode.isAncestorOf === 'function' && otherNode.isAncestorOf(node)) {
            isTopMost = false;
            break;
          }
        }

        if (isTopMost) {
          topMostNonFrame = n;
          break;
        }
      }

      if (topMostNonFrame) return topMostNonFrame;

      // Если предок не найден, пробуем прямое соответствие target -> BaseNode
      for (const n of nonFrameBaseNodes) {
        if (n.getKonvaNode() === target) return n;
      }
    }

    let topMostAncestor: BaseNode | null = null;
    for (const n of this._core.nodes.list()) {
      const node = n.getKonvaNode() as unknown as Konva.Node;
      if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(target)) {
        let isTopMost = true;
        for (const other of this._core.nodes.list()) {
          if (other === n) continue;
          const otherNode = other.getKonvaNode() as unknown as Konva.Node;
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
      if (n.getKonvaNode() === target) return n;
    }
    return null;
  }

  private _onNodeRemoved = (removed: BaseNode) => {
    if (this._selected && this._selected === removed) {
      this._clearSelection();
    }
  };

  private _disableGroupChildrenDragging(group: Konva.Group) {
    const children = group.getChildren();
    for (const child of children) {
      const draggableChild = child as DraggableNode;
      if (typeof draggableChild.draggable === 'function') {
        draggableChild.draggable(false);
      }
    }
  }
}
