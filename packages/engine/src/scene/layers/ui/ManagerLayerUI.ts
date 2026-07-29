import type { IModuleBaseLayerUI, LayerUIModuleType } from "./modules";
import type { IManagerLayerUI } from "./types";

export class ManagerLayerUI implements IManagerLayerUI {
    private readonly _modules: Map<LayerUIModuleType, IModuleBaseLayerUI>;

    constructor() {
        this._modules = new Map();
    }

    public register(module: IModuleBaseLayerUI): void {
        const moduleType = module.getType();
        if (this._modules.has(moduleType)) {
            throw new Error(`UI module "${moduleType}" is already registered.`);
        }

        this._modules.set(moduleType, module);
    }

    public unregister(type: LayerUIModuleType): boolean {
        const module = this._modules.get(type);

        if (!module) {
            return false;
        }

        module.destroy();
        this._modules.delete(type);
        return true;
    }

    public get(type: LayerUIModuleType): IModuleBaseLayerUI | null {
        return this._modules.get(type) ?? null;
    }

    public has(type: LayerUIModuleType): boolean {
        return this._modules.has(type);
    }

    public getAll(): IModuleBaseLayerUI[] {
        return [...this._modules.values()];
    }

    public clear(): void {
        for (const module of this._modules.values()) {
            module.clear();
        }
    }

    public destroy(): void {
        for (const module of this._modules.values()) {
            module.destroy();
        }

        this._modules.clear();
    }
}