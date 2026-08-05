import { ShapeEffectBase, ShapeEffectType } from "../base";
import type { IShapeEffectShadow } from "./types";

export abstract class ShapeEffectShadowBase<
	TType extends ShapeEffectType,
> extends ShapeEffectBase<TType> implements IShapeEffectShadow {
	private static readonly DEFAULT_FILL = "rgba(0, 0, 0, 1)";

	private _fill = ShapeEffectShadowBase.DEFAULT_FILL;
	private _opacity = 0.25;
	private _x = 4;
	private _y = 4;
	private _blur = 4;
	private _spread = 0;

	public getFill(): string {
		return this._fill;
	}

	public setFill(value: string): void {
		const fill = value.trim();

		if (!fill || this._fill === fill) {
			return;
		}

		this._fill = fill;
	}

	public getOpacity(): number {
		return this._opacity;
	}

	public setOpacity(value: number): void {
		if (!Number.isFinite(value)) {
			return;
		}

		const opacity = Math.max(0, Math.min(1, value));

		if (this._opacity === opacity) {
			return;
		}

		this._opacity = opacity;
	}

	public getX(): number {
		return this._x;
	}

	public setX(value: number): void {
		if (!Number.isFinite(value) || this._x === value) {
			return;
		}

		this._x = value;
	}

	public getY(): number {
		return this._y;
	}

	public setY(value: number): void {
		if (!Number.isFinite(value) || this._y === value) {
			return;
		}

		this._y = value;
	}

	public setOffset(x: number, y: number): void {
		if (
			!Number.isFinite(x) ||
			!Number.isFinite(y) ||
			(this._x === x && this._y === y)
		) {
			return;
		}

		this._x = x;
		this._y = y;
	}

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

	public getSpread(): number {
		return this._spread;
	}

	public setSpread(value: number): void {
		if (!Number.isFinite(value) || this._spread === value) {
			return;
		}

		this._spread = value;
	}
}