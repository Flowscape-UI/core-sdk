import { Direction } from "../../../../../../core";
import { HandleBase, HandleType } from "../../base";
import type { IHandleTransformRotate } from "./types";

export class HandleTransformRotate extends HandleBase implements IHandleTransformRotate {
    constructor(direction: Direction) {
        const size = 46;

        super(HandleType.TransformRotate);

        super.setFill("#FFFFFF00");
        super.setStrokeFill("#4DA3FF00");
        super.setSize(size, size);
        super.setHitSize(size, size);
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
