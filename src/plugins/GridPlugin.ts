import Konva from 'konva';

import type { Scene } from '../Scene';

import type { Plugin } from './Plugin';

export interface GridPluginOptions {
  stepX?: number;
  stepY?: number;
  color?: string;
  lineWidth?: number;
  visible?: boolean;
  minScaleToShow?: number | null;
}

export class GridPlugin implements Plugin {
  private _shape?: Konva.Shape;
  private _layer?: Konva.Layer;
  private _world?: Konva.Group;
  private _stage?: Konva.Stage;
  private _dragMoveHandler?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  private _worldAddHandler?: (e: Konva.KonvaEventObject<Event>) => void;
  private _worldRemoveHandler?: (e: Konva.KonvaEventObject<Event>) => void;

  private _stepX: number;
  private _stepY: number;
  private _color: string;
  private _lineWidth: number;
  private _visible: boolean;
  private _minScaleToShow: number | null;
  private _snap: boolean;

  constructor(options: GridPluginOptions = {}) {
    this._stepX = Math.max(1, options.stepX ?? 1);
    this._stepY = Math.max(1, options.stepY ?? 1);
    this._color = options.color ?? '#2b313a';
    this._lineWidth = options.lineWidth ?? 1;
    this._visible = options.visible ?? true;
    this._minScaleToShow = options.minScaleToShow ?? null;
    this._snap = true;
  }

  public onAttach(scene: Scene): void {
    this._layer = scene.getGridLayer();
    this._world = scene.getWorld();
    this._stage = scene;

    const sceneFunc = (con: Konva.Context, _shape: Konva.Shape) => {
      if (!this._visible) return;
      if (!this._stage || !this._world) return;
      const stageW = this._stage.width();
      const stageH = this._stage.height();
      const scale = this._world.scaleX();
      if (this._minScaleToShow != null && scale < this._minScaleToShow) return;
      const pos = this._world.position();
      const stepX = Math.max(1, this._stepX) * scale;
      const stepY = Math.max(1, this._stepY) * scale;

      const offsetX = ((pos.x % stepX) + stepX) % stepX;
      const offsetY = ((pos.y % stepY) + stepY) % stepY;

      con.beginPath();
      con.lineWidth = this._lineWidth;
      con.strokeStyle = this._color;

      for (let x = offsetX; x <= stageW; x += stepX) {
        const px = this._lineWidth % 2 ? Math.round(x) + 0.5 : Math.round(x);
        con.moveTo(px, 0);
        con.lineTo(px, stageH);
      }
      for (let y = offsetY; y <= stageH; y += stepY) {
        const py = this._lineWidth % 2 ? Math.round(y) + 0.5 : Math.round(y);
        con.moveTo(0, py);
        con.lineTo(stageW, py);
      }
      con.stroke();
    };

    this._shape = new Konva.Shape({ listening: false, sceneFunc });
    this._layer.add(this._shape);
    // Ensure grid is on top of everything
    this._layer.moveToTop();
    this._shape.moveToTop();
    this._stage.batchDraw();

    // Attach drag snapping identical to previous Scene logic
    this._dragMoveHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._snap || !this._world) return;
      const node = e.target as Konva.Node;
      if (!this._stage) return;
      // Ignore stage, layers, and the world container itself
      if (
        node === (this._stage as unknown as Konva.Node) ||
        node === this._world ||
        node instanceof Konva.Layer
      )
        return;
      // ensure node is inside world
      let p: Konva.Node | null = node.getParent();
      let inWorld = false;
      while (p) {
        if (p === this._world) {
          inWorld = true;
          break;
        }
        p = p.getParent();
      }
      if (!inWorld) return;
      // check draggable
      const anyNode = node as unknown as Konva.Node;
      if (typeof anyNode.draggable === 'function' && !anyNode.draggable()) return;

      const abs = node.getAbsolutePosition();
      const sx = this._world.scaleX();
      const sy = this._world.scaleY();
      const wx = (abs.x - this._world.x()) / sx;
      const wy = (abs.y - this._world.y()) / sy;

      const snappedX = Math.round(wx / this._stepX) * this._stepX;
      const snappedY = Math.round(wy / this._stepY) * this._stepY;

      const snappedAbsX = snappedX * sx + this._world.x();
      const snappedAbsY = snappedY * sy + this._world.y();

