import type { ICamera } from "../../../../../core/camera";
import type { ILayerOverlay } from "../../../../../core/scene/layers/overlay/types";
import type { IBindableRenderer } from "../../../../common";

export interface IRendererLayerOverlay extends IBindableRenderer<IRendererLayerOverlayTarget> {}

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