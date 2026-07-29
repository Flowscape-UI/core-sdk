import Konva from "konva";
import { EffectShadow } from "../../../effect";
import { StrokeAlign, type CornerRadius } from "../../../../nodes";
import { EffectType } from "../../../../nodes/shape/effect";

const INNER_SHADOW_CLIP_GROUP_NAME = "effect-inner-shadow-clip-group";
const INNER_SHADOW_GROUP_NAME = "effect-inner-shadow-group";
const INNER_SHADOW_BLUR_ROOT_NAME = "effect-inner-shadow-blur-root";
const INNER_SHADOW_OUTER_RECT_NAME = "effect-inner-shadow-outer-rect";
const INNER_SHADOW_HOLE_NAME = "effect-inner-shadow-hole";

export class RendererEffectInnerShadow {
    public readonly type: EffectType;
    private readonly _effect: EffectShadow;

    private readonly _clipGroup: Konva.Group;
    private readonly _group: Konva.Group;
    private readonly _blurRoot: Konva.Group;
    private readonly _outerRect: Konva.Rect;
    private readonly _holeShape: Konva.Shape;

    constructor(effect: EffectShadow, holeShape: Konva.Shape) {
        this.type = EffectType.InnerShadow;
        this._effect = effect;

        this._clipGroup = new Konva.Group({
            name: INNER_SHADOW_CLIP_GROUP_NAME,
            listening: false,
            visible: false,
        });

        this._group = new Konva.Group({
            name: INNER_SHADOW_GROUP_NAME,
            listening: false,
        });

        this._blurRoot = new Konva.Group({
            name: INNER_SHADOW_BLUR_ROOT_NAME,
            listening: false,
        });

        this._outerRect = new Konva.Rect({
            name: INNER_SHADOW_OUTER_RECT_NAME,
            listening: false,
        });

        this._holeShape = holeShape.clone() as Konva.Shape;
        this._holeShape.name(INNER_SHADOW_HOLE_NAME);
        this._holeShape.listening(false);
        this._holeShape.globalCompositeOperation("destination-out");

        this._blurRoot.add(this._outerRect, this._holeShape);
        this._group.add(this._blurRoot);
        this._clipGroup.add(this._group);
    }

    public getHoleShape(): Konva.Shape {
        return this._holeShape;
    }

    public getView(): Konva.Group {
        return this._clipGroup;
    }

    public mount(parent: Konva.Group): void {
        parent.add(this._clipGroup);
    }

    public update(): void {
        this._blurRoot.filters([]);
        this._blurRoot.blurRadius(0);
        this._blurRoot.clearCache();

        if (!this._effect.isVisible()) {
            this._clipGroup.visible(false);
            return;
        }

        const blur = Math.max(0, this._effect.getBlur());
        const spread = Math.max(0, this._effect.getSpread());
        const opacity = this._effect.getOpacity();
        const offsetX = Math.round(this._effect.getX());
        const offsetY = Math.round(this._effect.getY());

        const width = this._holeShape.getAttr("rectWidth") ?? 0;
        const height = this._holeShape.getAttr("rectHeight") ?? 0;

        if (width <= 0 || height <= 0) {
            this._clipGroup.visible(false);
            return;
        }

        const padding =
            Math.max(4, Math.ceil(blur * 3)) +
            spread +
            Math.max(Math.abs(offsetX), Math.abs(offsetY));

        this._clipGroup.visible(true);
        this._clipGroup.opacity(opacity);
        this._clipGroup.position({ x: 0, y: 0 });

        this._clipGroup.clipFunc((ctx) => {
            ctx.beginPath();
            this._appendOuterShapePath(ctx, this._holeShape);
            ctx.closePath();
        });

        this._outerRect.setAttrs({
            x: -padding,
            y: -padding,
            width: Math.max(1, Math.ceil(width + padding * 2)),
            height: Math.max(1, Math.ceil(height + padding * 2)),
            fill: this._effect.getFill(),
        });

        // ВАЖНО:
        // hole двигается в обратную сторону от offset,
        // иначе inner shadow будет визуально "с той стороны наоборот".
        this._holeShape.position({
            x: -offsetX,
            y: -offsetY,
        });

        // Для inner shadow spread = сужение hole внутрь,
        // чтобы тень становилась толще внутри фигуры.
        this._holeShape.setAttr("innerShadowInset", spread);
        this._holeShape.fill("#000");
        this._holeShape.visible(true);

        const bounds = {
            x: -padding,
            y: -padding,
            width: Math.max(1, Math.ceil(width + padding * 2)),
            height: Math.max(1, Math.ceil(height + padding * 2)),
        };

        this._blurRoot.cache(bounds);

        if (blur > 0) {
            this._blurRoot.filters([Konva.Filters.Blur]);
            this._blurRoot.blurRadius(blur);
        }
    }

