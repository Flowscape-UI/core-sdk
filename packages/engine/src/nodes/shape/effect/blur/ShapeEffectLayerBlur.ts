import { ShapeEffectBase, ShapeEffectType } from "../base";
import type { IShapeEffectLayerBlur } from "./types";

export class ShapeEffectLayerBlur
	extends ShapeEffectBase<ShapeEffectType.LayerBlur>
	implements IShapeEffectLayerBlur
{
	public readonly type = ShapeEffectType.LayerBlur;
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
