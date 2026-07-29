import { Direction, type ID } from "../../../../../core/types";
import type { IHandleBase } from "../base";
import type { ILayerOverlayHandle } from "../types";
import { LayerOverlayHandleManager } from "../LayerOverlayHandlesManager";
import { HandleTransformPivot } from "./pivot";
import { HandleTransformPosition } from "./position";
import { HandleTransformResizeEdge, HandleTransformResizeVertex } from "./resize";
import { HandleTransformRotate } from "./rotate";

export class LayerOverlayTransformHandlesManager {
    private readonly _handles = new Map<ID, IHandleBase>();

    constructor() {
        this._registerDefaults();
    }

    public getById(id: ID): ILayerOverlayHandle | null {
        return this._handles.get(id) ?? null;
    }

    public getAll(): ILayerOverlayHandle[] {
        return [...this._handles.values()];
    }

    public registerTo(target: LayerOverlayHandleManager): void {
        for (const [id, handle] of this._handles) {
            target.add(id, handle);
        }
    }

    private _add(id: ID, handle: IHandleBase): void {
        if (this._handles.has(id)) {
            throw new Error(`Overlay transform handler with id "${id}" is already added.`);
        }

        this._handles.set(id, handle);
    }

    private _registerDefaults(): void {
        this._add("transform-rotate-nw", new HandleTransformRotate(Direction.NW));
        this._add("transform-rotate-ne", new HandleTransformRotate(Direction.NE));
        this._add("transform-rotate-se", new HandleTransformRotate(Direction.SE));
        this._add("transform-rotate-sw", new HandleTransformRotate(Direction.SW));

        this._add("transform-position", new HandleTransformPosition());

        this._add("transform-resize-n", new HandleTransformResizeEdge(Direction.N));
        this._add("transform-resize-e", new HandleTransformResizeEdge(Direction.E));
        this._add("transform-resize-s", new HandleTransformResizeEdge(Direction.S));
        this._add("transform-resize-w", new HandleTransformResizeEdge(Direction.W));

        this._add("transform-resize-ne", new HandleTransformResizeVertex(Direction.NE));
        this._add("transform-resize-nw", new HandleTransformResizeVertex(Direction.NW));
        this._add("transform-resize-se", new HandleTransformResizeVertex(Direction.SE));
        this._add("transform-resize-sw", new HandleTransformResizeVertex(Direction.SW));

        this._add("transform-pivot", new HandleTransformPivot());
    }
}
