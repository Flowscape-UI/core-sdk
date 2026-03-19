import { formatRgb, parse, type Color } from "culori";
import { EffectBase } from "../base";
import { EffectType } from "../../../nodes/shape/effect";


export class EffectInnerShadow extends EffectBase {
    public readonly type: EffectType;
    private static readonly DEFAULT_FILL_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 0,
    };

    private _fill: Color;
    private _opacity: number;
    private _x: number;
    private _y: number;
    private _blur: number;
    private _spread: number;

    constructor() {
        super();
        this.type = EffectType.InnerShadow;
        this._fill = EffectInnerShadow.DEFAULT_FILL_COLOR;
        this._opacity = 0.25;
        this._x = 4;
        this._y = 4;
        this._blur = 4;
        this._spread = 0;
    }

    public getFill(): string {
        return formatRgb(this._fill);
    }

    public setFill(value: string): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._fill && formatRgb(this._fill) === formatRgb(color)) {
            return;
        }
        this._fill = color;
    }

    public getOpacity(): number {
        return this._opacity;
    }

    public setOpacity(value: number): void {
        const newValue = Math.max(0, Math.min(1, value));
        if (this._opacity === newValue) {
            return;
        }
        this._opacity = newValue;
    }

    public getX(): number {
        return this._x;
    }

    public setX(value: number): void {
        if (this._x === value) {
            return;
        }
        this._x = value;
    }

    public getY(): number {
        return this._y;
    }

    public setY(value: number): void {
        if (this._y === value) {
            return;
        }
        this._y = value;
    }

    public setOffset(x: number, y: number): void {
        if (this._x === x && this._y === y) {
            return;
        }
        this._x = x;
        this._y = y;
    }

    public getBlur(): number {
        return this._blur;
    }

    public setBlur(value: number): void {
        const newValue = Math.max(0, value);
        if (this._blur === newValue) {
            return;
        }
        this._blur = newValue;
    }

    public getSpread(): number {
        return this._spread;
    }

    public setSpread(value: number): void {
        if (this._spread === value) {
            return;
        }
        this._spread = value;
    }

    public computeBounds(
    width: number,
    height: number
): { x: number; y: number; width: number; height: number } {
    const local = this.computeLocalBounds(width, height);

    return {
        x: local.x + this._x,
        y: local.y + this._y,
        width: local.width,
        height: local.height,
    };
}

    public computeLocalBounds(
    width: number,
    height: number
): { x: number; y: number; width: number; height: number } {
    const spread = Math.max(0, this._spread);
    const blur = Math.max(0, this._blur);

    // для blur лучше брать запас побольше, чем просто blur
    const blurPadding = Math.ceil(blur * 2);

    const minX = -spread - blurPadding;
    const minY = -spread - blurPadding;
    const maxX = width + spread + blurPadding;
    const maxY = height + spread + blurPadding;

    return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
    };
}
}