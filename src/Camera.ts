import Konva from 'konva';

import type { Plugin } from './plugins/Plugin';

export interface CameraOptions {
  stage: Konva.Stage;
  target?: Konva.Node; // by default we transform the stage itself; can target a group (world)
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

// Camera provides a transform controller (position + scale) over a target node (stage or group).
// No event listeners or hotkeys inside. Only explicit methods.
export class Camera extends Konva.Transform {
  private _stage: Konva.Stage;
  private _target: Konva.Node; // should support absolute position/scale (Stage or Group)
  private _minScale: number;
  private _maxScale: number;
  private _suppressTargetUpdate: boolean;
  private _zoomAnchor: 'cursor' | Konva.Transform;
  private _plugins: Plugin[] = [];

  constructor(options: CameraOptions) {
    super();
    const { stage, target = stage, minScale = 0.25, maxScale = 200, initialScale = 1 } = options;
    this._stage = stage;
    this._target = target;
    this._minScale = minScale;
    this._maxScale = maxScale;
    this._suppressTargetUpdate = false;
    this._zoomAnchor = 'cursor';

    // Sync internal transform from target without affecting the target
    this._suppressTargetUpdate = true;
    super.reset();
    super.translate(this._target.x(), this._target.y());
    const s = this._target.scaleX();
    super.scale(s, s);
    this._suppressTargetUpdate = false;
    // Apply initial scale via translate z
    const factor = (initialScale || 1) / (s || 1);
    if (factor !== 1) {
      this.translate(0, 0, factor);
    }
  }

  public getStage(): Konva.Stage {
    return this._stage;
  }

  public getTarget(): Konva.Node {
    return this._target;
  }

  public setTarget(target: Konva.Node): void {
    this._target = target;
    this._syncTransformFromTarget();
  }

  public override reset(): void {
    // reset internal transform and target view
    super.reset();
    this._suppressTargetUpdate = true;
    this._target.scale({ x: 1, y: 1 });
    this._target.position({ x: 0, y: 0 });
    this._suppressTargetUpdate = false;
    this._redraw();
  }

  public lookAt(anchor: 'cursor' | Konva.Transform = 'cursor'): void {
    this._zoomAnchor = anchor;
  }

  // Transform overrides to also affect target
  // public override translate(x: number, y: number): this;
  // public override translate(x: number, y: number, z: number): this;
  public override translate(x: number, y: number, z?: number): this {
    // 1) Apply XY pan first
    super.translate(x, y);
    if (!this._suppressTargetUpdate) {
      this._target.position({ x: this._target.x() + x, y: this._target.y() + y });
    }

    // 2) If Z provided, zoom towards current pointer
    if (typeof z === 'number' && z !== 1) {
      const anchor = this._getZoomAnchorPosition();
      const oldScale = this._target.scaleX() || 1;
      const nextScale = this._clamp(oldScale * z, this._minScale, this._maxScale);
      const effective = nextScale / oldScale;

      if (anchor) {
        // current position after XY pan
        const pos = { x: this._target.x(), y: this._target.y() };
        // scale relatively
        super.scale(effective, effective);
        if (!this._suppressTargetUpdate) {
          this._target.scale({ x: nextScale, y: nextScale });
        }
        // keep pointer-anchored point fixed
        const newPos = {
          x: anchor.x - ((anchor.x - pos.x) / oldScale) * nextScale,
          y: anchor.y - ((anchor.y - pos.y) / oldScale) * nextScale,
        };
        const dx = newPos.x - this._target.x();
        const dy = newPos.y - this._target.y();
        super.translate(dx, dy);
        if (!this._suppressTargetUpdate) {
          this._target.position(newPos);
        }
      } else {
        // no pointer - just scale around origin
        super.scale(effective, effective);
        if (!this._suppressTargetUpdate) {
          this._target.scale({ x: nextScale, y: nextScale });
        }
      }
    }

    if (!this._suppressTargetUpdate) {
      this._redraw();
    }
    return this;
  }

  public override scale(sx: number, sy: number): this {
    const curX = this._target.scaleX() || 1;
    const curY = this._target.scaleY() || 1;
    const nextX = this._clamp(curX * sx, this._minScale, this._maxScale);
    const nextY = this._clamp(curY * sy, this._minScale, this._maxScale);
    const effX = nextX / curX;
    const effY = nextY / curY;
    super.scale(effX, effY);
    if (!this._suppressTargetUpdate) {
      this._target.scale({ x: nextX, y: nextY });
      this._redraw();
    }
    return this;
  }

  private _clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private _redraw(): void {
    this._stage.batchDraw();
  }

  public addPlugins(plugins: Plugin[]): void {
    plugins.forEach((p) => {
      this._plugins.push(p);
      p.onAttach(this);
    });
  }

  public removeAllPlugins(): void {
    for (let i = this._plugins.length - 1; i >= 0; i--) {
      this._plugins[i]?.onDetach(this);
    }
    this._plugins = [];
  }

  private _syncTransformFromTarget(): void {
    this._suppressTargetUpdate = true;
    super.reset();
    super.translate(this._target.x(), this._target.y());
    const s = this._target.scaleX();
    super.scale(s, s);
    this._suppressTargetUpdate = false;
  }

  private _getZoomAnchorPosition(): { x: number; y: number } | null {
    if (this._zoomAnchor === 'cursor') {
      const p = this._stage.getPointerPosition();
      return p ?? null;
    }
    const d = this._zoomAnchor.decompose();
    return { x: d.x, y: d.y };
  }
}
