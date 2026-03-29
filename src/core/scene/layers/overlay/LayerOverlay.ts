import type { ID, IShapeBase } from "../../../../nodes";
import { LayerBase, LayerType } from "../base";
import type { ILayerOverlay } from "./types";

import {
    LayerOverlayHandleManager,
    type ILayerOverlayHandleManager,

    HandleHover,

    // Transform handles
    HandleTransform,
    HandleTransformResize,
    HandleTransformPosition,
    HandleTransformRotate,
    HandleTransformPivot,

    HandleCornerRadius,
} from "./handles";

export class LayerOverlay extends LayerBase implements ILayerOverlay {
    private _enabled: boolean;
    private readonly _selectedNodes: IShapeBase[];

    private readonly _handlerManager: ILayerOverlayHandleManager;

    constructor(width: number, height: number) {
        super(width, height, LayerType.Overlay);

        this._enabled = true;
        this._selectedNodes = [];
        this._handlerManager = new LayerOverlayHandleManager();

        this._handlerManager.register(new HandleHover());
        this._handlerManager.register(new HandleTransform());
        this._handlerManager.register(new HandleTransformResize());
        this._handlerManager.register(new HandleTransformPosition());
        this._handlerManager.register(new HandleTransformRotate());
        this._handlerManager.register(new HandleTransformPivot());
        this._handlerManager.register(new HandleCornerRadius());
    }

    /*****************************************************************/
    /*                            State                              */
    /*****************************************************************/

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
    }

    /*****************************************************************/
    /*                            Hover                              */
    /*****************************************************************/

    public getHoveredNode(): IShapeBase | null {
        return this._getHoverHandle().getNode();
    }

    public getHoveredNodeId(): ID | null {
        return this._getHoverHandle().getNodeId();
    }

    public setHoveredNode(node: IShapeBase | null): void {
        const handle = this._getHoverHandle();

        if (handle.getNodeId() === (node?.id ?? null)) {
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
    /*                           Handlers                            */
    /*****************************************************************/

    public getHandlerManager(): ILayerOverlayHandleManager {
        return this._handlerManager;
    }

    /*****************************************************************/
    /*                           Lifecycle                           */
    /*****************************************************************/

    public clear(): void {
        this._selectedNodes.length = 0;
        this._handlerManager.clear();
    }

    public override destroy(): void {
        this.clear();
        this._handlerManager.destroy();
        super.destroy();
    }


    private _getHoverHandle(): HandleHover {
        const handler = this._handlerManager.get(HandleHover.TYPE);

        if (!(handler instanceof HandleHover)) {
            throw new Error("Hover handle is not registered.");
        }

        return handler;
    }
}