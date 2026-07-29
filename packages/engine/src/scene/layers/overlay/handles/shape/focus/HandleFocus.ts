import { HandleBase, HandleDebugDrawType, HandleType } from "../../base";
import type { IHandleFocus } from "./types";

export class HandleFocus extends HandleBase implements IHandleFocus {
    constructor() {
        const defaultColor = "#4DA3FF";
        super(HandleType.Focus);

        // Basic style
        super.setStrokeFill(defaultColor);
        super.setStrokeWidth(2);
        super.setFill("rgba(0,0,0,0)");

        // Debug style
        super.setDebugFill(defaultColor);
        super.setDebugStrokeWidth(2);
        super.setDebugOpacity(0.5);
        super.setDebugStrokeFill(defaultColor);
        super.setDebugFillType(HandleDebugDrawType.Dashed);
        super.setDebugStrokeType(HandleDebugDrawType.Solid);
    }
}
