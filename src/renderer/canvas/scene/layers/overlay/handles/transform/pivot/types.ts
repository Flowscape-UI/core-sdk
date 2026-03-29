import type Konva from "konva";
import type { ICamera } from "../../../../../../../../core/camera";
import type { IBindableRenderer } from "../../../../../../../common";
import type { IHandleTransformPivot } from "../../../../../../../../core/scene/layers/overlay";

export interface IRendererHandleTransformPivot extends IBindableRenderer<IRendererHandleTransformPivotTarget> {
    getRoot(): Konva.Group;
}

export interface IRendererHandleTransformPivotTarget {
    getHandle(): IHandleTransformPivot;
    getCamera(): ICamera;
}