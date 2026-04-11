import type { IAttachable, IDestroyable, IEntity, IRenderable, IUpdatable } from "../../../../core/interfaces";
import type { HostType } from "../../../hosts";

export interface IRendererLayerBase<T = unknown> extends
IAttachable<T>,
IUpdatable,
IDestroyable,
IRenderable,
IEntity<HostType> {
    getRenderNode(): any;
}