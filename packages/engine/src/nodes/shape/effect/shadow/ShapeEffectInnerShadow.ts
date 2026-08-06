import { ShapeEffectType } from "../base";
import { ShapeEffectShadowBase } from "./ShapeEffectShadowBase";
import type { IShapeEffectShadow } from "./types";

export interface IShapeEffectInnerShadow extends IShapeEffectShadow<ShapeEffectType.InnerShadow> {}

export class ShapeEffectInnerShadow
	extends ShapeEffectShadowBase<ShapeEffectType.InnerShadow>
	implements IShapeEffectInnerShadow
{
	public readonly type = ShapeEffectType.InnerShadow;
}
