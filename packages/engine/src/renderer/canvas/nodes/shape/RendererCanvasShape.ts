import Konva from "konva";
import { transformTo } from "gradiente";

import {
	registerGradientTransformers,
	type KonvaGradientPaint,
} from "../../transformers/gradients";

import {
	FillMode,
	type IShapeBase,
	type Rect,
	type ShapePathCommand,
	type ShapeStrokePath,
} from "../../../../nodes";

import { RendererCanvasBase } from "../base";

const FILL_SHAPE_NAME = "shape-fill";
const FILL_SHAPE_SELECTOR = `.${FILL_SHAPE_NAME}`;

const STROKE_SHAPE_NAME = "shape-stroke";
const STROKE_SHAPE_SELECTOR = `.${STROKE_SHAPE_NAME}`;

registerGradientTransformers();

type GradientPaintCacheEntry = {
	fillMode: FillMode;
	fillValue: string;
	paint: KonvaGradientPaint;
};

type StrokePoint = {
	x: number;
	y: number;
};

type StrokeSample = StrokePoint & {
	width: number;
};

type FlattenedStrokeSegment = {
	points: StrokeSample[];
};


export class RendererCanvasShape extends RendererCanvasBase<IShapeBase> {
	private readonly _gradientPaintCache = new WeakMap<
		Konva.Shape,
		GradientPaintCacheEntry
	>();

	public create(node: IShapeBase): Konva.Group {
		const group = new Konva.Group({
			id: String(node.id),
		});

		const fillShape =
			this._createFillShape();

		const strokeShape =
			this._createStrokeShape();

		group.add(fillShape);
		group.add(strokeShape);

		return group;
	}

	protected override onUpdate(
		node: IShapeBase,
		view: Konva.Group,
	): void {
		const commands =
			node.toPathCommands();

		const fillShape =
			this._findOneOrThrow<Konva.Shape>(
				view,
				FILL_SHAPE_SELECTOR,
			);

		const strokeShape =
			this._findOneOrThrow<Konva.Shape>(
				view,
				STROKE_SHAPE_SELECTOR,
			);

		/*
		 * Fill.
		 *
		 * Важно: используем intrinsic bounds,
		 * а не ViewOBB со stroke.
		 */
		fillShape.setAttrs({
			pathCommands: commands,

			paintBounds:
				node.getLocalOBB(),

			fillMode:
				node.getFillMode(),

			fillValue:
				node.getFill(),
		});

		/*
		 * Stroke.
		 *
		 * Пока первый элемент StrokeWidth
		 * используется как uniform width.
		 *
		 * [10] -> 10px для всего path.
		 *
		 * [10, 20, ...] добавим позже
		 * как per-segment stroke.
		 */
		strokeShape.setAttrs({
			pathCommands: commands,

			strokePath:
				node.getStrokePath(),

			paintBounds:
				node.getLocalViewOBB(),

			strokeWidths:
				node.getStrokeWidth(),

			strokeMode:
				node.getStrokeMode(),

			strokeValue:
				node.getStrokeFill(),
		});
	}

	/*********************************************************/
	/*                         Fill                          */
	/*********************************************************/

	private _createFillShape(): Konva.Shape {
		return new Konva.Shape({
			name: FILL_SHAPE_NAME,
			listening: false,

			sceneFunc: (ctx, shape) => {
				const commands =
					shape.getAttr(
						"pathCommands",
					) as
					| readonly ShapePathCommand[]
					| undefined;

				if (
					!commands ||
					commands.length === 0
				) {
					return;
				}

				const bounds =
					shape.getAttr(
						"paintBounds",
					) as Rect | undefined;

				if (
					!bounds ||
					bounds.width <= 0 ||
					bounds.height <= 0
				) {
					return;
				}

				const fillMode =
					(
						shape.getAttr(
							"fillMode",
						) as
						| FillMode
						| undefined
					) ??
					FillMode.Color;

				const fillValue =
					String(
						shape.getAttr(
							"fillValue",
						) ??
						"#000000",
					);

				ctx.beginPath();

				this._appendPath(
					ctx,
					commands,
				);

				this._drawFill(
					ctx,
					shape,
					bounds,
					fillMode,
					fillValue,
				);
			},
		});
	}

	/*********************************************************/
	/*                        Stroke                         */
	/*********************************************************/

