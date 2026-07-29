import Konva from "konva";
import {
	GradientLinear,
	GradientTransformerModule,
	transformTo,
} from "gradiente";
import type {
	CanvasGradientPaint,
	KonvaGradientPaint
} from "./types";

const TRANSFORM_TARGET = "konvajs";

export class ModuleTransformerLinearGradientToKonvajs extends GradientTransformerModule<
	GradientLinear,
	KonvaGradientPaint
> {
	public constructor() {
		super({
			target: TRANSFORM_TARGET,
			gradientType: "linear-gradient",
			gradientClass: GradientLinear,
			expectedName: "GradientLinear",
		});
	}

	protected transform(gradient: GradientLinear): KonvaGradientPaint {
		const canvasPaint = transformTo<CanvasGradientPaint>(
			"canvas-2d",
			gradient,
		);

		return {
			draw: (
				ctx: Konva.Context,
				width: number,
				height: number,
			): void => {
				if (width <= 0 || height <= 0) {
					return;
				}

				const canvas = document.createElement("canvas");

				canvas.width = Math.max(1, Math.ceil(width));
				canvas.height = Math.max(1, Math.ceil(height));

				const canvasContext = canvas.getContext("2d");

				if (!canvasContext) {
					throw new Error(
						"Unable to create Canvas 2D context for the linear gradient.",
					);
				}

				canvasPaint.draw(
					canvasContext,
					canvas.width,
					canvas.height,
				);

				ctx.drawImage(
					canvas,
					0,
					0,
					canvas.width,
					canvas.height,
					0,
					0,
					width,
					height,
				);
			},
		};
	}
}