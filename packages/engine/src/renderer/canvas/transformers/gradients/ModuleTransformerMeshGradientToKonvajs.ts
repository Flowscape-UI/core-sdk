import Konva from "konva";
import {
	GradientMesh,
	GradientTransformerModule,
	transformTo,
} from "gradiente";
import type {
	CanvasGradientPaint,
	KonvaGradientPaint,
} from "./types";

const TRANSFORM_TARGET = "konvajs";
const MESH_MAX_RENDER_SCALE = 2;

export class ModuleTransformerMeshGradientToKonvajs extends GradientTransformerModule<
	GradientMesh,
	KonvaGradientPaint
> {
	public constructor() {
		super({
			target: TRANSFORM_TARGET,
			gradientType: "mesh-gradient",
			gradientClass: GradientMesh,
			expectedName: "GradientMesh",
		});
	}

	protected transform(gradient: GradientMesh): KonvaGradientPaint {
		const canvasPaint = transformTo<CanvasGradientPaint>(
			"canvas-2d",
			gradient,
		);

		const canvas = document.createElement("canvas");
		const canvasContext = canvas.getContext("2d");

		if (!canvasContext) {
			throw new Error(
				"Unable to create Canvas 2D context for the mesh gradient.",
			);
		}

		let cachedWidth = 0;
		let cachedHeight = 0;
		let cachedScale = 0;

		return {
			draw: (
				ctx: Konva.Context,
				width: number,
				height: number,
				renderScale = 1,
			): void => {
				if (width <= 0 || height <= 0) {
					return;
				}

				/*
				 * Используем только фиксированные уровни качества.
				 * Непрерывный scale камеры постоянно сбрасывал бы кеш.
				 */
				const scale =
					MESH_MAX_RENDER_SCALE >= 2 &&
					renderScale >= 1.75
						? 2
						: 1;

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