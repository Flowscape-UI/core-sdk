import Konva from "konva";

import {
	ShapeEffectType,
	type IShapeEffectLayerBlur,
	type Rect,
} from "../../../../nodes";

const BLUR_PADDING_FACTOR = 3;
const RASTER_PADDING = 2;
const MAX_RASTER_SCALE = 4;
const MAX_RASTER_DIMENSION = 4096;
const MAX_RASTER_PIXELS = 8_388_608;

export class RendererShapeEffectLayerBlur {
	public readonly type = ShapeEffectType.LayerBlur;

	private _target: Konva.Group | null = null;
	private _signature = "";

	public mount(target: Konva.Group): void {
		if (this._target === target) {
			return;
		}

		this.clear();
		this._target = target;
	}

	public update(
		effects: readonly IShapeEffectLayerBlur[],
		sourceBounds: Rect,
		requestedScale: number,
		contentSignature: string,
	): void {
		if (!this._target) {
			return;
		}

		const blurValues = effects
			.filter((effect) => effect.isVisible())
			.map((effect) => Math.max(0, effect.getBlur()))
			.filter((blur) => blur > 0);

		if (
			blurValues.length === 0 ||
			sourceBounds.width <= 0 ||
			sourceBounds.height <= 0
		) {
			this.clear();
			return;
		}

		const cacheBounds = getLayerBlurRasterBounds(sourceBounds, blurValues);
		const scale = resolveLayerBlurRasterScale(requestedScale, cacheBounds);
		const signature = JSON.stringify({
			content: contentSignature,
			blurValues,
			sourceBounds,
			scale,
		});

		if (signature === this._signature && this._target.isCached()) {
			return;
		}

		this._resetTarget();

		const padding = getLayerBlurPadding(blurValues);

		this._target.cache({
			x: sourceBounds.x,
			y: sourceBounds.y,
			width: sourceBounds.width,
			height: sourceBounds.height,
			offset: padding,
			pixelRatio: scale,
		});
		this._target.filters(
			blurValues.map((blur) => `blur(${blur}px)`),
		);

		this._signature = signature;
	}

	public clear(): void {
		this._resetTarget();
		this._signature = "";
	}

	public destroy(): void {
		this.clear();
		this._target = null;
	}

	private _resetTarget(): void {
		if (!this._target) {
			return;
		}

		this._target.filters([]);
		this._target.clearCache();
	}
}

export function getLayerBlurRasterBounds(
	sourceBounds: Rect,
	effects: readonly (IShapeEffectLayerBlur | number)[],
): Rect {
	const blurValues = effects
		.map((effect) =>
			typeof effect === "number"
				? Math.max(0, effect)
				: effect.isVisible()
					? Math.max(0, effect.getBlur())
					: 0,
		)
		.filter((blur) => blur > 0);

	if (blurValues.length === 0) {
		return { ...sourceBounds };
	}

	const padding = getLayerBlurPadding(blurValues);

	return {
		x: sourceBounds.x - padding,
		y: sourceBounds.y - padding,
		width: Math.max(1, sourceBounds.width + padding * 2),
		height: Math.max(1, sourceBounds.height + padding * 2),
	};
}

function getLayerBlurPadding(blurValues: readonly number[]): number {
	const totalBlur = blurValues.reduce((sum, blur) => sum + blur, 0);

	return Math.ceil(totalBlur * BLUR_PADDING_FACTOR) + RASTER_PADDING;
}

function resolveLayerBlurRasterScale(
	requestedScale: number,
	bounds: Rect,
): number {
	const normalizedRequestedScale = Math.min(
		MAX_RASTER_SCALE,
		Math.max(1, requestedScale),
	);
	const dimensionScale = Math.min(
		MAX_RASTER_DIMENSION / Math.max(1, bounds.width),
		MAX_RASTER_DIMENSION / Math.max(1, bounds.height),
	);
	const pixelScale = Math.sqrt(
		MAX_RASTER_PIXELS / Math.max(1, bounds.width * bounds.height),
	);
	const scale = Math.min(normalizedRequestedScale, dimensionScale, pixelScale);

	if (scale >= 0.25) {
		return Math.floor(scale * 4) / 4;
	}

	return Math.max(Number.EPSILON, scale);
}