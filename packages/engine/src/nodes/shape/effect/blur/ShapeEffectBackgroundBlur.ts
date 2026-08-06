import {
  ShapeEffectBase,
  ShapeEffectType,
} from "../base";
import type { IShapeEffectBackgroundBlur } from "./types";


export class ShapeEffectBackgroundBlur
  extends ShapeEffectBase<ShapeEffectType.BackgroundBlur>
  implements IShapeEffectBackgroundBlur
{
  public readonly type = ShapeEffectType.BackgroundBlur;

  private _blur = 4;

  public getBlur(): number {
    return this._blur;
  }

  public setBlur(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    const blur = Math.max(0, value);

    if (this._blur === blur) {
      return;
    }

    this._blur = blur;
  }
}
