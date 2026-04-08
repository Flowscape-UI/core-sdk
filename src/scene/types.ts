import type { IInputControllerBase } from "../input";
import type { IRendererLayerBase } from "../renderer/canvas/scene/layers/types";
import type { InputManager } from "./InputManager";
import type { LayerManager } from "./LayerManager";
import type { ILayerBase } from "./layers";
import type { LayerBackground } from "./layers/background/LayerBackground";
import type { LayerOverlay } from "./layers/overlay/LayerOverlay";
import type { LayerUI } from "./layers/ui";
import type { LayerWorld } from "./layers/world/LayerWorld";
import type { ManagerRenderHost } from "./ManagerRenderHost";

export type LayerBinding = {
    layer: ILayerBase;
    renderer: IRendererLayerBase<unknown>;
};

export type InputBinding = {
    layer: ILayerBase;
    controller: IInputControllerBase<unknown>;
};

export interface IScene {
    readonly layerManager: LayerManager;
    readonly hostManager: ManagerRenderHost;
    readonly inputManager: InputManager;

    readonly layerBackground: LayerBackground;
    readonly layerWorld: LayerWorld;
    readonly layerOverlay: LayerOverlay;
    readonly layerUI: LayerUI;

    // setRenderHost(value: IRendererRoot): void;

    setSize(width: number, height: number): void;

    getWidth(): number;
    getHeight(): number;

    invalidate(): void;
}