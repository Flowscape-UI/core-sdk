import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import { GroupNode } from '../nodes/GroupNode';
import type { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';
import { SelectionPlugin } from './SelectionPlugin';

export interface AreaSelectionPluginOptions {
  rectStroke?: string;
  rectFill?: string;
  rectStrokeWidth?: number;
  rectOpacity?: number; // применяется к fill
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

    // Рамка выбора
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
      if (e.target !== stage && e.target.getLayer() === core.nodes.layer) return;

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
      if (this._pointerInsidePermanentGroupBBox(p)) {
        return;
      }

      this._selecting = true;
      this._start = { x: p.x, y: p.y };
      this._rect.visible(true);
      this._rect.position({ x: p.x, y: p.y });
      this._rect.size({ width: 0, height: 0 });
      this._layer?.batchDraw();
    });

    stage.on('mousemove.area', () => {
      if (!this._selecting || !this._rect || !this._start) return;

      // Check if we are over rulers (RulerPlugin)
      const p = stage.getPointerPosition();
      if (!p) return;

      const rulerThickness = 30;
      const overRuler = p.y <= rulerThickness || p.x <= rulerThickness;

      // If we are over rulers (RulerPlugin), disable marquee selection
      if (overRuler) {
        this._selecting = false;
        this._rect.visible(false);
        this._layer?.batchDraw();
        return;
      }

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
      for (const bn of allNodes) {
        const node = bn.getNode() as unknown as Konva.Node;
        const layer = node.getLayer();
        if (layer !== this._core?.nodes.layer) continue;
        const r = node.getClientRect({ skipShadow: true, skipStroke: false });
        if (this._rectsIntersect(bbox, r)) {
          const owner = this._findOwningGroupBaseNode(node);
          pickedSet.add(owner ?? bn);
        }
      }
      const pickedBase: BaseNode[] = Array.from(pickedSet);
      const sel = this._getSelectionPlugin();
      if (sel) {
        const ctrl = sel.getMultiGroupController();
        if (pickedBase.length > 0) {
          ctrl.ensure(pickedBase);
        } else {
          // If the rectangle left the only (or all) node — temporary group fades away
          ctrl.destroy();
        }
        this._core?.stage.batchDraw();
      }
    });

    stage.on('mouseup.area', () => {
      if (!this._selecting) return;
      this._finalizeArea();
    });

    // Click outside — remove temporary group/selection
    stage.on('click.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
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

    // Clear current state
    this._clearSelection();

    // Remove layer
    if (this._layer) this._layer.destroy();
    this._layer = null;
    this._rect = null;
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
    const nodes: BaseNode[] = this._core.nodes.list();
    const picked: Konva.Node[] = [];
    for (const n of nodes) {
      const node = n.getNode() as unknown as Konva.Node;
      // Только те, что реально в слое нод
      const layer = node.getLayer();
      if (layer !== this._core.nodes.layer) continue;
      const r = node.getClientRect({ skipShadow: true, skipStroke: false });
      if (this._rectsIntersect(bbox, r)) picked.push(node);
    }

    // Form a set of nodes and apply as a temporary group (as Shift‑multi selection)
    const sel = this._getSelectionPlugin();
    if (sel) {
      const list: BaseNode[] = this._core.nodes.list();
      const baseSet = new Set<BaseNode>();
      for (const kn of picked) {
        const bn = list.find((n) => n.getNode() === (kn as unknown as Konva.Node)) ?? null;
        const owner = this._findOwningGroupBaseNode(kn as unknown as Konva.Node);
        if (owner) baseSet.add(owner);
        else if (bn) baseSet.add(bn);
      }
      const baseNodes = Array.from(baseSet);
      if (baseNodes.length > 0) {
        sel.getMultiGroupController().ensure(baseNodes);
        this._core.stage.batchDraw();
      } else {
        sel.getMultiGroupController().destroy();
      }
    }
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
    const sel = this._core.plugins.list().find((p) => p instanceof SelectionPlugin);
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
    while (cur) {
      const owner = groupBaseNodes.find((gbn) => gbn.getNode() === cur) ?? null;
      if (owner) return owner;
      cur = cur.getParent();
    }
    return null;
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
    return this._core.nodes.list().some((bn) => bn instanceof GroupNode && bn.getNode() === n);
  }

  private _currentGroupNode(): Konva.Group | null {
    if (!this._transformer) return null;
    const nodes = typeof this._transformer.nodes === 'function' ? this._transformer.nodes() : [];
    const n = nodes[0];
    if (!n) return null;
    return n instanceof Konva.Group ? n : null;
  }

  // true, if pointer inside visual bbox any permanent group (GroupNode from NodeManager)
  private _pointerInsidePermanentGroupBBox(p: { x: number; y: number }): boolean {
    if (!this._core) return false;
    const list: BaseNode[] = this._core.nodes.list();
    for (const bn of list) {
      if (!(bn instanceof GroupNode)) continue;
      const node = bn.getNode();
      const bbox = node.getClientRect({ skipShadow: true, skipStroke: true });
      const inside =
        p.x >= bbox.x && p.x <= bbox.x + bbox.width && p.y >= bbox.y && p.y <= bbox.y + bbox.height;
      if (inside) return true;
    }
    return false;
  }
}
