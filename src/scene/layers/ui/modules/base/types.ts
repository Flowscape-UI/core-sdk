export type LayerUIModuleType = string;

export interface IModuleBaseLayerUI {
    getType(): LayerUIModuleType;

    isEnabled(): boolean;
    setEnabled(value: boolean): void;

    attach(root: HTMLElement): void;
    detach(): void;

    clear(): void;
    update(): void;
    destroy(): void;
}