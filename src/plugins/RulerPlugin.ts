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

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Создаём слой для линейки (не участвует в событиях, чтобы не блокировать взаимодействие с канвасом)
    this._layer = new Konva.Layer({
      name: 'ruler-layer',
      listening: false,
      hitGraphEnabled: false,
    });
    
    if (this._options.enabled) {
      core.stage.add(this._layer);
    }

    // Группы для горизонтальной и вертикальной линейки
    this._hGroup = new Konva.Group({ listening: false });
    this._vGroup = new Konva.Group({ listening: false });
    this._layer.add(this._hGroup);
    this._layer.add(this._vGroup);

    // Фоны линеек
    this._hBg = new Konva.Rect({ 
      fill: this._options.bgColor, 
      listening: false 
    });
    this._vBg = new Konva.Rect({ 
      fill: this._options.bgColor, 
      listening: false 
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
      sceneFunc: (ctx) => this._drawHorizontalRuler(ctx),
    });
    this._hGroup.add(this._hTicksShape);

    // Shape для вертикальной линейки (деления + подписи)
    this._vTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => this._drawVerticalRuler(ctx),
    });
    this._vGroup.add(this._vTicksShape);

    // Подписываемся на изменения камеры и размера stage
    const stage = core.stage;
    const world = core.nodes.world;
    
    stage.on('resize.ruler', () => {
      this._scheduleRedraw();
    });
    
    world.on('xChange.ruler yChange.ruler scaleXChange.ruler scaleYChange.ruler', () => {
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
   * Отрисовка горизонтальной линейки
   */
  private _drawHorizontalRuler(ctx: Konva.Context) {
      if (!this._core) return;
    
      const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX() || 1e-9;
    const stageW = stage.width();
    const tPx = this._options.thicknessPx;
    const worldX = world.x();

    // Минимальный желаемый шаг между делениями в пикселях
    const minStepPx = 50;
    const minWorldStep = minStepPx / scale;
    let step = this._calculateNiceStep(minWorldStep);
    
    // ВАЖНО: округляем до целого числа, чтобы не было дробных координат
    // Минимальный шаг = 1, все координаты должны быть целыми
    if (step < 1) {
      step = 1;
    }
    
    const stepPx = step * scale;

    // Адаптивная система уровней делений и подписей
    let majorStep: number;
    let mediumStep: number;
    let labelStep: number;
    let drawStep: number; // шаг отрисовки делений
    
    if (stepPx >= 60) {
      // При максимальном приближении (видны отдельные пиксели) - 
      // рисуем ВСЕ деления, подписи на каждом
      majorStep = step * 10; // крупные деления через 10
      mediumStep = step * 5;  // средние деления через 5
      labelStep = step;       // подписи на КАЖДОМ делении
      drawStep = step;        // рисуем все деления
    } else if (stepPx >= 40) {
      // При среднем зуме - деления через 5 и 10, подписи на каждом 5-м
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 5;
      drawStep = step; // рисуем все деления
      } else {
      // При дальнем зуме - деления через 5 и 10, подписи только на крупных
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 10;
      drawStep = step; // рисуем все деления
    }
    
    ctx.save();
    
    // Вычисляем первое видимое деление
    const worldStart = -worldX / scale;
    const firstTick = Math.floor(worldStart / drawStep) * drawStep;
    
    for (let worldPos = firstTick; ; worldPos += drawStep) {
      const screenX = worldX + worldPos * scale;
      
      if (screenX > stageW) break;
      if (screenX < 0) continue;
      
      // Определяем тип деления на основе мировой координаты
      // Используем drawStep для точности проверки
      const isMajor = Math.abs(worldPos % majorStep) < drawStep * 0.01;
      const isMedium = !isMajor && Math.abs(worldPos % mediumStep) < drawStep * 0.01;
      
      // Длина деления
      const tickLength = isMajor ? tPx * 0.6 : isMedium ? tPx * 0.4 : tPx * 0.25;
      
      // Цвет деления
      const alpha = isMajor ? 0.9 : isMedium ? 0.6 : 0.4;
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      
      // Рисуем деление
      ctx.beginPath();
      ctx.moveTo(screenX, tPx);
      ctx.lineTo(screenX, tPx - tickLength);
      ctx.stroke();
      
      // Подпись: проверяем, кратна ли мировая координата шагу подписей
      const shouldShowLabel = Math.abs(worldPos % labelStep) < drawStep * 0.01;
      if (shouldShowLabel) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = this._options.color;
        ctx.font = `${this._options.fontSizePx}px ${this._options.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(this._formatNumber(worldPos), screenX + 4, 4);
      }
    }
    
    ctx.restore();
  }

  /**
   * Отрисовка вертикальной линейки
   */
  private _drawVerticalRuler(ctx: Konva.Context) {
    if (!this._core) return;
    
    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX() || 1e-9;
    const stageH = stage.height();
    const tPx = this._options.thicknessPx;
    const worldY = world.y();

    // Минимальный желаемый шаг между делениями в пикселях
    const minStepPx = 50;
    const minWorldStep = minStepPx / scale;
    let step = this._calculateNiceStep(minWorldStep);
    
    // ВАЖНО: округляем до целого числа, чтобы не было дробных координат
    // Минимальный шаг = 1, все координаты должны быть целыми
    if (step < 1) {
      step = 1;
    }
    
    const stepPx = step * scale;

    // Адаптивная система уровней делений и подписей
    let majorStep: number;
    let mediumStep: number;
    let labelStep: number;
    let drawStep: number; // шаг отрисовки делений
    
    if (stepPx >= 60) {
      // При максимальном приближении (видны отдельные пиксели) - 
      // рисуем ВСЕ деления, подписи на каждом
      majorStep = step * 10; // крупные деления через 10
      mediumStep = step * 5;  // средние деления через 5
      labelStep = step;       // подписи на КАЖДОМ делении
      drawStep = step;        // рисуем все деления
    } else if (stepPx >= 40) {
      // При среднем зуме - деления через 5 и 10, подписи на каждом 5-м
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 5;
      drawStep = step; // рисуем все деления
    } else {
      // При дальнем зуме - деления через 5 и 10, подписи только на крупных
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 10;
      drawStep = step; // рисуем все деления
    }
    
    ctx.save();
    
    // Вычисляем первое видимое деление
    const worldStart = -worldY / scale;
    const firstTick = Math.floor(worldStart / drawStep) * drawStep;
    
    for (let worldPos = firstTick; ; worldPos += drawStep) {
      const screenY = worldY + worldPos * scale;
      
      if (screenY > stageH) break;
      if (screenY < 0) continue;
      
      // Определяем тип деления на основе мировой координаты
      // Используем drawStep для точности проверки
      const isMajor = Math.abs(worldPos % majorStep) < drawStep * 0.01;
      const isMedium = !isMajor && Math.abs(worldPos % mediumStep) < drawStep * 0.01;
      
      // Длина деления
      const tickLength = isMajor ? tPx * 0.6 : isMedium ? tPx * 0.4 : tPx * 0.25;
      
      // Цвет деления
      const alpha = isMajor ? 0.9 : isMedium ? 0.6 : 0.4;
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      
      // Рисуем деление
      ctx.beginPath();
      ctx.moveTo(tPx, screenY);
      ctx.lineTo(tPx - tickLength, screenY);
      ctx.stroke();
      
      // Подпись: проверяем, кратна ли мировая координата шагу подписей
      const shouldShowLabel = Math.abs(worldPos % labelStep) < drawStep * 0.01;
      if (shouldShowLabel) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = this._options.color;
        ctx.font = `${this._options.fontSizePx}px ${this._options.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        
        // Для вертикальной линейки поворачиваем текст
        ctx.save();
        ctx.translate(4, screenY + 4);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(this._formatNumber(worldPos), 0, 0);
        ctx.restore();
      }
    }
    
    ctx.restore();
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
   * Отложенная перерисовка (throttling)
   */
  private _scheduleRedraw() {
    if (!this._core || !this._layer || this._redrawScheduled) return;
    
    this._redrawScheduled = true;
    
    const raf = globalThis.requestAnimationFrame || ((cb: FrameRequestCallback) => {
      return globalThis.setTimeout(() => cb(0), 16);
    });
    
    raf(() => {
      this._redrawScheduled = false;
      this._redraw();
    });
  }

  /**
   * Показать линейку
   */
  public show() {
    if (this._core && this._layer && !this._layer.getStage()) {
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
    if (this._layer && this._layer.getStage()) {
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
