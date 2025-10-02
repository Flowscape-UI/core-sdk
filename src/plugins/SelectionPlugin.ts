import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import { MultiGroupController } from '../utils/MultiGroupController';
import { restyleSideAnchorsForTr as restyleSideAnchorsUtil } from '../utils/OverlayAnchors';
import { makeRotateHandle } from '../utils/RotateHandleFactory';
import { OverlayFrameManager } from '../utils/OverlayFrameManager';

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
  // Автопанорамирование мира при перетаскивании у краёв экрана
  autoPanEnabled?: boolean;
  // Ширина зоны у края экрана (px)
  autoPanEdgePx?: number;
  // Максимальная скорость автопана в px/кадр
  autoPanMaxSpeedPx?: number;
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
  // Флаг подавления показа corner-radius хендлеров во время трансформации
  private _cornerHandlesSuppressed = false;
  // Сохранённая позиция противоположного угла при старте трансформации (для фиксации origin)
  private _transformOppositeCorner: { x: number; y: number } | null = null;
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
  // Сохранённое состояние stage.draggable() перед началом ротации
  private _prevStageDraggableBeforeRotate: boolean | null = null;

  // RAF-id для коалесцирования синхронизации оверлеев во время зума/панорамирования мира
  private _worldSyncRafId: number | null = null;
  // Ссылка на обработчик событий камеры для on/off
  private _onCameraZoomEvent: (() => void) | null = null;

  // Минимальная hover-рамка (синяя граница при наведении)
  private _hoverTr: Konva.Transformer | null = null;
  private _isPointerDown = false;

  // Автопанорамирование мира при перетаскивании у краёв экрана
  private _autoPanRafId: number | null = null;
  private _autoPanActive = false;
  private _autoPanEdgePx: number; // ширина зоны у края экрана (px)
  private _autoPanMaxSpeedPx: number; // макс. скорость автопана в px/кадр
  private _draggingNode: Konva.Node | null = null; // текущая нода в drag

  // --- Пропорциональный ресайз по Shift для угловых хендлеров ---
  private _ratioKeyPressed = false;
  private _onGlobalKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onGlobalKeyUp: ((e: KeyboardEvent) => void) | null = null;

  // Временная мульти-группа (Shift+Click)
  private _tempMultiSet = new Set<BaseNode>();
  private _tempMultiGroup: Konva.Group | null = null;
  private _tempMultiTr: Konva.Transformer | null = null;
  // Единый менеджер оверлеев для временной группы
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
      zIndex: number;
      abs: { x: number; y: number };
      prevDraggable: boolean | null;
    }
  >();

  public getMultiGroupController(): MultiGroupController {
    if (!this._core) throw new Error('Core is not attached');
    this._multiCtrl ??= new MultiGroupController(this._core, {
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
          // Смещение мира так, чтобы «подтягивать» поле под курсор (в экранных пикселях)
          world.x(world.x() - vx);
          world.y(world.y() - vy);
          // Компенсация для перетаскиваемой ноды: оставляем под курсором
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
   * Отложенная перерисовка (throttling)
   * Группирует множественные вызовы batchDraw в один
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

  // Режим редактирования дочерней ноды внутри группы: хранение состояния родительской группы
  private _parentGroupDuringChildEdit: Konva.Group | null = null;
  private _parentGroupPrevDraggable: boolean | null = null;

  // Кэш для оптимизации
  private _dragMoveScheduled = false;
  private _batchDrawScheduled = false;

  // ОПТИМИЗАЦИЯ: Throttling для mousemove
  private _lastHoverMoveTime = 0;
  private _hoverMoveThrottle = 16; // 60 FPS

  // ОПТИМИЗАЦИЯ: Debouncing для UI updates (size label, rotate handles, etc.)
  private _uiUpdateScheduled = false;

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

    // Инициализация приватных полей автопана из опций
    this._autoPanEdgePx = this._options.autoPanEdgePx;
    this._autoPanMaxSpeedPx = this._options.autoPanMaxSpeedPx;
  }

  public setOptions(patch: Partial<SelectionPluginOptions>) {
    this._options = { ...this._options, ...patch } as typeof this._options;
    // Обновляем Transformer под новое состояние опций
    if (this._core) this._refreshTransformer();
    // Применяем новые значения автопана к приватным полям, если заданы
    if (typeof patch.autoPanEdgePx === 'number') this._autoPanEdgePx = patch.autoPanEdgePx;
    if (typeof patch.autoPanMaxSpeedPx === 'number')
      this._autoPanMaxSpeedPx = patch.autoPanMaxSpeedPx;
    // Если автопан был выключен — остановить цикл
    if (patch.autoPanEnabled === false) this._stopAutoPanLoop();
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    // Инициализация контроллера временной мульти‑группы, проксирующего приватные методы
    this._multiCtrl = new MultiGroupController(core, {
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
        // Коалесцируем как в основном обработчике мира
        this._tempMultiTr?.forceUpdate();
        this._updateTempMultiSizeLabel();
        this._updateTempMultiHitRect();
        this._updateTempRotateHandlesPosition();
        this._scheduleBatchDraw();
        this._destroyHoverTr();
      },
    });

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
        if (this._options.deselectOnEmptyClick) {
          this._destroyTempMulti();
          this._clearSelection();
        }
        return;
      }

      // Обычное выделение ноды (для группы — выберется группа)
      const target = e.target;
      if (!this._options.selectablePredicate(target)) return;

      // Shift+Click или Ctrl+Click: собрать временную группу (мультивыделение)
      if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
        const base = this._findBaseNodeByTarget(target);
        if (!base) return;

        // Если нода находится в группе, игнорируем (защита групп)
        const nodeKonva = base.getNode();
        const parent = nodeKonva.getParent();
        if (parent && parent instanceof Konva.Group && parent !== this._core.nodes.world) {
          // Нода в группе - не добавляем в мультивыделение
          return;
        }

        if (this._tempMultiSet.size === 0 && this._selected && this._selected !== base) {
          // перенести текущую выбранную ноду в набор и убрать её одиночные оверлеи
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

      // Обычный клик — разрушить временную группу и выделить одну ноду
      this._destroyTempMulti();
      this._select(baseNode);
      this._scheduleBatchDraw();
    });

    // Двойной клик: "проваливание" на уровень ниже в иерархии групп
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

        // Находим ближайшую зарегистрированную группу между selectedNode и target
        // Если группы нет - выбираем саму ноду
        let nextLevel: BaseNode | null = null;

        // Ищем ближайшего зарегистрированного потомка selectedNode, который является предком target
        for (const n of this._core.nodes.list()) {
          const node = n.getNode() as unknown as Konva.Node;

          // Проверяем, что node является потомком selectedNode
          if (
            typeof selectedNode.isAncestorOf === 'function' &&
            selectedNode.isAncestorOf(node) &&
            node !== selectedNode
          ) {
            // Проверяем, что node является предком target (но не равен target, если это не группа)
            if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(e.target)) {
              // Проверяем, что это ближайший предок (нет промежуточных зарегистрированных нод)
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

        // Если не нашли промежуточную группу, ищем саму ноду target
        nextLevel ??= this._core.nodes.list().find((n) => n.getNode() === e.target) ?? null;

        if (nextLevel) {
          this._select(nextLevel);
          const node = nextLevel.getNode();
          // Включаем перетаскивание для выбранной ноды
          if (typeof node.draggable === 'function') node.draggable(true);
          // Временно отключаем перетаскивание у родительской группы
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

    // Реакция на удаление ноды — снимаем выделение, если выделенная нода была удалена
    core.eventBus.on('node:removed', this._onNodeRemoved);

    // Hover-рамка: подсвечивает границы ноды/группы при наведении, даже если выделен другой объект
    // ОПТИМИЗАЦИЯ: добавлен throttling для производительности
    stage.on('mousemove.hover', this._onHoverMoveThrottled);
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

    // Автопан: запускать уже при первом перетаскивании, даже если нода ещё не была выбрана
    const layer = this._core.nodes.layer;
    layer.on('dragstart.selectionAutoPan', (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!this._options.autoPanEnabled) return;
      const target = e.target as Konva.Node;
      // Учитываем пользовательский фильтр выбираемости, чтобы не реагировать на служебные ноды
      if (!this._options.selectablePredicate(target)) return;
      this._draggingNode = target;
      this._startAutoPanLoop();
    });
    layer.on('dragend.selectionAutoPan', () => {
      this._draggingNode = null;
      this._stopAutoPanLoop();
    });

    // Когда панорамируется «камера» через перемещение world, необходимо синхронизировать все оверлеи
    const world = this._core.nodes.world;
    const syncOverlaysOnWorldChange = () => {
      if (!this._core) return;
      // Коалесцируем множественные события (scale, x, y) в один апдейт на кадр
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
          // Пересчитать привязку и все пользовательские оверлеи в экранных координатах
          this._transformer?.forceUpdate();
          this._hoverTr?.forceUpdate();
          this._restyleSideAnchors();
          this._updateCornerRadiusHandlesPosition();
          this._updateRotateHandlesPosition();
          this._updateSizeLabel();
          // Обновляем видимость хендлеров скругления в зависимости от зума
          this._updateCornerRadiusHandlesVisibility();
          // Временная группа: форс‑апдейт единого менеджера оверлеев
          this._tempOverlay?.forceUpdate();
          // ОПТИМИЗАЦИЯ: используем scheduleBatchDraw вместо прямого вызова
          this._scheduleBatchDraw();
        }
        // Hover-оверлей убираем до следующего mousemove, чтобы избежать мерцаний
        this._destroyHoverTr();
      });
    };
    world.on(
      'xChange.selectionCamera yChange.selectionCamera scaleXChange.selectionCamera scaleYChange.selectionCamera',
      syncOverlaysOnWorldChange,
    );
    // Слушаем события камеры для зума (CameraManager)
    this._onCameraZoomEvent = () => {
      syncOverlaysOnWorldChange();
    };
    core.eventBus.on('camera:zoom', this._onCameraZoomEvent as unknown as (p: unknown) => void);
    core.eventBus.on('camera:setZoom', this._onCameraZoomEvent as unknown as (p: unknown) => void);
    core.eventBus.on('camera:reset', this._onCameraZoomEvent as unknown as () => void);

    // Глобальные слушатели для Shift (пропорциональный ресайз только для угловых якорей)
    this._onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this._ratioKeyPressed = true;
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+G — закрепить временную группу в постоянную (по коду клавиши, независимо от раскладки)
      if (ctrl && !e.shiftKey && e.code === 'KeyG') {
        e.preventDefault();
        this._commitTempMultiToGroup();
      }
      // Ctrl+Shift+G — разгруппировать выбранную постоянную группу (по коду клавиши)
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
    // Снимаем выделение и чистим состояния
    this._destroyTempMulti();
    this._clearSelection();

    // Отписки
    core.stage.off('.selection');
    core.stage.off('.hover');
    this._core?.nodes.layer.off('.hover');
    // Снять слушатели world и сбросить отложенный RAF
    this._core?.nodes.world.off('.selectionCamera');
    // Снять layer-уровневые обработчики автопана
    this._core?.nodes.layer.off('.selectionAutoPan');
    // Отменяем незавершённый RAF, если есть
    if (this._worldSyncRafId != null) {
      globalThis.cancelAnimationFrame(this._worldSyncRafId);
      this._worldSyncRafId = null;
    }
    // Снять слушатели событий камеры
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

    // Снять hover-оверлей
    this._destroyHoverTr();

    // Удалить глобальные слушатели клавиш
    if (this._onGlobalKeyDown) globalThis.removeEventListener('keydown', this._onGlobalKeyDown);
    if (this._onGlobalKeyUp) globalThis.removeEventListener('keyup', this._onGlobalKeyUp);
    this._onGlobalKeyDown = null;
    this._onGlobalKeyUp = null;
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

    // Если есть выделение и клик пришёл внутри уже выделенной ноды — тянем именно её
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
      // Иначе — остаётся группа (baseNode найден выше)
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
      // Запоминаем активную ноду для компенсации смещения при автопане
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
      // Запустить автопан при перетаскивании
      this._startAutoPanLoop();
    });
    konvaNode.on('dragmove.selection', () => {
      // Оптимизация: throttling для dragmove
      if (this._dragMoveScheduled) return;

      this._dragMoveScheduled = true;
      const raf = globalThis.requestAnimationFrame;
      raf(() => {
        this._dragMoveScheduled = false;
        this._scheduleBatchDraw();
      });
    });
    konvaNode.on('dragend.selection', () => {
      // Сбросить ссылку на активную ноду
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
      // Остановить автопан
      this._stopAutoPanLoop();
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

  // ===== Helpers: временная мульти-группа =====
  private _ensureTempMulti(nodes: BaseNode[]) {
    if (!this._core) return;
    const world = this._core.nodes.world;
    // Заполняем набор для корректной проверки size при коммите (важно для лассо)
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
        const z = kn.zIndex();
        const abs = kn.getAbsolutePosition();
        const prevDraggable =
          typeof (kn as unknown as { draggable?: (v?: boolean) => boolean }).draggable ===
          'function'
            ? (kn as unknown as { draggable: (v?: boolean) => boolean }).draggable()
            : null;
        this._tempPlacement.set(kn, { parent, zIndex: z, abs, prevDraggable });
        grp.add(kn as unknown as Konva.Group | Konva.Shape);
        kn.setAbsolutePosition(abs);
        if (
          typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
        )
          (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(false);
        // Блокируем drag у детей и перенаправляем на группу
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
      // Единый менеджер оверлеев для временной группы
      this._tempOverlay ??= new OverlayFrameManager(this._core);
      this._tempOverlay.attach(grp, { keepRatioCornerOnlyShift: () => this._ratioKeyPressed });
      // Поведение, как у обычной группы: drag группы, без панорамирования сцены
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
        // Спрятать рамку/лейбл/хендлеры временной группы на время перетаскивания
        this._tempOverlay?.hideOverlaysForDrag();
        forceUpdate();
      });
      grp.on('dragmove.tempMulti', forceUpdate);
      grp.on('transform.tempMulti', forceUpdate);
      grp.on('dragend.tempMulti', () => {
        stage.draggable(prevStageDraggable);
        this._draggingNode = null;
        this._stopAutoPanLoop();
        // Вернуть рамку/лейбл/хендлеры после перетаскивания
        this._tempOverlay?.restoreOverlaysAfterDrag();
        forceUpdate();
      });
      return;
    }
    // обновить состав
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
    // Снять единый менеджер оверлеев (уберёт transformer/лейбл/rotate/hit)
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }
    if (this._tempMultiGroup) {
      this._tempMultiGroup.off('.tempMulti');
      const children = [...this._tempMultiGroup.getChildren()];
      for (const kn of children) {
        // снять перехваты с детей
        kn.off('.tempMultiChild');
        const info = this._tempPlacement.get(kn);
        // Сохраняем абсолютный трансформ ребёнка (позиция/скейл/вращение)
        const absBefore = kn.getAbsoluteTransform().copy();
        // Родитель-назначение: сохранённый или world
        const dstParent = info?.parent ?? this._core.nodes.world;
        // Переместить к родителю-назначению
        kn.moveTo(dstParent);
        // Рассчитать локальный трансформ, эквивалентный ранее абсолютному
        const parentAbs = dstParent.getAbsoluteTransform().copy();
        parentAbs.invert();
        const local = parentAbs.multiply(absBefore);
        const d = local.decompose();
        // Применить локальные x/y/rotation/scale, чтобы сохранить визуальный результат
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
        // Восстановить порядок и draggable
        if (info) {
          try {
            kn.zIndex(info.zIndex);
          } catch {
            /* ignore */
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
    // Визуальный bbox БЕЗ учёта stroke (и, соответственно, без рамки выделения)
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

  // Обновить/создать невидимую хит-зону, соответствующую bbox группы (для drag в пустых местах)
  private _updateTempMultiHitRect() {
    if (!this._core || !this._tempMultiGroup) return;
    const layer = this._core.nodes.layer;
    // Локальный bbox группы (без трансформации), чтобы прямоугольник корректно совпадал при любом повороте/скейле
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
        fill: 'rgba(0,0,0,0.001)', // почти невидимая, но участвующая в hit-test
        listening: true,
        perfectDrawEnabled: false,
      });
      // Разрешаем drag группы при mousedown в пустой области
      rect.on('mousedown.tempMultiHit', (ev: Konva.KonvaEventObject<MouseEvent>) => {
        if (ev.evt.button !== 0) return;
        ev.cancelBubble = true;
        const anyGrp = this._tempMultiGroup as unknown as { startDrag?: () => void };
        if (typeof anyGrp.startDrag === 'function') anyGrp.startDrag();
      });
      // Добавляем в группу и держим на заднем плане
      this._tempMultiGroup.add(rect);
      rect.moveToBottom();
      this._tempMultiHitRect = rect;
      layer.batchDraw();
      return;
    }
    // Обновляем геометрию существующего прямоугольника
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
    for (const kn of children) {
      // Снять перехваты временной группы с детей
      kn.off('.tempMultiChild');
      const abs = kn.getAbsolutePosition();
      g.add(kn as unknown as Konva.Group | Konva.Shape);
      kn.setAbsolutePosition(abs);
      if (
        typeof (kn as unknown as { draggable?: (v: boolean) => boolean }).draggable === 'function'
      )
        (kn as unknown as { draggable: (v: boolean) => boolean }).draggable(false);
    }
    if (this._tempMultiTr) {
      this._tempMultiTr.destroy();
      this._tempMultiTr = null;
    }
    // Детачим единый менеджер оверлеев временной группы, чтобы не оставались висящие элементы UI
    if (this._tempOverlay) {
      this._tempOverlay.detach();
      this._tempOverlay = null;
    }
    // Снять обработчики .tempMulti у самой временной группы перед уничтожением
    this._tempMultiGroup.off('.tempMulti');
    this._tempMultiGroup.destroy();
    this._tempMultiGroup = null;
    this._tempPlacement.clear();
    this._tempMultiSet.clear();
    // Явно включаем draggable для созданной группы (на случай, если downstream логика поменяет опции)
    if (typeof g.draggable === 'function') g.draggable(true);
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
      // Сохраняем полный абсолютный трансформ ребёнка (позиция + scale + rotation)
      const absBefore = kn.getAbsoluteTransform().copy();

      // Перемещаем к world
      world.add(kn as unknown as Konva.Group | Konva.Shape);

      // Рассчитываем локальный трансформ, эквивалентный ранее абсолютному
      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();
      const local = worldAbs.multiply(absBefore);
      const d = local.decompose();

      // Применяем локальные x/y/rotation/scale, чтобы сохранить визуальный результат
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

      // Включаем draggable для разгруппированных нод
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
    // Удаляем размерный label группы при разгруппировке
    this._destroySizeLabel();
    this._core.nodes.remove(sel);
    this._core.stage.batchDraw();
  }

  // ===================== Hover (минимально) =====================
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

  // ОПТИМИЗАЦИЯ: Throttled версия _onHoverMove
  private _onHoverMoveThrottled = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const now = Date.now();
    if (now - this._lastHoverMoveTime < this._hoverMoveThrottle) {
      return; // Пропускаем обновление
    }
    this._lastHoverMoveTime = now;
    this._onHoverMove(e);
  };

  private _onHoverMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core) return;
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const target = e.target;
    // Если есть временная группа (наша или area-temp-group) и указатель внутри неё — подавить hover
    const isInsideTemp = (() => {
      const hasTemp = !!this._tempMultiGroup;
      if (!hasTemp) {
        // Проверим, не внутри ли area-temp-group
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
      // есть _tempMultiGroup — проверим принадлежность
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
      let lastGroup: Konva.Node | null = null;
      // Ищем самую верхнюю (внешнюю) зарегистрированную группу
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
    // При зажатом Ctrl — всегда подсвечиваем leaf-ноду (если она зарегистрирована)
    let owner: Konva.Node | null = ctrlPressed
      ? (targetOwnerNode ?? targetOwnerGroup)
      : (targetOwnerGroup ?? targetOwnerNode);

    // Спец-правило (без Ctrl): если выделена НОДА (не группа) внутри группы и ховер по ДРУГОЙ ноде группы — подсвечиваем leaf-ноду
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
      // Скрываем hover только если это та же нода или если selectedNode является предком owner
      // НЕ скрываем, если owner является предком selectedNode (это означает, что owner - более высокая группа)
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
      // Запрещаем флип по осям, чтобы не было внезапных инверсий при зажатом Shift
      flipEnabled: false,
      // По умолчанию свободный ресайз. Пропорции включаем динамически по Shift.
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
    // Глобальный ограничитель размеров: не даём схлопываться до 0 и фиксируем противоположный угол
    transformer.boundBoxFunc((_, newBox) => {
      const MIN = 1; // px
      let w = newBox.width;
      let h = newBox.height;
      let x = newBox.x;
      let y = newBox.y;

      // Просто клампим размеры к MIN, не сдвигая позицию
      // (фиксация противоположного угла делается в transform.corner-sync)
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
    // Растянуть якоря на всю сторону и скрыть их визуально (оставив hit-area)
    this._restyleSideAnchors();
    // Добавить угловые хендлеры для cornerRadius, если поддерживается
    this._setupCornerRadiusHandles(false);
    // Добавить угловые хендлеры ротации
    this._setupRotateHandles();
    // Добавить/обновить размерный label
    this._setupSizeLabel();
    // Во время трансформации (ресайз/скейл) синхронизировать позиции всех оверлеев
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
      // Скрываем corner-radius хендлеры на время трансформации
      this._cornerHandlesSuppressed = true;
      this._cornerHandlesGroup?.visible(false);
      this._hideRadiusLabel();

      // Сохраняем абсолютную позицию противоположного угла для фиксации origin
      // ТОЛЬКО для угловых якорей (для всех типов нод, включая группы)
      const node = this._selected?.getNode() as unknown as Konva.Node | undefined;
      const activeAnchor =
        typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
      const isCornerAnchor =
        activeAnchor === 'top-left' ||
        activeAnchor === 'top-right' ||
        activeAnchor === 'bottom-left' ||
        activeAnchor === 'bottom-right';

      // Применяем фиксацию для угловых якорей (включая группы)
      if (node && isCornerAnchor) {
        // Для групп используем clientRect, для одиночных нод — width/height
        const isGroup = node instanceof Konva.Group;
        let width: number;
        let height: number;
        let localX = 0;
        let localY = 0;

        if (isGroup) {
          // Для групп берём визуальный bbox
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
          // Для одиночных нод — стандартные размеры
          width = node.width();
          height = node.height();
        }

        const absTransform = node.getAbsoluteTransform();

        // Определяем локальные координаты противоположного угла
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

        // Преобразуем в абсолютные координаты
        this._transformOppositeCorner = absTransform.point({ x: oppositeX, y: oppositeY });
      } else {
        // Для боковых якорей не фиксируем угол
        this._transformOppositeCorner = null;
      }
    });
    transformer.on('transform.keepratio', updateKeepRatio);

    transformer.on('transform.corner-sync', () => {
      // На лету «впитываем» неравномерный масштаб в width/height для Rect,
      // чтобы скругления оставались полукруглыми, а не эллипсами
      const n = this._selected?.getNode() as unknown as Konva.Node | undefined;
      if (n) {
        this._bakeRectScale(n);

        // Корректируем позицию ноды, чтобы противоположный угол оставался на месте
        if (this._transformOppositeCorner) {
          const activeAnchor =
            typeof transformer.getActiveAnchor === 'function' ? transformer.getActiveAnchor() : '';
          const absTransform = n.getAbsoluteTransform();

          // Для групп используем clientRect, для одиночных нод — width/height
          const isGroup = n instanceof Konva.Group;
          let width: number;
          let height: number;
          let localX = 0;
          let localY = 0;

          if (isGroup) {
            // Для групп берём визуальный bbox
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
            // Для одиночных нод — стандартные размеры
            width = n.width();
            height = n.height();
          }

          // Определяем локальные координаты противоположного угла
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

          // Текущая абсолютная позиция противоположного угла
          const currentOpposite = absTransform.point({ x: oppositeX, y: oppositeY });

          // Вычисляем смещение
          const dx = this._transformOppositeCorner.x - currentOpposite.x;
          const dy = this._transformOppositeCorner.y - currentOpposite.y;

          // Корректируем позицию ноды в локальных координатах родителя
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
      // ОПТИМИЗАЦИЯ: используем debounced обновление UI
      this._scheduleUIUpdate();
      // Временная группа: обновить позиции ротационных хендлеров
      this._updateTempRotateHandlesPosition();
      this._core?.nodes.layer.batchDraw();
    });
    transformer.on('transformend.corner-sync', () => {
      // Сбрасываем флаг подавления corner-radius хендлеров и сохранённый угол
      this._cornerHandlesSuppressed = false;
      this._transformOppositeCorner = null;
      this._restyleSideAnchors();
      // ОПТИМИЗАЦИЯ: используем debounced обновление UI
      this._scheduleUIUpdate();
      this._core?.nodes.layer.batchDraw();
    });
    // Слушать изменения атрибутов выбранной ноды, если размеры/позиция меняются программно
    const selNode = this._selected.getNode() as unknown as Konva.Node;
    // Снять прежние обработчики, если были, затем повесить новые с namespace
    selNode.off('.overlay-sync');
    const syncOverlays = () => {
      this._restyleSideAnchors();
      // ОПТИМИЗАЦИЯ: используем debounced обновление UI
      this._scheduleUIUpdate();
      this._scheduleBatchDraw();
    };
    selNode.on(
      'widthChange.overlay-sync heightChange.overlay-sync scaleXChange.overlay-sync scaleYChange.overlay-sync rotationChange.overlay-sync xChange.overlay-sync yChange.overlay-sync',
      syncOverlays,
    );
    this._scheduleBatchDraw();
  }

  // Растянуть side-anchors (top/right/bottom/left) на всю сторону выбранной ноды
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
        // Сохраняем текущее состояние stage.draggable перед отключением
        if (this._core) this._prevStageDraggableBeforeRotate = this._core.stage.draggable();
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
        // Пересчитать кастомные middle‑хендлеры под текущее вращение
        this._restyleSideAnchors();
        this._core.nodes.layer.batchDraw();
        // ОПТИМИЗАЦИЯ: используем debounced обновление UI
        this._scheduleUIUpdate();
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
        // Восстанавливаем предыдущее состояние stage.draggable вместо безусловного true
        if (this._core && this._prevStageDraggableBeforeRotate !== null) {
          this._core.stage.draggable(this._prevStageDraggableBeforeRotate);
          this._prevStageDraggableBeforeRotate = null;
        }
        // Финально пересчитать кастомные middle‑хендлеры
        this._restyleSideAnchors();
        // ОПТИМИЗАЦИЯ: используем debounced обновление UI
        this._scheduleUIUpdate();
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

  // ОПТИМИЗАЦИЯ: Debounced обновление UI элементов
  // Вместо обновления на каждый фрейм - обновляем один раз через requestAnimationFrame
  private _scheduleUIUpdate() {
    if (this._uiUpdateScheduled) return;
    this._uiUpdateScheduled = true;

    globalThis.requestAnimationFrame(() => {
      this._updateSizeLabel();
      this._updateRotateHandlesPosition();
      this._updateCornerRadiusHandlesPosition();
      this._uiUpdateScheduled = false;
    });
  }

  private _updateSizeLabel() {
    if (!this._core || !this._selected || !this._sizeLabel) return;
    const node = this._selected.getNode();
    // Визуальный bbox — для позиционирования (привязка к нижнему центру экрана)
    const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
    // Логический размер — независим от зума камеры (world): localRect * (absNodeScale / absWorldScale)
    const localRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      // Исключаем stroke/border, чтобы показывать реальные размеры ноды
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
    // Изначально скрываем хендлеры - они появятся при hover на ноду
    group.visible(false);
    this._cornerHandlesGroup = group;

    // Добавляем обработчики для показа/скрытия хендлеров при hover на ноду
    node.off('.cornerRadiusHover');
    node.on('mouseenter.cornerRadiusHover', () => {
      if (!this._core || !this._cornerHandlesGroup) return;
      // Проверяем зум - при зуме < 0.3 хендлеры не показываем
      const world = this._core.nodes.world;
      const currentZoom = world.scaleX();
      if (currentZoom < 0.3) return;
      this._cornerHandlesGroup.visible(true);
    });
    node.on('mouseleave.cornerRadiusHover', () => {
      if (!this._cornerHandlesGroup) return;
      // Скрываем хендлеры только если курсор не над самими хендлерами
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        this._cornerHandlesGroup.visible(false);
        return;
      }
      // Проверяем, находится ли курсор над группой хендлеров
      const shapes = layer.getIntersection(pointer);
      if (shapes && this._cornerHandlesGroup.isAncestorOf(shapes)) {
        // Курсор над хендлерами - не скрываем
        return;
      }
      this._cornerHandlesGroup.visible(false);
    });

    // Добавляем обработчики на саму группу хендлеров
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

    // Проверяем, находится ли курсор уже над нодой при создании хендлеров
    // Если да - сразу показываем хендлеры
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

      // Подавляем показ во время трансформации
      if (this._cornerHandlesSuppressed) {
        this._cornerHandlesGroup?.visible(false);
        this._radiusLabel?.visible(false);
        return;
      }
      // Скрывать хендлеры скругления углов при зуме < 0.3
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

    // Используем локальный прямоугольник, как для rotate-хендлеров, чтобы учесть local.x/local.y, stroke и т.п.
    const local = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
    const width = local.width;
    const height = local.height;
    if (width <= 0 || height <= 0) return;

    const tr = node.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);

    // Инвариантный визуальный отступ 12px: приводим к локальным координатам, чтобы на экране он оставался постоянным
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

    // Учитываем смещение локального прямоугольника (local.x/local.y)
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

    // Компенсировать масштаб родителя (слоя/сцены), чтобы кружки были постоянного размера,
    // не двигая их координаты: масштабируем каждый кружок, а НЕ всю группу
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
    // Гарантировать z-index над квадратными якорями трансформера
    this._cornerHandlesGroup.moveToTop();
  }

  private _updateCornerRadiusHandlesVisibility() {
    if (!this._core || !this._selected || !this._cornerHandlesGroup) return;

    const world = this._core.nodes.world;
    const currentZoom = world.scaleX();
    const stage = this._core.stage;
    const layer = this._core.nodes.layer;
    const node = this._selected.getNode() as unknown as Konva.Node;

    // Проверяем, находится ли курсор над нодой или хендлерами
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      // Нет курсора - скрываем хендлеры
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

    // При нормальном зуме проверяем, находится ли курсор над нодой или хендлерами
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
    // 1) Ищем САМОГО ВЕРХНЕГО предка (самую внешнюю группу)
    let topMostAncestor: BaseNode | null = null;
    for (const n of this._core.nodes.list()) {
      const node = n.getNode() as unknown as Konva.Node;
      if (typeof node.isAncestorOf === 'function' && node.isAncestorOf(target)) {
        // Проверяем, является ли этот предок самым верхним
        // (т.е. нет другого зарегистрированного предка выше него)
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
