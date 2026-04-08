import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type {
    IHandleTransformRotate,
    TransformRotateAxis,
} from "./types";

const ALL_AXES: readonly TransformRotateAxis[] = ["ne", "nw", "se", "sw"];

export class HandleTransformRotate implements IHandleTransformRotate {
    public static readonly TYPE = "transform-rotate";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = false;
        this._node = null;
    }

    public getType(): string {
        return HandleTransformRotate.TYPE;
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

    public getPivotWorldPoint(): Point | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const node = this._node;
        const matrix = node.getWorldMatrix();

        const pivot = node.getPivot();   // normalized 0..1
        const width = node.getWidth();
        const height = node.getHeight();

        const localPivot = {
            x: pivot.x * width,
            y: pivot.y * height,
        };

        return {
            x: matrix.a * localPivot.x + matrix.c * localPivot.y + matrix.tx,
            y: matrix.b * localPivot.x + matrix.d * localPivot.y + matrix.ty,
        };
    }

    public setNode(node: IShapeBase): void {
        this._node = node;
        this._enabled = true;
    }

    public clearNode(): void {
        this._node = null;
        this._enabled = false;
    }

    public getAvailableAxes(): readonly TransformRotateAxis[] {
        return ALL_AXES;
    }

    public getObbCorners(): readonly Point[] {
        if (!this._node) {
            return [];
        }

        return this._node.getWorldViewCorners();
    }

    public getHandleWorldPoint(axis: TransformRotateAxis): Point | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return null;
        }

        const [tl, tr, br, bl] = corners;

        const xAxis = this._normalize({
            x: tr.x - tl.x,
            y: tr.y - tl.y,
        });

        const yAxis = this._normalize({
            x: bl.x - tl.x,
            y: bl.y - tl.y,
        });

        const offset = 0;

        switch (axis) {
            case "nw":
                return this._addPoints(
                    tl,
                    this._addPoints(
                        this._scalePoint(xAxis, -offset),
                        this._scalePoint(yAxis, -offset),
                    ),
                );

            case "ne":
                return this._addPoints(
                    tr,
                    this._addPoints(
                        this._scalePoint(xAxis, offset),
                        this._scalePoint(yAxis, -offset),
                    ),
                );

            case "se":
                return this._addPoints(
                    br,
                    this._addPoints(
                        this._scalePoint(xAxis, offset),
                        this._scalePoint(yAxis, offset),
                    ),
                );

            case "sw":
                return this._addPoints(
                    bl,
                    this._addPoints(
                        this._scalePoint(xAxis, -offset),
                        this._scalePoint(yAxis, offset),
                    ),
                );

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

    private _addPoints(a: Point, b: Point): Point {
        return {
            x: a.x + b.x,
            y: a.y + b.y,
        };
    }

    private _scalePoint(point: Point, scale: number): Point {
        return {
            x: point.x * scale,
            y: point.y * scale,
        };
    }

    private _normalize(point: Point): Point {
        const length = Math.hypot(point.x, point.y);

        if (length === 0) {
            return { x: 0, y: 0 };
        }

        return {
            x: point.x / length,
            y: point.y / length,
        };
    }
}