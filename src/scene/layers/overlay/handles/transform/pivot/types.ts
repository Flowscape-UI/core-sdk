import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { ILayerOverlayHandle } from "../../types";

export interface IHandleTransformPivot extends ILayerOverlayHandle {
    /**
     * Returns true if pivot handle has node.
     *
     * Возвращает true, если pivot-хендлер имеет ноду.
     */
    hasNode(): boolean;

    /**
     * Returns pivot node.
     *
     * Возвращает ноду pivot-хендлера.
     */
    getNode(): IShapeBase | null;

    /**
     * Returns pivot node id.
     *
     * Возвращает id ноды pivot-хендлера.
     */
    getNodeId(): ID | null;

    /**
     * Sets pivot node.
     *
     * Устанавливает ноду pivot-хендлера.
     */
    setNode(node: IShapeBase): void;

    /**
     * Clears pivot node.
     *
     * Очищает ноду pivot-хендлера.
     */
    clearNode(): void;

    /**
     * Returns transform OBB corners in world space.
     *
     * Возвращает углы transform OBB в мировых координатах.
     */
    getObbCorners(): readonly Point[];

    /**
     * Returns pivot point in world space.
     *
     * Возвращает pivot-точку в мировых координатах.
     */
    getPivotWorldPoint(): Point | null;
}