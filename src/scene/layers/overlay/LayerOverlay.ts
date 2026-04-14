
import { LayerBase, LayerType } from "../base";
import type { ILayerOverlay } from "./types";

import {
    LayerOverlayFreeHandlesManager,
    LayerOverlayShapeHandlesManager,
    LayerOverlayTransformHandlesManager,
    LayerOverlayHandleManager,
    type IHandleHover,
} from "./handles";
import type { IShapeBase } from "../../../nodes";
import { type ID } from "../../../core/types";
import type { ILayerWorld } from "../world";

export class LayerOverlay extends LayerBase implements ILayerOverlay {
    public readonly layerWorld: ILayerWorld;
    public readonly handleManager: LayerOverlayHandleManager;
    public readonly freeHandleManager: LayerOverlayFreeHandlesManager;
    public readonly shapeHandleManager: LayerOverlayShapeHandlesManager;
    public readonly transformHandleManager: LayerOverlayTransformHandlesManager;
    private readonly _selectedNodes: IShapeBase[];

    constructor(world: ILayerWorld) {
        super(LayerType.Overlay, 2);
        this.layerWorld = world;
        this._selectedNodes = [];

        this.handleManager = new LayerOverlayHandleManager();
        this.freeHandleManager = new LayerOverlayFreeHandlesManager();
        this.shapeHandleManager = new LayerOverlayShapeHandlesManager();
        this.transformHandleManager = new LayerOverlayTransformHandlesManager();
        this.freeHandleManager.registerTo(this.handleManager);
        this.shapeHandleManager.registerTo(this.handleManager);
        this.transformHandleManager.registerTo(this.handleManager);
    }

    /*****************************************************************/
    /*                            Hover                              */
    /*****************************************************************/

    public getHoveredNode(): IShapeBase | null {
        return this._getHoverHandle().getNode();
    }

    public getHoveredNodeId(): ID | null {
        return this._getHoverHandle().getNode()?.id ?? null;
    }

    public setHoveredNode(node: IShapeBase | null): void {
        const handle = this._getHoverHandle();
        const currentNodeId = handle.getNode()?.id ?? null;

        if (currentNodeId === (node?.id ?? null)) {
            return;
        }

        if (node) {
            handle.setNode(node);
            handle.setEnabled(true);
        } else {
            handle.clearNode();
            handle.setEnabled(false);
        }
    }

    public clearHoveredNode(): void {
        const handle = this._getHoverHandle();

        if (!handle.hasNode()) {
            return;
        }

        handle.clearNode();
        handle.setEnabled(false);
    }


    /*****************************************************************/
    /*                          Selection                            */
    /*****************************************************************/
    public getSelectedNodes(): IShapeBase[] {
        return [...this._selectedNodes];
    }

    public getSelectedNodeIds(): ID[] {
        return this._selectedNodes.map((node) => node.id);
    }

    public isNodeSelected(id: ID): boolean {
        return this._selectedNodes.some((node) => node.id === id);
    }

    public setSelectedNodes(nodes: IShapeBase[]): void {
        this._selectedNodes.length = 0;

        for (const node of nodes) {
            const exists = this._selectedNodes.some((item) => item.id === node.id);

            if (exists) {
                continue;
            }

            this._selectedNodes.push(node);
        }
    }

    public addSelectedNode(node: IShapeBase): boolean {
        const exists = this._selectedNodes.some((item) => item.id === node.id);

        if (exists) {
            return false;
        }

        this._selectedNodes.push(node);
        return true;
    }

    public removeSelectedNode(id: ID): boolean {
        const index = this._selectedNodes.findIndex((node) => node.id === id);

        if (index === -1) {
            return false;
        }

        this._selectedNodes.splice(index, 1);
        return true;
    }

    public clearSelectedNodes(): void {
        this._selectedNodes.length = 0;
    }



    /*****************************************************************/
    /*                           Lifecycle                           */
    /*****************************************************************/

    public clear(): void {
        this._selectedNodes.length = 0;

        for (const handler of this.handleManager.getAll()) {
            handler.clear();
        }
    }

    public override destroy(): void {
        this.clear();

        for (const handler of this.handleManager.getAll()) {
            handler.destroy();
        }

        super.destroy();
    }


    private _getHoverHandle(): IHandleHover {
        const handler = this.handleManager.getById("hover");

        if (this._isHoverHandle(handler)) {
            return handler;
        }

        for (const item of this.handleManager.getAll()) {
            if (this._isHoverHandle(item)) {
                return item;
            }
        }

        throw new Error("Hover handle is not registered.");
    }

    private _isHoverHandle(value: unknown): value is IHandleHover {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<IHandleHover>;

        return (
            typeof handle.getNode === "function" &&
            typeof handle.setNode === "function" &&
            typeof handle.hasNode === "function" &&
            typeof handle.clearNode === "function"
        );
    }
}
