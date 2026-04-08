import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { IHandleTransformPivot } from "./types";

export class HandleTransformPivot implements IHandleTransformPivot {
    public static readonly TYPE = "transform-pivot";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = false;
        this._node = null;
    }

    public getType(): string {
        return HandleTransformPivot.TYPE;
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

    public getPivotWorldPoint(): Point | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const node = this._node;
        const matrix = node.getWorldMatrix();

        const pivot = node.getPivot();
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

    public clear(): void {
        this.clearNode();
    }

    public destroy(): void {
        this.clearNode();
    }
}