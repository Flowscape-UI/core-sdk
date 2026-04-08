import type { ID } from "../../../core/types";
import type { IShapeBase } from "../../../nodes";
import type { ILayerBase } from "../base";
import type { ILayerOverlayHandleManager } from "./handles";

export interface ILayerOverlay extends ILayerBase {
    /**
     * Returns the currently hovered node.
     *
     * Возвращает текущую hover-ноду.
     */
    getHoveredNode(): IShapeBase | null;

    /**
     * Returns the hovered node id.
     *
     * Возвращает id hover-ноды.
     */
    getHoveredNodeId(): ID | null;

    /**
     * Sets the currently hovered node.
     *
     * Устанавливает текущую hover-ноду.
     */
    setHoveredNode(node: IShapeBase | null): void;

    /**
     * Clears hovered node.
     *
     * Очищает hover-ноду.
     */
    clearHoveredNode(): void;

    /**
     * Returns selected nodes.
     *
     * Возвращает выбранные ноды.
     */
    getSelectedNodes(): IShapeBase[];

    /**
     * Returns selected node ids.
     *
     * Возвращает id выбранных нод.
     */
    getSelectedNodeIds(): ID[];

    /**
     * Returns true if node is selected.
     *
     * Возвращает true, если нода выбрана.
     */
    isNodeSelected(id: ID): boolean;

    /**
     * Replaces selected nodes.
     *
     * Заменяет текущий список выбранных нод.
     */
    setSelectedNodes(nodes: IShapeBase[]): void;

    /**
     * Adds node to selection.
     *
     * Добавляет ноду в selection.
     */
    addSelectedNode(node: IShapeBase): boolean;

    /**
     * Removes node from selection.
     *
     * Удаляет ноду из selection.
     */
    removeSelectedNode(id: ID): boolean;

    /**
     * Clears selected nodes.
     *
     * Очищает selection.
     */
    clearSelectedNodes(): void;

    /**
     * Returns overlay handler manager.
     *
     * Возвращает менеджер overlay-хендлеров.
     */
    getHandlerManager(): ILayerOverlayHandleManager;

    /**
     * Clears overlay runtime state.
     *
     * Очищает runtime-состояние overlay.
     */
    clear(): void;
}