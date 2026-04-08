import type { ID } from "../../../core/types";
import { ModuleManager } from "./ModuleManager";
import type { IInputControllerBase, IInputModule } from "./types";


export abstract class InputControllerBase<
    TTarget = unknown,
    TModule extends IInputModule<TTarget> = IInputModule<TTarget>
> implements IInputControllerBase<TTarget, TModule> {
    public abstract readonly id: ID;

    public readonly moduleManager = new ModuleManager<TModule>();

    protected _target: TTarget | null = null;
    protected _isAttached = false;
    protected _isDestroyed = false;

    public attach(target: TTarget): void {
        if (this._isDestroyed) {
            return;
        }

        this._target = target;
        this._isAttached = true;

        for (const module of this.moduleManager.getAll()) {
            module.attach(target);
        }

        this._onAttach(target);
    }

    public detach(): void {
        if (!this._isAttached || this._target === null) {
            return;
        }

        this._onDetach();

        for (const module of this.moduleManager.getAll()) {
            module.detach();
        }

        this._target = null;
        this._isAttached = false;
    }

    public update(): void {
        if (!this._isAttached || this._target === null || this._isDestroyed) {
            return;
        }

        this._onBeforeUpdate();

        for (const module of this.moduleManager.getAll()) {
            module.update();
        }

        this._onAfterUpdate();
    }

    public destroy(): void {
        if (this._isDestroyed) {
            return;
        }

        this.detach();

        for (const module of this.moduleManager.getAll()) {
            module.destroy();
        }

        this.moduleManager.clear();
        this._isDestroyed = true;

        this._onDestroy();
    }

    public addModule(module: TModule): void {
        if (this._isDestroyed) {
            return;
        }

        const existing = this.moduleManager.getById(module.id);
        if (existing) {
            if (this._isAttached) {
                existing.detach();
            }

            existing.destroy();
            this.moduleManager.remove(existing.id);
        }

        this.moduleManager.add(module);

        if (this._isAttached && this._target !== null) {
            module.attach(this._target);
        }

        this._onModuleAdded(module);
    }

    public removeModule(id: ID): boolean {
        const module = this.moduleManager.getById(id);
        if (!module) {
            return false;
        }

        if (this._isAttached) {
            module.detach();
        }

        module.destroy();
        const removed = this.moduleManager.remove(id);

        if (removed) {
            this._onModuleRemoved(module);
        }

        return removed;
    }

    public getTarget(): TTarget | null {
        return this._target;
    }

    public get isAttached(): boolean {
        return this._isAttached;
    }

    public get isDestroyed(): boolean {
        return this._isDestroyed;
    }

    protected _onAttach(_: TTarget): void {}
    protected _onDetach(): void {}
    protected _onBeforeUpdate(): void {}
    protected _onAfterUpdate(): void {}
    protected _onDestroy(): void {}
    protected _onModuleAdded(_: TModule): void {}
    protected _onModuleRemoved(_: TModule): void {}
}