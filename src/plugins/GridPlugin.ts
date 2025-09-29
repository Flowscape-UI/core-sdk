import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface GridPluginOptions {
  stepX?: number; // шаг сетки в мировых координатах
  stepY?: number;
  color?: string; // цвет линий сетки
  lineWidth?: number; // толщина линий на экране (px)
  visible?: boolean;
  minScaleToShow?: number | null; // если задан и масштаб меньше — сетка скрыта
  enableSnap?: boolean; // включить привязку к сетке при drag/resize
}

/**
 * GridPlugin — рисует сетку и реализует привязку (snap) к сетке при сильном зуме.
 * Архитектура идентична остальным плагинам: onAttach/onDetach, собственный слой с Konva.Shape.
 *
 * Важные моменты текущей архитектуры движка:
 * - Панорамирование/масштаб выполняются трансформациями Stage.
 * - Ноды располагаются на слое NodeManager (core.nodes.layer), также туда добавляются Transformers.
 */
export class GridPlugin extends Plugin {
  private _core?: CoreEngine;
  private _layer: Konva.Layer | null = null;
  private _shape: Konva.Shape | null = null;

  private _stepX: number;
  private _stepY: number;
  private _color: string;
  private _lineWidth: number;
  private _visible: boolean;
  private _minScaleToShow: number | null;
  private _enableSnap: boolean;

  // handlers
  private _dragMoveHandler: ((e: Konva.KonvaEventObject<MouseEvent>) => void) | null = null;
  private _nodesAddHandler: ((e: Konva.KonvaEventObject<Event>) => void) | null = null;
  private _nodesRemoveHandler: ((e: Konva.KonvaEventObject<Event>) => void) | null = null;

