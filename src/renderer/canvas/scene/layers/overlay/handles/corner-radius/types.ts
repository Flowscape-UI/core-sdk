import type Konva from "konva";
import type { ICamera } from "../../../../../../../core/camera";
import type { IBindableRenderer } from "../../../../../../common";
import type { IHandleCornerRadius } from "../../../../../../../scene";

export interface IRendererHandleCornerRadius extends IBindableRenderer<IRendererHandleCornerRadiusTarget> {
    getRoot(): Konva.Group;
}

export interface IRendererHandleCornerRadiusTarget {
    getHandle(): IHandleCornerRadius;
    getCamera(): ICamera;
}