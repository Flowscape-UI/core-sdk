import type Konva from "konva";
import type { IBindableRenderer } from "../../../../../../../common";
import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransform } from "../../../../../../../../scene/layers";


export interface IRendererHandleTransform
    extends IBindableRenderer<IRendererHandleTransformTarget> {
    getRoot(): Konva.Group;
}

/**
 * Transform handle renderer target.
 *
 * Контекст рендерера transform-хендлера.
 */
export interface IRendererHandleTransformTarget {
    /**
     * Returns transform handle.
     *
     * Возвращает transform-хендлер.
     */
    getHandle(): IHandleTransform;

    /**
     * Returns camera.
     *
     * Возвращает камеру.
     */
    getCamera(): ICamera;
}