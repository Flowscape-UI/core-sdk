import { HandleBase, HandleDebugDrawType, HandleType } from "../../base";
import type { IHandleHover } from "./types";

export class HandleHover extends HandleBase implements IHandleHover {
    constructor() {
        const defaultColor = "#4DA3FF";
        super(HandleType.Hover);

        // Basic style
        super.setStrokeFill(defaultColor);
        super.setStrokeWidth(3);
        super.setFill("rgba(0,0,0,0)");

        // Debug style
        super.setDebugFill(defaultColor);
        super.setDebugStrokeWidth(3);
        super.setDebugOpacity(0.5);
        super.setDebugStrokeFill(defaultColor);
        super.setDebugFillType(HandleDebugDrawType.Dashed);
        super.setDebugStrokeType(HandleDebugDrawType.Solid);
    }
}
