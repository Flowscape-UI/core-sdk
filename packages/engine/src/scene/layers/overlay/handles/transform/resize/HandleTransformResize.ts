import { HandleBase, HandleType } from "../../base";
import type { IShapeBase } from "../../../../../../nodes";
import type {
    IHandleTransformResizeEdge,
    IHandleTransformResizeVertex,
} from "./types";
import { Direction } from "../../../../../../core";

export class HandleTransformResizeEdge extends HandleBase implements IHandleTransformResizeEdge {
    private static readonly HIT_STROKE = 24;
    public readonly direction: Direction;

    constructor(direction: Direction) {
        super(HandleType.TransformResize);
        this.direction = direction;

        super.setFill("rgba(0,0,0,0)");
        super.setStrokeFill("#4DA3FF");
        super.setStrokeWidth(2);

        switch (direction) {
            case Direction.E:
                super.setPosition({ x: 1, y: 0.5 });
                break;
            case Direction.S:
                super.setPosition({ x: 0.5, y: 1 });
                break;
            case Direction.W:
                super.setPosition({ x: 0, y: 0.5 });
                break;
            default:
                super.setPosition({ x: 0.5, y: 0 });
                break;
        }
    }

    public override setNode(value: IShapeBase | null): boolean {
        const changed = super.setNode(value);
        this._syncSizeFromNodeObb();
        return changed;
    }

    public override clearNode(): void {
        super.clearNode();
        this.setSize(0, 0);
        this.setHitSize(0, 0);
        this.setOffset({ x: 0, y: 0 });
    }

    private _syncSizeFromNodeObb(): void {
        const node = this.getNode();
        if (!node) {
            this.setSize(0, 0);
            this.setHitSize(0, 0);
            this.setOffset({x: 0, y: 0});
            return;
        }

        const obb = node.getWorldViewOBB();
        const stroke = Math.max(1, this.getStrokeWidth());

        if (this.direction === "n" || this.direction === "s") {
            this.setSize(obb.width, stroke);
            this.setHitSize(obb.width, HandleTransformResizeEdge.HIT_STROKE);
            this.setOffset({
                x: obb.width * 0.5,
                y: stroke * 0.5,
            });
            return;
        }

        this.setSize(stroke, obb.height);
        this.setHitSize(HandleTransformResizeEdge.HIT_STROKE, obb.height);
        this.setOffset({
            x: stroke * 0.5,
            y: obb.height * 0.5,
        });
    }
}

export class HandleTransformResizeVertex extends HandleBase implements IHandleTransformResizeVertex {
    public readonly direction: Direction;

    constructor(direction: Direction) {
        const size = 10;
        super(HandleType.TransformResize);
        this.direction = direction;

        super.setFill("#FFFFFF");
        super.setStrokeFill("#4DA3FF");
        super.setStrokeWidth(2);
        super.setSize(
            size,
            size,
        );
        super.setHitSize(
            size,
            size,
        );
        super.setOffset({
            x: size * 0.5,
            y: size * 0.5,
        });

        switch (direction) {
            case Direction.NE:
                super.setPosition({ x: 1, y: 0 });
                break;
            case Direction.SE:
                super.setPosition({ x: 1, y: 1 });
                break;
            case Direction.SW:
                super.setPosition({ x: 0, y: 1 });
                break;
            default:
                super.setPosition({ x: 0, y: 0 });
                break;
        }
    }
}