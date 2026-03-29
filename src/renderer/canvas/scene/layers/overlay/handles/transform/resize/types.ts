import type Konva from "konva";
import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransformResize } from "../../../../../../../../core/scene/layers/overlay/handles/transform/resize";
import type { IBindableRenderer } from "../../../../../../../common";

export interface IRendererHandleTransformResize extends IBindableRenderer<IRendererHandleTransformResizeTarget> {
    getRoot(): Konva.Group;
}

export interface IRendererHandleTransformResizeTarget {
    getHandle(): IHandleTransformResize;
    getCamera(): ICamera;
}