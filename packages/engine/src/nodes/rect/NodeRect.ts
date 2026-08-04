import type { ID } from "../../core/types";
import { EPSILON, MathF32 } from "../../core/math";
import type { Vector2 } from "../../core/transform/types";
import type { Rect } from "../base";
import { NodeType } from "../base";
import { ShapeBase, StrokeAlign, type ShapeCornerRadiusAnchor, type ShapePathCommand, type ShapeStrokePath } from "../shape";
import { matrixInvert } from "../utils/matrix-invert";
import { type INodeRect } from "./types";

export class NodeRect extends ShapeBase implements INodeRect {
	constructor(id: ID, name?: string, type?: NodeType) {
		super(id, type ?? NodeType.Rect, name ?? "Rect");
	}

	public override hitTest(worldPoint: Vector2): boolean {
		const bounds = this.getWorldViewAABB();

		if (
			worldPoint.x < bounds.x ||
			worldPoint.x > bounds.x + bounds.width ||
			worldPoint.y < bounds.y ||
			worldPoint.y > bounds.y + bounds.height
		) {
			return false;
		}

		try {
			const invMatrix = matrixInvert(this.getWorldMatrix());
			const localPoint = this._applyMatrixToPoint(
				invMatrix,
				worldPoint,
			);

			const local = this.getLocalOBB();
			const view = this.getLocalViewOBB();

			const [
				topLeft,
				topRight,
				bottomRight,
				bottomLeft,
			] = this._getResolvedCornerRadii();

			const outset = this._getViewOutset(local, view);

			const normalized = this._normalizeCornerRadii(view, {
				tlx: topLeft + outset.l,
				tly: topLeft + outset.t,

				trx: topRight + outset.r,
				try: topRight + outset.t,

				brx: bottomRight + outset.r,
				bry: bottomRight + outset.b,

				blx: bottomLeft + outset.l,
				bly: bottomLeft + outset.b,
			});

			return this._isPointInsideRoundedRect(
				localPoint,
				view,
				normalized,
			);
		} catch {
			return false;
		}
	}

	public override toPathCommands(): readonly ShapePathCommand[] {
		const bounds = this.getLocalOBB();

		const [
			topLeft,
			topRight,
			bottomRight,
			bottomLeft,
		] = this._getResolvedCornerRadii();

		return this._buildRoundedRectPath(bounds, {
			tlx: topLeft,
			tly: topLeft,

			trx: topRight,
			try: topRight,

			brx: bottomRight,
			bry: bottomRight,

			blx: bottomLeft,
			bly: bottomLeft,
		});
	}

	public override getCornerRadiusAnchors(): readonly ShapeCornerRadiusAnchor[] {
		const bounds = this.getLocalOBB();

		const tl = {
			x: bounds.x,
			y: bounds.y,
		};

		const tr = {
			x: bounds.x + bounds.width,
			y: bounds.y,
		};

		const br = {
			x: bounds.x + bounds.width,
			y: bounds.y + bounds.height,
		};

		const bl = {
			x: bounds.x,
			y: bounds.y + bounds.height,
		};

		return [
			{
				point: tl,
				previous: bl,
				next: tr,
			},
			{
				point: tr,
				previous: tl,
				next: br,
			},
			{
				point: br,
				previous: tr,
				next: bl,
			},
			{
				point: bl,
				previous: br,
				next: tl,
			},
		];
	}

