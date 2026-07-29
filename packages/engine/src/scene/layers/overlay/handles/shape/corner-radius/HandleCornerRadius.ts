import { EPSILON } from "../../../../../../core";
import type { Point } from "../../../../../../core/camera";
import { Direction } from "../../../../../../core/types";
import { HandleBase, HandleType } from "../../base";
import type {
    CornerRadiusAxis,
    CornerRadiusSection,
    IHandleCornerRadius,
} from "./types";

export class HandleCornerRadius extends HandleBase implements IHandleCornerRadius {
    private readonly _axis: CornerRadiusAxis;
    private readonly _sectionBounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };

    constructor(direction: Direction) {
        const size = 8;
        const inset = 10;

        super(HandleType.CornerRadius);

        this._axis = this._resolveAxis(direction);
        this._sectionBounds = this._resolveSectionBounds(direction);

        super.setFill("#FFFFFF");
        super.setStrokeFill("#4DA3FF");
        super.setStrokeWidth(1);
        super.setSize(size, size);
        super.setHitSize(size, size);
        super.setOffset({ x: -inset, y: -inset });

        super.setPosition(this._clampPositionToSection(this._resolveDefaultPosition(direction)));
    }

    public override setX(value: number): void {
        const clamped = this._clampPositionToSection({
            x: value,
            y: this.getY(),
        });

        super.setX(clamped.x);
        super.setY(clamped.y);
    }

    public override setY(value: number): void {
        const clamped = this._clampPositionToSection({
            x: this.getX(),
            y: value,
        });

        super.setX(clamped.x);
        super.setY(clamped.y);
    }

    public override setPosition(value: Point): void {
        const clamped = this._clampPositionToSection(value);

        super.setX(clamped.x);
        super.setY(clamped.y);
    }

    public getHandleWorldPoint(): Point | null {
        const section = this.getSection();

        if (!section) {
            return null;
        }

        const diagonalEnd = this._getSectionDiagonalPoint(section);
        const diagonalVector = {
            x: diagonalEnd.x - section.origin.x,
            y: diagonalEnd.y - section.origin.y,
        };

        const diagonalLength = Math.hypot(diagonalVector.x, diagonalVector.y);

        if (diagonalLength <= EPSILON) {
            return section.origin;
        }

        const value = this._getCornerRadiusValue();
        const maxRadius = this._getSectionMaxRadius(section);

        if (maxRadius <= 0.000001) {
            return section.origin;
        }

        const progress = Math.max(0, Math.min(value / maxRadius, 1));
        const distance = diagonalLength * progress;

        const dir = {
            x: diagonalVector.x / diagonalLength,
            y: diagonalVector.y / diagonalLength,
        };

        return {
            x: section.origin.x + dir.x * distance,
            y: section.origin.y + dir.y * distance,
        };
    }

    public getSection(): CornerRadiusSection | null {
        const node = this.getNode();

        if (!this.isEnabled() || !node) {
            return null;
        }

        const corners = node.getWorldViewCorners();

        if (corners.length < 4) {
            return null;
        }

        const [tl, tr, br, bl] = corners;
        const sectionSize = this._getSectionSize();

        switch (this._axis) {
            case "tl":
                return this._createSection(tl, tr, bl, sectionSize);
            case "tr":
                return this._createSection(tr, tl, br, sectionSize);
            case "br":
                return this._createSection(br, bl, tr, sectionSize);
            case "bl":
                return this._createSection(bl, br, tl, sectionSize);
            default:
                return null;
        }
    }

    private _resolveDefaultPosition(direction: Direction): Point {
        switch (direction) {
            case Direction.NE:
                return { x: 1, y: 0 };
            case Direction.SE:
                return { x: 1, y: 1 };
            case Direction.SW:
                return { x: 0, y: 1 };
            default:
                return { x: 0, y: 0 };
        }
    }

    private _getDistance(a: Point, b: Point): number {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    private _normalize(point: Point): Point {
        const length = Math.hypot(point.x, point.y);

        if (length <= 0.000001) {
            return { x: 0, y: 0 };
        }

        return {
            x: point.x / length,
            y: point.y / length,
        };
    }

    private _getSectionSize(): number {
        const node = this.getNode();

        if (!this.isEnabled() || !node) {
            return 0;
        }

        const corners = node.getWorldViewCorners();

        if (corners.length < 4) {
            return 0;
        }

        const [tl, tr, _, bl] = corners;

        const width = this._getDistance(tl, tr);
        const height = this._getDistance(tl, bl);

        return Math.min(width, height) * 0.5;
    }

    private _getCornerRadiusValue(): number {
        const node = this.getNode();

        if (!node) {
            return 0;
        }

        const radius = node.getCornerRadius();

        switch (this._axis) {
            case "tl":
                return radius.tl;
            case "tr":
                return radius.tr;
            case "br":
                return radius.br;
            case "bl":
                return radius.bl;
            default:
                return 0;
        }
    }

    private _getSectionDiagonalPoint(section: CornerRadiusSection): Point {
        return {
            x: section.xAxisPoint.x + section.yAxisPoint.x - section.origin.x,
            y: section.xAxisPoint.y + section.yAxisPoint.y - section.origin.y,
        };
    }

    private _createSection(
        origin: Point,
        xTarget: Point,
        yTarget: Point,
        sectionSize: number,
    ): CornerRadiusSection {
        const dirX = this._normalize({
            x: xTarget.x - origin.x,
            y: xTarget.y - origin.y,
        });

        const dirY = this._normalize({
            x: yTarget.x - origin.x,
            y: yTarget.y - origin.y,
        });

        const inset = this._getInset();

        const insetOrigin = {
            x: origin.x + dirX.x * inset + dirY.x * inset,
            y: origin.y + dirX.y * inset + dirY.y * inset,
        };

        const insetSectionSize = Math.max(0, sectionSize - inset);

        return {
            axis: this._axis,
            origin: insetOrigin,
            xAxisPoint: {
                x: insetOrigin.x + dirX.x * insetSectionSize,
                y: insetOrigin.y + dirX.y * insetSectionSize,
            },
            yAxisPoint: {
                x: insetOrigin.x + dirY.x * insetSectionSize,
                y: insetOrigin.y + dirY.y * insetSectionSize,
            },
            inset,
            width: insetSectionSize,
            height: insetSectionSize,
        };
    }

    private _getSectionMaxRadius(section: CornerRadiusSection): number {
        return Math.max(0, Math.min(section.width, section.height) + section.inset);
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

    private _resolveAxis(direction: Direction): CornerRadiusAxis {
        switch (direction) {
            case Direction.NE:
                return "tr";
            case Direction.SE:
                return "br";
            case Direction.SW:
                return "bl";
            default:
                return "tl";
        }
    }

    private _resolveSectionBounds(direction: Direction): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    } {
        switch (direction) {
            case Direction.NE:
                return { minX: 0.5, maxX: 1, minY: 0, maxY: 0.5 };
            case Direction.SE:
                return { minX: 0.5, maxX: 1, minY: 0.5, maxY: 1 };
            case Direction.SW:
                return { minX: 0, maxX: 0.5, minY: 0.5, maxY: 1 };
            default:
                return { minX: 0, maxX: 0.5, minY: 0, maxY: 0.5 };
        }
    }

    private _clampPositionToSection(value: Point): Point {
        return {
            x: Math.min(
                this._sectionBounds.maxX,
                Math.max(this._sectionBounds.minX, value.x),
            ),
            y: Math.min(
                this._sectionBounds.maxY,
                Math.max(this._sectionBounds.minY, value.y),
            ),
        };
    }
}
