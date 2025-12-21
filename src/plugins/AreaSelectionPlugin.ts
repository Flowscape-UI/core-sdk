import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import { FrameNode } from '../nodes/FrameNode';
import { GroupNode } from '../nodes/GroupNode';

import { Plugin } from './Plugin';
import { SelectionPlugin } from './SelectionPlugin';

export interface AreaSelectionPluginOptions {
  rectStroke?: string;
  rectFill?: string;
  rectStrokeWidth?: number;
  rectOpacity?: number; // applied to fill
  enableKeyboardShortcuts?: boolean; // Ctrl+G, Ctrl+Shift+G
}

/**
 * AreaSelectionPlugin
 * - Drag LKM over empty space draws selection rectangle (marquee) in screen coordinates
 * - All nodes whose client rectangles intersect the rectangle are temporarily grouped
 * - Click outside — temporary group is removed, nodes return to their original positions
 * - Ctrl+G — lock in permanent group (GroupNode through NodeManager)
 * - Ctrl+Shift+G — unlock selected permanent group
 */
export class AreaSelectionPlugin extends Plugin {
  private _core?: CoreEngine;
  private _layer: Konva.Layer | null = null; // layer for selection rectangle
  private _rect: Konva.Rect | null = null;

  private _start: { x: number; y: number } | null = null;
  private _transformer: Konva.Transformer | null = null;
  // Modelasso forms temporary group, so single clicks are not needed
  private _selecting = false;
  private _skipNextClick = false;
  private _lastPickedBaseNodes: BaseNode[] = [];

  // Auto-pan world when lasso selecting near screen edges
  private _autoPanRafId: number | null = null;
  private _autoPanActive = false;
  private _autoPanEdgePx = 50; // edge zone width (px)
  private _autoPanMaxSpeedPx = 20; // max auto-pan speed in px/frame

  private _options: Required<AreaSelectionPluginOptions>;

  constructor(options: AreaSelectionPluginOptions = {}) {
    super();
    this._options = {
      rectStroke: options.rectStroke ?? '#2b83ff',
      rectFill: options.rectFill ?? '#2b83ff',
      rectStrokeWidth: options.rectStrokeWidth ?? 1,
      rectOpacity: options.rectOpacity ?? 0.15,
      enableKeyboardShortcuts: options.enableKeyboardShortcuts ?? true,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    const layer = new Konva.Layer({ name: 'area-selection-layer', listening: false });
    core.stage.add(layer);
    this._layer = layer;

    // Selection rectangle
    this._rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: false,
      stroke: this._options.rectStroke,
      strokeWidth: this._options.rectStrokeWidth,
      fill: this._options.rectFill,
      opacity: this._options.rectOpacity,
      listening: false,
    });
    layer.add(this._rect);

    const stage = core.stage;

