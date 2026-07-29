import type { IAttachable, IDestroyable, IEntity, IRenderable, IUpdatable } from "../../core/interfaces";
import type { IScene } from "../../scene/types";

export type HostType = "canvas" | "html" | null;
export interface IRendererHost extends IEntity<HostType>, IAttachable<IScene>, IRenderable, IUpdatable, IDestroyable {
    getSurface(): HTMLElement;
}