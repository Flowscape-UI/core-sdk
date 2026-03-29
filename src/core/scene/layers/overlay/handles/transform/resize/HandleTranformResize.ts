import type { ID, IShapeBase } from "../../../../../../../nodes";
import type { Point } from "../../../../../../camera";
import type {
    IHandleTransformResize,
    TransformResizeAxis,
} from "./types";

const ALL_AXES: readonly TransformResizeAxis[] = [
    "n",
    "e",
    "s",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
];

export class HandleTransformResize implements IHandleTransformResize {
    public static readonly TYPE = "transform-resize";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = false;
        this._node = null;
    }

    public getType(): string {
        return HandleTransformResize.TYPE;
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

    public getAvailableAxes(): readonly TransformResizeAxis[] {
        return ALL_AXES;
    }

    public getHandleWorldPoint(axis: TransformResizeAxis): Point | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return null;
        }

        const [tl, tr, br, bl] = corners;

        switch (axis) {
            case "nw":
                return tl;
            case "ne":
                return tr;
            case "se":
                return br;
            case "sw":
                return bl;
            case "n":
                return this._getMidpoint(tl, tr);
            case "e":
                return this._getMidpoint(tr, br);
            case "s":
                return this._getMidpoint(bl, br);
            case "w":
                return this._getMidpoint(tl, bl);
            default:
                return null;
        }
    }

    public getEdgeWorldPoints(axis: "n" | "e" | "s" | "w"): readonly [Point, Point] | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        const corners = this._node.getWorldViewCorners();

        if (corners.length < 4) {
            return null;
        }

        const [tl, tr, br, bl] = corners;

        switch (axis) {
            case "n":
                return [tl, tr];
            case "e":
                return [tr, br];
            case "s":
                return [bl, br];
            case "w":
                return [tl, bl];
            default:
                return null;
        }
    }

    public hitTestAxis(_point: Point): TransformResizeAxis | null {
        if (!this._enabled || !this._node) {
            return null;
        }

        return null;
    }

    public clear(): void {
        this.clearNode();
    }

    public destroy(): void {
        this.clearNode();
    }

    private _getMidpoint(a: Point, b: Point): Point {
        return {
            x: (a.x + b.x) * 0.5,
            y: (a.y + b.y) * 0.5,
        };
    }
    
}