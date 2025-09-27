import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerPluginOptions {
  thicknessPx?: number; // толщина линейки в пикселях
  majorTickPx?: number; // желаемый шаг для крупных делений в пикселях
  fontFamily?: string;
  fontSizePx?: number;
  color?: string; // цвет текста и делений
  bgColor?: string; // фон линейки
  guidesColor?: string; // цвет направляющих
  target?: EventTarget; // куда вешать keydown, по умолчанию window
}

export class RulerPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerPluginOptions>;
  private _layer: Konva.Layer | null = null; // слой для линейки
  private _guidesLayer: Konva.Layer | null = null; // слой для направляющих

  private _hGroup?: Konva.Group; // содержимое горизонтальной линейки (фон, деления, текст)
  private _vGroup?: Konva.Group; // содержимое вертикальной линейки

  private _hBg?: Konva.Rect;
  private _vBg?: Konva.Rect;

  private _hTicks?: Konva.Group;
  private _vTicks?: Konva.Group;

  private _hLabel?: Konva.Text; // диапазон x1..x2
  private _vLabel?: Konva.Text; // диапазон y1..y2

  // Направляющие храним непосредственно в слоях (их позиция — мировые координаты)

  private _visible = true;

  constructor(options: RulerPluginOptions = {}) {
    super();
    const {
      thicknessPx = 30,
      majorTickPx = 50,
      fontFamily = 'Inter, Calibri, Arial, sans-serif',
      fontSizePx = 10,
      color = '#7a7a7a',
      bgColor = '#f5f5f7',
      guidesColor = '#2b83ff',
      target = globalThis as unknown as EventTarget,
    } = options;
    this._options = {
      thicknessPx,
      majorTickPx,
      fontFamily,
      fontSizePx,
      color,
      bgColor,
      guidesColor,
      target,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Слой линейки и направляющих
    const guidesLayer = new Konva.Layer({ name: 'guides-layer' });
    const rulerLayer = new Konva.Layer({ name: 'ruler-layer' });
    this._guidesLayer = guidesLayer;
    this._layer = rulerLayer;
    core.stage.add(guidesLayer);
    core.stage.add(rulerLayer);

    // Группы
    this._hGroup = new Konva.Group({ listening: true });
    this._vGroup = new Konva.Group({ listening: true });
    this._layer.add(this._hGroup);
    this._layer.add(this._vGroup);

    // Фоны
    this._hBg = new Konva.Rect({ fill: this._options.bgColor, listening: true });
    this._vBg = new Konva.Rect({ fill: this._options.bgColor, listening: true });
    this._hGroup.add(this._hBg);
    this._vGroup.add(this._vBg);

    // Группы делений
    this._hTicks = new Konva.Group({ listening: false });
    this._vTicks = new Konva.Group({ listening: false });
    this._hGroup.add(this._hTicks);
    this._vGroup.add(this._vTicks);

    // Подписи диапазона
    this._hLabel = new Konva.Text({
      text: '',
      fontFamily: this._options.fontFamily,
      fontSize: this._options.fontSizePx,
      fill: this._options.color,
      listening: false,
    });
    this._vLabel = new Konva.Text({
      text: '',
      fontFamily: this._options.fontFamily,
      fontSize: this._options.fontSizePx,
      fill: this._options.color,
      listening: false,
      rotation: -90,
    });
    this._hGroup.add(this._hLabel);
    this._vGroup.add(this._vLabel);

    // Подписки на изменения сцены (namespace .ruler)
    const stage = core.stage;
    stage.on(
      'resize.ruler xChange.ruler yChange.ruler scaleXChange.ruler scaleYChange.ruler',
      () => {
        this._layoutAndRedraw();
      },
    );

    // События для создания направляющих: клик по линейке
    const hGroup = this._hGroup;
    const vGroup = this._vGroup;
    hGroup.on('mousedown.ruler', (e: Konva.KonvaEventObject<MouseEvent>) => {
      this._startCreateGuide(e, 'h');
    });
    vGroup.on('mousedown.ruler', (e: Konva.KonvaEventObject<MouseEvent>) => {
      this._startCreateGuide(e, 'v');
    });
    // Перетаскивание направляющих ограничено одной осью
    this._guidesLayer.on('dblclick.ruler', (e: Konva.KonvaEventObject<MouseEvent>) => {
      this._onGuideDoubleClick(e);
    });

    // Хоткей Ctrl+G — показать/скрыть
    const t = this._options.target as EventTarget & {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };
    t.addEventListener('keydown', this._onKey as EventListener);

    this._layoutAndRedraw();
    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    core.stage.off('.ruler');
    const t = this._options.target as EventTarget & {
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };
    t.removeEventListener('keydown', this._onKey as EventListener);

    if (this._layer) this._layer.destroy();
    if (this._guidesLayer) this._guidesLayer.destroy();
    this._layer = null;
    this._guidesLayer = null;
  }

  // ===== Keyboard toggle =====
  private _onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      this._visible = !this._visible;
      if (this._layer) this._layer.visible(this._visible);
      if (this._guidesLayer) this._guidesLayer.visible(this._visible);
      if (this._core) this._core.stage.batchDraw();
    }
  };

  // ===== Guide creation =====
  private _startCreateGuide(_e: Konva.KonvaEventObject<unknown>, type: 'h' | 'v') {
    if (!this._core || !this._guidesLayer) return;
    const stage = this._core.stage;
    const scale = stage.scaleX();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Преобразование экрана в мир
    const worldAt = (sx: number, sy: number) => ({
      x: (sx - stage.x()) / scale,
      y: (sy - stage.y()) / scale,
    });

    // начальная мировая позиция направляющей
    const w = worldAt(pos.x, pos.y);
    if (type === 'h') {
      this._addHorizontalGuide(w.y);
    } else {
      this._addVerticalGuide(w.x);
    }
    this._layoutAndRedraw();
    this._core.stage.batchDraw();
  }

  private _onGuideDoubleClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!this._core) return;
    const node = e.target;
    if (node.name() === 'guide-h') {
      node.destroy();
      this._core.stage.batchDraw();
    } else if (node.name() === 'guide-v') {
      node.destroy();
      this._core.stage.batchDraw();
    }
  }

  private _addHorizontalGuide(y: number) {
    if (!this._guidesLayer || !this._core) return;
    const line = new Konva.Line({
      name: 'guide-h',
      x: 0,
      y,
      points: [0, 0, 1, 0], // относительные точки, растянем при layout
      stroke: this._options.guidesColor,
      strokeWidth: 1,
      dash: [4, 4],
      draggable: true,
      dragBoundFunc: (pos) => ({ x: 0, y: pos.y }), // фиксируем ось X
      hitStrokeWidth: 10,
    });
    line.on('dragmove.ruler', () => {
      this._layoutAndRedraw();
    });
    this._guidesLayer.add(line);
  }

  private _addVerticalGuide(x: number) {
    if (!this._guidesLayer || !this._core) return;
    const line = new Konva.Line({
      name: 'guide-v',
      x,
      y: 0,
      points: [0, 0, 0, 1], // относительные точки, растянем при layout
      stroke: this._options.guidesColor,
      strokeWidth: 1,
      dash: [4, 4],
      draggable: true,
      dragBoundFunc: (pos) => ({ x: pos.x, y: 0 }), // фиксируем ось Y
      hitStrokeWidth: 10,
    });
    line.on('dragmove.ruler', () => {
      this._layoutAndRedraw();
    });
    this._guidesLayer.add(line);
  }

  // ===== Layout & redraw =====
  private _layoutAndRedraw() {
    if (!this._core || !this._layer || !this._guidesLayer || !this._hGroup || !this._vGroup) return;
    const stage = this._core.stage;
    const scale = stage.scaleX();
    const stageW = stage.width();
    const stageH = stage.height();
    const sPos = stage.position();

    // Перевод экран->мир для якорных углов
    const worldAt = (sx: number, sy: number) => ({
      x: (sx - sPos.x) / scale,
      y: (sy - sPos.y) / scale,
    });

    const topLeft = worldAt(0, 0);
    const topRight = worldAt(stageW, 0);
    const bottomLeft = worldAt(0, stageH);

    // Размер линейки в мире, чтобы на экране был фиксированный thickness
    const t = this._options.thicknessPx / scale;

    // Позиция и размер фоновых прямоугольников линейки (в мировых координатах)
    if (this._hBg) {
      this._hBg.position({ x: topLeft.x, y: topLeft.y });
      this._hBg.size({ width: topRight.x - topLeft.x, height: t });
    }
    if (this._vBg) {
      this._vBg.position({ x: topLeft.x, y: topLeft.y });
      this._vBg.size({ width: t, height: bottomLeft.y - topLeft.y });
    }

    // Обновить деления и подписи
    this._redrawTicksAndLabels(topLeft, topRight, bottomLeft, scale);

    // Обновить направляющие — растянуть на весь текущий вид
    this._redrawGuides(topLeft, topRight, bottomLeft);

    // Поверх всех остальных слоёв
    this._layer.moveToTop();
    this._guidesLayer.moveToTop();
  }

  private _redrawTicksAndLabels(
    topLeft: { x: number; y: number },
    topRight: { x: number; y: number },
    bottomLeft: { x: number; y: number },
    scale: number,
  ) {
    if (!this._hTicks || !this._vTicks || !this._hLabel || !this._vLabel) return;

    const tWorld = this._options.thicknessPx / scale;
    const majorPx = this._options.majorTickPx;

    // Вычисляем шаг в мировых координатах так, чтобы крупные деления ~ majorPx
    const stepWorldRaw = majorPx / scale;
    const stepWorld = this._niceStep(stepWorldRaw);

    // Горизонтальные деления
    this._hTicks.destroyChildren();
    const xStart = Math.floor(topLeft.x / stepWorld) * stepWorld;
    const xEnd = topRight.x;
    for (let x = xStart; x <= xEnd; x += stepWorld) {
      const sx = x; // мировая x
      const line = new Konva.Line({
        points: [sx, topLeft.y + tWorld, sx, topLeft.y + tWorld - tWorld * 0.5],
        stroke: this._options.color,
        strokeWidth: 1 / scale,
        listening: false,
      });
      this._hTicks.add(line);

      const label = new Konva.Text({
        text: this._formatNumber(x),
        x: sx + 2 / scale,
        y: topLeft.y + tWorld - (this._options.fontSizePx + 2) / scale,
        fontFamily: this._options.fontFamily,
        fontSize: this._options.fontSizePx / scale,
        fill: this._options.color,
        listening: false,
      });
      this._hTicks.add(label);
    }

    // Вертикальные деления
    this._vTicks.destroyChildren();
    const yStart = Math.floor(topLeft.y / stepWorld) * stepWorld;
    const yEnd = bottomLeft.y;
    for (let y = yStart; y <= yEnd; y += stepWorld) {
      const sy = y;
      const line = new Konva.Line({
        points: [topLeft.x + tWorld, sy, topLeft.x + tWorld - tWorld * 0.5, sy],
        stroke: this._options.color,
        strokeWidth: 1 / scale,
        listening: false,
      });
      this._vTicks.add(line);

      const label = new Konva.Text({
        text: this._formatNumber(y),
        x: topLeft.x + 2 / scale,
        y: sy - (this._options.fontSizePx + 2) / scale,
        fontFamily: this._options.fontFamily,
        fontSize: this._options.fontSizePx / scale,
        fill: this._options.color,
        listening: false,
      });
      this._vTicks.add(label);
    }

    // Диапазон x1..x2, y1..y2
    this._hLabel.text(`x: ${this._formatNumber(topLeft.x)} .. ${this._formatNumber(topRight.x)}`);
    this._hLabel.position({ x: topLeft.x + 8 / scale, y: topLeft.y + 2 / scale });

    this._vLabel.text(`y: ${this._formatNumber(topLeft.y)} .. ${this._formatNumber(bottomLeft.y)}`);
    // Размещаем у верхней части вертикальной линейки
    this._vLabel.position({
      x: topLeft.x + (this._options.thicknessPx - 4) / scale,
      y: topLeft.y + 8 / scale,
    });
  }

  private _redrawGuides(
    topLeft: { x: number; y: number },
    topRight: { x: number; y: number },
    bottomLeft: { x: number; y: number },
  ) {
    if (!this._guidesLayer) return;

    // Обновить геометрию всех существующих линий
    const hNodes = this._guidesLayer.find('.guide-h');
    for (const n of hNodes) {
      const line = n as Konva.Line;
      line.points([topLeft.x, 0, topRight.x, 0]);
    }
    const vNodes = this._guidesLayer.find('.guide-v');
    for (const n of vNodes) {
      const line = n as Konva.Line;
      line.points([0, topLeft.y, 0, bottomLeft.y]);
    }
  }

  // Округление шага к «красивым» значениям (1, 2, 5 * 10^k)
  private _niceStep(raw: number): number {
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
    const n = raw / pow;
    let nice: number;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  private _formatNumber(v: number): string {
    // Короткий формат без лишних знаков после запятой
    if (Math.abs(v) >= 1000) return Math.round(v).toString();
    return (Math.round(v * 100) / 100).toString();
  }
}
