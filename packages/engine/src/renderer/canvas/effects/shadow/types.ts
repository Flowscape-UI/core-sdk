import type { DropShadowMode, Rect, ShapePathCommand } from "../../../../nodes";

export type CanvasShadowArea = Readonly<{
	commands: readonly ShapePathCommand[];
	fillRule: CanvasFillRule;
}>;

export type CanvasShadowStroke = Readonly<{
	commands: readonly ShapePathCommand[];
	width: number;
	lineCap: CanvasLineCap;
	lineJoin: CanvasLineJoin;
}>;

/**
 * Canvas-ready snapshot of the visible shape silhouette.
 *
 * The snapshot contains geometry only. It does not depend on a concrete
 * shape class, fill paint or gradient implementation.
 */
export type CanvasShadowGeometry = Readonly<{
	bounds: Rect;
	fillCommands: readonly ShapePathCommand[];
	strokeAreas: readonly CanvasShadowArea[];
	fallbackStroke: CanvasShadowStroke | null;
	signature: string;
}>;

export type CanvasDropShadowState = Readonly<{
	x: number;
	y: number;
	blur: number;
	spread: number;
	fill: string;
	opacity: number;
	mode: DropShadowMode;
}>;

export type CanvasInnerShadowState = Readonly<{
	x: number;
	y: number;
	blur: number;
	spread: number;
	fill: string;
	opacity: number;
}>;

export type CanvasShadowRaster = Readonly<{
	canvas: HTMLCanvasElement;
	bounds: Rect;
	scale: number;
}>;
