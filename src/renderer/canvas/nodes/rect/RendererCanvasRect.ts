import Konva from "konva";
import { StrokeAlign, type CornerRadius, type NodeRect } from "../../../../nodes";
import { EffectType } from "../../../../nodes/shape/effect";
import { RendererEffectInnerShadow, RendererEffectShadow } from "../../effect/shadow";
import { RendererCanvasBase } from "../base";

const STROKE_SHAPE_NAME = "rect-stroke-shape";
const STROKE_SHAPE_SELECTOR = `.${STROKE_SHAPE_NAME}`;

const FILL_NAME = "rect-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

const EFFECT_LAYER_NAME = "rect-effect-layer";
const EFFECT_LAYER_SELECTOR = `.${EFFECT_LAYER_NAME}`;

export class RendererCanvasRect extends RendererCanvasBase<NodeRect> {
    private readonly _shadowRenderers = new Map<string, RendererEffectShadow>();
    private readonly _innerShadowRenderers = new Map<string, RendererEffectInnerShadow>();

    public create(node: NodeRect): Konva.Group {
        const group = new Konva.Group({ id: String(node.id) });

        const effectLayer = new Konva.Group({
            name: EFFECT_LAYER_NAME,
            listening: false,
        });

        const fill = new Konva.Rect({
            name: FILL_NAME,
            listening: false,
        });

        const strokeShape = this._createStrokeShape();

        effectLayer.add(fill, strokeShape);
        group.add(effectLayer);

        return group;
    }

    protected onUpdate(node: NodeRect, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Rect>(view, FILL_SELECTOR);
        const strokeShape = this._findOneOrThrow<Konva.Shape>(view, STROKE_SHAPE_SELECTOR);
        const effectLayer = this._findOneOrThrow<Konva.Group>(view, EFFECT_LAYER_SELECTOR);

        const width = node.getWidth();
        const height = node.getHeight();

        fill.width(width);
        fill.height(height);
        fill.fill(node.getFill());

        const { tl, tr, br, bl } = node.getCornerRadius();
        fill.cornerRadius([tl, tr, br, bl]);

        const strokeColor = node.getStrokeFill();
        const { t, r, b, l } = node.getStrokeWidth();
        const strokeAlign = node.getStrokeAlign();

        strokeShape.fill(strokeColor);
        strokeShape.setAttrs({
            rectWidth: width,
            rectHeight: height,
            strokeTop: t,
            strokeRight: r,
            strokeBottom: b,
            strokeLeft: l,
            strokeAlign,
            radiusTopLeft: tl,
            radiusTopRight: tr,
            radiusBottomRight: br,
            radiusBottomLeft: bl,
        });

        const shadowEffect = node.effect.get(EffectType.DropShadow) as any;
        const innerShadowEffect = node.effect.get(EffectType.InnerShadow) as any;

        let shadowRenderer = this._shadowRenderers.get(String(node.id));
        let innerShadowRenderer = this._innerShadowRenderers.get(String(node.id));

        if (!shadowRenderer && shadowEffect) {
            const shadowShape = this._createShadowShape();
            shadowRenderer = new RendererEffectShadow(
                shadowEffect,
                shadowShape
            );
            shadowRenderer.mount(effectLayer);
            this._shadowRenderers.set(String(node.id), shadowRenderer);
        }
        if (!innerShadowRenderer && innerShadowEffect) {
            const holeShape = this._createInnerShadowHoleShape();
            innerShadowRenderer = new RendererEffectInnerShadow(
                innerShadowEffect,
                holeShape
            );
            innerShadowRenderer.mount(effectLayer);
            this._innerShadowRenderers.set(String(node.id), innerShadowRenderer);
        }

        if (shadowRenderer) {
            shadowRenderer.getShadowShape().setAttrs({
                rectWidth: width,
                rectHeight: height,
                strokeTop: t,
                strokeRight: r,
                strokeBottom: b,
                strokeLeft: l,
                strokeAlign,
                radiusTopLeft: tl,
                radiusTopRight: tr,
                radiusBottomRight: br,
                radiusBottomLeft: bl,
            });
            shadowRenderer.update();
        }

        if (innerShadowRenderer) {
            innerShadowRenderer.getHoleShape().setAttrs({
                rectWidth: width,
                rectHeight: height,
                strokeTop: t,
                strokeRight: r,
                strokeBottom: b,
                strokeLeft: l,
                strokeAlign,
                radiusTopLeft: tl,
                radiusTopRight: tr,
                radiusBottomRight: br,
                radiusBottomLeft: bl,
            });

            innerShadowRenderer.update();
        }

        if (innerShadowRenderer) {
            innerShadowRenderer.getView().moveToTop();
            strokeShape.moveToTop();
        }
    }

