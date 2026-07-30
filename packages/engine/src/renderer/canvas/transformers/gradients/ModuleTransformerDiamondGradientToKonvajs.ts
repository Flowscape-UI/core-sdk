import Konva from "konva";
import {
	GradientDiamond,
	GradientTransformerModule,
	transformTo,
} from "gradiente";
import type { CanvasGradientPaint, KonvaGradientPaint } from "./types";

const TRANSFORM_TARGET = "konvajs";

export class ModuleTransformerDiamondGradientToKonvajs extends GradientTransformerModule<
	GradientDiamond,
	KonvaGradientPaint
> {
	public constructor() {
		super({
			target: TRANSFORM_TARGET,
			gradientType: "diamond-gradient",
			gradientClass: GradientDiamond,
			expectedName: "GradientDiamond",
		});
	}

	protected transform(gradient: GradientDiamond): KonvaGradientPaint {
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
						"Unable to create Canvas 2D context for the diamond gradient.",
					);
				}

				/*
				 * Алмазный градиент рисуется поэксельно через ImageData +
				 * putImageData, а putImageData НЕ учитывает setTransform
				 * (в отличие от заливки градиентом в радиальном варианте).
				 * Поэтому вместо масштабирования контекста передаём в сам
				 * canvasPaint.draw уже увеличенные width/height холста —
				 * трансформер пересчитает позицию/радиусы под них сам.
				 */
				canvasPaint.draw(canvasContext, canvas.width, canvas.height);

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
