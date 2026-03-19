import type { INode, NodeType } from "../../../../nodes";
import type { INodeCanvasRenderer } from "./types";

export class RendererCanvasRegistry {
    private readonly _renderers = new Map<NodeType, INodeCanvasRenderer>();

    /**
     * Registers a canvas renderer for the specified node type.
     *
     * Регистрирует canvas-рендерер для указанного типа ноды.
     */
    public register<TNode extends INode>(
        type: NodeType,
        renderer: INodeCanvasRenderer<TNode>
    ): void {
        if (this._renderers.has(type)) {
            throw new Error(`Renderer for node type "${type}" is already registered.`);
        }

        this._renderers.set(type, renderer as INodeCanvasRenderer);
    }

    /**
     * Returns the renderer associated with the specified node type.
     *
     * Возвращает рендерер, связанный с указанным типом ноды.
     */
    public get<TNode extends INode>(
        type: NodeType
    ): INodeCanvasRenderer<TNode> | undefined {
        return this._renderers.get(type) as INodeCanvasRenderer<TNode> | undefined;
    }

    /**
     * Returns the renderer associated with the specified node type
     * or throws an error if it is not registered.
     *
     * Возвращает рендерер для указанного типа ноды
     * или выбрасывает ошибку, если он не зарегистрирован.
     */
    public getOrThrow<TNode extends INode>(
        type: NodeType
    ): INodeCanvasRenderer<TNode> {
        const renderer = this.get<TNode>(type);

        if (!renderer) {
            throw new Error(`Renderer for node type "${type}" is not registered.`);
        }

        return renderer;
    }

    /**
     * Returns true if a renderer is registered for the specified node type.
     *
     * Возвращает true, если для указанного типа ноды зарегистрирован рендерер.
     */
    public has(type: NodeType): boolean {
        return this._renderers.has(type);
    }

    /**
     * Removes the renderer associated with the specified node type.
     *
     * Удаляет рендерер, связанный с указанным типом ноды.
     */
    public remove(type: NodeType): boolean {
        return this._renderers.delete(type);
    }

    /**
     * Removes all registered renderers.
     *
     * Удаляет все зарегистрированные рендереры.
     */
    public clear(): void {
        this._renderers.clear();
    }
}