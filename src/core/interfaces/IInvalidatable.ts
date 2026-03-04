import type { IRenderable } from "./IRenderable";

export interface IInvalidatable {
    invalidate(layer: IRenderable): void;
}