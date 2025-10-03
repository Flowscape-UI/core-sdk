import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface GridPluginOptions {
  stepX?: number; // grid step in world coordinates
  stepY?: number;
  color?: string; // grid line color
  lineWidth?: number; // grid line width on screen (px)
  visible?: boolean;
  minScaleToShow?: number | null; // if set and scale is less — grid is hidden
  enableSnap?: boolean; // enable snap to grid on drag/resize
}

/**
 * GridPlugin — draws a grid and implements snap to grid on drag/resize.
 * Architecture is identical to other plugins: onAttach/onDetach, own layer with Konva.Shape.
 *
 * Important points of the current architecture:
 * - Panning/scale is performed by Stage transformations.
 * - Nodes are placed on the NodeManager layer (core.nodes.layer), also Transformers are added to it.
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

  // Cache for optimization
  private _redrawScheduled = false;
  private _transformersCache: Konva.Node[] = [];
  private _cacheInvalidated = true;

  constructor(options: GridPluginOptions = {}) {
    super();
    this._stepX = Math.max(1, options.stepX ?? 1);
    this._stepY = Math.max(1, options.stepY ?? 1);
    this._color = options.color ?? '#2b313a';
    this._lineWidth = options.lineWidth ?? 1;
    this._visible = options.visible ?? true;
    this._minScaleToShow = options.minScaleToShow ?? 8;
    this._enableSnap = options.enableSnap ?? true;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Draw grid in the same layer as content (nodes.layer), but outside the world group,
    // so it doesn't transform with the camera and can overlap nodes.
    const layer = core.nodes.layer;

    // Shape with custom sceneFunc
    const sceneFunc = (ctx: Konva.Context, _shape: Konva.Shape) => {
      if (!this._visible) return;
      if (!this._core) return;
      const stage = this._core.stage;
      const world = this._core.nodes.world;
      const scale = world.scaleX();
      // Only appears when minScaleToShow is reached (if set)
      if (this._minScaleToShow != null && scale < this._minScaleToShow) return;

      const stageW = stage.width();
      const stageH = stage.height();
      // GridLayer doesn't transform, world transforms through world
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
      // Without rounding/0.5px, to avoid drift accumulation during scaling
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
    // Grid should be above nodes, but below Transformers — order will be set below

    this._layer = layer;
    this._shape = shape;

    // Subscriptions to scene and world transformations/size changes — grid redraw
    // Optimization: use throttling
    const stage = core.stage;
    const world = core.nodes.world;
    stage.on('resize.grid', () => {
      this._scheduleRedraw();
    });
    world.on('xChange.grid yChange.grid scaleXChange.grid scaleYChange.grid', () => {
      this._scheduleRedraw();
    });

    // Function: raise all Transformers above grid-shape
    const bringTransformersToTop = () => {
      // Optimization: cache transformers
      if (this._cacheInvalidated) {
        this._transformersCache = layer.find('Transformer');
        this._cacheInvalidated = false;
      }
      for (const n of this._transformersCache) n.moveToTop();
      // Then move the grid directly below them
      this._shape?.moveToTop();
      for (const n of this._transformersCache) n.moveToTop();
    };
    bringTransformersToTop();

    // Snap: dragging
    this._dragMoveHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._core || !this._enableSnap) return;
      const stage = this._core.stage;
      const world = this._core.nodes.world;
      const target = e.target as Konva.Node;
      // Skip stage and layers
      if (target === (stage as unknown as Konva.Node) || target instanceof Konva.Layer) return;
      // Check if target is inside nodes layer
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
      // Only for draggable
      const anyNode = target as unknown as { draggable?: () => boolean };
      if (typeof anyNode.draggable === 'function' && !anyNode.draggable()) return;

      const abs = target.getAbsolutePosition();
      const sx = world.scaleX() || 1;
      const sy = world.scaleY() || 1;
      const pixelMode = this._minScaleToShow != null ? sx >= this._minScaleToShow : false;

      if (pixelMode) {
        // Snap to world grid cells (multiple of stepX/stepY in world coordinates)
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
        // World snap: multiple of stepX/stepY in world coordinates, independent of scale
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

    // Snap: resize through Transformer.boundBoxFunc
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
        _oldBox: { x: number; y: number; width: number; height: number; rotation: number },
        newBox: { x: number; y: number; width: number; height: number; rotation: number },
      ): { x: number; y: number; width: number; height: number; rotation: number } => {
        const base = newBox;
        if (!this._enableSnap || !this._core) return base;
        const nodes = typeof anyN.nodes === 'function' ? anyN.nodes() : [];
        const target = nodes[0];
        if (!target) return base;
        // Always pixel snap of the bounds in screen pixels. The rotater anchor is not touched.
        const anchor = typeof anyN.getActiveAnchor === 'function' ? anyN.getActiveAnchor() : '';
        if (anchor === 'rotater') return base;

        // Snap edges to world grid: in what units does base come? In the parent coordinates of the node,
        // which are related to "world" (nodes in world). Therefore we quantize by stepX/stepY directly.
        const stepX = Math.max(1, this._stepX);
        const stepY = Math.max(1, this._stepY);
        const a = typeof anchor === 'string' ? anchor : '';

        // For non-rotated — exact snap of edges in world coordinates.
        const worldAbs = this._core.nodes.world.getAbsoluteTransform();
        const invWorldAbs = worldAbs.copy();
        invWorldAbs.invert();

        // Box boundBoxFunc (base/newBox) — in ABSOLUTE coordinates
        const leftA = base.x;
        const rightA = base.x + base.width;
        const topA = base.y;
        const bottomA = base.y + base.height;

        // Translation to WORLD: abs -> world
        const Lw = invWorldAbs.point({ x: leftA, y: topA }).x;
        const Rw = invWorldAbs.point({ x: rightA, y: topA }).x;
        const Tw = invWorldAbs.point({ x: leftA, y: topA }).y;
        const Bw = invWorldAbs.point({ x: leftA, y: bottomA }).y;

        let newLw = Lw;
        let newRw = Rw;
        let newTw = Tw;
        let newBw = Bw;

        // Snap only moving edges to the nearest lines of the world grid (eps for stability)
        const q = (v: number, s: number) => Math.round((v + 1e-9) / s) * s;
        if (a.includes('left')) newLw = q(Lw, stepX);
        if (a.includes('right')) newRw = q(Rw, stepX);
        if (a.includes('top')) newTw = q(Tw, stepY);
        if (a.includes('bottom')) newBw = q(Bw, stepY);

        // Minimal sizes in WORLD
        if (newRw - newLw < stepX) {
          if (a.includes('left')) newLw = newRw - stepX;
          else newRw = newLw + stepX;
        }
        if (newBw - newTw < stepY) {
          if (a.includes('top')) newTw = newBw - stepY;
          else newBw = newTw + stepY;
        }

        // Back to ABSOLUTE coordinates: world -> abs
        const leftAbs = worldAbs.point({ x: newLw, y: newTw }).x;
        const topAbs = worldAbs.point({ x: newLw, y: newTw }).y;
        const rightAbs = worldAbs.point({ x: newRw, y: newTw }).x;
        const bottomAbs = worldAbs.point({ x: newLw, y: newBw }).y;

        // Assembly of the final box directly from ABS coordinates, obtained from snapped world edges
        const round3 = (v: number) => Math.round(v * 1000) / 1000;
        const result = {
          x: round3(leftAbs),
          y: round3(topAbs),
          width: round3(rightAbs - leftAbs),
          height: round3(bottomAbs - topAbs),
          rotation: base.rotation,
        };
        return result;
      };
      // Setup boundBoxFunc through queueMicrotask, so that SelectionPlugin can set its boundBoxFunc first
      globalThis.queueMicrotask(() => {
        tr.boundBoxFunc(snapFn);
      });
    };

    const walkAttach = (n: Konva.Node) => {
      attachTransformerSnap(n);
      const anyN = n as unknown as { getChildren?: () => Konva.Node[] };
      const children = typeof anyN.getChildren === 'function' ? anyN.getChildren() : [];
      for (const c of children) walkAttach(c);
    };

    // Walk through the current tree of nodes layer
    walkAttach(core.nodes.layer as unknown as Konva.Node);

    // Handle dynamic addition/deletion
    this._nodesAddHandler = (e: Konva.KonvaEventObject<Event>) => {
      const added = (e as unknown as { child?: Konva.Node }).child ?? (e.target as Konva.Node);
      walkAttach(added);
      // If added Transformer — raise it above the grid
      const anyAdded = added as unknown as { getClassName?: () => string };
      const cls = typeof anyAdded.getClassName === 'function' ? anyAdded.getClassName() : '';
      if (cls === 'Transformer') {
        this._cacheInvalidated = true; // invalidate cache
        added.moveToTop();
        // restore grid immediately below Transformers
        this._shape?.moveToTop();
        // and raise all Transformers again
        // Optimization: update cache and use it
        this._transformersCache = layer.find('Transformer');
        this._cacheInvalidated = false;
        for (const n of this._transformersCache) n.moveToTop();
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
      // Check if removed was a Transformer
      const anyRemoved = removed as unknown as { getClassName?: () => string };
      const cls = typeof anyRemoved.getClassName === 'function' ? anyRemoved.getClassName() : '';
      if (cls === 'Transformer') {
        this._cacheInvalidated = true; // invalidate cache
      }
      // Restore order: grid immediately below Transformers, transformers above
      this._shape?.moveToTop();
      // Optimization: update cache and use it
      if (this._cacheInvalidated) {
        this._transformersCache = layer.find('Transformer');
        this._cacheInvalidated = false;
      }
      for (const n of this._transformersCache) n.moveToTop();
    };
    core.nodes.layer.on('add.grid', this._nodesAddHandler);
    core.nodes.layer.on('remove.grid', this._nodesRemoveHandler);

    // Pixel snap of the radius of rounded rectangles
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
        // Konva API setter — the same function cornerRadius(value)
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
  }

  /**
   * Deferred redraw (throttling)
   */
  private _scheduleRedraw() {
    if (this._redrawScheduled) return;

    this._redrawScheduled = true;
    const raf = globalThis.requestAnimationFrame;
    raf(() => {
      this._redrawScheduled = false;
      this._layer?.batchDraw();
    });
  }

  protected onDetach(core: CoreEngine): void {
    const stage = core.stage;
    stage.off('.grid');
    core.nodes.layer.off('.grid');

    if (this._shape) this._shape.destroy();
    // Layer nodes belong to the engine — do not delete

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
  // Getters for synchronization with the ruler
  public get stepX(): number {
    return this._stepX;
  }
  public get stepY(): number {
    return this._stepY;
  }
  public get minScaleToShow(): number | null {
    return this._minScaleToShow;
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
