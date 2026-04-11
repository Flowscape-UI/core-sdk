import { formatRgb, parse, type Color } from "culori";
import { MathF32 } from "../../core/math";
import type { ID } from "../../core/types";
import {
    NodeBase,
    NodeType,
    type OrientedRect,
    type Rect
} from "../base";
import {
    StrokeAlign,
    type CornerRadius,
    type IShapeBase,
    type StrokeWidth
} from "./types";
import { ShapeEffect } from "./effect";
import type { Vector2 } from "../../core/transform/types";

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

    public readonly effect: ShapeEffect;

    private _cornerRadius: CornerRadius;
    private _fill: Color;

    private _strokeWidth: StrokeWidth;
    private _strokeFill: Color;
    private _strokeAlign: StrokeAlign;

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

        this.effect = new ShapeEffect();
    }


    /***********************************************************/
    /*                        Appearance                       */
    /***********************************************************/
    public getCornerRadius(): CornerRadius {
        return { ...this._cornerRadius };
    }

    public setCornerRadius(value: CornerRadius): void {
        const newCornerRadius: CornerRadius = {
            tl: MathF32.max(0, value.tl),
            tr: MathF32.max(0, value.tr),
            br: MathF32.max(0, value.br),
            bl: MathF32.max(0, value.bl),
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
        return formatRgb(this._fill);
    }

    public setFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;

        if (!color) {
            return;
        }

        if (this._fill && formatRgb(this._fill) === formatRgb(color)) {
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
            t: MathF32.max(0, value.t),
            r: MathF32.max(0, value.r),
            b: MathF32.max(0, value.b),
            l: MathF32.max(0, value.l),
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
        return formatRgb(this._strokeFill);
    }

    public setStrokeFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;

        if (!color) {
            return;
        }

        if (this._strokeFill && formatRgb(this._strokeFill) === formatRgb(color)) {
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
    /*                       View Bounds                       */
    /***********************************************************/
    public getLocalViewOBB(): Rect {
        const bounds = this.getLocalOBB();
        const outset = this._getViewStrokeOutset();
        return {
            x: MathF32.sub(bounds.x, outset.l),
            y: MathF32.sub(bounds.y, outset.t),
            width: MathF32.add(bounds.width, MathF32.add(outset.l, outset.r)),
            height: MathF32.add(bounds.height, MathF32.add(outset.t, outset.b)),
        };
    }

    public getWorldViewCorners(): [Vector2, Vector2, Vector2, Vector2] {
        const worldMatrix = this.getWorldMatrix();
        const local = this.getLocalViewOBB();

        const x = local.x;
        const y = local.y;
        const w = local.width;
        const h = local.height;

        return [
            this._applyMatrixToPoint(worldMatrix, { x, y }),
            this._applyMatrixToPoint(worldMatrix, { x: MathF32.add(x, w), y }),
            this._applyMatrixToPoint(worldMatrix, { x: MathF32.add(x, w), y: MathF32.add(y, h) }),
            this._applyMatrixToPoint(worldMatrix, { x, y: MathF32.add(y, h) }),
        ];
    }

    public getWorldViewOBB(): OrientedRect {
        const corners = this.getWorldViewCorners();

        const center = {
            x: MathF32.toF32((corners[0].x + corners[2].x) / 2),
            y: MathF32.toF32((corners[0].y + corners[2].y) / 2),
        };

        const width = Math.hypot(
            corners[1].x - corners[0].x,
            corners[1].y - corners[0].y
        );

        const height = Math.hypot(
            corners[2].x - corners[1].x,
            corners[2].y - corners[1].y
        );

        return {
            center,
            width: MathF32.toF32(width),
            height: MathF32.toF32(height),
            rotation: this.getWorldRotation(),
        };
    }

    public getWorldViewAABB(): Rect {
        return this._getAABBFromPoints(this.getWorldViewCorners());
    }



    /***********************************************************/
    /*                          Helper                         */
    /***********************************************************/
    private _getViewStrokeOutset(): StrokeWidth {
        const stroke = this.getStrokeWidth();

        switch (this.getStrokeAlign()) {
            case StrokeAlign.Inside:
                return { t: 0, r: 0, b: 0, l: 0 };

            case StrokeAlign.Center:
                return {
                    t: stroke.t / 2,
                    r: stroke.r / 2,
                    b: stroke.b / 2,
                    l: stroke.l / 2,
                };

            case StrokeAlign.Outside:
                return { ...stroke };

            default:
                return { t: 0, r: 0, b: 0, l: 0 };
        }
    }
}