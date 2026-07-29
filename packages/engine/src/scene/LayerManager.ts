import type { ID } from "../core/types";
import type { IRendererLayerBase } from "../renderer/canvas/scene/layers/types";
import type { ILayerBase } from "./layers/base";
import type { LayerBinding } from "./types";

export class LayerManager {
    private readonly _bindings = new Map<string, LayerBinding>();

    public add(
        layer: ILayerBase,
        renderer: IRendererLayerBase<unknown>,
    ): void {
        const idString = String(layer.id);

        this._bindings.set(idString, {
            layer,
            renderer,
        });
    }

    public remove(id: ID): boolean {
        const idString = String(id);
        if (!this._bindings.has(idString)) {
            return false;
        }

        this._bindings.delete(idString);
        return true;
    }

    public getAll(): readonly LayerBinding[] {
        return Array.from(this._bindings.values());
    }

    public getById(id: ID): LayerBinding | null {
        return this._bindings.get(String(id)) ?? null;
    }
}
