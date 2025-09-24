import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';

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
      if (this._options.deselectOnEmptyClick) this._clearSelection();
      return;
    }

    const target = e.target;
    if (!this._options.selectablePredicate(target)) return;

    const baseNode = this._findBaseNodeByTarget(target);
    if (!baseNode) return;

    // Стартуем перетаскивание сразу, без визуального выделения до окончания drag
    const konvaNode = baseNode.getNode();

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

    // Немедленно запускаем перетаскивание
    if (typeof konvaNode.startDrag === 'function') {
      konvaNode.startDrag();
    }
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
    // Добавим лёгкую перерисовку
    konvaNode.on('dragmove.selection', () => {
      if (this._transformer?.visible()) {
        this._transformerWasVisibleBeforeDrag = true;
        this._transformer.visible(false);
      }
      this._core?.stage.batchDraw();
    });
    konvaNode.on('dragend.selection', () => {
      if (this._transformer?.visible() && this._transformerWasVisibleBeforeDrag) {
        this._transformerWasVisibleBeforeDrag = false;
        this._transformer.visible(true);
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

    // Снять слушатели drag c namespace
    node.off('.selection');
    node.off('.selection-once');

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
      rotateEnabled: false,
      // Можно расширить опциями плагина при необходимости
    });
    layer.add(transformer);
    transformer.nodes([this._selected.getNode() as unknown as Konva.Node]);
    this._transformer = transformer;
    layer.batchDraw();
  }

  // ===================== Helpers =====================
  private _findBaseNodeByTarget(target: Konva.Node): BaseNode | null {
    if (!this._core) return null;
    // Ищем соответствующую BaseNode по ссылке на внутренний konvaNode
    for (const n of this._core.nodes.list()) {
      if (n.getNode() === target || target.isAncestorOf(n.getNode() as unknown as Konva.Node)) {
        return n;
      }
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
