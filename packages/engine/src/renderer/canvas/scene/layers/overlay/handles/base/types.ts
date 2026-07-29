import type Konva from "konva";
import type { IBindableRenderer } from "../../../../../../common";
import type { IHandleBase } from "../../../../../../../scene";
import type { RendererHandleTarget } from "./RendererHandleTarget";

export interface IRendererHandleBase<T extends IHandleBase>
    extends IBindableRenderer<RendererHandleTarget<T>> {
    getRoot(): Konva.Group;
}
