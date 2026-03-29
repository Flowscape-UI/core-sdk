import type { ID, IShapeBase } from "../../../../../../../nodes";
import type { Point } from "../../../../../../camera";
import type { ILayerOverlayHandle } from "../../types";

export interface IHandleTransformPosition extends ILayerOverlayHandle {
    /**
     * Returns true if position handle has node.
     *
     * Возвращает true, если position-хендлер имеет ноду.
     */
    hasNode(): boolean;

    /**
     * Returns position node.
     *
     * Возвращает ноду position-хендлера.
     */
    getNode(): IShapeBase | null;

    /**
     * Returns position node id.
     *
     * Возвращает id ноды position-хендлера.
     */
    getNodeId(): ID | null;

    /**
     * Sets position node.
     *
     * Устанавливает ноду position-хендлера.
     */
    setNode(node: IShapeBase): void;

    /**
     * Clears position node.
     *
     * Очищает ноду position-хендлера.
     */
    clearNode(): void;

    /**
     * Returns transform OBB corners in world space.
     *
     * Возвращает углы transform OBB в мировых координатах.
     */
    getObbCorners(): readonly Point[];

    /**
     * Checks whether world point is inside transform position bounds.
     *
     * Проверяет, находится ли мировая точка внутри bounds position-хендлера.
     */
    containsPoint(point: Point): boolean;
}