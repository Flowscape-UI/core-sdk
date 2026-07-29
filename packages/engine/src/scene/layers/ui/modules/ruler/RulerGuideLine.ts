import { formatRgb, parse, type Color } from "culori";
import { MathF32 } from "../../../../../core/math";
import type { IRulerGuideLine } from "./types";

export class RulerGuideLine implements IRulerGuideLine {
    private static readonly DEFAULT_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 0
    };

    private readonly _id: number;
    private _value: number;
    private _color: Color;
    private _thickness: number;
    private _visible: boolean;


    constructor(id: number) {
        this._id = id;
        this._value = 0;
        this._color = RulerGuideLine.DEFAULT_COLOR;
        this._thickness = 1;
        this._visible = true;
    }

    public getId(): number {
        return this._id;
    }

    public isVisible(): boolean {
        return this._visible;
    }

    public getValue(): number {
        return this._value;
    }

    public setVisible(value: boolean): void {
        if(this._visible === value) {
            return;
        }
        this._visible = value;
    }

    public setValue(value: number): void {
        if(this._value === value) {
            return;
        }
        this._value = MathF32.toF32(value);
    }

    public getColor(): string {
        return formatRgb(this._color);
    }

    public setColor(value: string): void {
        const newColor = parse(value);
        if(!newColor) {
            throw new Error(`Invalid color value: "${value}"`);
        }
        if(formatRgb(this._color) === formatRgb(newColor)) {
            return;
        }
        this._color = newColor;
    }

    public getThickness(): number {
        return this._thickness;
    }

    public setThickness(value: number): void {
        const newValue = MathF32.max(1, MathF32.round(value));
        if(this._thickness === newValue) {
            return;
        }
        this._thickness = newValue;
    }

    public reset(): void {
        this._value = 0;
        this._color = RulerGuideLine.DEFAULT_COLOR;
        this._thickness = 1;
        this._visible = true;
    }
}