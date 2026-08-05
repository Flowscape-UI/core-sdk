import { ShapeEffectType } from "../base";
import { ShapeEffectShadowBase } from "./ShapeEffectShadowBase";
import { DropShadowMode, type IShapeEffectShadow } from "./types";

export interface IShapeEffectDropShadow extends IShapeEffectShadow {
	getMode(): DropShadowMode;
	setMode(value: DropShadowMode): void;
}

export class ShapeEffectDropShadow extends ShapeEffectShadowBase<
	ShapeEffectType.DropShadow
> implements IShapeEffectDropShadow {
	public readonly type = ShapeEffectType.DropShadow;

	private _mode = DropShadowMode.Cutout;

	public getMode(): DropShadowMode {
		return this._mode;
	}

	public setMode(value: DropShadowMode): void {
		if (this._mode === value) {
			return;
		}

		this._mode = value;
	}
}