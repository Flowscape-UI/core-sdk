import type { IShapeEffectBase, ShapeEffectType } from "../base";

export interface IShapeEffectBlur<
	T extends ShapeEffectType,
> extends IShapeEffectBase<T> {
	getBlur(): number;
	setBlur(value: number): void;
}

export interface IShapeEffectLayerBlur extends IShapeEffectBlur<ShapeEffectType.LayerBlur> {}
export interface IShapeEffectBackgroundBlur extends IShapeEffectBlur<ShapeEffectType.BackgroundBlur> {}
