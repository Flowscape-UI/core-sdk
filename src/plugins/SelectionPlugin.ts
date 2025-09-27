import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';

// Узел Konva с поддержкой draggable() геттер/сеттер
type DraggableNode = Konva.Node & { draggable(value?: boolean): boolean };

export interface SelectionPluginOptions {
  // Разрешить перетаскивание выбранной ноды
  dragEnabled?: boolean;
  // Добавлять визуальный Transformer для выбранной ноды
  enableTransformer?: boolean;
  // Снимать выделение кликом в пустую область
  deselectOnEmptyClick?: boolean;
  // Пользовательская проверка, можно ли выделять конкретный Konva.Node
  selectablePredicate?: (node: Konva.Node) => boolean;
}

/**
 * Универсальный плагин выбора и перетаскивания нод, совместимых с BaseNode.
 *
 * Поведение по умолчанию:
 * - Клик по ноде на слое NodeManager приводит к выделению ноды
 * - Выделенная нода становится перетаскиваемой (dragEnabled)
 * - Клик по пустой области снимает выделение (deselectOnEmptyClick)
 * - По желанию можно включить Konva.Transformer (enableTransformer)
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
  // Состояние видимости для ротационных хендлеров во время drag
  private _rotateHandlesWereVisibleBeforeDrag = false;
  // Группа и ссылки на угловые хендлеры для скругления
  private _cornerHandlesGroup: Konva.Group | null = null;
  private _cornerHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  // Label с размерами выбранной ноды (ширина × высота)
  private _sizeLabel: Konva.Label | null = null;
  // Label для отображения радиуса при наведении/перетаскивании corner-хендлеров
  private _radiusLabel: Konva.Label | null = null;
  // Группа и ссылки на угловые хендлеры ротации
  private _rotateHandlesGroup: Konva.Group | null = null;
  private _rotateHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  private _rotateDragState: { base: number; start: number } | null = null;
  // Абсолютный центр на момент старта ротации — для компенсации позиции
  private _rotateCenterAbsStart: { x: number; y: number } | null = null;

  // Минимальная hover-рамка (синяя граница при наведении)
  private _hoverTr: Konva.Transformer | null = null;
  private _isPointerDown = false;

  // Режим редактирования дочерней ноды внутри группы: хранение состояния родительской группы
  private _parentGroupDuringChildEdit: Konva.Group | null = null;
  private _parentGroupPrevDraggable: boolean | null = null;

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
    };
  }

  public setOptions(patch: Partial<SelectionPluginOptions>) {
    this._options = { ...this._options, ...patch } as typeof this._options;
    // Обновляем Transformer под новое состояние опций
    if (this._core) this._refreshTransformer();
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Навешиваем обработчики на сцену (namespace .selection)
    const stage = core.stage;
    stage.on('mousedown.selection', this._onMouseDown);

    stage.on('click.selection', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      const stage = this._core.stage;
      const layer = this._core.nodes.layer;

      // Только ЛКМ
      if (e.evt.button !== 0) return;

      // Клик по пустому месту — снимаем выделение (если включено)
      if (e.target === stage || e.target.getLayer() !== layer) {
        if (this._options.deselectOnEmptyClick) this._clearSelection();
        return;
      }

      // Обычное выделение ноды (для группы — выберется группа)
      const target = e.target;
      if (!this._options.selectablePredicate(target)) return;

      // Ctrl-клик: выбрать точную зарегистрированную ноду под курсором (если есть)
      if (e.evt.ctrlKey) {
        const exact = this._core.nodes.list().find((n) => n.getNode() === target);
        if (exact) {
          this._select(exact);
          this._core.stage.batchDraw();
          return;
        }
        // если точной нет — ниже сработает стандартная логика (группа/ближайший зарегистрированный)
      }

      const baseNode = this._findBaseNodeByTarget(target);
      if (!baseNode) return;

      this._select(baseNode);
      this._core.stage.batchDraw();
    });

    // Двойной клик: если сейчас выделена группа и клик по её ребёнку — выделяем ровно ребёнка
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
        const exact = this._core.nodes.list().find((n) => n.getNode() === e.target);
        if (!exact) return;
        e.cancelBubble = true; // не даём всплыть до логики выбора группы
        this._select(exact);
        const node = exact.getNode();
        // Включаем перетаскивание для выбранной дочерней ноды
        if (typeof node.draggable === 'function') node.draggable(true);
        // Временно отключаем перетаскивание у родительской группы, чтобы тянулась не вся группа
        let parent: Konva.Node | null = (e.target as Konva.Node).getParent();
        while (parent && !(parent instanceof Konva.Group)) parent = parent.getParent();
        if (parent && parent instanceof Konva.Group) {
          this._parentGroupDuringChildEdit = parent;
          this._parentGroupPrevDraggable =
            typeof parent.draggable === 'function' ? parent.draggable() : null;
          if (typeof parent.draggable === 'function') parent.draggable(false);
        }
        this._core.stage.batchDraw();
      }
    });

    // Реакция на удаление ноды — снимаем выделение, если выделенная нода была удалена
    core.eventBus.on('node:removed', this._onNodeRemoved);

    // Hover-рамка: подсвечивает границы ноды/группы при наведении, даже если выделен другой объект
    stage.on('mousemove.hover', this._onHoverMove);
    stage.on('mouseleave.hover', this._onHoverLeave);
    stage.on('mousedown.hover', this._onHoverDown);
    stage.on('mouseup.hover', this._onHoverUp);
    stage.on('touchstart.hover', this._onHoverDown);
    stage.on('touchend.hover', this._onHoverUp);
    // Во время драга тоже скрываем оверлей
    this._core.nodes.layer.on('dragstart.hover', () => {
      this._destroyHoverTr();
    });
    this._core.nodes.layer.on('dragmove.hover', () => {
      this._destroyHoverTr();
    });
  }

  protected onDetach(core: CoreEngine): void {
    // Снимаем выделение и чистим состояния
    this._clearSelection();

    // Отписки
    core.stage.off('.selection');
    core.stage.off('.hover');
    this._core?.nodes.layer.off('.hover');
    core.eventBus.off('node:removed', this._onNodeRemoved);

    // Снять hover-оверлей
    this._destroyHoverTr();
  }

  // ===================== Selection logic =====================
  private _onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core) return;
    // Только левая кнопка мыши
    if (e.evt.button !== 0) return;

    const stage = this._core.stage;
    const layer = this._core.nodes.layer;

    // Клик по пустому месту
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
                    // После drag вернуть рамку
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
                // Если drag не стартовал — это клик: только тогда снимаем выделение
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
      // Если клик пришёл ВНЕ bbox — снимаем выделение мгновенно
      if (!insideHandled) {
        if (this._options.deselectOnEmptyClick) this._clearSelection();
      }
      return;
    }

    const target = e.target;
    if (!this._options.selectablePredicate(target)) return;

    // Базовый поиск (обычно группа)
    let baseNode = this._findBaseNodeByTarget(target);
    if (!baseNode) return;

    // Если клик пришёл внутри уже выбранной ноды — фиксируем выбор на ней (не перепрыгиваем на группу)
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
    }

    // При зажатом Ctrl — если под курсором зарегистрированная leaf-нода, выбрать её как baseNode
    if (e.evt.ctrlKey) {
      const exact = this._core.nodes.list().find((n) => n.getNode() === target);
      if (exact) {
        baseNode = exact;
      }
    }

    // this._select(baseNode); // uncomment if needed

    // Стартуем перетаскивание сразу, без визуального выделения до окончания drag
    const konvaNode = baseNode.getNode();

    // Порог для «намеренного» движения, чтобы не мешать dblclick
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

    // Если уже идёт перетаскивание — ничего не делаем
    if (typeof konvaNode.isDragging === 'function' && konvaNode.isDragging()) {
      return;
    }

    const hasDraggable = typeof konvaNode.draggable === 'function';
    const prevNodeDraggable = hasDraggable ? konvaNode.draggable() : false;
    const prevStageDraggable = stage.draggable();

    // На время drag делаем ноду перетаскиваемой
    if (hasDraggable) {
      konvaNode.draggable(true);
    }

    // На старте drag отключаем pan сцены
    konvaNode.on('dragstart.selection-once', () => {
      stage.draggable(false);
    });

    // По окончании drag: восстановить состояние сцены/ноды и выделить ноду
    konvaNode.on('dragend.selection-once', () => {
      stage.draggable(prevStageDraggable);
      if (hasDraggable) {
        if (this._options.dragEnabled) {
          konvaNode.draggable(true);
        } else {
          konvaNode.draggable(prevNodeDraggable);
        }
      }
      // После завершения перетаскивания — вернуть визуальное выделение
      this._select(baseNode);
    });
  };

  private _select(node: BaseNode) {
    if (!this._core) return;

    // Сбрасываем предыдущее выделение
    this._clearSelection();

    // Сохраняем и включаем draggable для выбранной ноды (если требуется)
    const konvaNode = node.getNode();
    this._prevDraggable = konvaNode.draggable();
    if (this._options.dragEnabled && typeof konvaNode.draggable === 'function') {
      konvaNode.draggable(true);
    }

    // Визуальный transformer (по желанию)
    this._selected = node;
    this._refreshTransformer();

    // Перетаскивание уже обрабатывается самим Konva Node при draggable(true)
    // Прячем/показываем рамку и хендлеры радиуса на время drag
    konvaNode.on('dragstart.selection', () => {
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
    });
    konvaNode.on('dragmove.selection', () => {
      // Ничего дополнительно, просто перерисовка
      this._core?.stage.batchDraw();
    });
    konvaNode.on('dragend.selection', () => {
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
      this._select(node);
      this._core?.stage.batchDraw();
    });

    // >>> ДОБАВИТЬ: панорамирование сцены при средней/правой кнопке, если нода уже выделена
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
    const node = this._selected.getNode();

    // Вернуть предыдущее состояние draggable
    if (typeof node.draggable === 'function' && this._prevDraggable !== null) {
      node.draggable(this._prevDraggable);
    }
    this._prevDraggable = null;

    // Вернуть состояние draggable у родительской группы, если мы были в режиме редактирования дочерней ноды
    if (this._parentGroupDuringChildEdit) {
      const grp = this._parentGroupDuringChildEdit;
      if (typeof grp.draggable === 'function' && this._parentGroupPrevDraggable !== null) {
        grp.draggable(this._parentGroupPrevDraggable);
      }
      this._parentGroupDuringChildEdit = null;
      this._parentGroupPrevDraggable = null;
    }

    // Снять слушатели drag c namespace
    node.off('.selection');
    node.off('.selection-once');

    // Удалить кастомные хендлеры радиуса
    this._destroyCornerRadiusHandles();
    // Удалить ротационные хендлеры
    this._destroyRotateHandles();

    // Удалить размерный label
    this._destroySizeLabel();

    // Удалить transformer, если был
    if (this._transformer) {
      this._transformer.destroy();
      this._transformer = null;
    }

    this._selected = null;
    this._core?.stage.batchDraw();
  }

  // ===================== Hover (минимально) =====================
  private _ensureHoverTr(): Konva.Transformer {
    if (!this._core) throw new Error('Core is not attached');
    if (this._hoverTr?.getParent()) return this._hoverTr;
    const tr = new Konva.Transformer({
      rotateEnabled: false,
      enabledAnchors: [],
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

  private _onHoverMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core) return;
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const target = e.target;
    // Если зажата кнопка мыши — hover не показываем
    const buttons = typeof e.evt.buttons === 'number' ? e.evt.buttons : 0;
    if (this._isPointerDown || buttons & 1) {
      this._destroyHoverTr();
      return;
    }
    // Наведение вне рабочего слоя — скрыть
    if (target === stage || target.getLayer() !== layer) {
      this._destroyHoverTr();
      return;
    }
    // Найти «владельца»:
    // - по умолчанию ближайшая зарегистрированная группа;
    // - если её нет — ближайший зарегистрированный предок (включая сам таргет);
    // - НО: если есть выделенная нода в этой же группе и ховер по другой ноде из группы — подсвечиваем именно эту ноду.
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
      while (cur) {
        if (registered.has(cur) && cur instanceof Konva.Group) return cur;
        cur = cur.getParent();
      }
      return null;
    };

    const targetOwnerGroup = findNearestRegisteredGroup(target);
    const targetOwnerNode = findNearestRegistered(target);

    const ctrlPressed = e.evt.ctrlKey;
    // При зажатом Ctrl — всегда подсвечиваем leaf-ноду (если она зарегистрирована)
    let owner: Konva.Node | null = ctrlPressed
      ? (targetOwnerNode ?? targetOwnerGroup)
      : (targetOwnerGroup ?? targetOwnerNode);

    // Спец-правило (без Ctrl): если выделена нода внутри той же группы и ховер по ДРУГОЙ ноде группы — подсвечиваем leaf-ноду
    if (!ctrlPressed && this._selected && targetOwnerNode) {
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
      // Если у нас есть группа для ховера и обе ноды под ней, и при этом ховерится не выбранная нода — выбрать targetOwnerNode
      if (
        targetOwnerGroup &&
        inSameGroup(selectedNode, targetOwnerNode, targetOwnerGroup) &&
        selectedNode !== targetOwnerNode
      ) {
        owner = targetOwnerNode;
      }
    }
    // Если так и не нашли — скрыть
    if (!owner) {
      this._destroyHoverTr();
      return;
    }
    // Учитываем пользовательский предикат уже по owner
    if (!this._options.selectablePredicate(owner)) {
      this._destroyHoverTr();
      return;
    }

    // Если навели на уже выделённую ноду/ветку — не дублируем рамку
    if (this._selected) {
      const selectedNode = this._selected.getNode() as unknown as Konva.Node;
      const isAncestor = (a: Konva.Node, b: Konva.Node): boolean => {
        // true, если a — предок b
        let cur: Konva.Node | null = b;
        while (cur) {
          if (cur === a) return true;
          cur = cur.getParent();
        }
        return false;
      };
      // При Ctrl скрываем только если owner === selectedNode (дубликат). Без Ctrl — прежняя логика по родству
      const shouldSuppress = ctrlPressed
        ? owner === selectedNode
        : owner === selectedNode ||
          isAncestor(owner, selectedNode) ||
          isAncestor(selectedNode, owner);
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

    // Очистка предыдущего
    if (this._transformer) {
      this._transformer.destroy();
      this._transformer = null;
    }

    if (!this._options.enableTransformer || !this._selected) return;

    const layer = this._core.nodes.layer;
    const transformer = new Konva.Transformer({
      // Отключаем стандартную ротацию Transformer — вращаем только кастомными хендлерами
      rotateEnabled: false,
      rotationSnapTolerance: 15,
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
    this._transformer = transformer;
    // Растянуть якоря на всю сторону и скрыть их визуально (оставив hit-area)
    this._restyleSideAnchors();
    // Добавить угловые хендлеры для cornerRadius, если поддерживается
    this._setupCornerRadiusHandles(false);
    // Добавить угловые хендлеры ротации
    this._setupRotateHandles();
    // Добавить/обновить размерный label
    this._setupSizeLabel();
    // Во время трансформации (ресайз/скейл) синхронизировать позиции всех оверлеев
    transformer.on('transform.corner-sync', () => {
      // На лету «впитываем» неравномерный масштаб в width/height для Rect,
      // чтобы скругления оставались полукруглыми, а не эллипсами
      const n = this._selected?.getNode() as unknown as Konva.Node | undefined;
      if (n) this._bakeRectScale(n);
      this._restyleSideAnchors();
      this._updateCornerRadiusHandlesPosition();
      this._updateRotateHandlesPosition();
      this._updateSizeLabel();
      this._core?.nodes.layer.batchDraw();
    });
    transformer.on('transformend.corner-sync', () => {
      this._restyleSideAnchors();
      this._updateCornerRadiusHandlesPosition();
      this._updateRotateHandlesPosition();
      this._updateSizeLabel();
      this._core?.nodes.layer.batchDraw();
    });
    // Слушать изменения атрибутов выбранной ноды, если размеры/позиция меняются программно
    const selNode = this._selected.getNode() as unknown as Konva.Node;
    // Снять прежние обработчики, если были, затем повесить новые с namespace
    selNode.off('.overlay-sync');
    const syncOverlays = () => {
      this._restyleSideAnchors();
      this._updateCornerRadiusHandlesPosition();
      this._updateRotateHandlesPosition();
      this._updateSizeLabel();
      this._core?.nodes.layer.batchDraw();
    };
    selNode.on(
      'widthChange.overlay-sync heightChange.overlay-sync scaleXChange.overlay-sync scaleYChange.overlay-sync rotationChange.overlay-sync xChange.overlay-sync yChange.overlay-sync',
      syncOverlays,
    );
    layer.batchDraw();
  }

  // Растянуть side-anchors (top/right/bottom/left) на всю сторону выбранной ноды
  private _restyleSideAnchors() {
    if (!this._core || !this._selected || !this._transformer) return;
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const node = this._selected.getNode();

    const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
    const thicknessPx = 6; // толщина зоны захвата в экранных пикселях

    // Точечная правка для ротации: когда нода повернута, длину сторон берём из «родных» размеров
    // (ширина/высота без трансформаций) умноженных на абсолютный масштаб, а не из bbox.
    // Это предотвращает «перестановку» короткой/длинной стороны.
    // Логический размер для текста лейбла должен соответствовать заданным размерам без учёта обводки
    // поэтому исключаем stroke при вычислении localRect
    const localRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const abs = node.getAbsoluteScale();
    const absX = Math.abs(abs.x) || 1;
    const absY = Math.abs(abs.y) || 1;
    const sideLenW = localRect.width * absX; // фактическая длина верх/низ в экранных координатах
    const sideLenH = localRect.height * absY; // фактическая длина лево/право в экранных координатах
    const rotDeg = (() => {
      const d = node.getAbsoluteTransform().decompose();
      return typeof d.rotation === 'number' ? d.rotation : 0;
    })();
    // Небольшой эпсилон, чтобы не перескакивать при очень малых дрожаниях
    const isRotated = Math.abs(((rotDeg % 180) + 180) % 180) > 0.5;

    const aTop = this._transformer.findOne<Konva.Rect>('.top-center');
    const aRight = this._transformer.findOne<Konva.Rect>('.middle-right');
    const aBottom = this._transformer.findOne<Konva.Rect>('.bottom-center');
    const aLeft = this._transformer.findOne<Konva.Rect>('.middle-left');

    if (aTop) {
      const width = isRotated ? sideLenW : bbox.width;
      const height = thicknessPx;
      aTop.setAttrs({ opacity: 0, width, height, offsetX: width / 2, offsetY: 0 });
    }
    if (aBottom) {
      const width = isRotated ? sideLenW : bbox.width;
      const height = thicknessPx;
      aBottom.setAttrs({ opacity: 0, width, height, offsetX: width / 2, offsetY: height });
    }
    if (aLeft) {
      const width = thicknessPx;
      const height = isRotated ? sideLenH : bbox.height;
      aLeft.setAttrs({ opacity: 0, width, height, offsetX: 0, offsetY: height / 2 });
    }
    if (aRight) {
      const width = thicknessPx;
      const height = isRotated ? sideLenH : bbox.height;
      aRight.setAttrs({ opacity: 0, width, height, offsetX: width, offsetY: height / 2 });
    }
    // Обновлять размеры якорей при изменениях масштаба/позиции/трансформации (coalescing в один кадр)

    // переменная нужна, если будет слишком много событий и чтобы они за раз в один кадр не попадали несколько одинаковых событий
    let anchorsPending = false;
    const scheduleUpdate = () => {
      if (anchorsPending) return;
      anchorsPending = true;
      Konva.Util.requestAnimFrame(() => {
        anchorsPending = false;
        this._restyleSideAnchors();
        this._updateSizeLabel();
        this._core?.nodes.layer.batchDraw();
      });
    };

    // Единый сброс слушателей нашего namespace и компактные подписки
    stage.off('.selection-anchors');
    layer.off('.selection-anchors');
    node.off('.selection-anchors');
    this._transformer.off('.selection-anchors');

    // Stage: колесо/resize + программные position/scale изменения (стрелки, +/-)
    stage.on(
      [
        'wheel.selection-anchors',
        'resize.selection-anchors',
        'xChange.selection-anchors',
        'yChange.selection-anchors',
        'positionChange.selection-anchors',
        'scaleXChange.selection-anchors',
        'scaleYChange.selection-anchors',
        'scaleChange.selection-anchors',
      ].join(' '),
      scheduleUpdate,
    );

    // Layer: если пан/зум реализован через слой
    layer.on(
      [
        'xChange.selection-anchors',
        'yChange.selection-anchors',
        'positionChange.selection-anchors',
        'scaleXChange.selection-anchors',
        'scaleYChange.selection-anchors',
        'scaleChange.selection-anchors',
      ].join(' '),
      scheduleUpdate,
    );

    // Node: движение и трансформации выбранной ноды
    node.on('dragmove.selection-anchors transform.selection-anchors', scheduleUpdate);

    // Transformer: синхронное обновление в процессе трансформации (без лагов) и финальное через schedule
    this._transformer.on('transform.selection-anchors', () => {
      // немедленно обновить без requestAnimFrame
      this._updateCornerRadiusHandlesPosition();
      this._updateRotateHandlesPosition();
      this._updateSizeLabel();
      this._core?.nodes.layer.batchDraw();
    });
    this._transformer.on('transformend.selection-anchors', scheduleUpdate);

    // Параллельно обновляем позиции угловых хендлеров радиуса
    this._updateCornerRadiusHandlesPosition();
    // Обновляем позиции ротационных хендлеров
    this._updateRotateHandlesPosition();
    // И обновим позицию/текст размерного label
    this._updateSizeLabel();
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

    const makeHandle = (name: string): Konva.Circle => {
      const c = new Konva.Circle({
        name,
        radius: 4,
        width: 25,
        height: 25,
        fill: '#ffffff',
        stroke: '#2b83ff',
        strokeWidth: 1.5,
        // Делаем хендлер невидимым визуально, но сохраняем интерактивность
        opacity: 0,
        // Увеличим зону попадания курсора, чтобы было легче навести
        hitStrokeWidth: 16,
        draggable: true,
        dragOnTop: true,
        listening: true,
      });
      return c;
    };

    const tl = makeHandle('rotate-tl');
    const tr = makeHandle('rotate-tr');
    const br = makeHandle('rotate-br');
    const bl = makeHandle('rotate-bl');
    // Добавляем по одному, чтобы исключить проблемы с varargs в рантайме/типах
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
        // Вариант 2: не меняем offset/pivot. Фиксируем абсолютный центр для компенсации смещения в dragmove
        const center = this._getNodeCenterAbs(node);
        this._rotateCenterAbsStart = center;
        const p = this._core?.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const start = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
        this._rotateDragState = { base: dec.rotation || 0, start };
        // Отключим drag сцены и самой ноды
        if (typeof node.draggable === 'function') node.draggable(false);
        this._core?.stage.draggable(false);
        // Курсор: во время ротации показываем 'grabbing'
        if (this._core) this._core.stage.container().style.cursor = 'grabbing';
      });
      h.on('dragmove.rotate', (e: Konva.KonvaEventObject<DragEvent>) => {
        if (!this._core || !this._selected || !this._rotateDragState) return;
        const node = this._selected.getNode() as unknown as Konva.Node;
        // Используем зафиксированный центр, если он есть, чтобы исключить дрейф
        const centerRef = this._rotateCenterAbsStart ?? this._getNodeCenterAbs(node);
        const pointer = this._core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const curr = (Math.atan2(pointer.y - centerRef.y, pointer.x - centerRef.x) * 180) / Math.PI;
        let rot = this._rotateDragState.base + (curr - this._rotateDragState.start);
        // Snapping как у Transformer, но с корректной нормализацией углов
        const norm = (deg: number) => {
          let x = deg % 360;
          if (x < 0) x += 360;
          return x;
        };
        const angDiff = (a: number, b: number) => {
          // минимальная signed-разница между a и b по модулю 360 в диапазоне [-180, 180)
          let d = norm(a - b + 180) - 180;
          return d;
        };
        // Snap только при зажатом Shift. Без Shift — свободная ротация
        if (e.evt.shiftKey) {
          const tr = this._transformer;
          let snaps: number[] | undefined;
          let tol = 5;
          if (tr) {
            const s = tr.rotationSnaps();
            if (Array.isArray(s)) snaps = s.map((v) => norm(v)); // нормализуем снэпы (360 -> 0)
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
                best = a; // используем нормализованный угол снэпа
                bestDiff = d;
              }
            }
            if (bestDiff !== Infinity) rot = best;
          }
        }
        node.rotation(rot);
        // Компенсация позиции: удерживаем центр неизменным
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
        // Обновить рамку трансформера немедленно
        this._transformer?.forceUpdate();
        this._core.nodes.layer.batchDraw();
        this._updateRotateHandlesPosition();
        this._updateCornerRadiusHandlesPosition();
        // Обновить позицию и текст размерного label под новое положение/вращение
        this._updateSizeLabel();
      });
      h.on('dragend.rotate', () => {
        this._rotateDragState = null;
        this._rotateCenterAbsStart = null;
        // Вернём pan сцены, draggable ноды — согласно настройкам
        if (this._selected) {
          const node = this._selected.getNode() as unknown as Konva.Node;
          if (this._options.dragEnabled && typeof node.draggable === 'function') {
            node.draggable(true);
          }
        }
        this._core?.stage.draggable(true);
        this._updateRotateHandlesPosition();
        this._updateSizeLabel();
        this._core?.nodes.layer.batchDraw();
        // Вернуть курсор в состояние 'grab' при окончании перетаскивания хендлера
        if (this._core) this._core.stage.container().style.cursor = 'grab';
      });
    };

    bindRotate(tl);
    bindRotate(tr);
    bindRotate(br);
    bindRotate(bl);

    // Hover-курсоры для хендлеров ротации
    const setCursor = (c: string) => {
      if (this._core) this._core.stage.container().style.cursor = c;
    };
    if (this._rotateHandles.tl) {
      this._rotateHandles.tl.on('mouseenter.rotate-cursor', () => {
        setCursor('grab');
      });
      this._rotateHandles.tl.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.tr) {
      this._rotateHandles.tr.on('mouseenter.rotate-cursor', () => {
        setCursor('grab');
      });
      this._rotateHandles.tr.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.br) {
      this._rotateHandles.br.on('mouseenter.rotate-cursor', () => {
        setCursor('grab');
      });
      this._rotateHandles.br.on('mouseleave.rotate-cursor', () => {
        setCursor('default');
      });
    }
    if (this._rotateHandles.bl) {
      this._rotateHandles.bl.on('mouseenter.rotate-cursor', () => {
        setCursor('grab');
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
    // ВАЖНО: учитываем local.x/local.y, иначе центр смещается
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
    const offset = 12; // вынесем хендлер чуть наружу от угла вдоль направления от центра
    // ВАЖНО: corners и центр нужно брать с учётом local.x/local.y
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

    // Компенсация зума: фиксированный визуальный размер
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
    // Z-index наверх
    this._rotateHandlesGroup.moveToTop();
  }

  // ===================== Size Label (width × height) =====================
  private _setupSizeLabel() {
    if (!this._core || !this._selected) return;
    const layer = this._core.nodes.layer;

    // Уничтожить предыдущий, если был
    this._destroySizeLabel();

    // Собираем Konva.Label с Tag и Text
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

  private _updateSizeLabel() {
    if (!this._core || !this._selected || !this._sizeLabel) return;
    const stage = this._core.stage;
    const node = this._selected.getNode();
    // Визуальный bbox — для позиционирования (привязка к нижнему центру экрана)
    const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
    // Логический размер — независим от зума сцены: localRect * (absNodeScale / absStageScale)
    const localRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      // Исключаем stroke/border, чтобы показывать реальные размеры ноды
      skipStroke: true,
    });
    const nodeDec = node.getAbsoluteTransform().decompose();
    const stageDec = stage.getAbsoluteTransform().decompose();
    const nodeAbsX = Math.abs(nodeDec.scaleX) || 1;
    const nodeAbsY = Math.abs(nodeDec.scaleY) || 1;
    const stageAbsX = Math.abs(stageDec.scaleX) || 1;
    const stageAbsY = Math.abs(stageDec.scaleY) || 1;
    const logicalW = localRect.width * (nodeAbsX / stageAbsX);
    const logicalH = localRect.height * (nodeAbsY / stageAbsY);
    const w = Math.max(0, Math.round(logicalW));
    const h = Math.max(0, Math.round(logicalH));

    const text = this._sizeLabel.getText();
    text.text(String(w) + ' × ' + String(h));

    // Позиционируем по нижнему центру bbox с небольшим отступом вниз
    const offset = 8; // пикселей
    const centerX = bbox.x + bbox.width / 2;
    const bottomY = bbox.y + bbox.height + offset;

    // Синхронно ставим абсолютную позицию и центровку без кадра задержки
    const labelRect = this._sizeLabel.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const labelW = labelRect.width;
    this._sizeLabel.absolutePosition({ x: centerX, y: bottomY });
    this._sizeLabel.offsetX(labelW / 2);
    this._sizeLabel.offsetY(0);
    // Компенсировать любые трансформации родителя (слоя/сцены): инверсия абсолютного масштаба родителя
    const parent = this._sizeLabel.getParent();
    if (parent) {
      const pDec = parent.getAbsoluteTransform().decompose();
      const invScaleX = 1 / (Math.abs(pDec.scaleX) || 1);
      const invScaleY = 1 / (Math.abs(pDec.scaleY) || 1);
      this._sizeLabel.scale({ x: invScaleX, y: invScaleY });
    }
    this._sizeLabel.moveToTop();
    if (this._transformer) this._transformer.moveToTop();
    // Поднять круглые corner‑handles выше трансформера
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
    // Поддерживаем только Konva.Rect, у которого есть cornerRadius()
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
    // Если все одинаковые, можно ставить числом, но массив тоже валиден в Konva
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
    this._cornerHandlesGroup = group;

    // ===== Хелперы =====
    // Квадраты упираются в центральную линию по X или Y (что раньше)
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

    // ===== Визуализация квадратов =====
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
        hitStrokeWidth: 16, // увеличенная зона попадания — меньше «срывов»
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

    // ===== “Умный роутинг” при совпадении хэндлеров =====
    type Key = 'tl' | 'tr' | 'br' | 'bl';
    const keyToIndex: Record<Key, 0 | 1 | 2 | 3> = { tl: 0, tr: 1, br: 2, bl: 3 };
    let routeEnabled = false; // на этом драге выбираем угол по направлению?
    let routeActive: Key | null = null; // какой угол выбран направлением
    let lastAltOnly = false; // Alt зафиксированный в текущем драге

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

    // Выбор routeActive по абсолютной позиции указателя (или предложенной pos из dragBoundFunc)
    const pickRouteByAbsPos = (posAbs: Konva.Vector2d) => {
      if (!routeEnabled || routeActive) return;
      const c = getCenterAbs();
      let vx = posAbs.x - c.x,
        vy = posAbs.y - c.y;
      const mag = Math.hypot(vx, vy);
      if (mag < 0.1) return; // микрозона около центра — не выбираем
      vx /= mag;
      vy /= mag;

      // Диагональные направления «центр→угол» в абсолюте (устойчиво к поворотам/скейлам)
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

    // ===== Ограничитель + пересчёт радиуса внутри dragBoundFunc (устойчив к выходу курсора) =====
    const makeBound = (defKey: Key) => (pos: Konva.Vector2d) => {
      // Выбрать угол по направлению "центр → pos" если мы в умном режиме
      pickRouteByAbsPos(pos);
      const key = routeActive ?? defKey;

      // Проекция на диагональ соответствующего квадрата
      const { snappedAbs, r: t, meta: s } = snapToCornerDiagonal(pos, key);

      // 0..100% → пиксельный радиус (целое число)
      const w = node.width();
      const hgt = node.height();
      const maxR = Math.max(0, Math.min(w, hgt) / 2);
      const percent = s.side > 0 ? t / s.side : 0;
      let rPix = Math.round(percent * maxR);
      rPix = Math.max(0, Math.min(rPix, maxR));

      // Применить радиус (Alt — только выбранный угол, иначе все 4)
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

      // Обновить визуалку и лейбл (делаем здесь — даже если dragmove не пришёл)
      this._showRadiusLabelForCorner(idx);
      updatePositions();
      this._core?.nodes.layer.batchDraw();

      return snappedAbs; // Конва поставит хэндлер туда, куда мы «снэпнули»
    };

    tl.dragBoundFunc(makeBound('tl'));
    tr.dragBoundFunc(makeBound('tr'));
    br.dragBoundFunc(makeBound('br'));
    bl.dragBoundFunc(makeBound('bl'));

    // ===== Обновление позиций (ручки + квадраты) =====
    const updatePositions = () => {
      const { tl, tr, br, bl } = this._cornerHandles;
      if (!tl || !tr || !br || !bl) return;

      const nodeAbsT = node.getAbsoluteTransform().copy();
      const layerInvAbsT = layer.getAbsoluteTransform().copy().invert();
      const toAbs = (p: { x: number; y: number }) => nodeAbsT.point(p);
      const toLayer = (p: { x: number; y: number }) => layerInvAbsT.point(nodeAbsT.point(p));

      const squares = computeCornerSquares();
      const radii = this._getCornerRadiusArray(node);

      const placeHandle = (key: Key, idx: 0 | 1 | 2 | 3, h: Konva.Circle) => {
        const s = squares[key]; // { corner, sign, side }
        const w = node.width();
        const hgt = node.height();
        const maxR = Math.max(0, Math.min(w, hgt) / 2);

        const rPix = Math.max(0, Math.min(maxR, radii[idx] || 0)); // radii[] уже в пикселях
        const percent = maxR > 0 ? rPix / maxR : 0; // 0..1
        const t = Math.max(0, Math.min(s.side, percent * s.side)); // обратно в ось-смещение квадрата

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

      // фиксированный визуальный размер кружков
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

    // ===== Drag-логика с роутингом (минимальная) =====
    const onDragStartRoute = (h: Konva.Circle, ev?: Konva.KonvaEventObject<DragEvent>) => {
      lastAltOnly = !!(ev?.evt as MouseEvent | undefined)?.altKey; // зафиксировать Alt на старте
      const startAbs = h.getAbsolutePosition();
      // включаем умный режим если выполнено ЛЮБОЕ из условий:
      // - рядом с центром-точкой
      // - рядом с любой центральной линией
      // - рядом одновременно несколько хэндлеров (зона слияния)
      routeEnabled =
        isNearCenterPoint(startAbs, 8) ||
        isNearCenterLine(startAbs, 6) ||
        anyHandlesOverlapNear(startAbs, 8);

      routeActive = null;

      if (routeEnabled) {
        const p = this._core?.stage.getPointerPosition() ?? startAbs;
        pickRouteByAbsPos(p); // сразу выбрать угол, чтобы не было кадра неопределённости
      }
    };

    const dragHandler =
      (_defaultKey: Key, _defaultIndex: 0 | 1 | 2 | 3) =>
      (e: Konva.KonvaEventObject<DragEvent>) => {
        // только обновляем Alt во время драга; остальное делает dragBoundFunc
        lastAltOnly = (e.evt as MouseEvent).altKey;
      };

    const dragEndReset = () => {
      routeEnabled = false;
      routeActive = null;
      lastAltOnly = false;
    };

    // биндинги
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

    // ===== Лейблы (как было) =====
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

    // Блокируем перетаскивание ноды на время правки радиуса
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

    // ===== Автосинк при пане/зуме/трансформациях =====
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
      this._transformer.on('transform' + ns, () => {
        updatePositions();
        this._core?.nodes.layer.batchDraw();
      });
      this._transformer.on('transformend' + ns, schedule);
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
    // Сброс курсора, если вдруг остался
    if (this._core) this._core.stage.container().style.cursor = 'default';
    // Уничтожить и radius label
    this._destroyRadiusLabel();
    // Снять подписки overlay-sync с выбранной ноды, чтобы не держать висящие обработчики
    if (this._selected) {
      const n = this._selected.getNode() as unknown as Konva.Node;
      n.off('.overlay-sync');
    }
  }

  // «Запекает» неравномерный масштаб в размеры прямоугольника, сохраняя абсолютную позицию
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
    // Восстановить абсолютную позицию ноды
    node.setAbsolutePosition(absBefore);
  }

  private _updateCornerRadiusHandlesPosition() {
    if (!this._core || !this._selected || !this._cornerHandlesGroup) return;
    const nodeRaw = this._selected.getNode() as unknown as Konva.Node;
    if (!this._isCornerRadiusSupported(nodeRaw)) return;
    const node = nodeRaw;

    const width = node.width();
    const height = node.height();
    if (width <= 0 || height <= 0) return;

    const tr = node.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);

    // Инвариантный визуальный отступ 12px: приведём к локальным координатам, чтобы на экране он оставался постоянным
    const absScale = node.getAbsoluteScale();
    const invX = 1 / (Math.abs(absScale.x) || 1);
    const invY = 1 / (Math.abs(absScale.y) || 1);
    const offXLocal = 12 * invX;
    const offYLocal = 12 * invY;
    // Абсолютные точки для каждого угла будут вычислены из локальных точек ниже

    const radii = this._getCornerRadiusArray(node);
    const maxR = Math.min(width, height) / 2 || 1;
    // Вектор направления в локальных координатах для каждого угла
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

    const p0Local = {
      x: offXLocal + dirLocal[0].x * Math.min(maxR, radii[0]),
      y: offYLocal + dirLocal[0].y * Math.min(maxR, radii[0]),
    };
    const p1Local = {
      x: width - offXLocal + dirLocal[1].x * Math.min(maxR, radii[1]),
      y: offYLocal + dirLocal[1].y * Math.min(maxR, radii[1]),
    };
    const p2Local = {
      x: width - offXLocal + dirLocal[2].x * Math.min(maxR, radii[2]),
      y: height - offYLocal + dirLocal[2].y * Math.min(maxR, radii[2]),
    };
    const p3Local = {
      x: offXLocal + dirLocal[3].x * Math.min(maxR, radii[3]),
      y: height - offYLocal + dirLocal[3].y * Math.min(maxR, radii[3]),
    };

    const p0 = mapAbs(p0Local);
    const p1 = mapAbs(p1Local);
    const p2 = mapAbs(p2Local);
    const p3 = mapAbs(p3Local);

    if (this._cornerHandles.tl) this._cornerHandles.tl.absolutePosition(p0);
    if (this._cornerHandles.tr) this._cornerHandles.tr.absolutePosition(p1);
    if (this._cornerHandles.br) this._cornerHandles.br.absolutePosition(p2);
    if (this._cornerHandles.bl) this._cornerHandles.bl.absolutePosition(p3);

    // Компенсировать масштаб родителя (слоя/сцены), чтобы кружки были постоянного размера,
    // не двигая их координаты: масштабируем каждый кружок, а НЕ всю группу
    const grpParent = this._cornerHandlesGroup.getParent();
    if (grpParent) {
      const pd = grpParent.getAbsoluteTransform().decompose();
      const invX = 1 / (Math.abs(pd.scaleX) || 1);
      const invY = 1 / (Math.abs(pd.scaleY) || 1);
      if (this._cornerHandles.tl) this._cornerHandles.tl.scale({ x: invX, y: invY });
      if (this._cornerHandles.tr) this._cornerHandles.tr.scale({ x: invX, y: invY });
      if (this._cornerHandles.br) this._cornerHandles.br.scale({ x: invX, y: invY });
      if (this._cornerHandles.bl) this._cornerHandles.bl.scale({ x: invX, y: invY });
    }
    // Гарантировать z-index над квадратными якорями трансформера
    this._cornerHandlesGroup.moveToTop();
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
    // Расположим левее и чуть ниже точки (handle) на 8px
    const offset = { x: 8, y: 8 };
    lbl.absolutePosition({ x: absPt.x - offset.x, y: absPt.y + offset.y });
    lbl.offsetX(labelW);
    lbl.offsetY(0);
    // Компенсация масштаба родителя
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
    // Если уже выбрана дочерняя нода и клик пришёл по ней (или её внутренним частям),
    // отдаём приоритет именно ей, чтобы drag шёл по дочернему элементу, а не по группе
    if (this._selected) {
      const selectedKonva = this._selected.getNode() as unknown as Konva.Node;
      if (selectedKonva === target) return this._selected;
      if (typeof selectedKonva.isAncestorOf === 'function' && selectedKonva.isAncestorOf(target)) {
        return this._selected;
      }
    }
    // Ищем соответствующую BaseNode по ссылке на внутренний konvaNode
    // 1) Сначала ищем родителя: если нода-обёртка (например, Group) является предком кликаемого target — выбираем её
    for (const n of this._core.nodes.list()) {
      const node = n.getNode() as unknown as Konva.Node;
      if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(target)) {
        return n;
      }
    }
    // 2) Если предок не найден — проверяем точное совпадение
    for (const n of this._core.nodes.list()) {
      if (n.getNode() === target) return n;
    }
    return null;
  }

  private _onNodeRemoved = (removed: BaseNode) => {
    // Если удалили выделенную ноду — снять выделение
    if (this._selected && this._selected === removed) {
      this._clearSelection();
    }
  };
}
