import type Konva from "konva";
import type { IBindableRenderer } from "../../../../../../common";
import type { ICamera } from "../../../../../../../core/camera";
import type { IHandleHover } from "../../../../../../../scene/layers";

export interface IRendererHandleHover extends IBindableRenderer<IRendererHandleHoverTarget> {
    getRoot(): Konva.Group;
}


/**
 * Hover handle renderer target.
 *
 * Контекст рендерера hover-хендлера.
 */
export interface IRendererHandleHoverTarget {
    /**
     * Returns hover handle.
     *
     * Возвращает hover-хендлер.
     */
    getHandle(): IHandleHover;

    /**
     * Returns camera.
     *
     * Возвращает камеру.
     */
    getCamera(): ICamera;
}