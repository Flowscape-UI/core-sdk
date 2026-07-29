import type { ID } from "../../../../../core/types";
import type { IHandleBase } from "../base";
import type { ILayerOverlayHandle } from "../types";
import { LayerOverlayHandleManager } from "../LayerOverlayHandlesManager";

export class LayerOverlayFreeHandlesManager {
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

    protected _add(id: ID, handle: IHandleBase): void {
        if (this._handles.has(id)) {
            throw new Error(`Overlay free handler with id "${id}" is already added.`);
        }

        this._handles.set(id, handle);
    }

    private _registerDefaults(): void {
        // Free handles are user-defined; defaults are intentionally empty.
    }
}

