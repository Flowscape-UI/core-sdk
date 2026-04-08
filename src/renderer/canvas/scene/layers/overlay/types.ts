import type { ICamera } from "../../../../../core/camera";
import type { ILayerOverlay } from "../../../../../scene/layers";
import type { IRendererLayerBase } from "../types";

export interface IRendererLayerOverlay extends IRendererLayerBase<IRendererLayerOverlayTarget> {}

/**
 * Hover handle renderer target.
 *
 * Контекст рендерера hover-хендлера.
 */
export interface IRendererLayerOverlayTarget {
    /**
     * Returns hover handle.
     *
     * Возвращает hover-хендлер.
     */
    getOverlay(): ILayerOverlay;

    /**
     * Returns camera.
     *
     * Возвращает камеру.
     */
    getCamera(): ICamera;
}