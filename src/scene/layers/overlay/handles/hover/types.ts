import type { ID, IShapeBase } from "../../../../../../nodes";
import type { ILayerOverlayHandle } from "../types";


/**
 * Hover handle interface.
 *
 * Интерфейс hover-хендлера.
 */
export interface IHandleHover extends ILayerOverlayHandle {
    /**
     * Returns hovered node.
     *
     * Возвращает hover-ноду.
     */
    getNode(): IShapeBase | null;

    /**
     * Returns hovered node id.
     *
     * Возвращает id hover-ноды.
     */
    getNodeId(): ID | null;

    /**
     * Returns true if hovered node exists.
     *
     * Возвращает true, если hover-нода существует.
     */
    hasNode(): boolean;

    /**
     * Sets hovered node.
     *
     * Устанавливает hover-ноду.
     */
    setNode(node: IShapeBase | null): void;

    /**
     * Clears hovered node.
     *
     * Очищает hover-ноду.
     */
    clearNode(): void;
}