      if (Math.abs(snappedAbsX - abs.x) > 0.001 || Math.abs(snappedAbsY - abs.y) > 0.001) {
        node.absolutePosition({ x: snappedAbsX, y: snappedAbsY });
      }
    };
    this._stage.on('dragmove', this._dragMoveHandler);

    const attachTransformerBoundBox = (node: Konva.Node) => {
      const anyNode = node as any;
      const className = typeof anyNode.getClassName === 'function' ? anyNode.getClassName() : '';
      if (className !== 'Transformer') return;
      const tr = anyNode as Konva.Transformer;
      const snapFn = (_oldBox: any, newBox: any): any => {
        const base = newBox;
        if (!this._snap || !this._world) return base;
        const nodes = typeof (tr as any).nodes === 'function' ? (tr as any).nodes() : [];
        const target = nodes && nodes.length ? (nodes[0] as Konva.Node) : null;
        if (!target) return base;
        // Skip rotation anchor or rotated targets
        const anchor = typeof (tr as any).getActiveAnchor === 'function' ? (tr as any).getActiveAnchor() : '';
        if (anchor === 'rotater') return base;
        const rot = (target.rotation() ?? 0) % 360;
        const angle = rot < 0 ? rot + 360 : rot;
        if (Math.abs(angle) > 0.001 && Math.abs(angle - 360) > 0.001) return base;

        const sx = this._world.scaleX() || 1;
        const sy = this._world.scaleY() || 1;
        const worldW = base.width / sx;
        const worldH = base.height / sy;

        const snappedWorldW = Math.max(this._stepX, Math.round(worldW / this._stepX) * this._stepX);
        const snappedWorldH = Math.max(this._stepY, Math.round(worldH / this._stepY) * this._stepY);

        const snappedW = snappedWorldW * sx;
        const snappedH = snappedWorldH * sy;

        const dx = snappedW - base.width;
        const dy = snappedH - base.height;

        const result: any = { ...base } as any;
        result.width = snappedW;
        result.height = snappedH;
        if (typeof anchor === 'string') {
          if (anchor.includes('left')) result.x = base.x - dx;
          if (anchor.includes('top')) result.y = base.y - dy;
        }
        return result;
      };
      (tr as any).boundBoxFunc(snapFn);
    };

    const walkAttach = (n: Konva.Node) => {
      attachTransformerBoundBox(n);
      const anyN = n as any;
      if (typeof anyN.getChildren === 'function') {
        const children = anyN.getChildren() as Konva.Node[];
        for (const c of children) walkAttach(c);
      }
    };
    if (this._world) walkAttach(this._world);

    // Handle dynamic add/remove
    this._worldAddHandler = (e: Konva.KonvaEventObject<Event>) => {
      const added = (e as unknown as { child?: Konva.Node }).child || (e.target as Konva.Node);
      walkAttach(added);
    };
    this._worldRemoveHandler = (e: Konva.KonvaEventObject<Event>) => {
      const removed = (e as unknown as { child?: Konva.Node }).child || (e.target as Konva.Node);
      const walkDetach = (n: Konva.Node) => {
        const anyN = n as any;
        const className = typeof anyN.getClassName === 'function' ? anyN.getClassName() : '';
        if (className === 'Transformer') {
          const tr = n as Konva.Transformer;
          if (typeof (tr as any).boundBoxFunc === 'function') {
            (tr as any).boundBoxFunc(undefined);
          }
        }
        if (typeof anyN.getChildren === 'function') {
          const children = anyN.getChildren() as Konva.Node[];
          for (const c of children) walkDetach(c);
        }
      };
      walkDetach(removed);
    };
    if (this._world) {
      this._world.on('add', this._worldAddHandler);
      this._world.on('remove', this._worldRemoveHandler);
    }
  }

  public onDetach(_scene: Scene): void {
    if (this._shape) {
      this._shape.destroy();
    }
    if (this._stage && this._dragMoveHandler) {
      this._stage.off('dragmove', this._dragMoveHandler);
    }
    if (this._world && this._worldAddHandler) this._world.off('add', this._worldAddHandler);
    if (this._world && this._worldRemoveHandler) this._world.off('remove', this._worldRemoveHandler);
    // Nothing else to detach
    if (this._stage) this._stage.batchDraw();
  }

  public setVisible(visible: boolean): void {
    this._visible = visible;
    if (this._stage) this._stage.batchDraw();
  }
  public setStep(stepX: number, stepY: number): void {
    this._stepX = Math.max(1, stepX);
    this._stepY = Math.max(1, stepY);
    if (this._stage) this._stage.batchDraw();
  }
  public setMinScaleToShow(value: number | null): void {
    this._minScaleToShow = value;
    if (this._stage) this._stage.batchDraw();
  }
  public setGrid(stepX: number, stepY: number): void {
    this.setStep(stepX, stepY);
  }
  public setGridVisible(visible: boolean): void {
    this.setVisible(visible);
  }
  public setGridMinScaleToShow(value: number | null): void {
    this.setMinScaleToShow(value);
  }
  public getGridMinScaleToShow(): number | null {
    return this._minScaleToShow;
  }
  public setGridSnap(enabled: boolean): void {
    this._snap = enabled;
  }
}
