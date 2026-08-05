import type { ShapeEffectType } from "./base";
import type { IShapeEffectDropShadow, IShapeEffectInnerShadow } from "./shadow";

export interface IShapeEffectByType {
	[ShapeEffectType.DropShadow]: IShapeEffectDropShadow;
	[ShapeEffectType.InnerShadow]: IShapeEffectInnerShadow;
}

export type IShapeEffect = IShapeEffectByType[keyof IShapeEffectByType];