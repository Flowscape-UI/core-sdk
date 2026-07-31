import Konva from "konva";

export type CanvasGradientPaint = {
	draw(ctx: CanvasRenderingContext2D, width: number, height: number): void;
};

export type KonvaGradientPaint = {
	draw(
		ctx: Konva.Context,
		width: number,
		height: number,
		renderScale?: number,
	): void;
};
