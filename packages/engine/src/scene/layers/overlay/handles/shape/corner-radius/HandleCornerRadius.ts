import { EPSILON } from "../../../../../../core";
import type { Point } from "../../../../../../core/camera";
import type { IShapeBase } from "../../../../../../nodes";
import { HandleBase, HandleType } from "../../base";
import type {
	CornerRadiusSection,
	IHandleCornerRadius,
} from "./types";

export class HandleCornerRadius
	extends HandleBase
	implements IHandleCornerRadius {
	private readonly _cornerIndex: number;

	constructor(cornerIndex: number) {
		const size = 8;
		const inset = 10;

		super(HandleType.CornerRadius);

		this._cornerIndex = Math.max(
			0,
			Math.floor(cornerIndex),
		);

		super.setFill("#FFFFFF");
		super.setStrokeFill("#4DA3FF");
		super.setStrokeWidth(1);

		super.setSize(size, size);
		super.setHitSize(size, size);

		super.setOffset({
			x: -inset,
			y: -inset,
		});
	}

	public getCornerIndex(): number {
		return this._cornerIndex;
	}

	public override setNode(node: IShapeBase): boolean {
		const changed = super.setNode(node);

		this._syncNormalizedPosition();

		return changed;
	}

	public override setX(value: number): void {
		super.setX(this._clamp01(value));
	}

	public override setY(value: number): void {
		super.setY(this._clamp01(value));
	}

	public override setPosition(value: Point): void {
		super.setPosition({
			x: this._clamp01(value.x),
			y: this._clamp01(value.y),
		});
	}

	public getHandleWorldPoint(): Point | null {
		const section = this.getSection();

		if (!section) {
			return null;
		}

		const diagonalEnd =
			this._getSectionDiagonalPoint(section);

		const diagonalVector = {
			x: diagonalEnd.x - section.origin.x,
			y: diagonalEnd.y - section.origin.y,
		};

		const diagonalLength = Math.hypot(
			diagonalVector.x,
			diagonalVector.y,
		);

		if (diagonalLength <= EPSILON) {
			return section.origin;
		}

		const value =
			this._getCornerRadiusValue();

		const maxRadius =
			this._getSectionMaxRadius(section);

		if (maxRadius <= EPSILON) {
			return section.origin;
		}

		const progress = Math.max(
			0,
			Math.min(
				value / maxRadius,
				1,
			),
		);

		return {
			x:
				section.origin.x +
				diagonalVector.x * progress,

			y:
				section.origin.y +
				diagonalVector.y * progress,
		};
	}

	public getSection(): CornerRadiusSection | null {
		const node = this.getNode();

		if (!this.isEnabled() || !node) {
			return null;
		}

		this._syncNormalizedPosition();

		const anchors =
			node.getCornerRadiusAnchors();

		const anchor =
			anchors[this._cornerIndex];

		if (!anchor) {
			return null;
		}

		const origin =
			this._toWorldPoint(anchor.point);

		const previous =
			this._toWorldPoint(anchor.previous);

		const next =
			this._toWorldPoint(anchor.next);

		const previousDistance =
			this._getDistance(
				origin,
				previous,
			);

		const nextDistance =
			this._getDistance(
				origin,
				next,
			);

		const maxRadius =
			Math.min(
				previousDistance,
				nextDistance,
			) * 0.5;

		if (maxRadius <= EPSILON) {
			return null;
		}

		let target: Point;

		if (anchor.handleTarget) {
			target =
				this._toWorldPoint(
					anchor.handleTarget,
				);
		} else {
			const bounds =
				node.getLocalOBB();

			target =
				this._toWorldPoint({
					x:
						bounds.x +
						bounds.width * 0.5,

					y:
						bounds.y +
						bounds.height * 0.5,
				});
		}

		return this._createSection(
			origin,
			target,
			maxRadius,
		);
	}

	private _syncNormalizedPosition(): void {
		const position =
			this._getNormalizedAnchorPosition();

		if (!position) {
			return;
		}

		super.setPosition(position);
	}

	private _getNormalizedAnchorPosition(): Point | null {
		const node = this.getNode();

		if (!node) {
			return null;
		}

		const anchor =
			node.getCornerRadiusAnchors()[
			this._cornerIndex
			];

		if (!anchor) {
			return null;
		}

		const bounds = node.getLocalOBB();

		const x =
			Math.abs(bounds.width) > EPSILON
				? (
					anchor.point.x -
					bounds.x
				) / bounds.width
				: 0;

		const y =
			Math.abs(bounds.height) > EPSILON
				? (
					anchor.point.y -
					bounds.y
				) / bounds.height
				: 0;

		return {
			x: this._clamp01(x),
			y: this._clamp01(y),
		};
	}

	private _clamp01(value: number): number {
		return Math.max(
			0,
			Math.min(1, value),
		);
	}

	private _getCornerRadiusValue(): number {
		const node = this.getNode();

		if (!node) {
			return 0;
		}

		const values =
			node.getCornerRadius();

		if (values.length === 0) {
			return 0;
		}

		if (values.length === 1) {
			return values[0] ?? 0;
		}

		return (
			values[this._cornerIndex] ??
			values[0] ??
			0
		);
	}

	private _createSection(
		origin: Point,
		target: Point,
		maxRadius: number,
	): CornerRadiusSection {
		const targetVector = {
			x: target.x - origin.x,
			y: target.y - origin.y,
		};

		const targetDistance = Math.hypot(
			targetVector.x,
			targetVector.y,
		);

		if (targetDistance <= EPSILON) {
			return {
				index: this._cornerIndex,
				origin,
				xAxisPoint: origin,
				yAxisPoint: origin,
				inset: 0,
				width: 0,
				height: 0,
			};
		}

		const direction = {
			x: targetVector.x / targetDistance,
			y: targetVector.y / targetDistance,
		};

		const inset = Math.min(
			this._getInset(),
			targetDistance,
			maxRadius,
		);

		const insetOrigin = {
			x:
				origin.x +
				direction.x * inset,

			y:
				origin.y +
				direction.y * inset,
		};

		const remainingVector = {
			x: target.x - insetOrigin.x,
			y: target.y - insetOrigin.y,
		};

		const halfVector = {
			x: remainingVector.x * 0.5,
			y: remainingVector.y * 0.5,
		};

		const availableRadius = Math.max(
			0,
			maxRadius - inset,
		);

		return {
			index: this._cornerIndex,

			origin: insetOrigin,

			xAxisPoint: {
				x: insetOrigin.x + halfVector.x,
				y: insetOrigin.y + halfVector.y,
			},

			yAxisPoint: {
				x: insetOrigin.x + halfVector.x,
				y: insetOrigin.y + halfVector.y,
			},

			inset,

			width: availableRadius,
			height: availableRadius,
		};
	}

	private _toWorldPoint(
		point: Point,
	): Point {
		const node = this.getNode();

		if (!node) {
			return point;
		}

		const matrix =
			node.getWorldMatrix();

		return {
			x:
				matrix.a * point.x +
				matrix.c * point.y +
				matrix.tx,

			y:
				matrix.b * point.x +
				matrix.d * point.y +
				matrix.ty,
		};
	}

	private _getSectionDiagonalPoint(
		section: CornerRadiusSection,
	): Point {
		return {
			x:
				section.xAxisPoint.x +
				section.yAxisPoint.x -
				section.origin.x,

			y:
				section.xAxisPoint.y +
				section.yAxisPoint.y -
				section.origin.y,
		};
	}

	private _getSectionMaxRadius(
		section: CornerRadiusSection,
	): number {
		return Math.max(
			0,
			Math.min(
				section.width,
				section.height,
			) + section.inset,
		);
	}

	private _getInset(): number {
		return Math.max(
			0,
			Math.max(
				Math.abs(this.getOffsetX()),
				Math.abs(this.getOffsetY()),
			),
		);
	}

	private _getDistance(
		a: Point,
		b: Point,
	): number {
		return Math.hypot(
			b.x - a.x,
			b.y - a.y,
		);
	}
}