	public override getStrokePath(): ShapeStrokePath | null {
		const bounds = this.getLocalOBB();

		if (
			bounds.width <= EPSILON ||
			bounds.height <= EPSILON
		) {
			return null;
		}

		const [
			top,
			right,
			bottom,
			left,
		] = this._resolveShapeValues(
			this.getStrokeWidth(),
			4,
		);

		const t = Math.max(0, top ?? 0);
		const r = Math.max(0, right ?? 0);
		const b = Math.max(0, bottom ?? 0);
		const l = Math.max(0, left ?? 0);

		if (
			t <= EPSILON &&
			r <= EPSILON &&
			b <= EPSILON &&
			l <= EPSILON
		) {
			return null;
		}

		const [
			topLeft,
			topRight,
			bottomRight,
			bottomLeft,
		] = this._getResolvedCornerRadii();

		const tlDelta = Math.max(l, t);
		const trDelta = Math.max(r, t);
		const brDelta = Math.max(r, b);
		const blDelta = Math.max(l, b);

		let outerBounds: Rect = {
			...bounds,
		};

		let innerBounds: Rect = {
			...bounds,
		};

		let outerRadius = {
			tl: topLeft,
			tr: topRight,
			br: bottomRight,
			bl: bottomLeft,
		};

		let innerRadius = {
			...outerRadius,
		};

		switch (this.getStrokeAlign()) {
			case StrokeAlign.Inside: {
				innerBounds = {
					x: bounds.x + l,
					y: bounds.y + t,
					width: Math.max(
						0,
						bounds.width - l - r,
					),
					height: Math.max(
						0,
						bounds.height - t - b,
					),
				};

				innerRadius = {
					tl: this._shrinkStrokeRadius(
						topLeft,
						tlDelta,
					),
					tr: this._shrinkStrokeRadius(
						topRight,
						trDelta,
					),
					br: this._shrinkStrokeRadius(
						bottomRight,
						brDelta,
					),
					bl: this._shrinkStrokeRadius(
						bottomLeft,
						blDelta,
					),
				};

				break;
			}

			case StrokeAlign.Center: {
				const halfT = t * 0.5;
				const halfR = r * 0.5;
				const halfB = b * 0.5;
				const halfL = l * 0.5;

				outerBounds = {
					x: bounds.x - halfL,
					y: bounds.y - halfT,

					width:
						bounds.width +
						halfL +
						halfR,

					height:
						bounds.height +
						halfT +
						halfB,
				};

				innerBounds = {
					x: bounds.x + halfL,
					y: bounds.y + halfT,

					width: Math.max(
						0,
						bounds.width -
						halfL -
						halfR,
					),

					height: Math.max(
						0,
						bounds.height -
						halfT -
						halfB,
					),
				};

				outerRadius = {
					tl: this._expandStrokeRadius(
						topLeft,
						tlDelta * 0.5,
					),
					tr: this._expandStrokeRadius(
						topRight,
						trDelta * 0.5,
					),
					br: this._expandStrokeRadius(
						bottomRight,
						brDelta * 0.5,
					),
					bl: this._expandStrokeRadius(
						bottomLeft,
						blDelta * 0.5,
					),
				};

				innerRadius = {
					tl: this._shrinkStrokeRadius(
						topLeft,
						tlDelta * 0.5,
					),
					tr: this._shrinkStrokeRadius(
						topRight,
						trDelta * 0.5,
					),
					br: this._shrinkStrokeRadius(
						bottomRight,
						brDelta * 0.5,
					),
					bl: this._shrinkStrokeRadius(
						bottomLeft,
						blDelta * 0.5,
					),
				};

				break;
			}

			case StrokeAlign.Outside: {
				outerBounds = {
					x: bounds.x - l,
					y: bounds.y - t,

					width:
						bounds.width +
						l +
						r,

					height:
						bounds.height +
						t +
						b,
				};

				outerRadius = {
					tl: this._expandStrokeRadius(
						topLeft,
						tlDelta,
					),
					tr: this._expandStrokeRadius(
						topRight,
						trDelta,
					),
					br: this._expandStrokeRadius(
						bottomRight,
						brDelta,
					),
					bl: this._expandStrokeRadius(
						bottomLeft,
						blDelta,
					),
				};

				break;
			}
		}

		if (
			outerBounds.width <= EPSILON ||
			outerBounds.height <= EPSILON
		) {
			return null;
		}

		const outer =
			this._buildRoundedRectPath(
				outerBounds,
				this._toStrokeCornerRadii(
					outerRadius,
				),
			);

		const inner =
			innerBounds.width > EPSILON &&
				innerBounds.height > EPSILON
				? this._buildRoundedRectPath(
					innerBounds,
					this._toStrokeCornerRadii(
						innerRadius,
					),
				)
				: [];

		return {
			outer,
			inner,
		};
	}

	private _toStrokeCornerRadii(
		radii: {
			tl: number;
			tr: number;
			br: number;
			bl: number;
		},
	): {
		tlx: number;
		tly: number;
		trx: number;
		try: number;
		brx: number;
		bry: number;
		blx: number;
		bly: number;
	} {
		return {
			tlx: radii.tl,
			tly: radii.tl,

			trx: radii.tr,
			try: radii.tr,

			brx: radii.br,
			bry: radii.br,

			blx: radii.bl,
			bly: radii.bl,
		};
	}

