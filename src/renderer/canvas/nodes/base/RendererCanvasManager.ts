import Konva from "konva";

import type { INode, Rect } from "../../../../nodes";
import { RendererCanvasRegistry } from "./RendererCanvasRegistry";
import type { ID } from "../../../../core";

export class RendererCanvasManager {
    private readonly _registry: RendererCanvasRegistry;
    private readonly _contentRoot: Konva.Group;
    private readonly _mounted = new Map<ID, Konva.Group>();

    constructor(
        registry: RendererCanvasRegistry,
        contentRoot: Konva.Group
    ) {
        this._registry = registry;
        this._contentRoot = contentRoot;
    }

    /**
     * Synchronizes a node tree.
     *
     * Синхронизирует дерево нод.
     */
    public renderNodes(
        nodes: readonly INode[],
        viewport: Rect
    ): void {
        const visited = new Set<ID>();

        for (const node of nodes) {
            this._renderNode(node, this._contentRoot, visited, viewport);
        }

        this._cleanupUnmounted(visited);
    }

    /**
     * Removes the mounted view associated with the specified node
     * and all of its descendants.
     *
     * Удаляет примонтированное представление указанной ноды
     * и всех её потомков.
     */
    public removeNode(node: INode): void {
        this._unmountNodeRecursive(node);
    }

    /**
     * Removes all mounted views.
     *
     * Удаляет все примонтированные представления.
     */
    public clear(): void {
        for (const [id, view] of this._mounted) {
            view.destroy();
            this._mounted.delete(id);
        }
    }

    /**
     * Returns the mounted Konva view for the specified node, if it exists.
     *
     * Возвращает примонтированное Konva-представление для указанной ноды, если оно существует.
     */
    public getMountedView(node: INode): Konva.Group | undefined {
        return this._mounted.get(node.id);
    }

    /****************************************************************/
    /*                            PRIVATE                           */
    /****************************************************************/

    private _renderNode(
        node: INode,
        parentContainer: Konva.Group,
        visited: Set<ID>,
        viewport: Rect,
    ): void {
        if (!node.isVisibleInHierarchy()) {
            this._unmountNodeRecursive(node);
            return;
        }

        const bounds = node.getHierarchyWorldAABB();

        if (!this._intersectsAabb(bounds, viewport)) {
            this._unmountNodeRecursive(node);
            return;
        }

        visited.add(node.id);


        const renderer = this._registry.get(node.type);
        let currentContainer = parentContainer;

        if (renderer) {
            let view = this._mounted.get(node.id);

            if (!view) {
                view = renderer.create(node);
                this._mounted.set(node.id, view);
            }

            if (view.getParent() !== parentContainer) {
                view.remove();
                parentContainer.add(view);
            }

            renderer.update(node, view);
            currentContainer = view;
        }

        for (const child of node.getChildren()) {
            this._renderNode(child, currentContainer, visited, viewport);
        }
    }

    private _cleanupUnmounted(visited: Set<ID>): void {
        for (const [id, view] of this._mounted) {
            if (visited.has(id)) {
                continue;
            }

            view.destroy();
            this._mounted.delete(id);
        }
    }

    private _unmountNodeRecursive(node: INode): void {
        for (const child of node.getChildren()) {
            this._unmountNodeRecursive(child);
        }

        const mounted = this._mounted.get(node.id);

        if (!mounted) {
            return;
        }

        mounted.destroy();
        this._mounted.delete(node.id);
    }

    private _intersectsAabb(a: Rect, b: Rect): boolean {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }
}