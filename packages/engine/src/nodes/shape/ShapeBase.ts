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
    type ShapeGeometry,
    type IShapeBase,
    type ShapePathCommand,
    type StrokeWidth,
    FillMode
} from "./types";
import { ShapeEffect } from "./effect";
import type { Vector2 } from "../../core/transform/types";

export class ShapeBase extends NodeBase implements IShapeBase {
    private static readonly DEFAULT_FILLS: Readonly<Record<FillMode, string>> = {
        [FillMode.Color]: "#D9D9D9",
        [FillMode.LinearGradient]: "linear-gradient(to left, #000000 0%, #FFFFFF 100%)",
        [FillMode.RadialGradient]: "radial-gradient(circle at center, #000000 0%, #FFFFFF 100%)",
        [FillMode.ConicGradient]: "conic-gradient(from 0deg at center, #000000 0%, #FFFFFF 100%)",
        [FillMode.DiamondGradient]: "diamond-gradient(at center, #000000 0%, #FFFFFF 100%)",
        [FillMode.MeshGradient]: "mesh-gradient(grid 2 2 method bilinear in oklab, vertex v00 0% 0% #000000, vertex v10 100% 0% #FFFFFF, vertex v01 0% 100% #FFFFFF, vertex v11 100% 100% #000000)",
    };

    public readonly effect: ShapeEffect;

    private _cornerRadius: CornerRadius;
    private _fillMode: FillMode;
    private _fills: Record<FillMode, string>;

    private _strokeWidth: StrokeWidth;
    private _strokeFillMode: FillMode;
    private _strokeFills: Record<FillMode, string>;
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
        this._fillMode = FillMode.Color;
        this._fills = { ...ShapeBase.DEFAULT_FILLS };

        this._strokeWidth = {
            t: 0,
            l: 0,
            b: 0,
            r: 0,
        };
        this._strokeFillMode = FillMode.Color;
        this._strokeFills = { ...ShapeBase.DEFAULT_FILLS };
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


    public getFillMode(): FillMode {
        return this._fillMode;
    }

    public setFillMode(value: FillMode): void {
        if (value === this._fillMode) {
            return;
        }

        this._fillMode = value;
        this._fills[value] = ShapeBase.DEFAULT_FILLS[value];
    }

    public getFill(): string {
        return this._fills[this._fillMode] || ShapeBase.DEFAULT_FILLS[FillMode.Color];
    }

    public setFill(value: string): void {
        const fill = value.trim();

        if (!fill || fill === this._fills[this._fillMode]) {
            return;
        }

        this._fills[this._fillMode] = fill;
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
        return this._strokeFills[this._strokeFillMode];
    }

    public setStrokeFill(value: string): void {
        const fill = value.trim();

        if (!fill) {
            return;
        }

        if (fill === this._strokeFills[this._strokeFillMode]) {
            return;
        }

        this._strokeFills[this._strokeFillMode] = fill;
    }

    public getStrokeMode(): FillMode {
        return this._strokeFillMode;
    }

    public setStrokeMode(value: FillMode): void {
        if (value === this._strokeFillMode) {
            return;
        }

        this._strokeFillMode = value;
        this._strokeFills[value] = ShapeBase.DEFAULT_FILLS[value];
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
    public getGeometry(): ShapeGeometry {
        const worldMatrix = this.getWorldMatrix();

        return {
            worldMatrix: {
                a: worldMatrix.a,
                b: worldMatrix.b,
                c: worldMatrix.c,
                d: worldMatrix.d,
                tx: worldMatrix.tx,
                ty: worldMatrix.ty,
            },

            localOBB: this.getLocalOBB(),
            worldCorners: this.getWorldCorners(),
            worldOBB: this.getWorldOBB(),
            worldAABB: this.getWorldAABB(),

            localViewOBB: this.getLocalViewOBB(),
            worldViewCorners: this.getWorldViewCorners(),
            worldViewOBB: this.getWorldViewOBB(),
            worldViewAABB: this.getWorldViewAABB(),
        };
    }

    public toPathCommands(): readonly ShapePathCommand[] {
        const view = this.getLocalViewOBB();

        return [
            {
                type: "moveTo",
                point: {
                    x: view.x,
                    y: view.y,
                },
            },
            {
                type: "lineTo",
                point: {
                    x: MathF32.add(view.x, view.width),
                    y: view.y,
                },
            },
            {
                type: "lineTo",
                point: {
                    x: MathF32.add(view.x, view.width),
                    y: MathF32.add(view.y, view.height),
                },
            },
            {
                type: "lineTo",
                point: {
                    x: view.x,
                    y: MathF32.add(view.y, view.height),
                },
            },
            {
                type: "closePath",
            },
        ];
    }

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
