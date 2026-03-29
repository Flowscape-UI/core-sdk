import type Konva from "konva";
import type { ICamera } from "../../../../../../../../core/camera";
import type { IBindableRenderer } from "../../../../../../../common";
import type { IHandleTransformRotate } from "../../../../../../../../core/scene/layers/overlay/handles/transform/rotate";

export interface IRendererHandleTransformRotate extends IBindableRenderer<IRendererHandleTransformRotateTarget> {
    getRoot(): Konva.Group;
}

export interface IRendererHandleTransformRotateTarget {
    getHandle(): IHandleTransformRotate;
    getCamera(): ICamera;
}