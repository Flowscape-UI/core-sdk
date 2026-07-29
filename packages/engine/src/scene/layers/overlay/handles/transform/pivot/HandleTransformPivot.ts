
import { FLOAT32_MAX, MathF32 } from "../../../../../../core";
import { HandleBase, HandleType } from "../../base";
import type { IHandleTransformPivot } from "./types";
import type { IShapeBase } from "../../../../../../nodes";

export class HandleTransformPivot extends HandleBase implements IHandleTransformPivot {
    constructor() {
        const size = 8;
        super(HandleType.TransformPivot);
        super.setSize(size, size);
        super.setHitSize(size, size);
        super.setFill("#FFFFFF");
        super.setStrokeFill("#4DA3FF");
        super.setStrokeWidth(1);
        super.setOffset({
            x: size * 0.5,
            y: size * 0.5,
        });
    }

    public override setNode(value: IShapeBase | null): boolean {
        const changed = super.setNode(value);

        if (!value) {
            return changed;
        }

        this.setPosition(value.getPivot());

        return changed;
    }

    protected override _normalizePositionX(value: number): number {
        return MathF32.clamp(value, -FLOAT32_MAX, FLOAT32_MAX);
    }

    protected override _normalizePositionY(value: number): number {
        return MathF32.clamp(value, -FLOAT32_MAX, FLOAT32_MAX);
    }
}