	private _createStrokeShape(): Konva.Shape {
		return new Konva.Shape({
			name: STROKE_SHAPE_NAME,
			listening: false,

			sceneFunc: (ctx, shape) => {
				const strokeMode =
					(
						shape.getAttr(
							"strokeMode",
						) as
						| FillMode
						| undefined
					) ??
					FillMode.Color;

				const strokeValue =
					String(
						shape.getAttr(
							"strokeValue",
						) ??
						"#000000",
					);

				const strokePath =
					shape.getAttr(
						"strokePath",
					) as
					| ShapeStrokePath
					| null
					| undefined;

				/*
				 * Полноценный stroke-area.
				 *
				 * outer - inner
				 */
				if (strokePath) {
					if (
						strokePath.outer.length === 0
					) {
						return;
					}

					ctx.beginPath();

					this._appendPath(
						ctx,
						strokePath.outer,
					);

					if (
						strokePath.inner.length > 0
					) {
						this._appendPath(
							ctx,
							strokePath.inner,
						);
					}

					switch (strokeMode) {
						case FillMode.Color:
							ctx.fillStyle =
								strokeValue;

							ctx.fill(
								"evenodd",
							);

							return;

						case FillMode.LinearGradient:
						case FillMode.RadialGradient:
						case FillMode.ConicGradient:
						case FillMode.DiamondGradient:
						case FillMode.MeshGradient: {
							const bounds =
								shape.getAttr(
									"paintBounds",
								) as
								| Rect
								| undefined;

							if (
								!bounds ||
								bounds.width <= 0 ||
								bounds.height <= 0
							) {
								return;
							}

							this._drawGradientStroke(
								ctx,
								shape,
								bounds,
								strokeMode,
								strokeValue,
							);

							return;
						}

						default:
							ctx.fillStyle =
								"#000000";

							ctx.fill(
								"evenodd",
							);

							return;
					}
				}

				/*
				 * Fallback для Shape, которые пока
				 * не реализуют getStrokePath().
				 *
				 * Gradient stroke здесь пока
				 * невозможен корректно, потому что
				 * у нас нет stroke-area для clipping.
				 */
				if (
					strokeMode !==
					FillMode.Color
				) {
					return;
				}

				const strokeWidths =
					shape.getAttr(
						"strokeWidths",
					) as
					| readonly number[]
					| undefined;

				if (
					!strokeWidths ||
					strokeWidths.length === 0
				) {
					return;
				}

				const width =
					Math.max(
						0,
						strokeWidths[0] ?? 0,
					);

				if (width <= 0) {
					return;
				}

				const commands =
					shape.getAttr(
						"pathCommands",
					) as
					| readonly ShapePathCommand[]
					| undefined;

				if (
					!commands ||
					commands.length === 0
				) {
					return;
				}

				ctx.beginPath();

				this._appendPath(
					ctx,
					commands,
				);

				ctx.strokeStyle =
					strokeValue;

				ctx.lineWidth =
					width;

				ctx.lineJoin =
					"miter";

				ctx.lineCap =
					"butt";

				ctx.stroke();
			},
		});
	}

	/*********************************************************/
	/*                         Path                          */
	/*********************************************************/

	private _appendPath(
		ctx: Konva.Context,
		commands: readonly ShapePathCommand[],
	): void {
		for (const command of commands) {
			switch (command.type) {
				case "moveTo":
					ctx.moveTo(
						command.point.x,
						command.point.y,
					);
					break;

				case "lineTo":
					ctx.lineTo(
						command.point.x,
						command.point.y,
					);
					break;

				case "quadraticCurveTo":
					ctx.quadraticCurveTo(
						command.control.x,
						command.control.y,
						command.point.x,
						command.point.y,
					);
					break;

				case "arcTo":
					this._appendArc(
						ctx,
						command.center.x,
						command.center.y,
						command.radiusX,
						command.radiusY,
						command.startAngle,
						command.endAngle,
						command.clockwise,
					);
					break;

				case "closePath":
					ctx.closePath();
					break;
			}
		}
	}

