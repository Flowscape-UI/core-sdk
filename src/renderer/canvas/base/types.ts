import Konva from "konva";
import type { INode } from "../../../nodes";



export interface INodeCanvasRenderer<
    TNode extends INode = INode,
    TView extends Konva.Group = Konva.Group
> {
    /**
     * Creates a Konva view for the node.
     *
     * Создаёт Konva-представление для ноды.
     */
    create(node: TNode): TView;

    /**
     * Updates the Konva view from the node state.
     *
     * Обновляет Konva-представление на основе состояния ноды.
     */
    update(node: TNode, view: TView): void;

    /**
     * Optional cleanup hook before the view is destroyed.
     *
     * Необязательный хук очистки перед уничтожением представления.
     */
    destroy?(node: TNode, view: TView): void;
}