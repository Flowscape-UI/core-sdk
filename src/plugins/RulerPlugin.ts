import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerPluginOptions {
  thicknessPx?: number; // ширина линейки в пикселях
  fontFamily?: string;
  fontSizePx?: number;
  color?: string; // цвет текста и делений
  bgColor?: string; // цвет фона линейки
  borderColor?: string; // цвет границы
  enabled?: boolean; // включена ли линейка при старте
}

export class RulerPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerPluginOptions>;
  private _layer: Konva.Layer | null = null;

  private _hGroup?: Konva.Group;
  private _vGroup?: Konva.Group;

  private _hBg?: Konva.Rect;
  private _vBg?: Konva.Rect;

  private _hTicksShape?: Konva.Shape;
  private _vTicksShape?: Konva.Shape;

  private _hBorder?: Konva.Line;
  private _vBorder?: Konva.Line;

  private _redrawScheduled = false;
  private _lastRedrawTime = 0;
  private _redrawThrottleMs = 16; // ~60 FPS
  private _panThrottleMs = 32; // ~30 FPS для панорамирования (более агрессивный throttling)

  // Кэш для оптимизации
  private _cachedActiveGuide: { type: 'h' | 'v'; coord: number } | null = null;
  private _cacheInvalidated = true;

  // Кэш вычислений шагов делений (по scale)
  private _stepsCache = new Map<
    number,
    {
      step: number;
      stepPx: number;
      majorStep: number;
      mediumStep: number;
      labelStep: number;
      drawStep: number;
      // Предвычисленные константы для цикла
      drawStepEpsilon: number;
      majorTickLength: number;
      mediumTickLength: number;
      minorTickLength: number;
      fontString: string;
    }
  >();

  constructor(options: RulerPluginOptions = {}) {
    super();
    const {
      thicknessPx = 30,
      fontFamily = 'Inter, Calibri, Arial, sans-serif',
      fontSizePx = 10,
      color = '#8c8c8c',
      bgColor = '#2c2c2c',
      borderColor = '#1f1f1f',
      enabled = true,
    } = options;
    this._options = {
      thicknessPx,
      fontFamily,
      fontSizePx,
      color,
      bgColor,
      borderColor,
      enabled,
    };
  }

  /**
   * Вычисляет оптимальный шаг делений линейки
   * Использует красивые числа: 1, 2, 5, 10, 20, 50, 100 и т.д.
   */
  private _calculateNiceStep(minWorldStep: number): number {
    if (!isFinite(minWorldStep) || minWorldStep <= 0) return 1;

    const magnitude = Math.pow(10, Math.floor(Math.log10(minWorldStep)));
    const normalized = minWorldStep / magnitude;

    let nice: number;
    if (normalized <= 1) nice = 1;
    else if (normalized <= 2) nice = 2;
    else if (normalized <= 5) nice = 5;
    else nice = 10;

    return nice * magnitude;
  }

  /**
   * Форматирует число для отображения на линейке
   * Всегда возвращает целое число без десятичных знаков
   */
  private _formatNumber(value: number): string {
    return Math.round(value).toString();
  }

  /**
   * Вычисляет и кэширует параметры делений для текущего масштаба
   */
  private _getStepsConfig(scale: number) {
    // Проверяем кэш
    const cached = this._stepsCache.get(scale);
    if (cached) return cached;

    const tPx = this._options.thicknessPx;
    const minStepPx = 50;
    const minWorldStep = minStepPx / scale;
    let step = this._calculateNiceStep(minWorldStep);

    // ВАЖНО: округляем до целого числа
    if (step < 1) step = 1;

    const stepPx = step * scale;

    // Адаптивная система уровней делений и подписей
    let majorStep: number;
    let mediumStep: number;
    let labelStep: number;
    let drawStep: number;

    if (stepPx >= 60) {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step;
      drawStep = step;
    } else if (stepPx >= 40) {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 5;
      drawStep = step;
    } else {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 10;
      drawStep = step;
    }

    // Предвычисляем константы для цикла
    const config = {
      step,
      stepPx,
      majorStep,
      mediumStep,
      labelStep,
      drawStep,
      drawStepEpsilon: drawStep * 0.01,
      majorTickLength: tPx * 0.6,
      mediumTickLength: tPx * 0.4,
      minorTickLength: tPx * 0.25,
      fontString: `${String(this._options.fontSizePx)}px ${this._options.fontFamily}`,
    };

    // Ограничиваем размер кэша (храним последние 10 масштабов)
    if (this._stepsCache.size > 10) {
      const firstKey = this._stepsCache.keys().next().value;
      if (firstKey !== undefined) this._stepsCache.delete(firstKey);
    }

    this._stepsCache.set(scale, config);
    return config;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Создаём слой для линейки
    this._layer = new Konva.Layer({
      name: 'ruler-layer',
      listening: true, // слушаем события для возможности взаимодействия с RulerGuidesPlugin
    });

    if (this._options.enabled) {
      core.stage.add(this._layer);
    }

    // Группы для горизонтальной и вертикальной линейки
    // listening: true чтобы события от фонов могли всплывать к RulerGuidesPlugin
    this._hGroup = new Konva.Group({ listening: true });
    this._vGroup = new Konva.Group({ listening: true });
    this._layer.add(this._hGroup);
    this._layer.add(this._vGroup);

    // Фоны линеек (могут слушать события от других плагинов, например RulerGuidesPlugin)
    this._hBg = new Konva.Rect({
      fill: this._options.bgColor,
      listening: true,
      name: 'ruler-h-bg',
    });
    this._vBg = new Konva.Rect({
      fill: this._options.bgColor,
      listening: true,
      name: 'ruler-v-bg',
    });
    this._hGroup.add(this._hBg);
    this._vGroup.add(this._vBg);

    // Границы линеек (разделители между линейкой и рабочей областью)
    this._hBorder = new Konva.Line({
      stroke: this._options.borderColor,
      strokeWidth: 1,
      listening: false,
    });
    this._vBorder = new Konva.Line({
      stroke: this._options.borderColor,
      strokeWidth: 1,
      listening: false,
    });
    this._hGroup.add(this._hBorder);
    this._vGroup.add(this._vBorder);

    // Shape для горизонтальной линейки (деления + подписи)
    this._hTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        // Получаем активную направляющую один раз для обеих линеек
        const activeGuide = this._getActiveGuideInfo();
        this._drawHorizontalRuler(ctx, activeGuide);
      },
    });
    this._hGroup.add(this._hTicksShape);

    // Shape для вертикальной линейки (деления + подписи)
    this._vTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        // Получаем активную направляющую один раз для обеих линеек
        const activeGuide = this._getActiveGuideInfo();
        this._drawVerticalRuler(ctx, activeGuide);
      },
    });
    this._vGroup.add(this._vTicksShape);

    // Подписываемся на изменения камеры и размера stage
    const stage = core.stage;
    const world = core.nodes.world;

    stage.on('resize.ruler', () => {
      this._scheduleRedraw();
    });

    // Разделяем события панорамирования и зума для разного throttling
    world.on('xChange.ruler yChange.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw(true); // true = панорамирование (более агрессивный throttling)
    });

    world.on('scaleXChange.ruler scaleYChange.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw(false); // false = зум (обычный throttling)
    });

    // Подписываемся на изменения направляющих для инвалидации кэша
    stage.on('guidesChanged.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw();
    });

    // Первичная отрисовка
    this._redraw();
    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    // Отписываемся от всех событий
    core.stage.off('.ruler');
    core.nodes.world.off('.ruler');

    // Удаляем слой
    if (this._layer) {
      this._layer.destroy();
      this._layer = null;
    }
  }

  /**
   * Получить активную направляющую из RulerGuidesPlugin (с кэшированием)
   */
  private _getActiveGuideInfo(): { type: 'h' | 'v'; coord: number } | null {
    if (!this._core) return null;

    // Используем кэш, если он не инвалидирован
    if (!this._cacheInvalidated) {
      return this._cachedActiveGuide;
    }

    // Ищем RulerGuidesPlugin через stage
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (!guidesLayer) {
      this._cachedActiveGuide = null;
      this._cacheInvalidated = false;
      return null;
    }

    // Получаем активную направляющую
    const guides = (guidesLayer as unknown as Konva.Layer).find('Line');
    for (const guide of guides) {
      const line = guide as Konva.Line & { worldCoord: number };
      if (line.strokeWidth() === 2) {
        // активная линия имеет strokeWidth = 2
        const worldCoord = line.worldCoord;
        const type = line.name() === 'guide-h' ? 'h' : 'v';
        this._cachedActiveGuide = { type, coord: worldCoord };
        this._cacheInvalidated = false;
        return this._cachedActiveGuide;
      }
    }

    this._cachedActiveGuide = null;
    this._cacheInvalidated = false;
    return null;
  }

  /**
   * Инвалидировать кэш активной направляющей
   */
  private _invalidateGuideCache() {
    this._cacheInvalidated = true;
  }

  /**
   * Универсальная отрисовка линейки (горизонтальной или вертикальной)
   * @param ctx - контекст canvas
   * @param axis - ось линейки ('h' для горизонтальной, 'v' для вертикальной)
   * @param activeGuide - кэшированная информация об активной направляющей
   */
  private _drawRuler(
    ctx: Konva.Context,
    axis: 'h' | 'v',
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    if (!this._core) return;

    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX() || 1e-9;
    const tPx = this._options.thicknessPx;

    const isHorizontal = axis === 'h';
    const stageSize = isHorizontal ? stage.width() : stage.height();
    const worldOffset = isHorizontal ? world.x() : world.y();

    // Горизонтальная линейка подсвечивает вертикальную направляющую и наоборот
    const highlightCoord =
      activeGuide?.type === (isHorizontal ? 'v' : 'h') ? activeGuide.coord : null;

    // Получаем кэшированную конфигурацию шагов
    const config = this._getStepsConfig(scale);
    const {
      majorStep,
      mediumStep,
      labelStep,
      drawStep,
      drawStepEpsilon,
      majorTickLength,
      mediumTickLength,
      minorTickLength,
      fontString,
    } = config;

    ctx.save();

    // Вычисляем первое видимое деление
    const worldStart = -worldOffset / scale;
    const firstTick = Math.floor(worldStart / drawStep) * drawStep;

    // Собираем деления по типам для батчинга
    const majorTicks: number[] = [];
    const mediumTicks: number[] = [];
    const minorTicks: number[] = [];
    const labels: { pos: number; text: string }[] = [];
    let highlightedTick: number | null = null;

    // Первый проход: классификация делений
    for (let worldPos = firstTick; ; worldPos += drawStep) {
      const screenPos = worldOffset + worldPos * scale;

      if (screenPos > stageSize) break;
      if (screenPos < 0) continue;

      // Проверяем, является ли эта координата активной направляющей
      const isHighlighted =
        highlightCoord !== null && Math.abs(worldPos - highlightCoord) < drawStepEpsilon;

      if (isHighlighted) {
        highlightedTick = screenPos;
        labels.push({ pos: screenPos, text: this._formatNumber(worldPos) });
        continue;
      }

      // Определяем тип деления
      const isMajor = Math.abs(worldPos % majorStep) < drawStepEpsilon;
      const isMedium = !isMajor && Math.abs(worldPos % mediumStep) < drawStepEpsilon;

      if (isMajor) {
        majorTicks.push(screenPos);
      } else if (isMedium) {
        mediumTicks.push(screenPos);
      } else {
        minorTicks.push(screenPos);
      }

      // Подпись
      const shouldShowLabel = Math.abs(worldPos % labelStep) < drawStepEpsilon;
      if (shouldShowLabel) {
        labels.push({ pos: screenPos, text: this._formatNumber(worldPos) });
      }
    }

    // Второй проход: батчинг отрисовки делений
    // Рисуем минорные деления
    if (minorTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of minorTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - minorTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - minorTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Рисуем средние деления
    if (mediumTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of mediumTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - mediumTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - mediumTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Рисуем крупные деления
    if (majorTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of majorTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - majorTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - majorTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Рисуем подсвеченное деление
    if (highlightedTick !== null) {
      ctx.strokeStyle = '#ff8c00';
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(highlightedTick, tPx);
        ctx.lineTo(highlightedTick, tPx - majorTickLength);
      } else {
        ctx.moveTo(tPx, highlightedTick);
        ctx.lineTo(tPx - majorTickLength, highlightedTick);
      }
      ctx.stroke();
    }

    // Рисуем подписи
    if (labels.length > 0) {
      ctx.font = fontString;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      for (const label of labels) {
        const isHighlighted = label.pos === highlightedTick;
        ctx.globalAlpha = isHighlighted ? 1 : 0.9;
        ctx.fillStyle = isHighlighted ? '#ff8c00' : this._options.color;

        if (isHorizontal) {
          ctx.fillText(label.text, label.pos + 4, 4);
        } else {
          // Для вертикальной линейки поворачиваем текст
          const x = 4;
          const y = label.pos + 4;
          ctx.setTransform(0, -1, 1, 0, x, y);
          ctx.fillText(label.text, 0, 0);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    }

    // Дополнительно рисуем подсвеченную координату, даже если она не попадает в обычную сетку
    if (highlightCoord !== null) {
      const screenPos = worldOffset + highlightCoord * scale;
      if (screenPos >= 0 && screenPos <= stageSize) {
        const alreadyDrawn = Math.abs(highlightCoord % drawStep) < drawStepEpsilon;

        if (!alreadyDrawn) {
          // Рисуем деление
          ctx.strokeStyle = '#ff8c00';
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (isHorizontal) {
            ctx.moveTo(screenPos, tPx);
            ctx.lineTo(screenPos, tPx - majorTickLength);
          } else {
            ctx.moveTo(tPx, screenPos);
            ctx.lineTo(tPx - majorTickLength, screenPos);
          }
          ctx.stroke();

          // Рисуем подпись
          ctx.fillStyle = '#ff8c00';
          ctx.font = fontString;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';

          if (isHorizontal) {
            ctx.fillText(this._formatNumber(highlightCoord), screenPos + 4, 4);
          } else {
            const x = 4;
            const y = screenPos + 4;
            ctx.setTransform(0, -1, 1, 0, x, y);
            ctx.fillText(this._formatNumber(highlightCoord), 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Отрисовка горизонтальной линейки
   * @param activeGuide - кэшированная информация об активной направляющей
   */
  private _drawHorizontalRuler(
    ctx: Konva.Context,
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    this._drawRuler(ctx, 'h', activeGuide);
  }

  /**
   * Отрисовка вертикальной линейки
   * @param activeGuide - кэшированная информация об активной направляющей
   */
  private _drawVerticalRuler(
    ctx: Konva.Context,
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    this._drawRuler(ctx, 'v', activeGuide);
  }

  /**
   * Полная перерисовка линейки
   */
  private _redraw() {
    if (!this._core || !this._layer) return;

    const stage = this._core.stage;
    const stageW = stage.width();
    const stageH = stage.height();
    const tPx = this._options.thicknessPx;

    // Обновляем размеры фонов
    if (this._hBg) {
      this._hBg.size({ width: stageW, height: tPx });
    }
    if (this._vBg) {
      this._vBg.size({ width: tPx, height: stageH });
    }

    // Обновляем границы
    if (this._hBorder) {
      this._hBorder.points([0, tPx, stageW, tPx]);
    }
    if (this._vBorder) {
      this._vBorder.points([tPx, 0, tPx, stageH]);
    }

    // Перерисовываем линейки
    this._layer.batchDraw();
  }

  /**
   * Отложенная перерисовка с улучшенным throttling
   * Группирует быстрые события зума/панорамирования для оптимизации
   * @param isPanning - true для панорамирования (более агрессивный throttling)
   */
  private _scheduleRedraw(isPanning = false) {
    if (!this._core || !this._layer) return;

    const now = globalThis.performance.now();
    const timeSinceLastRedraw = now - this._lastRedrawTime;

    // Если уже запланирована перерисовка, пропускаем
    if (this._redrawScheduled) return;

    this._redrawScheduled = true;

    // Выбираем throttle период в зависимости от типа события
    const throttleMs = isPanning ? this._panThrottleMs : this._redrawThrottleMs;

    // Если прошло достаточно времени с последней перерисовки, рисуем сразу
    if (timeSinceLastRedraw >= throttleMs) {
      globalThis.requestAnimationFrame(() => {
        this._redrawScheduled = false;
        this._lastRedrawTime = globalThis.performance.now();
        this._redraw();
      });
    } else {
      // Иначе откладываем до истечения throttle периода
      const delay = throttleMs - timeSinceLastRedraw;
      globalThis.setTimeout(() => {
        globalThis.requestAnimationFrame(() => {
          this._redrawScheduled = false;
          this._lastRedrawTime = globalThis.performance.now();
          this._redraw();
        });
      }, delay);
    }
  }

  /**
   * Показать линейку
   */
  public show() {
    if (this._core && this._layer) {
      this._core.stage.add(this._layer);
      this._layer.moveToTop();
      this._redraw();
      this._core.stage.batchDraw();
    }
  }

  /**
   * Скрыть линейку
   */
  public hide() {
    if (this._layer?.getStage()) {
      this._layer.remove();
      this._core?.stage.batchDraw();
    }
  }

  /**
   * Переключить видимость линейки
   */
  public toggle() {
    if (this._layer?.getStage()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Проверить, видима ли линейка
   */
  public isVisible(): boolean {
    return !!this._layer?.getStage();
  }
}
