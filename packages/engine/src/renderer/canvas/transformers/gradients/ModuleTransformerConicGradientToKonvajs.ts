import Konva from "konva";
import {
	GradientConic,
	GradientTransformerModule,
	transformTo,
} from "gradiente";
import type {
	CanvasGradientPaint,
	KonvaGradientPaint,
} from "./types";

const TRANSFORM_TARGET = "konvajs";

export class ModuleTransformerConicGradientToKonvajs extends GradientTransformerModule<
	GradientConic,
	KonvaGradientPaint
> {
	public constructor() {
		super({
			target: TRANSFORM_TARGET,
			gradientType: "conic-gradient",
			gradientClass: GradientConic,
			expectedName: "GradientConic",
		});
	}

	protected transform(gradient: GradientConic): KonvaGradientPaint {
	const canvasPaint = transformTo<CanvasGradientPaint>(
		"canvas-2d",
		gradient,
	);

	const canvas = document.createElement("canvas");
	const canvasContext = canvas.getContext("2d");

	if (!canvasContext) {
		throw new Error(
			"Unable to create Canvas 2D context for the conic gradient.",
		);
	}

	let cachedWidth = 0;
	let cachedHeight = 0;
	let cachedScale = 0;

	return {
		draw: (
			ctx,
			width,
			height,
			renderScale = 1,
		): void => {
			if (width <= 0 || height <= 0) {
				return;
			}

			/*
			 * Важно: не использовать непрерывный scale камеры.
			 * Оставляем только фиксированные уровни качества.
			 */
			const scale = renderScale >= 1.5 ? 2 : 1;

			const pixelWidth = Math.max(
				1,
				Math.ceil(width * scale),
			);

			const pixelHeight = Math.max(
				1,
				Math.ceil(height * scale),
			);

			const cacheInvalid =
				pixelWidth !== cachedWidth ||
				pixelHeight !== cachedHeight ||
				scale !== cachedScale;

			if (cacheInvalid) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;

				canvasPaint.draw(
					canvasContext,
					pixelWidth,
					pixelHeight,
				);

				cachedWidth = pixelWidth;
				cachedHeight = pixelHeight;
				cachedScale = scale;
			}

			ctx.save();
			ctx.imageSmoothingEnabled = true;

			ctx.drawImage(
				canvas,
				0,
				0,
				pixelWidth,
				pixelHeight,
				0,
				0,
				width,
				height,
			);

			ctx.restore();
		},
	};
}
}