    stage.on('mousedown.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only LKM and only click on empty space (outside nodes layer)
      if (e.evt.button !== 0) return;

      const target = e.target as Konva.Node;
      const nodesLayer = core.nodes.layer;

      // По умолчанию запрещаем старт лассо по нодам в nodesLayer, чтобы не мешать обычному selection/drag.
      // Исключение: клик по фону непустого FrameNode, у которого уже отключён drag (draggable: false) —
      // в этом случае разрешаем начинать лассо внутри фрейма для выбора его детей. Клик по дочерним нодам
      // фрейма остаётся под контролем SelectionPlugin (обычный select/drag).
      if (target !== stage && target.getLayer() === nodesLayer) {
        const allNodes: BaseNode[] = this._core?.nodes.list() ?? [];
        let allowByFrameException = false;

        for (const bn of allNodes) {
          if (!(bn instanceof FrameNode)) continue;
          const frameNode = bn.getKonvaNode() as unknown as Konva.Node;
          const contentGroup = bn.getContentGroup();

          // Проверяем, что текущий target относится к этому фрейму
          let cur: Konva.Node | null = target;
          let belongsToFrame = false;
          while (cur) {
            if (cur === frameNode) {
              belongsToFrame = true;
              break;
            }
            cur = cur.getParent();
          }

          if (!belongsToFrame) continue;

          // Если target лежит внутри contentGroup (дочерние ноды фрейма) — не считаем это кликом по фону,
          // отдаём его SelectionPlugin.
          const insideContent =
            target === (contentGroup as unknown as Konva.Node) ||
            (contentGroup as unknown as Konva.Node).isAncestorOf(target);
          if (insideContent) {
            continue;
          }

          const hasChildren = contentGroup.getChildren().length > 0;
          const frameGroup = frameNode as unknown as Konva.Node & {
            draggable?: (value?: boolean) => boolean;
          };
          const frameDraggable =
            typeof frameGroup.draggable === 'function' ? frameGroup.draggable() : true;

          if (hasChildren && !frameDraggable) {
            // Непустой, не‑draggable FrameNode: разрешаем старт лассо по его фону
            allowByFrameException = true;
            break;
          }
        }

        if (!allowByFrameException) return;
      }

      const p = stage.getPointerPosition();
      if (!p || !this._rect) return;

      // Ignore clicks on rulers (RulerPlugin)
      const rulerLayer = stage.findOne('.ruler-layer');
      if (rulerLayer && e.target.getLayer() === rulerLayer) {
        return;
      }

      // Ignore clicks on guides (RulerGuidesPlugin)
      const guidesLayer = stage.findOne('.guides-layer');
      if (guidesLayer && e.target.getLayer() === guidesLayer) {
        return;
      }

      // Ignore clicks on rulers (RulerPlugin)
      const rulerThickness = 30; // should match RulerPlugin
      if (p.y <= rulerThickness || p.x <= rulerThickness) {
        return;
      }

      // If click is inside permanent group bbox, disable marquee selection
      // if (this._pointerInsidePermanentGroupBBox(p)) {
      //   return;
      // }

      this._selecting = true;
      this._start = { x: p.x, y: p.y };
      this._rect.visible(true);
      this._rect.position({ x: p.x, y: p.y });
      this._rect.size({ width: 0, height: 0 });
      this._layer?.batchDraw();
      this._lastPickedBaseNodes = [];
      // Start auto-pan during lasso selection
      this._startAutoPanLoop();
    });

    stage.on('mousemove.area', () => {
      if (!this._selecting || !this._rect || !this._start) return;

      const p = stage.getPointerPosition();
      if (!p) return;

      const x = Math.min(this._start.x, p.x);
      const y = Math.min(this._start.y, p.y);
      const w = Math.abs(p.x - this._start.x);
      const h = Math.abs(p.y - this._start.y);
      this._rect.position({ x, y });
      this._rect.size({ width: w, height: h });
      this._layer?.batchDraw();

      // Current set of nodes under the rectangle — form temporary group (as Shift‑multi selection)
      // If node belongs to permanent group, select the entire group
      const bbox = { x, y, width: w, height: h };
      const allNodes: BaseNode[] = this._core?.nodes.list() ?? [];
      const pickedSet = new Set<BaseNode>();
      const fullyCoveredFrames = new Set<FrameNode>();

      for (const bn of allNodes) {
        if (bn instanceof GroupNode) continue;
        const node = bn.getKonvaNode() as unknown as Konva.Node;
        const layer = node.getLayer();
        if (layer !== this._core?.nodes.layer) continue;
        // Особое правило для FrameNode:
        // - непустой фрейм попадает в выбор только при 100% покрытии лассо;
        // - пустой фрейм ведёт себя как обычная нода (достаточно пересечения).
        if (bn instanceof FrameNode) {
          const frameRect = bn.getRect();
          const fr = frameRect.getClientRect({ skipShadow: true, skipStroke: true });
          const contentGroup = bn.getContentGroup();
          const hasChildren = contentGroup.getChildren().length > 0;

          if (hasChildren) {
            if (this._rectContains(bbox, fr)) {
              pickedSet.add(bn);
              fullyCoveredFrames.add(bn);
            }
          } else {
            if (this._rectsIntersect(bbox, fr)) {
              pickedSet.add(bn);
            }
          }
          continue;
        }

        // Если этот node лежит внутри contentGroup уже выбранного фрейма —
        // не добавляем его отдельно, чтобы overlay/transformer работали только по фрейму.
        let insideSelectedFrame = false;
        for (const frame of fullyCoveredFrames) {
          const contentGroup = frame.getContentGroup() as unknown as Konva.Node;
          if (node === contentGroup || contentGroup.isAncestorOf(node)) {
            insideSelectedFrame = true;
            break;
          }
        }
        if (insideSelectedFrame) continue;

        const r = node.getClientRect({ skipShadow: true, skipStroke: false });
        if (this._rectsIntersect(bbox, r)) {
          const owner = this._findOwningGroupBaseNode(node);
          pickedSet.add(owner ?? bn);
        }
      }
      const pickedBase: BaseNode[] = Array.from(pickedSet);
      const sel = this._getSelectionPlugin();
      if (pickedBase.length > 0) {
        this._lastPickedBaseNodes = pickedBase;
      }
      if (sel) {
        const ctrl = sel.getMultiGroupController();
        if (pickedBase.length > 0) {
          ctrl.ensure(pickedBase);
        }
        this._core?.stage.batchDraw();
      }
    });

    stage.on('mouseup.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._selecting) return;
      let dragged = false;
      if (this._rect?.visible()) {
        const size = this._rect.size();
        dragged = size.width > 2 || size.height > 2;
      }
      this._finalizeArea();
      // Stop auto-pan
      this._stopAutoPanLoop();
      if (dragged) {
        this._skipNextClick = true;
        this._core?.stage.setAttr('_skipSelectionEmptyClickOnce', true);
        e.cancelBubble = true;
      }
    });

    // Click outside — remove temporary group/selection
    stage.on('click.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      if (this._skipNextClick) {
        this._skipNextClick = false;
        e.cancelBubble = true;
        return;
      }
      // Do not interfere with Shift‑clicks: multi selection handles SelectionPlugin
      if (e.evt.shiftKey) return;
      const sel = this._getSelectionPlugin();
      const ctrl = sel?.getMultiGroupController();
      const tempActive = !!ctrl?.isActive();
      if (!tempActive && !this._isPermanentGroupSelected()) return;

      const target = e.target as Konva.Node;
      const groupNode = this._currentGroupNode();
      if (groupNode) {
        // If click is not on a child of the current group, clear selection
        const isInside = this._isAncestor(groupNode, target);
        if (!isInside) this._clearSelection();
      } else {
        // Only temporary (via SelectionPlugin)
        if (tempActive && ctrl) {
          const insideTemp = ctrl.isInsideTempByTarget(target);
          if (!insideTemp) {
            ctrl.destroy();
            this._core.stage.batchDraw();
          }
        }
      }
    });

    // Hotkeys are handled in SelectionPlugin, no duplicates here
  }

  protected onDetach(core: CoreEngine): void {
    // Remove subscriptions
    core.stage.off('.area');

    // Stop auto-pan if active
    this._stopAutoPanLoop();

    // Clear current state
    this._clearSelection();

    // Remove layer
    if (this._layer) this._layer.destroy();
    this._layer = null;
    this._rect = null;
  }

  /** Проверить, что прямоугольник `inner` полностью содержится внутри `outer`. */
  private _rectContains(
    outer: { x: number; y: number; width: number; height: number },
    inner: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height
    );
  }

  // =================== Auto-pan logic ===================
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
          // Expand lasso anchor to reflect additional area revealed by auto-pan
          if (this._start) {
            this._start.x -= vx;
            this._start.y -= vy;
          }
          // Update lasso rectangle position to compensate for world movement
          if (this._rect && this._start) {
            const p = stage.getPointerPosition();
            if (p) {
              const x = Math.min(this._start.x, p.x);
              const y = Math.min(this._start.y, p.y);
              const width = Math.abs(p.x - this._start.x);
              const height = Math.abs(p.y - this._start.y);
              this._rect.position({ x, y });
              this._rect.size({ width, height });
            }
          }
          this._layer?.batchDraw();
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

  // =================== Internal logic ===================
  private _finalizeArea() {
    if (!this._core || !this._rect || !this._start) return;
    this._selecting = false;

    const bbox = this._rect.getClientRect({ skipStroke: true });
    // hide rect, but do not remove — will be needed later
    this._rect.visible(false);
    this._layer?.batchDraw();

    // Find nodes intersecting with bbox (in client coordinates)
    let baseNodes: BaseNode[] = [];
    if (this._lastPickedBaseNodes.length > 0) {
      // Если во время mousemove мы уже набрали набор BaseNode (включая специальные правила для FrameNode),
      // используем его как есть, чтобы не дублировать логику.
      baseNodes = [...this._lastPickedBaseNodes];
    } else {
      const nodes: BaseNode[] = this._core.nodes.list();
      const picked: Konva.Node[] = [];
      for (const n of nodes) {
        const node = n.getKonvaNode() as unknown as Konva.Node;
        // Only those actually in the node layer
        const layer = node.getLayer();
        if (layer !== this._core.nodes.layer) continue;

        // Те же правила для FrameNode, что и в mousemove:
        // - непустой фрейм попадает только при полном покрытии bbox;
        // - пустой — при простом пересечении.
        if (n instanceof FrameNode) {
          const frameRect = n.getRect();
          const fr = frameRect.getClientRect({ skipShadow: true, skipStroke: true });
          const contentGroup = n.getContentGroup();
          const hasChildren = contentGroup.getChildren().length > 0;

          if (hasChildren) {
            if (this._rectContains(bbox, fr)) {
              picked.push(node);
            }
          } else {
            const r = node.getClientRect({ skipShadow: true, skipStroke: false });
            if (this._rectsIntersect(bbox, r)) picked.push(node);
          }
          continue;
        }

        const r = node.getClientRect({ skipShadow: true, skipStroke: false });
        if (this._rectsIntersect(bbox, r)) picked.push(node);
      }

      // Form a set of nodes and apply as a temporary group (as Shift‑multi selection)
      const list: BaseNode[] = this._core.nodes.list();
      const baseSet = new Set<BaseNode>();
      for (const kn of picked) {
        const bn = list.find((n) => n.getKonvaNode() === (kn as unknown as Konva.Node)) ?? null;
        const owner = this._findOwningGroupBaseNode(kn as unknown as Konva.Node);
        if (owner) baseSet.add(owner);
        else if (bn && !(bn instanceof GroupNode)) baseSet.add(bn);
      }
      baseNodes = Array.from(baseSet);
    }

    const sel = this._getSelectionPlugin();
    if (sel) {
      if (baseNodes.length === 1) {
        // Ровно один узел (в т.ч. FrameNode с 100% покрытием) —
        // используем обычный single‑selection, чтобы работала спец‑логика
        // ресайза (например, для FrameNode без скейла детей).
        const only = baseNodes[0];
        if (only) {
          sel.selectSingleFromArea(only);
        }
      } else if (baseNodes.length > 1) {
        // 2+ узла — создаём временную группу как и раньше
        sel.getMultiGroupController().ensure(baseNodes);
        this._core.stage.batchDraw();
      } else {
        sel.getMultiGroupController().destroy();
      }
    }
    this._lastPickedBaseNodes = [];
  }

  private _clearSelection() {
    // If permanent GroupNode selected via our Transformer — just remove transformer
    if (this._isPermanentGroupSelected()) {
      if (this._transformer) this._transformer.destroy();
      this._transformer = null;
      this._core?.stage.batchDraw();
    }
    // Remove temporary group (if any) via SelectionPlugin
    const sel = this._getSelectionPlugin();
    const ctrl = sel?.getMultiGroupController();
    if (ctrl) ctrl.destroy();
  }

  // Get SelectionPlugin from CoreEngine
  private _getSelectionPlugin(): SelectionPlugin | null {
    if (!this._core) return null;
    const sel = this._core.plugins
      .list()
      .find((p): p is SelectionPlugin => p instanceof SelectionPlugin);
    return sel ?? null;
  }

  // ================ Utils ================
  private _rectsIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    // Inclusive intersection: touching by border is also considered
    return (
      a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
    );
  }

  // Find parent GroupNode for current node
  private _findOwningGroupBaseNode(node: Konva.Node): BaseNode | null {
    if (!this._core) return null;
    const list: BaseNode[] = this._core.nodes.list();
    // Collect all permanent groups (GroupNode) and compare their Konva.Node
    const groupBaseNodes = list.filter((bn) => bn instanceof GroupNode);
    let cur: Konva.Node | null = node;
    let lastOwner: BaseNode | null = null;
    while (cur) {
      const owner = groupBaseNodes.find((gbn) => gbn.getKonvaNode() === cur) ?? null;
      if (owner) lastOwner = owner;
      cur = cur.getParent();
    }
    return lastOwner;
  }
  private _isAncestor(ancestor: Konva.Node, node: Konva.Node): boolean {
    let cur: Konva.Node | null = node;
    while (cur) {
      if (cur === ancestor) return true;
      cur = cur.getParent();
    }
    return false;
  }

  private _isPermanentGroupSelected(): boolean {
    if (!this._transformer) return false;
    const nodes = typeof this._transformer.nodes === 'function' ? this._transformer.nodes() : [];
    const n = nodes[0];
    if (!n) return false;
    // Permanent group is a registered in NodeManager GroupNode
    if (!this._core) return false;
    return this._core.nodes.list().some((bn) => bn instanceof GroupNode && bn.getKonvaNode() === n);
  }

  private _currentGroupNode(): Konva.Group | null {
    if (!this._transformer) return null;
    const nodes = typeof this._transformer.nodes === 'function' ? this._transformer.nodes() : [];
    const n = nodes[0];
    if (!n) return null;
    return n instanceof Konva.Group ? n : null;
  }
}
