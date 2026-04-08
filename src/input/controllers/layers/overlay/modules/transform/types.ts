import type { Point } from "../../../../../../core/camera";
import type { IAttachable, IDestroyable, IUpdatable, IWithId } from "../../../../../../core/interfaces";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { OverlayInputContext } from "../../LayerOverlayInputController";

export interface IOverlayTransformSubModule extends IWithId, IAttachable<OverlayInputContext>, IUpdatable, IDestroyable {
    hitTest(screenPoint: Point): boolean;
    tryBegin(screenPoint: Point): boolean;
    isActive(): boolean;

    hasNode(): boolean;
    getNodeId(): ID | null;
    setNode(node: IShapeBase): void;
    clearNode(): void;
}