    public clear(): void {
        this._clipGroup.visible(false);
        this._clipGroup.clipFunc(undefined);
        this._blurRoot.filters([]);
        this._blurRoot.blurRadius(0);
        this._blurRoot.clearCache();
    }

    public destroy(): void {
        this._clipGroup.destroy();
    }

    private _appendOuterShapePath(
        ctx: CanvasRenderingContext2D,
        shape: Konva.Shape
    ): void {
        const width = shape.getAttr("rectWidth") ?? 0;
        const height = shape.getAttr("rectHeight") ?? 0;

        const t = shape.getAttr("strokeTop") ?? 0;
        const r = shape.getAttr("strokeRight") ?? 0;
        const b = shape.getAttr("strokeBottom") ?? 0;
        const l = shape.getAttr("strokeLeft") ?? 0;

        const align = shape.getAttr("strokeAlign") ?? StrokeAlign.Inside;

        const baseRadius: CornerRadius = {
            tl: shape.getAttr("radiusTopLeft") ?? 0,
            tr: shape.getAttr("radiusTopRight") ?? 0,
            br: shape.getAttr("radiusBottomRight") ?? 0,
            bl: shape.getAttr("radiusBottomLeft") ?? 0,
        };

        const tlDelta = Math.max(l, t);
        const trDelta = Math.max(r, t);
        const brDelta = Math.max(r, b);
        const blDelta = Math.max(l, b);

        let outerX = 0;
        let outerY = 0;
        let outerWidth = width;
        let outerHeight = height;
        let outerRadius: CornerRadius = { ...baseRadius };

        switch (align) {
            case StrokeAlign.Inside:
                outerX = 0;
                outerY = 0;
                outerWidth = width;
                outerHeight = height;
                outerRadius = { ...baseRadius };
                break;

            case StrokeAlign.Center:
                outerX = -l / 2;
                outerY = -t / 2;
                outerWidth = width + l / 2 + r / 2;
                outerHeight = height + t / 2 + b / 2;
                outerRadius = {
                    tl: this._expandRadius(baseRadius.tl, tlDelta / 2),
                    tr: this._expandRadius(baseRadius.tr, trDelta / 2),
                    br: this._expandRadius(baseRadius.br, brDelta / 2),
                    bl: this._expandRadius(baseRadius.bl, blDelta / 2),
                };
                break;

            case StrokeAlign.Outside:
                outerX = -l;
                outerY = -t;
                outerWidth = width + l + r;
                outerHeight = height + t + b;
                outerRadius = {
                    tl: this._expandRadius(baseRadius.tl, tlDelta),
                    tr: this._expandRadius(baseRadius.tr, trDelta),
                    br: this._expandRadius(baseRadius.br, brDelta),
                    bl: this._expandRadius(baseRadius.bl, blDelta),
                };
                break;
        }

        this._appendRoundedRectPath(ctx, outerX, outerY, outerWidth, outerHeight, outerRadius);
    }

    private _appendRoundedRectPath(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: CornerRadius
    ): void {
        const w = Math.max(0, width);
        const h = Math.max(0, height);
        if (w <= 0 || h <= 0) return;

        const r = this._normalizeCornerRadius(w, h, radius);

        ctx.moveTo(x + r.tl, y);
        ctx.lineTo(x + w - r.tr, y);
        ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
        ctx.lineTo(x + w, y + h - r.br);
        ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
        ctx.lineTo(x + r.bl, y + h);
        ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
        ctx.lineTo(x, y + r.tl);
        ctx.arcTo(x, y, x + r.tl, y, r.tl);
        ctx.closePath();
    }

    private _normalizeCornerRadius(
        width: number,
        height: number,
        radius: CornerRadius
    ): CornerRadius {
        let tl = Math.max(0, radius.tl);
        let tr = Math.max(0, radius.tr);
        let br = Math.max(0, radius.br);
        let bl = Math.max(0, radius.bl);

        const topSum = tl + tr;
        if (topSum > width && topSum > 0) {
            const k = width / topSum;
            tl *= k;
            tr *= k;
        }

        const bottomSum = bl + br;
        if (bottomSum > width && bottomSum > 0) {
            const k = width / bottomSum;
            bl *= k;
            br *= k;
        }

        const leftSum = tl + bl;
        if (leftSum > height && leftSum > 0) {
            const k = height / leftSum;
            tl *= k;
            bl *= k;
        }

        const rightSum = tr + br;
        if (rightSum > height && rightSum > 0) {
            const k = height / rightSum;
            tr *= k;
            br *= k;
        }

        return { tl, tr, br, bl };
    }

    private _expandRadius(radius: number, delta: number): number {
        return radius <= 0 ? 0 : Math.max(0, radius + delta);
    }
}