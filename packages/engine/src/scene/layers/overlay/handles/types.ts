export interface ILayerOverlayHandle {
    isEnabled(): boolean;
    setEnabled(value: boolean): void;

    clear(): void;
    destroy(): void;
}