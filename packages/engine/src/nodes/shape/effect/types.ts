import type { ShapeEffectType } from "./base";
import type { IShapeEffectBackgroundBlur, IShapeEffectLayerBlur } from "./blur";
import type { IShapeEffectDropShadow, IShapeEffectInnerShadow } from "./shadow";

export interface IShapeEffectByType {
	[ShapeEffectType.DropShadow]: IShapeEffectDropShadow;
	[ShapeEffectType.InnerShadow]: IShapeEffectInnerShadow;
	[ShapeEffectType.LayerBlur]: IShapeEffectLayerBlur;
	[ShapeEffectType.BackgroundBlur]: IShapeEffectBackgroundBlur;
}

export type IShapeEffect = IShapeEffectByType[keyof IShapeEffectByType];
