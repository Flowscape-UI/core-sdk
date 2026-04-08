import type { IRenderable } from "./IRenderable";

export interface IInvalidatable {
    invalidate(render: IRenderable): void;
}