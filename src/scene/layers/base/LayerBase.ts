import { MathF32 } from "../../../core/math";
import type { ILayerBase, LayerType } from "./types";

export class LayerBase implements ILayerBase {
    private readonly _type: LayerType;
    private _width: number;
    private _height: number;

    constructor(width: number, height: number, type: LayerType) {
        this._type = type;
        this._width = width;
        this._height = height;
    }

    /*****************************************************************/
    /*                             Size                              */
    /*****************************************************************/
    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height;
    }

    public getSize(): {width: number, height: number} {
        return {
            width: this._width,
            height: this._height,
        }
    }

    public setWidth(value: number): void {
        const newValue = MathF32.toF32(value);
        if(this._width === newValue) {
            return;
        }
        this._width = newValue;
    }

    public setHeight(value: number): void {
        const newValue = MathF32.toF32(value);
        if(this._height === newValue) {
            return;
        }
        this._height = newValue;
    }

    public setSize(width: number, height: number): void {
        const newWidth = MathF32.toF32(width);
        const newHeight = MathF32.toF32(height);
        if(
            this._width === newWidth &&
            this._height === newHeight
        ) {
            return;
        }
        this._width = newWidth;
        this._height = newHeight;
    }

    public getType(): LayerType {
        return this._type;
    }

    public destroy(): void {
        this._width = 0;
        this._height = 0;
    }
}