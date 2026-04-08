import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { IHandleTransformPosition } from "./types";

export class HandleTransformPosition implements IHandleTransformPosition {
    public static readonly TYPE = "transform-position";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = false;
        this._node = null;
    }

    public getType(): string {
        return HandleTransformPosition.TYPE;
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

    public getObbCorners(): readonly Point[] {
        if (!this._node) {
            return [];
        }

        return this._node.getWorldViewCorners();
    }

    public containsPoint(point: Point): boolean {
        if (!this._enabled || !this._node) {
            return false;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return false;
        }

        const [tl, tr, br, bl] = corners;

        const xAxis = this._normalize(this._subtractPoints(tr, tl));
        const yAxis = this._normalize(this._subtractPoints(bl, tl));

        const width = this._distance(tl, tr);
        const height = this._distance(tl, bl);

        const local = this._subtractPoints(point, tl);

        const px = this._dot(local, xAxis);
        const py = this._dot(local, yAxis);

        return px >= 0 && px <= width && py >= 0 && py <= height;
    }

    public clear(): void {
        this.clearNode();
    }

    public destroy(): void {
        this.clearNode();
    }

    private _subtractPoints(a: Point, b: Point): Point {
        return {
            x: a.x - b.x,
            y: a.y - b.y,
        };
    }

    private _dot(a: Point, b: Point): number {
        return a.x * b.x + a.y * b.y;
    }

    private _distance(a: Point, b: Point): number {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    private _normalize(v: Point): Point {
        const length = Math.hypot(v.x, v.y);

        if (length === 0) {
            return { x: 0, y: 0 };
        }

        return {
            x: v.x / length,
            y: v.y / length,
        };
    }
}