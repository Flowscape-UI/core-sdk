import { formatHex, parse, type Color } from "culori";
import {
    NodeBase,
    NodeType,
    type ID
} from "../base";
import {
    EffectType,
    StrokeAlign,
    type CornerRadius,
    type IShapeBase,
    type StrokeWidth
} from "./types";

export class ShapeBase extends NodeBase implements IShapeBase {
    private static readonly DEFAULT_FILL_COLOR: Color = {
        mode: "rgb",
        r: 0.85,
        g: 0.85,
        b: 0.85,
    };

    private static readonly DEFAULT_STROKE_FILL_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 0,
    };

    private _cornerRadius: CornerRadius;
    private _fill: Color;

    private _strokeWidth: StrokeWidth;
    private _strokeFill: Color;
    private _strokeAlign: StrokeAlign;

    private _effect: EffectType;


    constructor(id: ID, type: NodeType, name?: string) {
        super(id, type, name);
        this.setSize(100, 100);

        this._cornerRadius = {
            tl: 0,
            tr: 0,
            br: 0,
            bl: 0,
        };
        this._fill = ShapeBase.DEFAULT_FILL_COLOR;

        this._strokeWidth = {
            t: 0,
            l: 0,
            b: 0,
            r: 0,
        };
        this._strokeFill = ShapeBase.DEFAULT_STROKE_FILL_COLOR;
        this._strokeAlign = StrokeAlign.Center;

        this._effect = EffectType.None;
    }


    /***********************************************************/
    /*                        Appearance                       */
    /***********************************************************/
    public getCornerRadius(): CornerRadius {
        return { ...this._cornerRadius };
    }

    public setCornerRadius(value: CornerRadius): void {
        const newCornerRadius: CornerRadius = {
            tl: Math.max(0, value.tl),
            tr: Math.max(0, value.tr),
            br: Math.max(0, value.br),
            bl: Math.max(0, value.bl),
        };

        if (
            newCornerRadius.tl === this._cornerRadius.tl &&
            newCornerRadius.tr === this._cornerRadius.tr &&
            newCornerRadius.br === this._cornerRadius.br &&
            newCornerRadius.bl === this._cornerRadius.bl
        ) {
            return;
        }

        this._cornerRadius = newCornerRadius;
    }


    public getFill(): string {
        return formatHex(this._fill);
    }

    public setFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;

        if (!color) {
            return;
        }

        if (this._fill && formatHex(this._fill) === formatHex(color)) {
            return;
        }

        this._fill = color;
    }


    /***********************************************************/
    /*                          Stroke                         */
    /***********************************************************/
    public getStrokeWidth(): StrokeWidth {
        return { ...this._strokeWidth };
    }

    public setStrokeWidth(value: StrokeWidth): void {
        const newStrokeWidth: StrokeWidth = {
            t: Math.max(0, value.t),
            r: Math.max(0, value.r),
            b: Math.max(0, value.b),
            l: Math.max(0, value.l),
        };

        if (
            newStrokeWidth.t === this._strokeWidth.t &&
            newStrokeWidth.r === this._strokeWidth.r &&
            newStrokeWidth.b === this._strokeWidth.b &&
            newStrokeWidth.l === this._strokeWidth.l
        ) {
            return;
        }

        this._strokeWidth = newStrokeWidth;
    }

    public getStrokeFill(): string {
        return formatHex(this._strokeFill);
    }

    public setStrokeFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;

        if (!color) {
            return;
        }

        if (this._strokeFill && formatHex(this._strokeFill) === formatHex(color)) {
            return;
        }

        this._strokeFill = color;
    }

    public getStrokeAlign(): StrokeAlign {
        return this._strokeAlign;
    }

    public setStrokeAlign(value: StrokeAlign): void {
        if (value === this._strokeAlign) {
            return;
        }

        this._strokeAlign = value;
    }



    /***********************************************************/
    /*                          Effect                         */
    /***********************************************************/
    public getEffect(): EffectType {
        return this._effect;
    }

    public setEffect(value: EffectType): void {
        if (value === this._effect) {
            return;
        }

        this._effect = value;
    }
}