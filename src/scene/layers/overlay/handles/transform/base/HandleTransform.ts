import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { IHandleTransform } from "./types";

export class HandleTransform implements IHandleTransform {
    public static readonly TYPE = "transform";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = false;
        this._node = null;
    }

    public getType(): string {
        return HandleTransform.TYPE;
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

        return this._node.hitTest(point);
    }

    public clear(): void {
        this.clearNode();
    }

    public destroy(): void {
        this.clearNode();
    }
}