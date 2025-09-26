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
  }

  protected onDetach(core: CoreEngine): void {
    // Снимаем выделение и чистим состояния
    this._clearSelection();

    // Отписки
    core.stage.off('.selection');
    core.eventBus.off('node:removed', this._onNodeRemoved);
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
      // Если есть выделенная нода и клик пришёл в её bbox (в т.ч. по "пустому" месту внутри рамки),
      // не снимаем выделение, а запускаем перетаскивание этой ноды
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
            // Стартуем drag для выбранной ноды
            if (typeof selKonva.startDrag === 'function') {
              const dnode = selKonva as DraggableNode;
              let prevNodeDraggable =
                typeof dnode.draggable === 'function' ? dnode.draggable() : false;
              if (typeof dnode.draggable === 'function' && !prevNodeDraggable)
                dnode.draggable(true);
              const prevStageDraggable = stage.draggable();
              selKonva.on('dragstart.selection-once-bbox', () => {
                stage.draggable(false);
              });
              selKonva.on('dragend.selection-once-bbox', () => {
                stage.draggable(prevStageDraggable);
                if (typeof dnode.draggable === 'function') {
                  dnode.draggable(this._options.dragEnabled ? true : prevNodeDraggable);
                }
                // Гарантированно показать рамку выделения после перетаскивания из bbox
                if (this._selected) {
                  this._refreshTransformer();
                  this._core?.nodes.layer.batchDraw();
                }
                selKonva.off('.selection-once-bbox');
              });
              selKonva.startDrag();
              e.cancelBubble = true;
              return; // не снимать выделение
            }
          }
        }
      }
      if (this._options.deselectOnEmptyClick) this._clearSelection();
      return;
    }

    const target = e.target;
    if (!this._options.selectablePredicate(target)) return;

    const baseNode = this._findBaseNodeByTarget(target);
    if (!baseNode) return;

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
      rotateEnabled: true,
      rotationSnaps: [0, 90, 180, 270, 360],
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
    this._setupCornerRadiusHandles();
    // Добавить/обновить размерный label
    this._setupSizeLabel();
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
    const localRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: false,
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
      this._updateSizeLabel();
      this._core?.nodes.layer.batchDraw();
    });
    this._transformer.on('transformend.selection-anchors', scheduleUpdate);

    // Параллельно обновляем позиции угловых хендлеров радиуса
    this._updateCornerRadiusHandlesPosition();
    // И обновим позицию/текст размерного label
    this._updateSizeLabel();
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
      skipStroke: false,
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

  private _setupCornerRadiusHandles() {
    if (!this._core || !this._selected) return;
    const konvaNode = this._selected.getNode() as unknown as Konva.Node;
    if (!this._isCornerRadiusSupported(konvaNode)) return;

    const layer = this._core.nodes.layer;

    // Уничтожить предыдущие
    this._destroyCornerRadiusHandles();

    const group = new Konva.Group({ name: 'corner-radius-handles-group', listening: true });
    layer.add(group);
    // Обеспечить, чтобы хендлеры были поверх трансформера
    group.moveToTop();
    this._cornerHandlesGroup = group;

    const makeHandle = (name: string): Konva.Circle => {
      const handle = new Konva.Circle({
        name,
        radius: 4,
        fill: '#ffffff',
        stroke: '#4a90e2',
        strokeWidth: 1.5,
        draggable: true,
        dragOnTop: true,
      });
      // Cursor hints
      handle.on('mouseenter.corner-radius', () => {
        if (this._core) {
          this._core.stage.container().style.cursor = 'default';
        }
      });
      // handle.on('mouseleave.corner-radius', () => {
      //   if (this._core) {
      //     this._core.stage.container().style.cursor = 'default';
      //   }
      // });
      return handle;
    };

    const tl = makeHandle('corner-radius-tl');
    const tr = makeHandle('corner-radius-tr');
    const br = makeHandle('corner-radius-br');
    const bl = makeHandle('corner-radius-bl');

    group.add(tl, tr, br, bl);
    this._cornerHandles = { tl, tr, br, bl };

    const dragHandler = (cornerIndex: 0 | 1 | 2 | 3) => (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!this._core || !this._selected) return;
      const nodeRaw = this._selected.getNode() as unknown as Konva.Node;
      if (!this._isCornerRadiusSupported(nodeRaw)) return;
      const node = nodeRaw;

      const width = node.width();
      const height = node.height();
      if (width <= 0 || height <= 0) return;

      // Абсолютные точки: смещённый старт (как в _updateCornerRadiusHandlesPosition) и центр
      const absT = node.getAbsoluteTransform().copy();
      const mapAbs = (pt: { x: number; y: number }) => absT.point(pt);
      const OFFSET = 12; // тот же визуальный отступ внутрь
      let cornerLocalX = 0;
      let cornerLocalY = 0;
      switch (cornerIndex) {
        case 0:
          cornerLocalX = OFFSET;
          cornerLocalY = OFFSET;
          break;
        case 1:
          cornerLocalX = width - OFFSET;
          cornerLocalY = OFFSET;
          break;
        case 2:
          cornerLocalX = width - OFFSET;
          cornerLocalY = height - OFFSET;
          break;
        case 3:
          cornerLocalX = OFFSET;
          cornerLocalY = height - OFFSET;
          break;
      }
      const cornerAbs = mapAbs({ x: cornerLocalX, y: cornerLocalY });
      const centerAbs = mapAbs({ x: width / 2, y: height / 2 });
      const maxR = Math.min(width, height) / 2;

      // Проецируем текущую позицию курсора/хендлера на отрезок corner->center
      const handle = e.target as Konva.Circle;
      const p = handle.getAbsolutePosition();
      const vx = centerAbs.x - cornerAbs.x;
      const vy = centerAbs.y - cornerAbs.y;
      const vLen2 = vx * vx + vy * vy || 1;
      const wx = p.x - cornerAbs.x;
      const wy = p.y - cornerAbs.y;
      let t = (wx * vx + wy * vy) / vLen2;
      t = Math.max(0, Math.min(1, t));
      const r = t * maxR;

      // Зафиксировать хендлер на линии (исключая отрицательное движение за старт)
      const snapped = { x: cornerAbs.x + vx * t, y: cornerAbs.y + vy * t };
      handle.absolutePosition(snapped);

      const current = this._getCornerRadiusArray(node);
      // DragEvent наследует MouseEvent, поэтому доступны ctrlKey/metaKey
      const me = e.evt as MouseEvent;
      const onlyThisCorner = me.altKey;
      if (!onlyThisCorner) {
        current[cornerIndex] = r;
      } else {
        current[0] = r;
        current[1] = r;
        current[2] = r;
        current[3] = r;
      }
      this._setCornerRadiusArray(node, current);
      this._updateCornerRadiusHandlesPosition();
      this._core.nodes.layer.batchDraw();
    };

    tl.on('dragmove.corner-radius', dragHandler(0));
    tr.on('dragmove.corner-radius', dragHandler(1));
    br.on('dragmove.corner-radius', dragHandler(2));
    bl.on('dragmove.corner-radius', dragHandler(3));

    // ===== Radius label: показать при hover/drag, скрыть при leave/end =====
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

    // Блокируем перетаскивание выбранной ноды на время правки радиуса
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

    // Инициализировать позиции
    this._updateCornerRadiusHandlesPosition();
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
    interface Point {
      x: number;
      y: number;
    }
    const cornerAbsPoints: [Point, Point, Point, Point] = [
      mapAbs({ x: 12, y: 12 }),
      mapAbs({ x: width - 12, y: 12 }),
      mapAbs({ x: width - 12, y: height - 12 }),
      mapAbs({ x: 12, y: height - 12 }),
    ];
    const centerAbs = mapAbs({ x: width / 2, y: height / 2 });

    const radii = this._getCornerRadiusArray(node);
    const maxR = Math.min(width, height) / 2 || 1;
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });

    const t0 = Math.max(0, Math.min(1, radii[0] / maxR));
    const t1 = Math.max(0, Math.min(1, radii[1] / maxR));
    const t2 = Math.max(0, Math.min(1, radii[2] / maxR));
    const t3 = Math.max(0, Math.min(1, radii[3] / maxR));
    const p0 = lerp(cornerAbsPoints[0], centerAbs, t0);
    const p1 = lerp(cornerAbsPoints[1], centerAbs, t1);
    const p2 = lerp(cornerAbsPoints[2], centerAbs, t2);
    const p3 = lerp(cornerAbsPoints[3], centerAbs, t3);

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
