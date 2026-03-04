import type { ILayer } from "./ILayer";

export class LayerManager {
    private readonly _layers: ILayer[] = [];

    public add(layer: ILayer): void {
        this._layers.push(layer);
    }

    public resize(width: number, height: number): void {
        for (const layer of this._layers) {
            layer.setSize(width, height);
        }
    }

    public destroy(): void {
        for (const layer of this._layers) {
            layer.destroy();
        }
        this._layers.length = 0;
    }
}