	private _getResolvedCornerRadii(): [
		number,
		number,
		number,
		number,
	] {
		const values = this._resolveShapeValues(
			this.getCornerRadius(),
			4,
		);

		return [
			values[0]!,
			values[1]!,
			values[2]!,
			values[3]!,
		];
	}

	private _buildRoundedRectPath(
		bounds: Rect,
		radii: {
			tlx: number;
			tly: number;
			trx: number;
			try: number;
			brx: number;
			bry: number;
			blx: number;
			bly: number;
		},
	): ShapePathCommand[] {
		const normalized = this._normalizeCornerRadii(bounds, radii);

		const x = bounds.x;
		const y = bounds.y;
		const w = bounds.width;
		const h = bounds.height;

		const commands: ShapePathCommand[] = [];

		commands.push({
			type: "moveTo",
			point: { x: MathF32.add(x, normalized.tlx), y },
		});

		commands.push({
			type: "lineTo",
			point: { x: MathF32.sub(MathF32.add(x, w), normalized.trx), y },
		});
		this._pushCornerArc(
			commands,
			{
				x: MathF32.sub(MathF32.add(x, w), normalized.trx),
				y: MathF32.add(y, normalized.try),
			},
			normalized.trx,
			normalized.try,
			-90,
			0,
		);

		commands.push({
			type: "lineTo",
			point: {
				x: MathF32.add(x, w),
				y: MathF32.sub(MathF32.add(y, h), normalized.bry),
			},
		});
		this._pushCornerArc(
			commands,
			{
				x: MathF32.sub(MathF32.add(x, w), normalized.brx),
				y: MathF32.sub(MathF32.add(y, h), normalized.bry),
			},
			normalized.brx,
			normalized.bry,
			0,
			90,
		);

		commands.push({
			type: "lineTo",
			point: { x: MathF32.add(x, normalized.blx), y: MathF32.add(y, h) },
		});
		this._pushCornerArc(
			commands,
			{
				x: MathF32.add(x, normalized.blx),
				y: MathF32.sub(MathF32.add(y, h), normalized.bly),
			},
			normalized.blx,
			normalized.bly,
			90,
			180,
		);

		commands.push({
			type: "lineTo",
			point: { x, y: MathF32.add(y, normalized.tly) },
		});
		this._pushCornerArc(
			commands,
			{
				x: MathF32.add(x, normalized.tlx),
				y: MathF32.add(y, normalized.tly),
			},
			normalized.tlx,
			normalized.tly,
			180,
			270,
		);

		commands.push({ type: "closePath" });
		return commands;
	}

	private _pushCornerArc(
		commands: ShapePathCommand[],
		center: { x: number; y: number },
		radiusX: number,
		radiusY: number,
		startAngle: number,
		endAngle: number,
	): void {
		if (radiusX <= 0 || radiusY <= 0) {
			return;
		}

		commands.push({
			type: "arcTo",
			center,
			radiusX,
			radiusY,
			startAngle,
			endAngle,
			clockwise: true,
		});
	}

