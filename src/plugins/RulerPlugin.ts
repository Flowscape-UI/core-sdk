import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';
import { GridPlugin } from './GridPlugin';

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
  private _hTicksShape?: Konva.Shape; // оптимизированная отрисовка делений по X
  private _vTicksShape?: Konva.Shape; // оптимизированная отрисовка делений по Y

  // Убраны диапазонные подписи (как в Figma — без лишних чисел в углу)

  // Направляющие храним непосредственно в слоях (их позиция — мировые координаты)

  private _visible = true;
  private _redrawScheduled = false;

  // ===== Guides interaction state =====
  private _activeGuide: Konva.Line | null = null;
  private _creating: { type: 'h' | 'v'; line: Konva.Line; wasInRuler: boolean } | null = null;

  // стили направляющих
  private readonly _GUIDE_COLOR = '#ff4d4f'; // базовый цвет (оранжево‑красный)
  private readonly _GUIDE_ACTIVE_COLOR = '#1d39c4'; // тёмно‑синий для выделенной
  private readonly _GUIDE_OPACITY = 0.55; // обычное состояние
  private readonly _GUIDE_HOVER_OPACITY = 0.95; // при наведении

  // Палитра линейки (dark)
  private readonly _RULER_BORDER = '#1f1f1f';
  private readonly _TICK_MAJOR = '#8c8c8c';
  private readonly _TICK_MEDIUM = '#5f5f5f';
  private readonly _TICK_MINOR = '#444444';
  private readonly _LABEL_COLOR = '#bfbfbf';

  // Бордюры линейки
  private _hBorder?: Konva.Line;
  private _vBorder?: Konva.Line;

  constructor(options: RulerPluginOptions = {}) {
    super();
    const {
      thicknessPx = 30,
      majorTickPx = 50,
      fontFamily = 'Inter, Calibri, Arial, sans-serif',
      fontSizePx = 10,
      color = '#4c4c4c',
      bgColor = '#2c2c2c',
      guidesColor = '#2b83ff',
      target = globalThis,
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

  // Поиск активного GridPlugin для синхронизации шагов
  private _getGrid(): GridPlugin | null {
    const core = this._core;
    if (!core) return null;
    const plugins = core.plugins.list();
    for (const p of plugins) {
      if (p instanceof GridPlugin) return p;
    }
    return null;
  }

  // Подбор множителя из {1,2,5} * 10^k, чтобы base*mult >= need
  private _niceMultiplier(need: number): number {
    if (!isFinite(need) || need <= 1) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(need)));
    const n = need / pow;
    if (n <= 1) return 1 * pow;
    if (n <= 2) return 2 * pow;
    if (n <= 5) return 5 * pow;
    return 10 * pow;
  }

  // Подбор «красивого» шага делений по желаемому экранному шагу (px)
  private _niceStepPx(desiredPx: number, scale: number): number {
    const rawWorld = desiredPx / Math.max(scale, 1e-9);
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rawWorld, 1e-9))));
    const n = rawWorld / pow;
    let nice: number;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  // вычисление мировых прямоугольников зон линеек
  private _getRulerWorldRects() {
    if (!this._core) {
      return { h: { x: 0, y: 0, w: 0, h: 0 }, v: { x: 0, y: 0, w: 0, h: 0 } };
    }
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const stageW = this._core.stage.width();
    const stageH = this._core.stage.height();
    const sPos = world.position();
    const worldAt = (sx: number, sy: number) => ({
      x: (sx - sPos.x) / scale,
      y: (sy - sPos.y) / scale,
    });
    const topLeft = worldAt(0, 0);
    const topRight = worldAt(stageW, 0);
    const bottomLeft = worldAt(0, stageH);
    const tWorld = this._options.thicknessPx / scale;
    return {
      h: { x: topLeft.x, y: topLeft.y, w: topRight.x - topLeft.x, h: tWorld },
      v: { x: topLeft.x, y: topLeft.y, w: tWorld, h: bottomLeft.y - topLeft.y },
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Слой линейки и направляющих
    const guidesLayer = new Konva.Layer({ name: 'guides-layer' });
    // Слой линейки НЕ участвует в хит-тестах, чтобы не блокировать зум/перемещение/клики по сцене
    const rulerLayer = new Konva.Layer({
      name: 'ruler-layer',
      listening: false,
      hitGraphEnabled: false,
    });
    this._guidesLayer = guidesLayer;
    this._layer = rulerLayer;
    core.stage.add(guidesLayer);
    core.stage.add(rulerLayer);

    // Группы
    // Группы внутри линейки могут быть listening:true, но слой выключен — они не перехватывают события
    this._hGroup = new Konva.Group({ listening: false });
    this._vGroup = new Konva.Group({ listening: false });
    this._layer.add(this._hGroup);
    this._layer.add(this._vGroup);

    // Курсоры при наведении на линейки
    const setCursor = (c: string) => {
      if (this._core) this._core.stage.container().style.cursor = c;
    };
    // Курсор теперь управляется глобально по положению мыши на stage

    // Фоны
    this._hBg = new Konva.Rect({ fill: this._options.bgColor, listening: true });
    this._vBg = new Konva.Rect({ fill: this._options.bgColor, listening: true });
    this._hGroup.add(this._hBg);
    this._vGroup.add(this._vBg);

    // Внутренние бордюры линейки (разделители с рабочим полем)
    this._hBorder = new Konva.Line({
      stroke: this._RULER_BORDER,
      strokeWidth: 1,
      listening: false,
    });
    this._vBorder = new Konva.Line({
      stroke: this._RULER_BORDER,
      strokeWidth: 1,
      listening: false,
    });
    this._hGroup.add(this._hBorder);
    this._vGroup.add(this._vBorder);

    // Группы делений
    this._hTicks = new Konva.Group({ listening: false });
    this._vTicks = new Konva.Group({ listening: false });
    this._hGroup.add(this._hTicks);
    this._vGroup.add(this._vTicks);
    // Один shape вместо сотен нод: деления + подписи для горизонтальной линейки
    this._hTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        if (!this._core) return;
        const stage = this._core.stage;
        const world = this._core.nodes.world;
        const scale = world.scaleX() || 1e-9;
        const stageW = stage.width();
        const tPx = this._options.thicknessPx;
        const offX = world.x();

        // Получить шаг делений и кратности
        const grid = this._getGrid();
        const desiredPx = 10;
        let stepMinorXPx: number;
        let cadenceX = 1;
        let baseX = 0;
        let gridVisible = false;
        if (grid) {
          baseX = Math.max(1, grid.stepX);
          const baseXPx = baseX * Math.max(scale, 1e-9);
          cadenceX = this._niceMultiplier(Math.ceil(desiredPx / Math.max(1e-9, baseXPx)));
          stepMinorXPx = baseXPx;
          const min = grid.minScaleToShow;
          gridVisible = min == null || scale >= min;
        } else {
          const stepMinorX = this._niceStepPx(desiredPx, scale);
          stepMinorXPx = stepMinorX * Math.max(scale, 1e-9);
          cadenceX = 1;
        }

        // Рисуем деления
        ctx.save();
        ctx.beginPath();
        const startSx = ((offX % stepMinorXPx) + stepMinorXPx) % stepMinorXPx;
        let kx = 0;
        const labelEveryX = gridVisible ? 1 : 10 * cadenceX;
        for (let sx = startSx; sx <= stageW + 1; sx += stepMinorXPx, kx++) {
          const xWorld = (sx - offX) / Math.max(scale, 1e-9);
          const isMajor = kx % (10 * cadenceX) === 0;
          const isMedium = !isMajor && kx % (5 * cadenceX) === 0;
          const len = (isMajor ? 0.75 : isMedium ? 0.55 : 0.35) * tPx;
          const color = isMajor
            ? this._TICK_MAJOR
            : isMedium
              ? this._TICK_MEDIUM
              : this._TICK_MINOR;
          ctx.strokeStyle = color;
          ctx.moveTo(sx, tPx);
          ctx.lineTo(sx, tPx - len);
          const isLabelTick = kx % labelEveryX === 0;
          if (isLabelTick) {
            // подпись
            const labelX = baseX > 0 ? Math.round(xWorld / baseX) * baseX : xWorld;
            ctx.fillStyle = this._LABEL_COLOR;
            ctx.font = String(this._options.fontSizePx) + 'px ' + this._options.fontFamily;
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(
              this._formatNumber(labelX),
              sx + 2,
              tPx - (this._options.fontSizePx + 4) + this._options.fontSizePx,
            );
          }
        }
        ctx.stroke();
        ctx.restore();
      },
    });
    this._hTicks.add(this._hTicksShape);

    // Вертикальная линейка
    this._vTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        if (!this._core) return;
        const stage = this._core.stage;
        const world = this._core.nodes.world;
        const scale = world.scaleX() || 1e-9;
        const stageH = stage.height();
        const tPx = this._options.thicknessPx;
        const offY = world.y();

        const grid = this._getGrid();
        const desiredPx = 10;
        let stepMinorYPx: number;
        let cadenceY = 1;
        let baseY = 0;
        let gridVisible = false;
        if (grid) {
          baseY = Math.max(1, grid.stepY);
          const baseYPx = baseY * Math.max(scale, 1e-9);
          cadenceY = this._niceMultiplier(Math.ceil(desiredPx / Math.max(1e-9, baseYPx)));
          stepMinorYPx = baseYPx;
          const min = grid.minScaleToShow;
          gridVisible = min == null || scale >= min;
        } else {
          const stepMinorY = this._niceStepPx(desiredPx, scale);
          stepMinorYPx = stepMinorY * Math.max(scale, 1e-9);
          cadenceY = 1;
        }

        ctx.save();
        ctx.beginPath();
        const startSy = ((offY % stepMinorYPx) + stepMinorYPx) % stepMinorYPx;
        let ky = 0;
        const labelEveryY = gridVisible ? 1 : 10 * cadenceY;
        for (let sy = startSy; sy <= stageH + 1; sy += stepMinorYPx, ky++) {
          const yWorld = (sy - offY) / Math.max(scale, 1e-9);
          const isMajor = ky % (10 * cadenceY) === 0;
          const isMedium = !isMajor && ky % (5 * cadenceY) === 0;
          const len = (isMajor ? 0.75 : isMedium ? 0.55 : 0.35) * tPx;
          const color = isMajor
            ? this._TICK_MAJOR
            : isMedium
              ? this._TICK_MEDIUM
              : this._TICK_MINOR;
          ctx.strokeStyle = color;
          ctx.moveTo(tPx, sy);
          ctx.lineTo(tPx - len, sy);
          const isLabelTick = ky % labelEveryY === 0;
          if (isLabelTick) {
            const labelY = baseY > 0 ? Math.round(yWorld / baseY) * baseY : yWorld;
            ctx.fillStyle = this._LABEL_COLOR;
            ctx.font = String(this._options.fontSizePx) + 'px ' + this._options.fontFamily;
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(this._formatNumber(labelY), 4, sy - 4);
          }
        }
        ctx.stroke();
        ctx.restore();
      },
    });
    this._vTicks.add(this._vTicksShape);

    // Диапазонные подписи не используются — соответствующие ноды убраны

    // Подписки на изменения сцены/камеры (namespace .ruler)
    const stage = core.stage;
    const world = core.nodes.world;
    stage.on('resize.ruler', () => {
      this._scheduleRedraw();
    });
    world.on('xChange.ruler yChange.ruler scaleXChange.ruler scaleYChange.ruler', () => {
      this._scheduleRedraw();
    });

    // События для создания направляющих: обработаем на stage, проверяя попадание в зону линейки (экран)
    stage.on('mousedown.ruler-create', (e: Konva.KonvaEventObject<MouseEvent>) => {
      const p = stage.getPointerPosition();
      if (!p) return;
      const tPx = this._options.thicknessPx;
      if (p.y <= tPx) {
        this._startCreateGuide(e, 'h');
      } else if (p.x <= tPx) {
        this._startCreateGuide(e, 'v');
      }
    });
    // Курсоры на линейке (по положению на экране)
    stage.on('mousemove.ruler-cursor', () => {
      const p = stage.getPointerPosition();
      if (!p) return;
      const tPx = this._options.thicknessPx;
      if (p.y <= tPx) setCursor('ns-resize');
      else if (p.x <= tPx) setCursor('ew-resize');
      else setCursor('default');
    });
    // Перетаскивание направляющих ограничено одной осью
    // Удаление по dblclick — отключено по требованиям

    // Хоткей Shift+R — показать/скрыть (по коду клавиши, независимо от раскладки)
    const t = this._options.target as EventTarget & {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };
    t.addEventListener('keydown', this._onKey as EventListener);

    // Подсветка размеров: клик по ноде/пустоте. Также снимаем выделение направляющей при клике вне её.
    stage.on('click.ruler-highlight', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core) return;
      const layer = this._core.nodes.layer;
      const target = e.target as Konva.Node;
      const nm = typeof target.name === 'function' ? target.name() : '';
      const isGuide = nm === 'guide-h' || nm === 'guide-v';
      if (!isGuide) this._setActiveGuide(null);
      if (e.target === stage || e.target.getLayer() !== layer) {
        this._setHighlightFromNode(null);
        this._core.stage.batchDraw();
        return;
      }
      // Откладываем на кадр, чтобы SelectionPlugin успел обновить Transformer
      const raf = globalThis.requestAnimationFrame;
      raf(() => {
        if (!this._core) return;
        // 1) Если есть активный Transformer — берём его первый узел
        const tr = this._core.nodes.layer.findOne('Transformer') as Konva.Transformer | null;
        const trNodes = tr && typeof tr.nodes === 'function' ? tr.nodes() : [];
        let hl = trNodes.length > 0 ? trNodes[0] : null;
        if (!hl) {
          // 2) Иначе ищем ближайшего зарегистрированного предка-группу
          const registered = new Set<Konva.Node>(
            this._core.nodes.list().map((n) => n.getNode() as unknown as Konva.Node),
          );
          const findNearestRegisteredGroup = (start: Konva.Node): Konva.Node | null => {
            let cur: Konva.Node | null = start;
            while (cur) {
              if (registered.has(cur) && cur instanceof Konva.Group) return cur;
              cur = cur.getParent();
            }
            return null;
          };
          const g = findNearestRegisteredGroup(target);
          if (g) hl = g;
          else {
            // 3) Или ближайший зарегистрированный узел (если группы нет)
            let cur: Konva.Node | null = target;
            while (cur) {
              if (registered.has(cur)) {
                hl = cur;
                break;
              }
              cur = cur.getParent();
            }
          }
        }
        this._setHighlightFromNode(hl ?? null);
        this._core.stage.batchDraw();
      });
    });
    // Во время drag — обновлять подсветку по активной ноде
    this._core.nodes.layer.on(
      'dragstart.ruler-highlight dragmove.ruler-highlight',
      (e: Konva.KonvaEventObject<DragEvent>) => {
        this._setHighlightFromNode(e.target as Konva.Node);
        this._core?.stage.batchDraw();
      },
    );
    //TODO: При ресайзе ноды нужно обновлять подсветку на линейке
    // this._core.nodes.layer.on('dragend.ruler-highlight', (e: Konva.KonvaEventObject<DragEvent>) => {
    //   // Сохраняем подсветку по итоговому положению ноды
    //   this._setHighlightFromNode(e.target as Konva.Node);
    //   this._core?.stage.batchDraw();
    // });

    // this._core.nodes.layer.on('transformend.selection-anchors', (e) => {
    //   console.log('transform layer', e.target.getClassName());
    // });
    // core.stage.on('transformstart.ruler-highlight', (e) => {
    //   console.log('transform stage', e.target.getClassName());
    // });

    // Обновлять подсветку во время трансформаций (resize/rotate через Transformer)
    // this._core.nodes.layer.on('transform.ruler-highlight', (e: Konva.KonvaEventObject<Event>) => {
    //   this._setHighlightFromNode(e.target as Konva.Node);
    //   this._core?.stage.batchDraw();
    // });

    this._layoutAndRedraw();
    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    core.stage.off('.ruler');
    core.nodes.world.off('.ruler');
    const t = this._options.target as EventTarget & {
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };
    t.removeEventListener('keydown', this._onKey as EventListener);
    // Снять highlight-подписки
    core.stage.off('.ruler-highlight');
    this._core?.nodes.layer.off('.ruler-highlight');

    if (this._layer) this._layer.destroy();
    if (this._guidesLayer) this._guidesLayer.destroy();
    this._layer = null;
    this._guidesLayer = null;
  }

  // ===== Keyboard toggle =====
  private _onKey = (e: KeyboardEvent) => {
    if (e.shiftKey && e.code === 'KeyR') {
      e.preventDefault();
      if (!this._core) return;
      const stage = this._core.stage;
      const isAttached = this._layer?.getStage();
      if (isAttached) {
        // Снять слои со stage для экономии ресурсов
        if (this._guidesLayer) this._guidesLayer.remove();
        if (this._layer) this._layer.remove();
      } else {
        // Вернуть слои на stage и переложить геометрию
        if (this._guidesLayer) stage.add(this._guidesLayer);
        if (this._layer) stage.add(this._layer);
        this._layoutAndRedraw();
      }
      stage.batchDraw();
    }
    // Удаление активной направляющей
    if ((e.code === 'Delete' || e.code === 'Backspace') && this._activeGuide) {
      e.preventDefault();
      this._activeGuide.destroy();
      this._activeGuide = null;
      if (this._core) this._core.stage.batchDraw();
    }
  };

  // ===== Guide creation =====
  private _startCreateGuide(_e: Konva.KonvaEventObject<unknown>, type: 'h' | 'v') {
    if (!this._core || !this._guidesLayer) return;
    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const worldAt = (sx: number, sy: number) => ({
      x: (sx - world.x()) / scale,
      y: (sy - world.y()) / scale,
    });

    // Создаём линию у границы линейки, но скрытой, пока курсор внутри линейки
    const w = worldAt(pos.x, pos.y);
    const line = new Konva.Line({
      name: type === 'h' ? 'guide-h' : 'guide-v',
      x: 0,
      y: 0,
      points: type === 'h' ? [0, 0, 1, 0] : [0, 0, 0, 1],
      stroke: this._GUIDE_COLOR,
      strokeWidth: 2,
      opacity: this._GUIDE_OPACITY,
      visible: false,
      draggable: true,
      dragBoundFunc: (p) => (type === 'h' ? { x: 0, y: p.y } : { x: p.x, y: 0 }),
      hitStrokeWidth: 10,
    });
    if (type === 'h') {
      (line as unknown as { wY?: number }).wY = w.y;
    } else {
      (line as unknown as { wX?: number }).wX = w.x;
    }
    this._attachGuideInteractions(line, type);
    this._guidesLayer.add(line);
    this._creating = { type, line, wasInRuler: true };

    const move = () => {
      if (!this._creating || !this._core) return;
      const st = this._core.stage;
      const sc = st.scaleX();
      const p = st.getPointerPosition();
      if (!p) return;
      const toWorld = (sx: number, sy: number) => ({
        x: (sx - st.x()) / sc,
        y: (sy - st.y()) / sc,
      });
      const pt = toWorld(p.x, p.y);

      // Границы областей линейки в мировых координатах
      const rects = this._getRulerWorldRects();
      const hRect = rects.h; // {x,y,w,h}
      const vRect = rects.v;

      if (this._creating.type === 'h') {
        const inside = pt.y >= hRect.y && pt.y <= hRect.y + hRect.h;
        if (inside) {
          this._creating.line.visible(false);
        } else {
          // если только что вышли за границу — поставить на границу
          if (this._creating.wasInRuler) {
            const borderY = pt.y < hRect.y ? hRect.y : hRect.y + hRect.h;
            (this._creating.line as unknown as { wY?: number }).wY = borderY;
            this._creating.wasInRuler = false;
          } else {
            (this._creating.line as unknown as { wY?: number }).wY = pt.y;
          }
          this._creating.line.visible(true);
        }
      } else {
        const inside = pt.x >= vRect.x && pt.x <= vRect.x + vRect.w;
        if (inside) {
          this._creating.line.visible(false);
        } else {
          if (this._creating.wasInRuler) {
            const borderX = pt.x < vRect.x ? vRect.x : vRect.x + vRect.w;
            (this._creating.line as unknown as { wX?: number }).wX = borderX;
            this._creating.wasInRuler = false;
          } else {
            (this._creating.line as unknown as { wX?: number }).wX = pt.x;
          }
          this._creating.line.visible(true);
        }
      }
      this._layoutAndRedraw();
      this._core.stage.batchDraw();
    };

    const up = () => {
      if (!this._creating || !this._core) return;
      // если линия так и не появилась (курсор не покидал линейку) — удалить
      if (!this._creating.line.visible()) {
        this._creating.line.destroy();
      } else {
        // сделать её активной
        this._setActiveGuide(this._creating.line);
      }
      this._creating = null;
      stage.off('mousemove.rulerCreate');
      stage.off('mouseup.rulerCreate');
      this._core.stage.batchDraw();
    };

    stage.on('mousemove.rulerCreate', move);
    stage.on('mouseup.rulerCreate', up);
  }

  private _attachGuideInteractions(line: Konva.Line, type: 'h' | 'v') {
    // курсор
    line.on('mouseenter.ruler-guide', () => {
      if (this._core)
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      if (this._activeGuide !== line) line.opacity(this._GUIDE_HOVER_OPACITY);
      this._core?.stage.batchDraw();
    });
    line.on('mouseleave.ruler-guide', () => {
      if (this._core) this._core.stage.container().style.cursor = 'default';
      if (this._activeGuide !== line) line.opacity(this._GUIDE_OPACITY);
      this._core?.stage.batchDraw();
    });
    // выбор
    line.on('mousedown.ruler-select', () => {
      this._setActiveGuide(line);
    });
    // Во время drag: скрывать под линейкой, показывать вне и обновлять мировые координаты
    line.on('dragmove.ruler-select', () => {
      if (!this._core) return;
      const rects = this._getRulerWorldRects();
      const world = this._core.nodes.world;
      const sc = world.scaleX() || 1;
      const offX = world.x();
      const offY = world.y();
      const pos = line.getAbsolutePosition();
      if (type === 'h') {
        const inside = pos.y >= rects.h.y && pos.y <= rects.h.y + rects.h.h;
        line.visible(!inside);
        // обновить wY из экранной позиции
        (line as unknown as { wY?: number }).wY = (pos.y - offY) / sc;
      } else {
        const inside = pos.x >= rects.v.x && pos.x <= rects.v.x + rects.v.w;
        line.visible(!inside);
        // обновить wX из экранной позиции
        (line as unknown as { wX?: number }).wX = (pos.x - offX) / sc;
      }
      this._core.stage.batchDraw();
    });
    // при окончании drag — оставить выбранной
    line.on('dragend.ruler-select', () => {
      this._setActiveGuide(line);
    });
  }

  private _setActiveGuide(line: Konva.Line | null) {
    if (this._activeGuide?.getStage()) {
      this._activeGuide.stroke(this._GUIDE_COLOR);
      this._activeGuide.opacity(this._GUIDE_OPACITY);
    }
    this._activeGuide = line;
    if (line) {
      line.stroke(this._GUIDE_ACTIVE_COLOR);
      line.opacity(1);
    }
    this._core?.stage.batchDraw();
  }

  // ===== Layout & redraw =====
  private _layoutAndRedraw() {
    if (!this._core || !this._layer || !this._guidesLayer || !this._hGroup || !this._vGroup) return;
    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const stageW = stage.width();
    const stageH = stage.height();
    const offX = world.x();
    const offY = world.y();

    // Видимый диапазон в МИРОВЫХ координатах
    const worldLeft = (0 - offX) / Math.max(scale, 1e-9);
    const worldRight = (stageW - offX) / Math.max(scale, 1e-9);
    const worldTop = (0 - offY) / Math.max(scale, 1e-9);
    const worldBottom = (stageH - offY) / Math.max(scale, 1e-9);

    // Толщина линейки в пикселях (в слое линейки используются экранные координаты)
    const tPx = this._options.thicknessPx;

    // Фоновые прямоугольники — в экранных координатах
    if (this._hBg) {
      this._hBg.position({ x: 0, y: 0 });
      this._hBg.size({ width: stageW, height: tPx });
    }
    if (this._vBg) {
      this._vBg.position({ x: 0, y: 0 });
      this._vBg.size({ width: tPx, height: stageH });
    }

    // Резерв: если подсветка ещё не задана, попробуем взять выделение из Transformer
    if (!this._highlightBounds) {
      const tr = this._core.nodes.layer.findOne('Transformer') as Konva.Transformer | null;
      const nodes = tr && typeof tr.nodes === 'function' ? tr.nodes() : [];
      const target = nodes[0];
      if (target) this._setHighlightFromNode(target);
    }

    // Обновить бордюры и подсветку; сами деления/подписи рисуются в sceneFunc
    this._updateBordersAndHighlight(
      { x: worldLeft, y: worldTop },
      { x: worldRight, y: worldTop },
      { x: worldLeft, y: worldBottom },
      scale,
      { offX, offY, tPx },
    );

    // Обновить направляющие — растянуть на весь текущий вид (в МИРЕ)
    this._redrawGuides(
      { x: worldLeft, y: worldTop },
      { x: worldRight, y: worldTop },
      { x: worldLeft, y: worldBottom },
    );

    // Поверх всех остальных слоёв должна быть линейка, направляющие — ниже
    this._layer.moveToTop();
  }

  private _updateBordersAndHighlight(
    topLeft: { x: number; y: number },
    topRight: { x: number; y: number },
    bottomLeft: { x: number; y: number },
    scale: number,
    screenCtx: { offX: number; offY: number; tPx: number },
  ) {
    const { offX, offY, tPx } = screenCtx;
    // (ticks рисуются в shape). Диапазонные подписи отключены.

    // Обновить бордюры
    const st = this._core?.stage;
    if (!st) return;
    if (this._hBorder) this._hBorder.points([0, tPx, st.width(), tPx]);
    if (this._vBorder) this._vBorder.points([tPx, 0, tPx, st.height()]);

    // Применить текущую подсветку размеров ноды (если есть)
    this._applyHighlightLayout({ topLeft, topRight, bottomLeft }, { scale, offX, offY, tPx });
  }

  // Троттлинг перерисовок в один кадр
  private _scheduleRedraw() {
    if (!this._core || !this._layer || !this._visible || this._redrawScheduled) return;
    this._redrawScheduled = true;
    const g = globalThis as unknown as {
      requestAnimationFrame?: (cb: FrameRequestCallback) => number;
      setTimeout?: (cb: (...args: unknown[]) => void, ms?: number) => number;
    };
    const raf: (cb: FrameRequestCallback) => number =
      typeof g.requestAnimationFrame === 'function'
        ? g.requestAnimationFrame.bind(g)
        : (cb: FrameRequestCallback) =>
            g.setTimeout ? g.setTimeout(cb as unknown as () => void, 16) : 0;
    raf(() => {
      this._redrawScheduled = false;
      this._layoutAndRedraw();
      this._core?.stage.batchDraw();
    });
  }

  private _redrawGuides(
    _topLeft: { x: number; y: number },
    _topRight: { x: number; y: number },
    _bottomLeft: { x: number; y: number },
  ) {
    if (!this._guidesLayer || !this._core) return;
    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const sc = world.scaleX() || 1;
    const offX = world.x();
    const offY = world.y();

    // Обновить геометрию всех существующих линий
    const hNodes = this._guidesLayer.find('.guide-h');
    for (const n of hNodes) {
      const line = n as Konva.Line;
      const wY = (line as unknown as { wY?: number }).wY ?? 0;
      const y = offY + wY * sc; // экранная Y
      line.position({ x: 0, y });
      line.points([0, 0, stage.width(), 0]);
    }
    const vNodes = this._guidesLayer.find('.guide-v');
    for (const n of vNodes) {
      const line = n as Konva.Line;
      const wX = (line as unknown as { wX?: number }).wX ?? 0;
      const x = offX + wX * sc; // экранная X
      line.position({ x, y: 0 });
      line.points([0, 0, 0, stage.height()]);
    }
  }

  // ===== Подсветка размеров активной ноды на линейках =====
  private _highlightHRect?: Konva.Rect;
  private _highlightVRect?: Konva.Rect;
  private _highlightBounds: { minX: number; maxX: number; minY: number; maxY: number } | null =
    null;

  private _ensureHighlightRects() {
    if (!this._hGroup || !this._vGroup) return;
    if (!this._highlightHRect) {
      this._highlightHRect = new Konva.Rect({ fill: 'rgba(43,131,255,0.35)', listening: false });
      this._hGroup.add(this._highlightHRect);
      // Расположим над линиями, чтобы гарантированно было видно
      this._highlightHRect.moveToTop();
    }
    if (!this._highlightVRect) {
      this._highlightVRect = new Konva.Rect({ fill: 'rgba(43,131,255,0.35)', listening: false });
      this._vGroup.add(this._highlightVRect);
      this._highlightVRect.moveToTop();
    }
  }

  private _applyHighlightLayout(
    view: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    screen: { scale: number; offX: number; offY: number; tPx: number },
  ) {
    if (!this._layer || !this._core) return;
    this._ensureHighlightRects();
    const { topLeft, topRight, bottomLeft } = view;
    const { scale, offX, offY, tPx } = screen;
    if (!this._highlightBounds || !this._highlightHRect || !this._highlightVRect) return;
    const { minX, maxX, minY, maxY } = this._highlightBounds;
    // Ограничим в текущем видимом диапазоне (в МИРЕ)
    const hx0w = Math.max(topLeft.x, Math.min(minX, maxX));
    const hx1w = Math.min(topRight.x, Math.max(minX, maxX));
    const hy0w = Math.max(topLeft.y, Math.min(minY, maxY));
    const hy1w = Math.min(bottomLeft.y, Math.max(minY, maxY));
    // Перевод в ЭКРАН
    const toScreenX = (wx: number) => offX + wx * scale;
    const toScreenY = (wy: number) => offY + wy * scale;
    if (hx1w > hx0w) {
      this._highlightHRect.visible(true);
      this._highlightHRect.position({ x: toScreenX(hx0w), y: 0 });
      this._highlightHRect.size({ width: toScreenX(hx1w) - toScreenX(hx0w), height: tPx });
      this._highlightHRect.strokeEnabled(false);
    } else {
      this._highlightHRect.visible(false);
    }
    if (hy1w > hy0w) {
      this._highlightVRect.visible(true);
      this._highlightVRect.position({ x: 0, y: toScreenY(hy0w) });
      this._highlightVRect.size({ width: tPx, height: toScreenY(hy1w) - toScreenY(hy0w) });
      this._highlightVRect.strokeEnabled(false);
    } else {
      this._highlightVRect.visible(false);
    }
  }

  private _setHighlightFromNode(node: Konva.Node | null) {
    if (!this._core) return;
    if (!node) {
      this._highlightBounds = null;
      if (this._highlightHRect) this._highlightHRect.visible(false);
      if (this._highlightVRect) this._highlightVRect.visible(false);
      return;
    }
    const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
    // Перевод ABS->WORLD через обратную абсолютную трансформацию группы world
    const world = this._core.nodes.world;
    const worldAbs = world.getAbsoluteTransform();
    const invWorldAbs = worldAbs.copy();
    invWorldAbs.invert();
    const p0 = invWorldAbs.point({ x: bbox.x, y: bbox.y });
    const p1 = invWorldAbs.point({ x: bbox.x + bbox.width, y: bbox.y + bbox.height });
    this._highlightBounds = {
      minX: Math.min(p0.x, p1.x),
      maxX: Math.max(p0.x, p1.x),
      minY: Math.min(p0.y, p1.y),
      maxY: Math.max(p0.y, p1.y),
    };
    this._layoutAndRedraw();
  }

  private _formatNumber(v: number): string {
    // Короткий формат без лишних знаков после запятой
    if (Math.abs(v) >= 1000) return Math.round(v).toString();
    return (Math.round(v * 100) / 100).toString();
  }
}
