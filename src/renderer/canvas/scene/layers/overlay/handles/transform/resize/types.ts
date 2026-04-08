import type Konva from "konva";
import type { ICamera } from "../../../../../../../../core/camera";
import type { IBindableRenderer } from "../../../../../../../common";
import type { IHandleTransformResize } from "../../../../../../../../scene/layers";

export interface IRendererHandleTransformResize extends IBindableRenderer<IRendererHandleTransformResizeTarget> {
    getRoot(): Konva.Group;
}

export interface IRendererHandleTransformResizeTarget {
    getHandle(): IHandleTransformResize;
    getCamera(): ICamera;
}