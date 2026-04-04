

import type { Point } from "../../../../../core/camera";
import type { ID, IShapeBase } from "../../../../../nodes";
import type {
    CornerRadiusAxis,
    CornerRadiusHandlePointMap,
    CornerRadiusSection,
    IHandleCornerRadius,
} from "./types";

const ALL_AXES: readonly CornerRadiusAxis[] = ["tl", "tr", "br", "bl"];
const DEFAULT_INSET = 10;

export class HandleCornerRadius implements IHandleCornerRadius {
    public static readonly TYPE = "corner-radius";

    private _enabled: boolean;
    private _node: IShapeBase | null;
    private _inset: number;
    private _debugEnabled: boolean = false;

    constructor() {
        this._enabled = false;
        this._node = null;
        this._inset = DEFAULT_INSET;
    }

    public isDebugEnabled(): boolean {
        return this._debugEnabled;
    }

    public setDebugEnabled(value: boolean): void {
        this._debugEnabled = value;
    }

    public getType(): string {
        return HandleCornerRadius.TYPE;
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
    }

    public hasNode(): boolean {
        return this._node !== null;
    }

    public getNode(): IShapeBase | null {
        return this._node;
    }

    public getNodeId(): ID | null {
        return this._node?.id ?? null;
    }

    public setNode(node: IShapeBase): void {
        this._node = node;
        this._enabled = true;
    }

    public clearNode(): void {
        this._node = null;
        this._enabled = false;
    }

    public getAvailableAxes(): readonly CornerRadiusAxis[] {
        return ALL_AXES;
    }

    public getHandleWorldPoint(axis: CornerRadiusAxis): Point | null {
        const section = this.getSection(axis);

        if (!section) {
            return null;
        }

        const diagonalEnd = this._getSectionDiagonalPoint(section);
        const diagonalVector = {
            x: diagonalEnd.x - section.origin.x,
            y: diagonalEnd.y - section.origin.y,
        };

        const diagonalLength = Math.hypot(diagonalVector.x, diagonalVector.y);

        if (diagonalLength <= 0.000001) {
            return section.origin;
        }

        const value = this._getCornerRadiusValue(axis);
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

    public getHandleWorldPoints(): CornerRadiusHandlePointMap | null {
        const tl = this.getHandleWorldPoint("tl");
        const tr = this.getHandleWorldPoint("tr");
        const br = this.getHandleWorldPoint("br");
        const bl = this.getHandleWorldPoint("bl");

        if (!tl || !tr || !br || !bl) {
            return null;
        }

        return { tl, tr, br, bl };
    }

    public getSection(axis: CornerRadiusAxis): CornerRadiusSection | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return null;
        }

        const [tl, tr, br, bl] = corners;
        const sectionSize = this._getSectionSize();

        switch (axis) {
            case "tl":
                return this._createSection(axis, tl, tr, bl, sectionSize);

            case "tr":
                return this._createSection(axis, tr, tl, br, sectionSize);

            case "br":
                return this._createSection(axis, br, bl, tr, sectionSize);

            case "bl":
                return this._createSection(axis, bl, br, tl, sectionSize);

            default:
                return null;
        }
    }

    public clear(): void {
        this.clearNode();
    }

    public destroy(): void {
        this.clearNode();
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
        if (!this._enabled || !this._node) {
            return 0;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return 0;
        }

        const [tl, tr, br, bl] = corners;

        const width = this._getDistance(tl, tr);
        const height = this._getDistance(tl, bl);

        return Math.min(width, height) * 0.5;
    }

    private _getCornerRadiusValue(axis: CornerRadiusAxis): number {
        if (!this._node) {
            return 0;
        }

        const radius = this._node.getCornerRadius();

        switch (axis) {
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
        axis: CornerRadiusAxis,
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

        const insetOrigin = {
            x: origin.x + dirX.x * this._inset + dirY.x * this._inset,
            y: origin.y + dirX.y * this._inset + dirY.y * this._inset,
        };

        const insetSectionSize = Math.max(0, sectionSize - this._inset);

        return {
            axis,
            origin: insetOrigin,
            xAxisPoint: {
                x: insetOrigin.x + dirX.x * insetSectionSize,
                y: insetOrigin.y + dirX.y * insetSectionSize,
            },
            yAxisPoint: {
                x: insetOrigin.x + dirY.x * insetSectionSize,
                y: insetOrigin.y + dirY.y * insetSectionSize,
            },
            inset: this._inset,
            width: insetSectionSize,
            height: insetSectionSize,
        };
    }

    private _getSectionMaxRadius(section: CornerRadiusSection): number {
        return Math.max(0, Math.min(section.width, section.height) + section.inset);
    }
}