import type { ILayerBase } from "../base";
import type { IModuleBaseLayerUI, LayerUIModuleType } from "./modules";

export interface ILayerUI extends ILayerBase {
    isEnabled(): boolean;
    setEnabled(value: boolean): void;

    getManager(): IManagerLayerUI;

    clear(): void;
}

export interface IManagerLayerUI {
    register(module: IModuleBaseLayerUI): void;
    unregister(type: LayerUIModuleType): boolean;

    get(type: LayerUIModuleType): IModuleBaseLayerUI | null;
    has(type: LayerUIModuleType): boolean;

    getAll(): IModuleBaseLayerUI[];

    clear(): void;
    destroy(): void;
}