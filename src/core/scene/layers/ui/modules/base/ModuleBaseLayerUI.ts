import type { IModuleBaseLayerUI, LayerUIModuleType } from "./types";

export abstract class ModuleBaseLayerUI implements IModuleBaseLayerUI {
    private readonly _type: LayerUIModuleType;
    private _enabled: boolean;

    constructor(type: LayerUIModuleType) {
        this._type = type;
        this._enabled = true;
    }

    public getType(): LayerUIModuleType {
        return this._type;
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
    }

    public attach(root: HTMLElement): void {}

    public detach(): void {}

    public clear(): void {}

    public update(): void {}

    public destroy(): void {
        this.detach();
    }
}