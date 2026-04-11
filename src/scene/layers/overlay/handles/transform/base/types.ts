
import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { ILayerOverlayHandle } from "../../types";

export interface IHandleTransform extends ILayerOverlayHandle {
    hasNode(): boolean;
    getNode(): IShapeBase | null;
    getNodeId(): ID | null;

    setNode(node: IShapeBase): void;
    clearNode(): void;

    getObbCorners(): readonly Point[];
    containsPoint(point: Point): boolean;
}