    private _createStrokeShape(): Konva.Shape {
        return new Konva.Shape({
            name: STROKE_SHAPE_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
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

                let outerX = 0, outerY = 0, outerWidth = width, outerHeight = height;
                let innerX = 0, innerY = 0, innerWidth = width, innerHeight = height;
                let outerRadius: CornerRadius = { ...baseRadius };
                let innerRadius: CornerRadius = { ...baseRadius };

                const tlDelta = Math.max(l, t);
                const trDelta = Math.max(r, t);
                const brDelta = Math.max(r, b);
                const blDelta = Math.max(l, b);

                switch (align) {
                    case StrokeAlign.Inside:
                        innerX = l; innerY = t;
                        innerWidth = width - l - r;
                        innerHeight = height - t - b;
                        innerRadius = {
                            tl: this._shrinkRadius(baseRadius.tl, tlDelta),
                            tr: this._shrinkRadius(baseRadius.tr, trDelta),
                            br: this._shrinkRadius(baseRadius.br, brDelta),
                            bl: this._shrinkRadius(baseRadius.bl, blDelta),
                        };
                        break;
                    case StrokeAlign.Center:
                        outerX = -l / 2; outerY = -t / 2;
                        outerWidth = width + l / 2 + r / 2;
                        outerHeight = height + t / 2 + b / 2;
                        innerX = l / 2; innerY = t / 2;
                        innerWidth = width - l / 2 - r / 2;
                        innerHeight = height - t / 2 - b / 2;
                        outerRadius = {
                            tl: this._expandRadius(baseRadius.tl, tlDelta / 2),
                            tr: this._expandRadius(baseRadius.tr, trDelta / 2),
                            br: this._expandRadius(baseRadius.br, brDelta / 2),
                            bl: this._expandRadius(baseRadius.bl, blDelta / 2),
                        };
                        innerRadius = {
                            tl: this._shrinkRadius(baseRadius.tl, tlDelta / 2),
                            tr: this._shrinkRadius(baseRadius.tr, trDelta / 2),
                            br: this._shrinkRadius(baseRadius.br, brDelta / 2),
                            bl: this._shrinkRadius(baseRadius.bl, blDelta / 2),
                        };
                        break;
                    case StrokeAlign.Outside:
                        outerX = -l; outerY = -t;
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

                innerWidth = Math.max(0, innerWidth);
                innerHeight = Math.max(0, innerHeight);

                ctx.beginPath();
                this._appendRoundedRectPath(ctx, outerX, outerY, outerWidth, outerHeight, outerRadius);
                if (innerWidth > 0 && innerHeight > 0) {
                    this._appendRoundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius);
                }
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill("evenodd");
            },
        });
    }

    private _createShadowShape(): Konva.Shape {
        return new Konva.Shape({
            listening: false,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                this._appendShadowOuterPath(ctx, shape, true);
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });
    }

    private _createInnerShadowHoleShape(): Konva.Shape {
        return new Konva.Shape({
            listening: false,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                this._appendInnerShadowHolePath(ctx, shape);
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });
    }

    private _appendInnerShadowHolePath(
        ctx: Konva.Context,
        shape: Konva.Shape
    ): void {
        const width = shape.getAttr("rectWidth") ?? 0;
        const height = shape.getAttr("rectHeight") ?? 0;

        const t = shape.getAttr("strokeTop") ?? 0;
        const r = shape.getAttr("strokeRight") ?? 0;
        const b = shape.getAttr("strokeBottom") ?? 0;
        const l = shape.getAttr("strokeLeft") ?? 0;

        const align = shape.getAttr("strokeAlign") ?? StrokeAlign.Inside;
        const inset = Math.max(0, shape.getAttr("innerShadowInset") ?? 0);

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

        if (inset > 0) {
            outerX += inset;
            outerY += inset;
            outerWidth -= inset * 2;
            outerHeight -= inset * 2;
            outerRadius = {
                tl: this._shrinkRadius(outerRadius.tl, inset),
                tr: this._shrinkRadius(outerRadius.tr, inset),
                br: this._shrinkRadius(outerRadius.br, inset),
                bl: this._shrinkRadius(outerRadius.bl, inset),
            };
        }

        if (outerWidth <= 0 || outerHeight <= 0) {
            return;
        }

        this._appendRoundedRectPath(ctx, outerX, outerY, outerWidth, outerHeight, outerRadius);
    }

    private _appendShadowOuterPath(
        ctx: Konva.Context,
        shape: Konva.Shape,
        includeSpread: boolean
    ): void {
        const width = shape.getAttr("rectWidth") ?? 0;
        const height = shape.getAttr("rectHeight") ?? 0;

        const t = shape.getAttr("strokeTop") ?? 0;
        const r = shape.getAttr("strokeRight") ?? 0;
        const b = shape.getAttr("strokeBottom") ?? 0;
        const l = shape.getAttr("strokeLeft") ?? 0;

        const align = shape.getAttr("strokeAlign") ?? StrokeAlign.Inside;
        const spread = includeSpread ? Math.max(0, shape.getAttr("shadowSpread") ?? 0) : 0;

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

        if (spread > 0) {
            outerX -= spread;
            outerY -= spread;
            outerWidth += spread * 2;
            outerHeight += spread * 2;
            outerRadius = {
                tl: this._expandRadius(outerRadius.tl, spread),
                tr: this._expandRadius(outerRadius.tr, spread),
                br: this._expandRadius(outerRadius.br, spread),
                bl: this._expandRadius(outerRadius.bl, spread),
            };
        }

        this._appendRoundedRectPath(ctx, outerX, outerY, outerWidth, outerHeight, outerRadius);
    }

    private _appendRoundedRectPath(
        ctx: Konva.Context,
        x: number, y: number, width: number, height: number,
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

    private _normalizeCornerRadius(width: number, height: number, radius: CornerRadius): CornerRadius {
        let tl = Math.max(0, radius.tl);
        let tr = Math.max(0, radius.tr);
        let br = Math.max(0, radius.br);
        let bl = Math.max(0, radius.bl);

        const topSum = tl + tr;
        if (topSum > width && topSum > 0) { const k = width / topSum; tl *= k; tr *= k; }
        const bottomSum = bl + br;
        if (bottomSum > width && bottomSum > 0) { const k = width / bottomSum; bl *= k; br *= k; }
        const leftSum = tl + bl;
        if (leftSum > height && leftSum > 0) { const k = height / leftSum; tl *= k; bl *= k; }
        const rightSum = tr + br;
        if (rightSum > height && rightSum > 0) { const k = height / rightSum; tr *= k; br *= k; }

        return { tl, tr, br, bl };
    }

    private _expandRadius(radius: number, delta: number): number {
        return radius <= 0 ? 0 : Math.max(0, radius + delta);
    }

    private _shrinkRadius(radius: number, delta: number): number {
        return radius <= 0 ? 0 : Math.max(0, radius - delta);
    }
}