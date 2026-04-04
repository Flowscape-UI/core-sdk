import type { ID, IShapeBase } from "../../../../../../../nodes";
import type { Point } from "../../../../../../camera";
import type { ILayerOverlayHandle } from "../../types";

export type TransformRotateAxis =
    | "ne"
    | "nw"
    | "se"
    | "sw";

export interface IHandleTransformRotate extends ILayerOverlayHandle {
    hasNode(): boolean;
    getNode(): IShapeBase | null;
    getNodeId(): ID | null;

    setNode(node: IShapeBase): void;
    clearNode(): void;

    getAvailableAxes(): readonly TransformRotateAxis[];
    getObbCorners(): readonly Point[];
    getHandleWorldPoint(axis: TransformRotateAxis): Point | null;
}