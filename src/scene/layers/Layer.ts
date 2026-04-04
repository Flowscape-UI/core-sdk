import Konva from "konva";
import type { ILayer } from "./ILayer";
import type { IInvalidatable, IRenderable, RenderOrder } from "../../interfaces";


export type LayerOption = {
    listening: boolean,
    perfectDrawEnabled: boolean,
}

const DEFAULT_OPTIONS: LayerOption = {
    listening: false,
    perfectDrawEnabled: false,
}

export abstract class Layer implements ILayer, IRenderable {
    public readonly order: RenderOrder;

    protected readonly _layer: Konva.Layer;
    protected readonly _stage: Konva.Stage;
    private readonly _invalidator: IInvalidatable;

    private _width: number;
    private _height: number;

    constructor(
        width: number,
        height: number,
        order: RenderOrder,
        stage: Konva.Stage,
        invalidator: IInvalidatable,
        options?: Partial<LayerOption>,
    ) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        this.order = order;
        this._width = width;
        this._height = height;
        this._stage = stage;
        this._invalidator = invalidator;

        this._layer = new Konva.Layer({listening: opts.listening});
        
        this._stage.add(this._layer);
        this._layer.batchDraw();
    }

    public getSize(): { width: number, height: number } {
        return {
            width: this._width,
            height: this._height,
        }
    }

    public addToLayer(children: (Konva.Group | Konva.Shape)): void {
        this._layer.add(children);
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this._layer.setSize({ width, height });
        this._layer.batchDraw();
    }

    public destroy(): void {
        this._layer.destroy();
    }



    public requestDraw() {
        this._invalidator.invalidate(this);
    }

    public flush() {
        this._layer.batchDraw();
    }

    public abstract render(): void;
}