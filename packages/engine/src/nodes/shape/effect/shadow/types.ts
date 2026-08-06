import { ShapeEffectType, type IShapeEffectBase } from "../base";

export enum DropShadowMode {
	Fill = "fill",
	Cutout = "cutout",
}

export type ShapeEffectShadowType =
	ShapeEffectType.DropShadow | ShapeEffectType.InnerShadow;

export interface IShapeEffectShadow<
	TType extends ShapeEffectShadowType = ShapeEffectShadowType,
> extends IShapeEffectBase<TType> {
	getFill(): string;
	setFill(value: string): void;
	getOpacity(): number;
	setOpacity(value: number): void;
	getX(): number;
	setX(value: number): void;
	getY(): number;
	setY(value: number): void;
	setOffset(x: number, y: number): void;

	getBlur(): number;
	setBlur(value: number): void;

	getSpread(): number;
	setSpread(value: number): void;
}
