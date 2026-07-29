import type { ID } from "../../../../core/types";
import type { IHandleBase } from "./base";
import type { ILayerOverlayHandle } from "./types";

export class LayerOverlayHandleManager {
    private readonly _handlers = new Map<ID, IHandleBase>();

    public add(id: ID, handler: IHandleBase): void {
        if (this._handlers.has(id)) {
            throw new Error(`Overlay handler with id "${id}" is already added.`);
        }

        this._handlers.set(id, handler);
        this._syncZIndex();
    }

    public getById(id: ID): ILayerOverlayHandle | null {
        return this._handlers.get(id) ?? null;
    }

    public getAll(): ILayerOverlayHandle[] {
        return [...this._handlers.values()];
    }

    public remove(id: ID): boolean {
        const deleted = this._handlers.delete(id);

        if (deleted) {
            this._syncZIndex();
        }

        return deleted;
    }

    private _syncZIndex(): void {
        let index = 0;

        for (const handle of this._handlers.values()) {
            handle.setZIndex(index);
            index += 1;
        }
    }
}
