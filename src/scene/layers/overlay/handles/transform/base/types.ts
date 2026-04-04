import type { ID, IShapeBase } from "../../../../../../../nodes";
import type { Point } from "../../../../../../camera";
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