	private _normalizeCornerRadii(
		bounds: Rect,
		radii: {
			tlx: number;
			tly: number;
			trx: number;
			try: number;
			brx: number;
			bry: number;
			blx: number;
			bly: number;
		},
	): {
		tlx: number;
		tly: number;
		trx: number;
		try: number;
		brx: number;
		bry: number;
		blx: number;
		bly: number;
	} {
		const clamped = {
			tlx: MathF32.max(0, radii.tlx),
			tly: MathF32.max(0, radii.tly),
			trx: MathF32.max(0, radii.trx),
			try: MathF32.max(0, radii.try),
			brx: MathF32.max(0, radii.brx),
			bry: MathF32.max(0, radii.bry),
			blx: MathF32.max(0, radii.blx),
			bly: MathF32.max(0, radii.bly),
		};

		const width = MathF32.max(0, bounds.width);
		const height = MathF32.max(0, bounds.height);

		const scaleXTop =
			clamped.tlx + clamped.trx > 0
				? width / (clamped.tlx + clamped.trx)
				: 1;
		const scaleXBottom =
			clamped.blx + clamped.brx > 0
				? width / (clamped.blx + clamped.brx)
				: 1;
		const scaleYLeft =
			clamped.tly + clamped.bly > 0
				? height / (clamped.tly + clamped.bly)
				: 1;
		const scaleYRight =
			clamped.try + clamped.bry > 0
				? height / (clamped.try + clamped.bry)
				: 1;

		const scaleX = MathF32.min(scaleXTop, scaleXBottom);
		const scaleY = MathF32.min(scaleYLeft, scaleYRight);
		const scale = MathF32.min(1, MathF32.min(scaleX, scaleY));

		return {
			tlx: MathF32.mul(clamped.tlx, scale),
			tly: MathF32.mul(clamped.tly, scale),
			trx: MathF32.mul(clamped.trx, scale),
			try: MathF32.mul(clamped.try, scale),
			brx: MathF32.mul(clamped.brx, scale),
			bry: MathF32.mul(clamped.bry, scale),
			blx: MathF32.mul(clamped.blx, scale),
			bly: MathF32.mul(clamped.bly, scale),
		};
	}

	private _getViewOutset(
		local: Rect,
		localView: Rect,
	): {
		t: number;
		r: number;
		b: number;
		l: number;
	} {
		const right = local.x + local.width;
		const bottom = local.y + local.height;
		const viewRight = localView.x + localView.width;
		const viewBottom = localView.y + localView.height;

		return {
			l: MathF32.max(0, local.x - localView.x),
			t: MathF32.max(0, local.y - localView.y),
			r: MathF32.max(0, viewRight - right),
			b: MathF32.max(0, viewBottom - bottom),
		};
	}

	private _isPointInsideRoundedRect(
		point: Vector2,
		bounds: Rect,
		radii: {
			tlx: number;
			tly: number;
			trx: number;
			try: number;
			brx: number;
			bry: number;
			blx: number;
			bly: number;
		},
	): boolean {
		const x = bounds.x;
		const y = bounds.y;
		const w = bounds.width;
		const h = bounds.height;

		const px = point.x;
		const py = point.y;

		if (px < x || px > x + w || py < y || py > y + h) {
			return false;
		}

		if (px < x + radii.tlx && py < y + radii.tly) {
			return this._isInsideCornerEllipse(
				px,
				py,
				x + radii.tlx,
				y + radii.tly,
				radii.tlx,
				radii.tly,
			);
		}

		if (px > x + w - radii.trx && py < y + radii.try) {
			return this._isInsideCornerEllipse(
				px,
				py,
				x + w - radii.trx,
				y + radii.try,
				radii.trx,
				radii.try,
			);
		}

		if (px > x + w - radii.brx && py > y + h - radii.bry) {
			return this._isInsideCornerEllipse(
				px,
				py,
				x + w - radii.brx,
				y + h - radii.bry,
				radii.brx,
				radii.bry,
			);
		}

		if (px < x + radii.blx && py > y + h - radii.bly) {
			return this._isInsideCornerEllipse(
				px,
				py,
				x + radii.blx,
				y + h - radii.bly,
				radii.blx,
				radii.bly,
			);
		}

		return true;
	}

	private _expandStrokeRadius(
		radius: number,
		delta: number,
	): number {
		/*
		 * Sharp corner должен остаться sharp.
		 *
		 * Stroke сам по себе не должен создавать
		 * border-radius там, где его не было.
		 */
		if (radius <= EPSILON) {
			return 0;
		}

		return MathF32.max(
			0,
			MathF32.add(
				radius,
				delta,
			),
		);
	}

	private _shrinkStrokeRadius(
		radius: number,
		delta: number,
	): number {
		if (radius <= EPSILON) {
			return 0;
		}

		return MathF32.max(
			0,
			MathF32.sub(
				radius,
				delta,
			),
		);
	}

	private _isInsideCornerEllipse(
		px: number,
		py: number,
		cx: number,
		cy: number,
		rx: number,
		ry: number,
	): boolean {
		if (rx <= 0 || ry <= 0) {
			return true;
		}

		const nx = (px - cx) / rx;
		const ny = (py - cy) / ry;

		return nx * nx + ny * ny <= 1;
	}
}
