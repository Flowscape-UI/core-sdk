import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
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

    getPivotWorldPoint(): Point | null;
}