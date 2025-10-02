import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerGuidesPluginOptions {
  guideColor?: string; // цвет направляющих
  activeColor?: string; // цвет активной направляющей
  rulerThicknessPx?: number; // толщина линейки (должна совпадать с RulerPlugin)
  snapToGrid?: boolean; // привязка к сетке
  gridStep?: number; // шаг сетки для привязки
}

export class RulerGuidesPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerGuidesPluginOptions>;
  private _guidesLayer: Konva.Layer | null = null;
  private _guides: Konva.Line[] = [];
  private _activeGuide: Konva.Line | null = null;
  private _draggingGuide: { type: 'h' | 'v'; line: Konva.Line } | null = null;

  // Кэш для оптимизации
  private _rulerLayerCache: Konva.Layer | null = null;
  private _updateScheduled = false;

  constructor(options: RulerGuidesPluginOptions = {}) {
    super();
    const {
      guideColor = '#8e3e2c', // оранжевый для обычных линий
      activeColor = '#2b83ff', // синий для активной линии
      rulerThicknessPx = 30,
      snapToGrid = true,
      gridStep = 1, // шаг 1px для точного позиционирования
    } = options;
    this._options = {
      guideColor,
      activeColor,
      rulerThicknessPx,
      snapToGrid,
      gridStep,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Проверяем наличие ruler-layer (создаётся RulerPlugin)
    const rulerLayer = core.stage.findOne('.ruler-layer');
    if (!rulerLayer) {
      throw new Error(
        'RulerGuidesPlugin requires RulerPlugin to be added to the CoreEngine first. ' +
          'Please add RulerPlugin before RulerGuidesPlugin.',
      );
    }

    // Создаём слой для направляющих
    this._guidesLayer = new Konva.Layer({ name: 'guides-layer' });
    core.stage.add(this._guidesLayer);

    // Перемещаем guides-layer ПОВЕРХ всех слоёв (включая ruler-layer)
    // Направляющие должны быть видны поверх всего
    this._guidesLayer.moveToTop();

    // Подписываемся на события stage для отслеживания перетаскивания из линейки
    const stage = core.stage;
    const thicknessPx = this._options.rulerThicknessPx;

    stage.on('mousedown.ruler-guides', () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Проверяем, кликнули ли мы по направляющей линии
      const target = stage.getIntersection(pos);
      if (target && (target.name() === 'guide-h' || target.name() === 'guide-v')) {
        // Клик по направляющей - обработается её собственным обработчиком
        return;
      }

      // Проверяем позицию клика относительно линейки
      if (pos.y <= thicknessPx && pos.x >= thicknessPx) {
        // Клик на горизонтальной линейке
        this._startCreateGuide('h');
      } else if (pos.x <= thicknessPx && pos.y >= thicknessPx) {
        // Клик на вертикальной линейке
        this._startCreateGuide('v');
      } else {
        // Клик за пределами линейки и направляющих - сбрасываем активную линию
        this._setActiveGuide(null);
      }
    });

    // Курсоры при наведении на линейки
    stage.on('mousemove.ruler-guides', () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Проверяем, не находимся ли над направляющей линией
      const target = stage.getIntersection(pos);
      if (target && (target.name() === 'guide-h' || target.name() === 'guide-v')) {
        // Над направляющей линией - курсор устанавливается обработчиком линии
        return;
      }

      // Определяем, находимся ли мы над линейкой
      if (pos.y <= thicknessPx && pos.x >= thicknessPx) {
        // Над горизонтальной линейкой
        stage.container().style.cursor = 'ns-resize';
      } else if (pos.x <= thicknessPx && pos.y >= thicknessPx) {
        // Над вертикальной линейкой
        stage.container().style.cursor = 'ew-resize';
      } else {
        // Не над линейкой и не над направляющей
        if (!this._draggingGuide) {
          stage.container().style.cursor = 'default';
        }
      }
    });

    // Кэшируем ruler-layer
    this._rulerLayerCache = core.stage.findOne('.ruler-layer') as Konva.Layer | null;

    // Подписываемся на изменения world для обновления позиций линий
    // Оптимизация: используем throttling
    const world = core.nodes.world;
    world.on(
      'xChange.ruler-guides yChange.ruler-guides scaleXChange.ruler-guides scaleYChange.ruler-guides',
      () => {
        this._scheduleUpdate();
      },
    );

    // Подписываемся на изменение размера stage для обновления длины линий
    stage.on('resize.ruler-guides', () => {
      this._scheduleUpdate();
    });

    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    // Отписываемся от всех событий
    core.stage.off('.ruler-guides');
    core.nodes.world.off('.ruler-guides');

    // Удаляем слой
    if (this._guidesLayer) {
      this._guidesLayer.destroy();
      this._guidesLayer = null;
    }

    this._guides = [];
    this._activeGuide = null;
    this._draggingGuide = null;
  }

  /**
   * Отложенное обновление позиций (throttling)
   */
  private _scheduleUpdate() {
    if (this._updateScheduled) return;

    this._updateScheduled = true;
    const raf =
      globalThis.requestAnimationFrame ||
      ((cb: FrameRequestCallback) =>
        globalThis.setTimeout(() => {
          cb(0);
        }, 16));
    raf(() => {
      this._updateScheduled = false;
      this._updateGuidesPositions();
    });
  }

  /**
   * Обновление позиций всех направляющих при изменении world transform
   */
  private _updateGuidesPositions() {
    if (!this._core) return;

    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const stage = this._core.stage;
    const stageW = stage.width();
    const stageH = stage.height();
    const worldX = world.x();
    const worldY = world.y();

    // Оптимизация: используем for вместо forEach
    for (let i = 0; i < this._guides.length; i++) {
      const guide = this._guides[i];
      if (!guide) continue;

      const worldCoord = (guide as any).worldCoord;
      if (worldCoord === undefined) continue;

      const isHorizontal = guide.name() === 'guide-h';

      if (isHorizontal) {
        const screenY = worldY + worldCoord * scale;
        guide.position({ x: 0, y: screenY });
        guide.points([0, 0, stageW, 0]);
      } else {
        const screenX = worldX + worldCoord * scale;
        guide.position({ x: screenX, y: 0 });
        guide.points([0, 0, 0, stageH]);
      }
    }

    this._guidesLayer?.batchDraw();
  }

  /**
   * Привязка координаты к сетке
   */
  private _snapToGrid(coord: number): number {
    if (!this._options.snapToGrid) return Math.round(coord);
    const step = this._options.gridStep;
    return Math.round(coord / step) * step;
  }

  /**
   * Создание направляющей линии из линейки
   */
  private _startCreateGuide(type: 'h' | 'v') {
    if (!this._core || !this._guidesLayer) return;

    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Вычисляем мировую координату с привязкой к сетке
    const rawCoord = type === 'h' ? (pos.y - world.y()) / scale : (pos.x - world.x()) / scale;
    const worldCoord = this._snapToGrid(rawCoord);

    // Создаём направляющую линию
    const line = new Konva.Line({
      name: type === 'h' ? 'guide-h' : 'guide-v',
      stroke: this._options.guideColor,
      strokeWidth: 1,
      opacity: 1, // полная непрозрачность
      draggable: true,
      hitStrokeWidth: 8,
      dragBoundFunc: (p) => {
        if (!this._core) return p;
        const world = this._core.nodes.world;
        const scale = world.scaleX();

        // Ограничиваем движение только по одной оси с привязкой к сетке
        if (type === 'h') {
          const rawWorldY = (p.y - world.y()) / scale;
          const worldY = this._snapToGrid(rawWorldY);
          return { x: 0, y: world.y() + worldY * scale };
        } else {
          const rawWorldX = (p.x - world.x()) / scale;
          const worldX = this._snapToGrid(rawWorldX);
          return { x: world.x() + worldX * scale, y: 0 };
        }
      },
    });

    // Сохраняем мировую координату
    (line as any).worldCoord = worldCoord;

    // Добавляем обработчики
    line.on('mouseenter', () => {
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
      this._core?.stage.batchDraw();
    });

    line.on('mouseleave', () => {
      if (this._core && !this._draggingGuide) {
        this._core.stage.container().style.cursor = 'default';
      }
      this._core?.stage.batchDraw();
    });

    line.on('click', () => {
      this._setActiveGuide(line);
    });

    line.on('dragstart', () => {
      this._draggingGuide = { type, line };
      this._setActiveGuide(line);
      // Устанавливаем курсор для драга
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
    });

    line.on('dragmove', () => {
      if (!this._core) return;
      const world = this._core.nodes.world;
      const scale = world.scaleX();
      const pos = line.getAbsolutePosition();

      // Обновляем мировую координату с привязкой к сетке
      const rawCoord = type === 'h' ? (pos.y - world.y()) / scale : (pos.x - world.x()) / scale;
      const worldCoord = this._snapToGrid(rawCoord);

      (line as any).worldCoord = worldCoord;

      // Устанавливаем курсор во время драга
      this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';

      // Обновляем линейку для динамической подсветки координаты
      // Оптимизация: используем кэшированный слой
      if (this._rulerLayerCache) {
        this._rulerLayerCache.batchDraw();
      }
    });

    line.on('dragend', () => {
      this._draggingGuide = null;
      // Курсор остается resize, так как мышь все еще над линией
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
    });

    this._guidesLayer.add(line);
    this._guides.push(line);
    this._setActiveGuide(line);

    // Начальная позиция и размер
    if (type === 'h') {
      line.position({ x: 0, y: world.y() + worldCoord * scale });
      line.points([0, 0, stage.width(), 0]);
    } else {
      line.position({ x: world.x() + worldCoord * scale, y: 0 });
      line.points([0, 0, 0, stage.height()]);
    }

    // Начинаем перетаскивание программно
    this._draggingGuide = { type, line };

    const moveHandler = () => {
      if (!this._draggingGuide || !this._core) return;

      const p = this._core.stage.getPointerPosition();
      if (!p) return;

      const world = this._core.nodes.world;
      const scale = world.scaleX();
      const rawCoord = type === 'h' ? (p.y - world.y()) / scale : (p.x - world.x()) / scale;
      const worldCoord = this._snapToGrid(rawCoord);

      (line as any).worldCoord = worldCoord;

      if (type === 'h') {
        line.position({ x: 0, y: world.y() + worldCoord * scale });
        line.points([0, 0, this._core.stage.width(), 0]);
      } else {
        line.position({ x: world.x() + worldCoord * scale, y: 0 });
        line.points([0, 0, 0, this._core.stage.height()]);
      }

      this._core.stage.batchDraw();
    };

    const upHandler = () => {
      this._draggingGuide = null;
      if (this._core) {
        this._core.stage.off('mousemove.guide-create');
        this._core.stage.off('mouseup.guide-create');
      }
    };

    stage.on('mousemove.guide-create', moveHandler);
    stage.on('mouseup.guide-create', upHandler);

    stage.batchDraw();
  }

  private _setActiveGuide(guide: Konva.Line | null) {
    if (this._activeGuide && this._activeGuide !== guide) {
      // Сбрасываем предыдущую активную направляющую
      this._activeGuide.stroke(this._options.guideColor);
      this._activeGuide.strokeWidth(1);
    }
    this._activeGuide = guide;
    if (guide) {
      // Выделяем новую активную направляющую
      guide.stroke(this._options.activeColor);
      guide.strokeWidth(2);
    }

    // Уведомляем линейку о необходимости перерисовки для подсветки координаты
    // Оптимизация: используем кэшированный слой
    if (this._rulerLayerCache) {
      this._rulerLayerCache.batchDraw();
    }

    // Уведомляем RulerPlugin об изменении направляющих
    this._core?.stage.fire('guidesChanged.ruler');

    this._core?.stage.batchDraw();
  }

  /**
   * Получить активную направляющую
   */
  public getActiveGuide(): Konva.Line | null {
    return this._activeGuide;
  }

  /**
   * Получить координату активной направляющей
   * @returns { type: 'h' | 'v', coord: number } | null
   */
  public getActiveGuideInfo(): { type: 'h' | 'v'; coord: number } | null {
    if (!this._activeGuide) return null;
    const worldCoord = (this._activeGuide as any).worldCoord;
    const type = this._activeGuide.name() === 'guide-h' ? 'h' : 'v';
    return { type, coord: worldCoord };
  }

  /**
   * Удалить активную направляющую
   */
  public removeActiveGuide() {
    if (this._activeGuide) {
      this._activeGuide.destroy();
      this._guides = this._guides.filter((g) => g !== this._activeGuide);
      this._activeGuide = null;
      this._core?.stage.batchDraw();
    }
  }

  /**
   * Получить все направляющие
   */
  public getGuides(): Konva.Line[] {
    return [...this._guides];
  }

  /**
   * Удалить все направляющие
   */
  public clearGuides() {
    this._guides.forEach((g) => g.destroy());
    this._guides = [];
    this._activeGuide = null;
    this._core?.stage.batchDraw();
  }
}
