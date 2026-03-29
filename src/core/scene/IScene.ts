import type { IRendererScene } from "../../renderer/canvas/scene";
import type { LayerBackground } from "./layers/background/LayerBackground";
import type { LayerOverlay } from "./layers/overlay/LayerOverlay";
import type { LayerWorld } from "./layers/world/LayerWorld";

export interface IScene {
    readonly layerBackground: LayerBackground;
    readonly layerWorld: LayerWorld;
    readonly layerOverlay: LayerOverlay;

    getRenderer(): IRendererScene | null;
    setRenderer(value: IRendererScene): void;

    setSize(width: number, height: number): void;

    getWidth(): number;
    getHeight(): number;

    invalidate(): void;
}