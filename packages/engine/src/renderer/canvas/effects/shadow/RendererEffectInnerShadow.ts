import Konva from "konva";
import {
	ShapeEffectType,
	type IShapeEffectInnerShadow,
} from "../../../../nodes";
import {
	getInnerShadowRasterBounds,
	renderInnerShadowRaster,
	resolveShadowRasterScale,
} from "./renderShadowRaster";
import type {
	CanvasInnerShadowState,
	CanvasShadowGeometry,
	CanvasShadowRaster,
} from "./types";

const INNER_SHADOW_NAME = "shape-inner-shadow";

export class RendererEffectInnerShadow {
	public readonly type = ShapeEffectType.InnerShadow;

	private readonly _view: Konva.Shape;
	private _geometry: CanvasShadowGeometry | null = null;
	private _effectState: CanvasInnerShadowState | null = null;
	private _stateSignature = "";
	private _rasterSignature = "";
	private _raster: CanvasShadowRaster | null = null;

	constructor() {
		this._view = new Konva.Shape({
			name: INNER_SHADOW_NAME,
			listening: false,

			sceneFunc: (context, shape) => {
				const raster = this._getRaster(context, shape);

				if (!raster) {
					return;
				}

				context.drawImage(
					raster.canvas,
					raster.bounds.x,
					raster.bounds.y,
					raster.bounds.width,
					raster.bounds.height,
				);
			},
		});
	}

	public getView(): Konva.Shape {
		return this._view;
	}

	public mount(parent: Konva.Group): void {
		if (this._view.getParent() === parent) {
			return;
		}

		this._view.remove();
		parent.add(this._view);
	}

	public update(
		effect: IShapeEffectInnerShadow,
		geometry: CanvasShadowGeometry,
	): void {
		const effectState: CanvasInnerShadowState = {
			x: effect.getX(),
			y: effect.getY(),
			blur: Math.max(0, effect.getBlur()),
			spread: effect.getSpread(),
			fill: effect.getFill(),
			opacity: Math.max(0, Math.min(1, effect.getOpacity())),
		};
		const stateSignature = JSON.stringify({
			geometry: geometry.signature,
			effect: effectState,
		});

		this._geometry = geometry;
		this._effectState = effectState;
		this._view.visible(effect.isVisible() && effectState.opacity > 0);

		if (stateSignature === this._stateSignature) {
			return;
		}

		this._stateSignature = stateSignature;
		this._invalidateRaster();
	}

	public clear(): void {
		this._geometry = null;
		this._effectState = null;
		this._stateSignature = "";
		this._view.visible(false);
		this._invalidateRaster();
	}

	public destroy(): void {
		this.clear();
		this._view.destroy();
	}

	private _getRaster(
		context: Konva.Context,
		shape: Konva.Shape,
	): CanvasShadowRaster | null {
		if (!this._geometry || !this._effectState || !this._view.isVisible()) {
			return null;
		}

		const requestedScale = this._resolveRequestedScale(context, shape);
		const bounds = getInnerShadowRasterBounds(
			this._geometry.bounds,
			this._effectState,
		);
		const scale = resolveShadowRasterScale(requestedScale, bounds);
		const rasterSignature = `${this._stateSignature}|${scale}`;

		if (this._raster && rasterSignature === this._rasterSignature) {
			return this._raster;
		}

		this._raster = renderInnerShadowRaster(
			this._geometry,
			this._effectState,
			scale,
		);
		this._rasterSignature = rasterSignature;

		return this._raster;
	}

	private _resolveRequestedScale(
		context: Konva.Context,
		shape: Konva.Shape,
	): number {
		const pixelRatio = context.getCanvas().getPixelRatio();
		const absoluteScale = shape.getAbsoluteScale();

		return Math.max(
			1,
			pixelRatio *
				Math.max(Math.abs(absoluteScale.x), Math.abs(absoluteScale.y)),
		);
	}

	private _invalidateRaster(): void {
		this._raster = null;
		this._rasterSignature = "";
	}
}