  constructor(options: GridPluginOptions = {}) {
    super();
    this._stepX = Math.max(1, options.stepX ?? 1);
    this._stepY = Math.max(1, options.stepY ?? 1);
    this._color = options.color ?? '#2b313a';
    this._lineWidth = options.lineWidth ?? 1;
    this._visible = options.visible ?? true;
    this._minScaleToShow = options.minScaleToShow ?? null;
    this._enableSnap = options.enableSnap ?? true;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Рисуем сетку в том же слое, что и контент (nodes.layer), но вне группы world,
    // чтобы сетка не трансформировалась камерой и могла перекрывать ноды.
    const layer = core.nodes.layer;

    // Shape с кастомным sceneFunc
    const sceneFunc = (ctx: Konva.Context, _shape: Konva.Shape) => {
      if (!this._visible) return;
      if (!this._core) return;
      const stage = this._core.stage;
      const world = this._core.nodes.world;
      const scale = world.scaleX();
      // Появляется только при достижении minScaleToShow (если задан)
      if (this._minScaleToShow != null && scale < this._minScaleToShow) return;

      const stageW = stage.width();
      const stageH = stage.height();
      // GridLayer не трансформируется, мир трансформируется через world
      const scaleX = world.scaleX();
      const scaleY = world.scaleY();
      const stepXPx = Math.max(1, this._stepX) * Math.max(1e-6, scaleX);
      const stepYPx = Math.max(1, this._stepY) * Math.max(1e-6, scaleY);
      // Смещение в экране считается от позиции world, как в «рабочем» проекте
      const offX = ((world.x() % stepXPx) + stepXPx) % stepXPx;
      const offY = ((world.y() % stepYPx) + stepYPx) % stepYPx;

      ctx.beginPath();
      ctx.lineWidth = this._lineWidth;
      ctx.strokeStyle = this._color;
      // Без округления/0.5px, чтобы не накапливать дрейф при масштабировании
      for (let x = offX; x <= stageW; x += stepXPx) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, stageH);
      }
      for (let y = offY; y <= stageH; y += stepYPx) {
        ctx.moveTo(0, y);
        ctx.lineTo(stageW, y);
      }
      ctx.stroke();
    };

    const shape = new Konva.Shape({ listening: false, sceneFunc });
    layer.add(shape);
    // Сетка должна быть поверх нод, но ниже Transformer-ов — порядок выставим ниже

    this._layer = layer;
    this._shape = shape;

    // Подписки на изменения трансформации/размера сцены и world — перерисовка сетки
    const stage = core.stage;
    const world = core.nodes.world;
    stage.on('resize.grid', () => this._layer?.batchDraw());
    world.on('xChange.grid yChange.grid scaleXChange.grid scaleYChange.grid', () => {
      this._layer?.batchDraw();
    });

    // Функция: поднять все Transformers поверх grid-shape
    const bringTransformersToTop = () => {
      const trNodes = layer.find('Transformer');
      for (const n of trNodes) n.moveToTop();
      // а затем вернуть сетку непосредственно под ними
      this._shape?.moveToTop();
      for (const n of trNodes) n.moveToTop();
    };
    bringTransformersToTop();

    // Snap: перетаскивание
    this._dragMoveHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core || !this._enableSnap) return;
      const stage = this._core.stage;
      const world = this._core.nodes.world;
      const target = e.target as Konva.Node;
      // Пропускаем stage и слои
      if (target === (stage as unknown as Konva.Node) || target instanceof Konva.Layer) return;
      // Проверим, что таргет находится внутри слоя нод
      const nodesLayer = this._core.nodes.layer;
      let p: Konva.Node | null = target;
      let inNodesLayer = false;
      while (p) {
        if (p === (nodesLayer as unknown as Konva.Node)) {
          inNodesLayer = true;
          break;
        }
        p = p.getParent();
      }
      if (!inNodesLayer) return;
      // Только для draggable
      const anyNode = target as unknown as { draggable?: () => boolean };
      if (typeof anyNode.draggable === 'function' && !anyNode.draggable()) return;

      const abs = target.getAbsolutePosition();
      const sx = world.scaleX() || 1;
      const sy = world.scaleY() || 1;
      const pixelMode = this._minScaleToShow != null ? sx >= this._minScaleToShow : false;

      if (pixelMode) {
        // Снап по клеткам мировой сетки (кратность stepX/stepY в мировых координатах)
        const wx = (abs.x - world.x()) / sx;
        const wy = (abs.y - world.y()) / sy;
        const stepX = Math.max(1, this._stepX);
        const stepY = Math.max(1, this._stepY);
        const snappedWX = Math.round(wx / stepX) * stepX;
        const snappedWY = Math.round(wy / stepY) * stepY;
        const snappedAbsX = snappedWX * sx + world.x();
        const snappedAbsY = snappedWY * sy + world.y();
        if (Math.abs(snappedAbsX - abs.x) > 0.001 || Math.abs(snappedAbsY - abs.y) > 0.001) {
          target.absolutePosition({ x: snappedAbsX, y: snappedAbsY });
        }
      } else {
        // Мировой снап: кратность шагу в мире, независимо от масштаба
        const wx = (abs.x - world.x()) / sx;
        const wy = (abs.y - world.y()) / sy;
        const stepX = Math.max(1, this._stepX);
        const stepY = Math.max(1, this._stepY);
        const snappedWX = Math.round(wx / stepX) * stepX;
        const snappedWY = Math.round(wy / stepY) * stepY;
        const snappedAbsX = snappedWX * sx + world.x();
        const snappedAbsY = snappedWY * sy + world.y();
        if (Math.abs(snappedAbsX - abs.x) > 0.001 || Math.abs(snappedAbsY - abs.y) > 0.001) {
          target.absolutePosition({ x: snappedAbsX, y: snappedAbsY });
        }
      }
    };
    stage.on('dragmove.grid', this._dragMoveHandler);

    // Snap: resize через Transformer.boundBoxFunc
    const attachTransformerSnap = (n: Konva.Node) => {
      const anyN = n as unknown as {
        getClassName?: () => string;
        nodes?: () => Konva.Node[];
        boundBoxFunc?: (fn?: (oldBox: unknown, newBox: unknown) => unknown) => void;
        getActiveAnchor?: () => string | undefined;
      };
      const cls = typeof anyN.getClassName === 'function' ? anyN.getClassName() : '';
      if (cls !== 'Transformer') return;
      const tr = n as Konva.Transformer;
      const snapFn = (
        _oldBox: unknown,
        newBox: { x: number; y: number; width: number; height: number },
      ): { x: number; y: number; width: number; height: number } => {
        const base = newBox;
        if (!this._enableSnap || !this._core) return base;
        const nodes = typeof anyN.nodes === 'function' ? anyN.nodes() : [];
        const target = nodes[0];
        if (!target) return base;
        // Всегда попиксельный снап габаритов в экранных пикселях. Якорь rotater не трогаем.
        const anchor = typeof anyN.getActiveAnchor === 'function' ? anyN.getActiveAnchor() : '';
        if (anchor === 'rotater') return base;

        // Снап рёбер по мировой сетке: в каких единицах приходит base? В координатах родителя ноды,
        // которые соотносятся с "миром" (узлы в world). Поэтому квантуем по stepX/stepY напрямую.
        // СНАП РЁБЕР В МИРЕ (через абсолютные трансформации)
        const stepX = Math.max(1, this._stepX);
        const stepY = Math.max(1, this._stepY);
        const a = typeof anchor === 'string' ? anchor : '';

        // Для неповернутых — точный snap рёбер в мировых координатах.
        const worldAbs = this._core.nodes.world.getAbsoluteTransform();
        const invWorldAbs = worldAbs.copy();
        invWorldAbs.invert();

        // Бокс boundBoxFunc (base/newBox) — в АБСОЛЮТНЫХ координатах
        const leftA = base.x;
        const rightA = base.x + base.width;
        const topA = base.y;
        const bottomA = base.y + base.height;

        // Перевод в МИР: abs -> world
        const Lw = invWorldAbs.point({ x: leftA, y: topA }).x;
        const Rw = invWorldAbs.point({ x: rightA, y: topA }).x;
        const Tw = invWorldAbs.point({ x: leftA, y: topA }).y;
        const Bw = invWorldAbs.point({ x: leftA, y: bottomA }).y;

        let newLw = Lw;
        let newRw = Rw;
        let newTw = Tw;
        let newBw = Bw;

        // Снапим только движущиеся рёбра к ближайшим линиям мировой сетки (eps для стабильности)
        const q = (v: number, s: number) => Math.round((v + 1e-9) / s) * s;
        if (a.includes('left')) newLw = q(Lw, stepX);
        if (a.includes('right')) newRw = q(Rw, stepX);
        if (a.includes('top')) newTw = q(Tw, stepY);
        if (a.includes('bottom')) newBw = q(Bw, stepY);

        // Минимальные размеры в МИРЕ
        if (newRw - newLw < stepX) {
          if (a.includes('left')) newLw = newRw - stepX;
          else newRw = newLw + stepX;
        }
        if (newBw - newTw < stepY) {
          if (a.includes('top')) newTw = newBw - stepY;
          else newBw = newTw + stepY;
        }

        // Обратно в АБСОЛЮТНЫЕ координаты: world -> abs
        const leftAbs = worldAbs.point({ x: newLw, y: newTw }).x;
        const topAbs = worldAbs.point({ x: newLw, y: newTw }).y;
        const rightAbs = worldAbs.point({ x: newRw, y: newTw }).x;
        const bottomAbs = worldAbs.point({ x: newLw, y: newBw }).y;

        // 1) Сборка итогового бокса напрямую из ABS-координат, полученных из заснапленных мировых рёбер
        const round3 = (v: number) => Math.round(v * 1000) / 1000;
        const result = { ...base };
        result.x = round3(leftAbs);
        result.y = round3(topAbs);
        result.width = round3(rightAbs - leftAbs);
        result.height = round3(bottomAbs - topAbs);
        return result;
      };
      (
        tr as unknown as {
          boundBoxFunc?: (fn?: (oldBox: unknown, newBox: unknown) => unknown) => void;
        }
      ).boundBoxFunc?.(snapFn as (oldBox: unknown, newBox: unknown) => unknown);
    };

    const walkAttach = (n: Konva.Node) => {
      attachTransformerSnap(n);
      const anyN = n as unknown as { getChildren?: () => Konva.Node[] };
      const children = typeof anyN.getChildren === 'function' ? anyN.getChildren() : [];
      for (const c of children) walkAttach(c);
    };

    // Пройтись по текущему дереву слоя нод
    walkAttach(core.nodes.layer as unknown as Konva.Node);

    // Обработка динамического добавления/удаления
    this._nodesAddHandler = (e: Konva.KonvaEventObject<Event>) => {
      const added = (e as unknown as { child?: Konva.Node }).child ?? (e.target as Konva.Node);
      walkAttach(added);
      // если добавили Transformer — поднять его выше сетки
      const anyAdded = added as unknown as { getClassName?: () => string };
      const cls = typeof anyAdded.getClassName === 'function' ? anyAdded.getClassName() : '';
      if (cls === 'Transformer') {
        added.moveToTop();
        // восстановить сетку сразу под Transformers
        this._shape?.moveToTop();
        // и снова поднять все Transformers наверх
        const trNodes = layer.find('Transformer');
        for (const n of trNodes) n.moveToTop();
      }
    };
    this._nodesRemoveHandler = (e: Konva.KonvaEventObject<Event>) => {
      const removed = (e as unknown as { child?: Konva.Node }).child ?? (e.target as Konva.Node);
      const walkDetach = (n: Konva.Node) => {
        const anyN = n as unknown as {
          getClassName?: () => string;
          boundBoxFunc?: (fn?: (oldBox: unknown, newBox: unknown) => unknown) => void;
          getChildren?: () => Konva.Node[];
        };
        const cls = typeof anyN.getClassName === 'function' ? anyN.getClassName() : '';
        if (cls === 'Transformer') {
          (
            n as unknown as {
              boundBoxFunc?: (fn?: (oldBox: unknown, newBox: unknown) => unknown) => void;
            }
          ).boundBoxFunc?.(undefined);
        }
        const children = typeof anyN.getChildren === 'function' ? anyN.getChildren() : [];
        for (const c of children) walkDetach(c);
      };
      walkDetach(removed);
      // Восстановить порядок: сетка сразу под Transformer, трансформеры поверх
      this._shape?.moveToTop();
      const trNodes = layer.find('Transformer');
      for (const n of trNodes) n.moveToTop();
    };
    core.nodes.layer.on('add.grid', this._nodesAddHandler);
    core.nodes.layer.on('remove.grid', this._nodesRemoveHandler);

    // Попиксельный снап радиуса скругления у прямоугольников
    core.nodes.layer.on('cornerRadiusChange.grid', (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as unknown as {
        getClassName?: () => string;
        cornerRadius?: () => number | number[];
        cornerRadiusSetter?: (v: number | number[]) => void;
      } & Konva.Rect;
      const cls = typeof node.getClassName === 'function' ? node.getClassName() : '';
      if (cls !== 'Rect') return;
      const getCR = (node as { cornerRadius: () => number | number[] }).cornerRadius;
      if (typeof getCR !== 'function') return;
      const value = getCR.call(node);
      const apply = (rounded: number | number[]) => {
        // В Konva API setter — та же функция cornerRadius(value)
        (node as { cornerRadius: (v: number | number[]) => void }).cornerRadius(rounded);
      };
      const stage = this._core?.stage;
      const scale = stage?.scaleX() ?? 1;
      const pixelMode = this._minScaleToShow != null ? scale >= this._minScaleToShow : false;
      if (Array.isArray(value)) {
        const rounded = value.map((v) => {
          if (pixelMode) {
            const scaleX = stage?.scaleX() ?? 1;
            const scaleY = stage?.scaleY() ?? 1;
            const rPx = v * (0.5 * (scaleX + scaleY));
            const snappedPx = Math.max(0, Math.round(rPx));
            return snappedPx / Math.max(1e-6, 0.5 * (scaleX + scaleY));
          } else {
            return Math.max(0, Math.round(v));
          }
        });
        apply(rounded);
      } else if (typeof value === 'number') {
        if (pixelMode) {
          const scaleX = stage?.scaleX() ?? 1;
          const scaleY = stage?.scaleY() ?? 1;
          const rPx = value * (0.5 * (scaleX + scaleY));
          const snappedPx = Math.max(0, Math.round(rPx));
          apply(snappedPx / Math.max(1e-6, 0.5 * (scaleX + scaleY)));
        } else {
          apply(Math.max(0, Math.round(value)));
        }
      }
    });

    // Первичная отрисовка
  }

  protected onDetach(core: CoreEngine): void {
    const stage = core.stage;
    stage.off('.grid');
    core.nodes.layer.off('.grid');

    if (this._shape) this._shape.destroy();
    // Слой нод принадлежит движку — не удаляем его

    this._shape = null;
    this._layer = null;
    this._dragMoveHandler = null;
    this._nodesAddHandler = null;
    this._nodesRemoveHandler = null;

    core.stage.batchDraw();
  }

  public setVisible(visible: boolean): void {
    this._visible = visible;
    if (this._core) this._core.stage.batchDraw();
  }
  public setStep(stepX: number, stepY: number): void {
    this._stepX = Math.max(1, stepX);
    this._stepY = Math.max(1, stepY);
    if (this._core) this._core.stage.batchDraw();
  }
  public setMinScaleToShow(value: number | null): void {
    this._minScaleToShow = value;
    if (this._core) this._core.stage.batchDraw();
  }
  public setSnap(enabled: boolean): void {
    this._enableSnap = enabled;
  }
}
