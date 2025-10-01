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
 * - Drag ЛКМ по пустому месту рисует рамку выбора (marquee) в экранных координатах
 * - Все ноды, чьи клиентские прямоугольники пересекают рамку, временно объединяются в группу
 * - Клик вне — временная группа удаляется, ноды возвращаются на исходные места
 * - Ctrl+G — закрепить в постоянную группу (GroupNode через NodeManager)
 * - Ctrl+Shift+G — разъединить выбранную постоянную группу
 */
export class AreaSelectionPlugin extends Plugin {
  private _core?: CoreEngine;
  private _layer: Konva.Layer | null = null; // слой для рамки
  private _rect: Konva.Rect | null = null;

  private _start: { x: number; y: number } | null = null;
  private _transformer: Konva.Transformer | null = null;
  // Режим лассо формирует временную группу, поэтому одиночные эмуляции кликов не нужны
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

    // Слой поверх контента для отрисовки рамки
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

    // Подписки на события мыши на сцене
    const stage = core.stage;

    stage.on('mousedown.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Только ЛКМ и только клик по пустому месту (вне слоя нод)
      if (e.evt.button !== 0) return;
      if (e.target !== stage && e.target.getLayer() === core.nodes.layer) return;

      const p = stage.getPointerPosition();
      if (!p || !this._rect) return;

      // Игнорируем клики на линейках (RulerPlugin)
      const rulerLayer = stage.findOne('.ruler-layer');
      if (rulerLayer && e.target.getLayer() === rulerLayer) {
        return;
      }

      // Игнорируем клики на направляющих линиях (RulerGuidesPlugin)
      const guidesLayer = stage.findOne('.guides-layer');
      if (guidesLayer && e.target.getLayer() === guidesLayer) {
        return;
      }

      // Игнорируем клики в области линейки по координатам (30px от краёв)
      const rulerThickness = 30; // должно совпадать с RulerPlugin
      if (p.y <= rulerThickness || p.x <= rulerThickness) {
        return;
      }

      // Если клик пришёлся в пределы bbox постоянной группы — запрещаем рамочный выбор
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
      
      // Проверяем, не находимся ли мы над линейкой или направляющими
      const p = stage.getPointerPosition();
      if (!p) return;
      
      const rulerThickness = 30;
      const overRuler = p.y <= rulerThickness || p.x <= rulerThickness;
      
      // Если начали выделение и попали на линейку - отменяем выделение
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

      // Текущее множество нод под рамкой — формируем временную группу (как Shift‑мультивыбор)
      // Если нода принадлежит постоянной группе, выбираем всю группу
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
          // Если рамка ушла с единственной (или всех) нод — временная группа спадает
          ctrl.destroy();
        }
        this._core?.stage.batchDraw();
      }
    });

    stage.on('mouseup.area', () => {
      if (!this._selecting) return;
      this._finalizeArea();
    });

    // Клик вне — снять временную группу/выделение
    stage.on('click.area', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      // Не вмешиваемся в Shift‑клики: мультивыделение обрабатывает SelectionPlugin
      if (e.evt.shiftKey) return;
      const sel = this._getSelectionPlugin();
      const ctrl = sel?.getMultiGroupController();
      const tempActive = !!ctrl?.isActive();
      if (!tempActive && !this._isPermanentGroupSelected()) return;

      const target = e.target as Konva.Node;
      const groupNode = this._currentGroupNode();
      if (groupNode) {
        // если клик не по потомку текущей группы — очистить
        const isInside = this._isAncestor(groupNode, target);
        if (!isInside) this._clearSelection();
      } else {
        // Только временная (через SelectionPlugin)
        if (tempActive && ctrl) {
          const insideTemp = ctrl.isInsideTempByTarget(target);
          if (!insideTemp) {
            ctrl.destroy();
            this._core.stage.batchDraw();
          }
        }
      }
    });

    // Горячие клавиши обрабатываются в SelectionPlugin, здесь дублирования больше нет
  }

  protected onDetach(core: CoreEngine): void {
    // Снять подписки
    core.stage.off('.area');

    // Очистить текущее состояние
    this._clearSelection();

    // Удалить слой рамки
    if (this._layer) this._layer.destroy();
    this._layer = null;
    this._rect = null;
  }

  // =================== Internal logic ===================
  private _finalizeArea() {
    if (!this._core || !this._rect || !this._start) return;
    this._selecting = false;

    const bbox = this._rect.getClientRect({ skipStroke: true });
    // скрыть рамку, но не удалять — пригодится дальше
    this._rect.visible(false);
    this._layer?.batchDraw();

    // Найти ноды, пересекающиеся с bbox (в клиентских координатах)
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

    // Сформировать множество нод и применить как временную группу (как при Shift‑мультивыборе)
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
        // Ничего не выбрано — очистить временную группу
        sel.getMultiGroupController().destroy();
      }
    }

    // Сброс внутренних состояний рамки
  }

  private _clearSelection() {
    // если выбран постоянный GroupNode через наш Transformer — просто снять трансформер
    if (this._isPermanentGroupSelected()) {
      if (this._transformer) this._transformer.destroy();
      this._transformer = null;
      this._core?.stage.batchDraw();
    }
    // удалить временную группу (если есть) через SelectionPlugin
    const sel = this._getSelectionPlugin();
    const ctrl = sel?.getMultiGroupController();
    if (ctrl) ctrl.destroy();
  }

  // Получить SelectionPlugin из CoreEngine
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
    // Включающее пересечение: касание по границе тоже считается
    return (
      a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
    );
  }

  // Найти родительский GroupNode для указанного нода
  private _findOwningGroupBaseNode(node: Konva.Node): BaseNode | null {
    if (!this._core) return null;
    const list: BaseNode[] = this._core.nodes.list();
    // Собираем все постоянные группы (GroupNode) и сравниваем их Konva.Node
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
    // Постоянная группа — это зарегистрированный в NodeManager GroupNode
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

  // true, если указатель внутри визуального bbox любой постоянной группы (GroupNode из NodeManager)
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
