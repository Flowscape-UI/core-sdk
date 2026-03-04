export enum RenderOrder {
    Background = 0,
    World = 100,
    Overlay = 200,
    UI = 300,
}

export interface IRenderable {
    order: RenderOrder;
    suborder?: number;
    render(): void;
    flush?(): void;
}