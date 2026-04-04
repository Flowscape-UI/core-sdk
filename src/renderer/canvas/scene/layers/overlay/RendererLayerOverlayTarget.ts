import type { ICamera } from "../../../../../core/camera";
import type { ILayerOverlay } from "../../../../../scene/layers/overlay";
import type { IRendererLayerOverlayTarget } from "./types";


export class RendererLayerOverlayTarget implements IRendererLayerOverlayTarget {
    private readonly _layer: ILayerOverlay;
    private readonly _camera: ICamera;

    constructor(handle: ILayerOverlay, camera: ICamera) {
        this._layer = handle;
        this._camera = camera;
    }

    /**
     * Returns hover handle.
     *
     * Возвращает hover-хендлер.
     */
    public getOverlay(): ILayerOverlay {
        return this._layer;
    }

    /**
     * Returns camera.
     *
     * Возвращает камеру.
     */
    public getCamera(): ICamera {
        return this._camera;
    }
}