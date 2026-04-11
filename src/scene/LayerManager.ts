import type { ID } from "../core/types";
import type { IRendererLayerBase } from "../renderer/canvas/scene/layers/types";
import type { ILayerBase } from "./layers/base";
import type { LayerBinding } from "./types";

export class LayerManager {
    private readonly _bindings = new Map<string, LayerBinding>();

    public add<TTarget>(
        layer: ILayerBase,
        renderer: IRendererLayerBase<TTarget>,
        target: TTarget
    ): void {
        const idString = String(layer.id);
        const existing = this._bindings.get(idString);

        if (existing) {
            existing.layer.destroy();
            existing.renderer.detach();
            existing.renderer.destroy();
        }

        renderer.attach(target);

        this._bindings.set(idString, {
            layer,
            renderer,
        });
    }

    public remove(id: ID): boolean {
        const idString = String(id);
        const binding = this._bindings.get(idString);

        if (!binding) {
            return false;
        }

        binding.layer.destroy();
        binding.renderer.detach();
        binding.renderer.destroy();

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