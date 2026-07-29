import type { ID } from "../core/types";
import type { IInputControllerBase } from "../input";
import type { ILayerBase } from "../scene/layers/base";
import type { InputBinding } from "./types";

export class InputManager {
    private readonly _bindings = new Map<string, InputBinding>();

    public add<TTarget>(
        layer: ILayerBase,
        controller: IInputControllerBase<TTarget>,
        target: TTarget
    ): void {
        const idString = String(controller.id);
        const existing = this._bindings.get(idString);

        if (existing) {
            existing.controller.detach();
            existing.controller.destroy();
        }

        controller.attach(target);

        this._bindings.set(idString, {
            layer,
            controller,
        });
    }

    public remove(id: ID): boolean {
        const idString = String(id);
        const binding = this._bindings.get(idString);

        if (!binding) {
            return false;
        }

        binding.controller.detach();
        binding.controller.destroy();

        this._bindings.delete(idString);
        return true;
    }

    public update(): void {
        this._bindings.forEach((binding) => {
            binding.controller.update();
        });
    }

    public getAll(): readonly InputBinding[] {
        return Array.from(this._bindings.values());
    }

    public getById(id: ID): InputBinding | null {
        return this._bindings.get(String(id)) ?? null;
    }

    public destroy(): void {
        this._bindings.forEach((binding) => {
            binding.controller.detach();
            binding.controller.destroy();
        });

        this._bindings.clear();
    }
}