	private _drawGradientStroke(
		ctx: Konva.Context,
		shape: Konva.Shape,
		bounds: Rect,
		strokeMode: FillMode,
		strokeValue: string,
	): void {
		const gradientPaint =
			this._getGradientPaint(
				shape,
				strokeMode,
				strokeValue,
			);

		const renderScale =
			this._resolveGradientRenderScale(
				strokeMode,
				ctx,
				shape,
			);

		ctx.save();

		/*
		 * Текущий path уже содержит:
		 *
		 * outer contour
		 * inner contour
		 *
		 * Поэтому clipping должен быть именно evenodd,
		 * иначе внутренняя область может не стать дыркой.
		 */
		ctx.clip(
			"evenodd",
		);

		ctx.translate(
			bounds.x,
			bounds.y,
		);

		gradientPaint.draw(
			ctx,
			bounds.width,
			bounds.height,
			renderScale,
		);

		ctx.restore();
	}


	private _appendArc(
		ctx: Konva.Context,
		centerX: number,
		centerY: number,
		radiusX: number,
		radiusY: number,
		startAngle: number,
		endAngle: number,
		clockwise: boolean,
	): void {
		if (
			radiusX <= 0 ||
			radiusY <= 0
		) {
			return;
		}

		const startRadians =
			(startAngle * Math.PI) / 180;

		const endRadians =
			(endAngle * Math.PI) / 180;

		ctx.save();

		ctx.translate(
			centerX,
			centerY,
		);

		ctx.scale(
			radiusX,
			radiusY,
		);

		ctx.arc(
			0,
			0,
			1,
			startRadians,
			endRadians,
			!clockwise,
		);

		ctx.restore();
	}

	/*********************************************************/
	/*                     Fill Drawing                      */
	/*********************************************************/

	private _drawFill(
		ctx: Konva.Context,
		shape: Konva.Shape,
		bounds: Rect,
		fillMode: FillMode,
		fillValue: string,
	): void {
		switch (fillMode) {
			case FillMode.Color:
				ctx.fillStyle =
					fillValue;

				ctx.fill();
				return;

			case FillMode.LinearGradient:
			case FillMode.RadialGradient:
			case FillMode.ConicGradient:
			case FillMode.DiamondGradient:
			case FillMode.MeshGradient:
				this._drawGradient(
					ctx,
					shape,
					bounds,
					fillMode,
					fillValue,
				);
				return;

			default:
				ctx.fillStyle =
					"#000000";

				ctx.fill();
		}
	}

	private _drawGradient(
		ctx: Konva.Context,
		shape: Konva.Shape,
		bounds: Rect,
		fillMode: FillMode,
		fillValue: string,
	): void {
		const gradientPaint =
			this._getGradientPaint(
				shape,
				fillMode,
				fillValue,
			);

		const renderScale =
			this._resolveGradientRenderScale(
				fillMode,
				ctx,
				shape,
			);

		ctx.save();

		ctx.clip();

		ctx.translate(
			bounds.x,
			bounds.y,
		);

		gradientPaint.draw(
			ctx,
			bounds.width,
			bounds.height,
			renderScale,
		);

		ctx.restore();
	}

	private _getGradientPaint(
		shape: Konva.Shape,
		fillMode: FillMode,
		fillValue: string,
	): KonvaGradientPaint {
		const cached =
			this._gradientPaintCache.get(
				shape,
			);

		if (
			cached &&
			cached.fillMode === fillMode &&
			cached.fillValue === fillValue
		) {
			return cached.paint;
		}

		const paint =
			transformTo<KonvaGradientPaint>(
				"konvajs",
				fillValue,
			);

		this._gradientPaintCache.set(
			shape,
			{
				fillMode,
				fillValue,
				paint,
			},
		);

		return paint;
	}

	private _resolveGradientRenderScale(
		fillMode: FillMode,
		ctx: Konva.Context,
		shape: Konva.Shape,
	): number {
		const pixelRatio =
			ctx
				.getCanvas()
				.getPixelRatio();

		const absoluteScale =
			shape.getAbsoluteScale();

		const nodeScale =
			Math.max(
				Math.abs(
					absoluteScale.x,
				),
				Math.abs(
					absoluteScale.y,
				),
			);

		const requestedScale =
			Math.max(
				1,
				pixelRatio *
				nodeScale,
			);

		switch (fillMode) {
			case FillMode.LinearGradient:
			case FillMode.RadialGradient:
				return requestedScale >=
					1.5
					? 2
					: 1;

			case FillMode.ConicGradient:
			case FillMode.DiamondGradient:
			case FillMode.MeshGradient:
			default:
				return 1;
		}
	}

	/*********************************************************/
	/*                        Helpers                        */
	/*********************************************************/
}