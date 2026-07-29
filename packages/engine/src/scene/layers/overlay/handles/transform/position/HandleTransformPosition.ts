import { HandleBase, HandleType } from "../../base";
import type { IHandleTransformPosition } from "./types";

export class HandleTransformPosition extends HandleBase implements IHandleTransformPosition {
    constructor() {
        super(HandleType.TransformPosition);
    }

    public override setNode(value: Parameters<HandleBase["setNode"]>[0]): boolean {
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
            this.setOffset({ x: 0, y: 0 });
            return;
        }

        const obb = node.getWorldViewOBB();

        this.setSize(obb.width, obb.height);
        this.setHitSize(obb.width, obb.height);
        this.setOffset({
            x: obb.width * 0.5,
            y: obb.height * 0.5,
        });
    }
}