import Konva from "konva";
import {
	GradientRadial,
	GradientTransformerModule,
	transformTo,
} from "gradiente";
import type { KonvaGradientPaint } from "./types";

type CanvasGradientPaint = {
	draw(ctx: CanvasRenderingContext2D, width: number, height: number): void;
};

export class ModuleTransformerRadialGradientToKonvajs extends GradientTransformerModule<
	GradientRadial,
	KonvaGradientPaint
> {
	public constructor() {
		super({
			target: "konvajs",
			gradientType: "radial-gradient",
			gradientClass: GradientRadial,
			expectedName: "GradientRadial",
		});
	}

	protected transform(gradient: GradientRadial): KonvaGradientPaint {
		const canvasPaint = transformTo<CanvasGradientPaint>(
			"canvas-2d",
			gradient,
		);

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

				const scale = Math.max(1, renderScale);

				const canvas = document.createElement("canvas");

				canvas.width = Math.max(1, Math.ceil(width * scale));

				canvas.height = Math.max(1, Math.ceil(height * scale));

				const canvasContext = canvas.getContext("2d");

				if (!canvasContext) {
					throw new Error(
						"Unable to create Canvas 2D context for the radial gradient.",
					);
				}

				/*
				 * Увеличиваем физическое разрешение canvas,
				 * но оставляем gradiente логические width и height.
				 */
				canvasContext.setTransform(scale, 0, 0, scale, 0, 0);

				canvasPaint.draw(canvasContext, width, height);

				ctx.save();

				ctx.imageSmoothingEnabled = true;

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

				ctx.restore();
			},
		};
	}
}
