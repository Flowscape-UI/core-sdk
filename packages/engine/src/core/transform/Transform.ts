import { MathF32 } from '../math';
import type { Matrix, Vector2 } from './types';
import type { ITransform } from './types/ITransform';

export class Transform implements ITransform {
  private _position: Vector2;
  private _scale: Vector2;
  private _rotation: number;
  private _pivot: Vector2;

  constructor() {
    this._position = { x: 0, y: 0 };
    this._rotation = 0;
    this._scale = { x: 1, y: 1 };
    this._pivot = { x: 0.5, y: 0.5 };
  }

  /*****************************************************************/
  /*                           Position                            */
  /*****************************************************************/
  public getX(): number {
    return this._position.x;
  }

  public getY(): number {
    return this._position.y;
  }

  public getPosition(): Vector2 {
    return { ...this._position };
  }

  public setX(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._position.x === valueF32) {
      return;
    }
    this._position.x = valueF32;
  }

  public setY(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._position.y === valueF32) {
      return;
    }
    this._position.y = valueF32;
  }

  public setPosition(x: number, y: number): void {
    const xF32 = MathF32.toF32(x);
    const yF32 = MathF32.toF32(y);
    if (this._position.x === xF32 && this._position.y === yF32) {
      return;
    }
    this._position.x = xF32;
    this._position.y = yF32;
  }

  public translateX(value: number): void {
    if (value === 0) {
      return;
    }
    this._position.x = MathF32.add(this._position.x, value);
  }

  public translateY(value: number): void {
    if (value === 0) {
      return;
    }
    this._position.y = MathF32.add(this._position.y, value);
  }

  public translate(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }
    this._position.x = MathF32.add(this._position.x, dx);
    this._position.y = MathF32.add(this._position.y, dy);
  }



  /*****************************************************************/
  /*                             Scalе                             */
  /*****************************************************************/
  public getScaleX(): number {
    return this._scale.x;
  }

  public getScaleY(): number {
    return this._scale.y;
  }

  public getScale(): Vector2 {
    return { ...this._scale };
  }

  public setScaleX(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._scale.x === valueF32) {
      return;
    }
    this._scale.x = valueF32;
  }

  public setScaleY(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._scale.y === valueF32) {
      return;
    }
    this._scale.y = valueF32;
  }

  public setScale(sx: number, sy: number): void {
    const sxF32 = MathF32.toF32(sx);
    const syF32 = MathF32.toF32(sy);
    if (this._scale.x === sxF32 && this._scale.y === syF32) {
      return;
    }
    this._scale.x = sxF32;
    this._scale.y = syF32;
  }



  /*****************************************************************/
  /*                           Rotation                            */
  /*****************************************************************/
  public getRotation(): number {
    return this._rotation;
  }

  public setRotation(value: number): void {
    const valueF32 = MathF32.normalizeRad(value);
    if (this._rotation === valueF32) {
      return;
    }
    this._rotation = valueF32;
  }

  public rotate(delta: number): void {
    if (delta === 0) {
      return;
    }
    this._rotation = MathF32.normalizeRad(MathF32.add(this._rotation, delta));
  }



  /*****************************************************************/
  /*                            Pivot                              */
  /*****************************************************************/
  public getPivotX(): number {
    return this._pivot.x;
  }

  public getPivotY(): number {
    return this._pivot.y;
  }

  public getPivot(): Vector2 {
    return { ...this._pivot };
  }

  public setPivotX(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._pivot.x === valueF32) {
      return;
    }
    this._pivot.x = valueF32;
  }

  public setPivotY(value: number): void {
    const valueF32 = MathF32.toF32(value);
    if (this._pivot.y === valueF32) {
      return;
    }
    this._pivot.y = valueF32;
  }

  public setPivot(px: number, py: number): void {
    const pxF32 = MathF32.toF32(px);
    const pyF32 = MathF32.toF32(py);
    if (this._pivot.x === pxF32 && this._pivot.y === pyF32) {
      return;
    }
    this._pivot.x = pxF32;
    this._pivot.y = pyF32;
  }



  /*****************************************************************/
  /*                         Local Matrix                          */
  /*****************************************************************/
  public getLocalMatrix(
    width: number,
    height: number,
    boundsX: number = 0,
    boundsY: number = 0
  ): Matrix {
    const px = MathF32.add(boundsX, MathF32.mul(width, this._pivot.x));
    const py = MathF32.add(boundsY, MathF32.mul(height, this._pivot.y));
    return this._composeMatrix(
      this._position,
      this._scale,
      this._rotation,
      px,
      py
    );
  }



  /*****************************************************************/
  /*                         Helpers                          */
  /*****************************************************************/
  private _composeMatrix(
    position: Vector2,
    scale: Vector2,
    rotation: number,
    px: number,
    py: number
  ): Matrix {
    const cos = MathF32.cos(rotation);
    const sin = MathF32.sin(rotation);

    const a = MathF32.mul(cos, scale.x);
    const b = MathF32.mul(sin, scale.x);
    const c = MathF32.mul(-sin, scale.y);
    const d = MathF32.mul(cos, scale.y);

    return {
      a,
      b,
      c,
      d,
      tx: MathF32.toF32(position.x - (a * px + c * py)),
      ty: MathF32.toF32(position.y - (b * px + d * py)),
    };
  }


}
