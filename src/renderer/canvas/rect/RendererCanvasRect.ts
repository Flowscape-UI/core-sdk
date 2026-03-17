import Konva from "konva";

import { StrokeAlign, type CornerRadius, type NodeRect, type StrokeWidth } from "../../../nodes";
import { RendererCanvasBase } from "../base";
import { EffectType, type DropShadowEffect } from "../../../nodes/shape/effect";

const STROKE_SHAPE_NAME = "rect-stroke-shape";
const STROKE_SHAPE_SELECTOR = `.${STROKE_SHAPE_NAME}`;

const FILL_NAME = "rect-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;


const SHADOW_GROUP_NAME = "rect-shadow-group";
const SHADOW_GROUP_SELECTOR = `.${SHADOW_GROUP_NAME}`;

const SHADOW_SHAPE_NAME = "rect-shadow-shape";
const SHADOW_SHAPE_SELECTOR = `.${SHADOW_SHAPE_NAME}`;

const SHADOW_CUTOUT_NAME = "rect-shadow-cutout";
const SHADOW_CUTOUT_SELECTOR = `.${SHADOW_CUTOUT_NAME}`;

const SHADOW_BLUR_ROOT_NAME = "rect-shadow-blur-root";
const SHADOW_BLUR_ROOT_SELECTOR = `.${SHADOW_BLUR_ROOT_NAME}`;

export class RendererCanvasRect extends RendererCanvasBase<NodeRect> {
    public create(node: NodeRect): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id)
        });

        const strokeShape = new Konva.Shape({
            name: STROKE_SHAPE_NAME,
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

                let outerX = 0;
                let outerY = 0;
                let outerWidth = width;
                let outerHeight = height;

                let innerX = 0;
                let innerY = 0;
                let innerWidth = width;
                let innerHeight = height;

                let outerRadius: CornerRadius = { ...baseRadius };
                let innerRadius: CornerRadius = { ...baseRadius };

                const tlDelta = Math.max(l, t);
                const trDelta = Math.max(r, t);
                const brDelta = Math.max(r, b);
                const blDelta = Math.max(l, b);

                switch (align) {
                    case StrokeAlign.Inside:
                        outerX = 0;
                        outerY = 0;
                        outerWidth = width;
                        outerHeight = height;

                        innerX = l;
                        innerY = t;
                        innerWidth = width - l - r;
                        innerHeight = height - t - b;

                        outerRadius = { ...baseRadius };
                        innerRadius = {
                            tl: this._shrinkRadius(baseRadius.tl, tlDelta),
                            tr: this._shrinkRadius(baseRadius.tr, trDelta),
                            br: this._shrinkRadius(baseRadius.br, brDelta),
                            bl: this._shrinkRadius(baseRadius.bl, blDelta),
                        };
                        break;

                    case StrokeAlign.Center:
                        outerX = -l / 2;
                        outerY = -t / 2;
                        outerWidth = width + l / 2 + r / 2;
                        outerHeight = height + t / 2 + b / 2;

                        innerX = l / 2;
                        innerY = t / 2;
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
                        outerX = -l;
                        outerY = -t;
                        outerWidth = width + l + r;
                        outerHeight = height + t + b;

                        innerX = 0;
                        innerY = 0;
                        innerWidth = width;
                        innerHeight = height;

                        outerRadius = {
                            tl: this._expandRadius(baseRadius.tl, tlDelta),
                            tr: this._expandRadius(baseRadius.tr, trDelta),
                            br: this._expandRadius(baseRadius.br, brDelta),
                            bl: this._expandRadius(baseRadius.bl, blDelta),
                        };

                        innerRadius = { ...baseRadius };
                        break;
                }

                innerWidth = Math.max(0, innerWidth);
                innerHeight = Math.max(0, innerHeight);

                ctx.beginPath();

                this._appendRoundedRectPath(
                    ctx,
                    outerX,
                    outerY,
                    outerWidth,
                    outerHeight,
                    outerRadius
                );

                if (innerWidth > 0 && innerHeight > 0) {
                    this._appendRoundedRectPath(
                        ctx,
                        innerX,
                        innerY,
                        innerWidth,
                        innerHeight,
                        innerRadius
                    );
                }

                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill("evenodd");
            },
        });


        const shadowGroup = new Konva.Group({
            name: SHADOW_GROUP_NAME,
            listening: false,
            visible: false,
        });

        const shadowBlurRoot = new Konva.Group({
            name: SHADOW_BLUR_ROOT_NAME,
            listening: false,
            visible: false,
        });

        const shadowShape = new Konva.Shape({
            name: SHADOW_SHAPE_NAME,
            listening: false,
            perfectDrawEnabled: false,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                this._appendShadowOuterPath(ctx, shape, true);
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });

        const shadowCutout = new Konva.Shape({
            name: SHADOW_CUTOUT_NAME,
            listening: false,
            perfectDrawEnabled: false,
            globalCompositeOperation: "destination-out",
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                this._appendShadowOuterPath(ctx, shape, false);
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });

        shadowBlurRoot.add(shadowShape);
        shadowGroup.add(shadowBlurRoot, shadowCutout);
        group.add(
            shadowGroup,
            new Konva.Rect({ name: FILL_NAME }),
            strokeShape
        );

        return group;
    }

    protected onUpdate(node: NodeRect, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Rect>(view, FILL_SELECTOR);
        const strokeShape = this._findOneOrThrow<Konva.Shape>(view, STROKE_SHAPE_SELECTOR);

        const shadowGroup = this._findOneOrThrow<Konva.Group>(view, SHADOW_GROUP_SELECTOR);
        const shadowBlurRoot = this._findOneOrThrow<Konva.Group>(view, SHADOW_BLUR_ROOT_SELECTOR);
        const shadowShape = this._findOneOrThrow<Konva.Shape>(view, SHADOW_SHAPE_SELECTOR);
        const shadowCutout = this._findOneOrThrow<Konva.Shape>(view, SHADOW_CUTOUT_SELECTOR);



        // Transform
        const width = node.getWidth();
        const height = node.getHeight();

        fill.width(width);
        fill.height(height);

        // Fill
        fill.fill(node.getFill());

        // Corner radius
        const { tl, tr, br, bl } = node.getCornerRadius();
        fill.cornerRadius([tl, tr, br, bl]);

        // Stroke
        const strokeColor = node.getStrokeFill();
        const strokeWidth = node.getStrokeWidth();
        const strokeAlign = node.getStrokeAlign();

        const { t, r, b, l } = strokeWidth;

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

        // Effect
        const shadowAttrs = {
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
        };

        shadowShape.setAttrs(shadowAttrs);
        shadowCutout.setAttrs(shadowAttrs);

        this._updateEffects(
            node,
            shadowGroup,
            shadowBlurRoot,
            shadowShape,
            shadowCutout,
            view
        );
    }

    /***********************************************************************/
    /*                            Stroke Helpers                           */
    /***********************************************************************/

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

        if (w <= 0 || h <= 0) {
            return;
        }

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
        if (radius <= 0) {
            return 0;
        }
        return Math.max(0, radius + delta);
    }

    private _shrinkRadius(radius: number, delta: number): number {
        if (radius <= 0) {
            return 0;
        }
        return Math.max(0, radius - delta);
    }



    /***********************************************************************/
    /*                            Shadow Helpers                           */
    /***********************************************************************/

    private _updateEffects(
        node: NodeRect,
        shadowGroup: Konva.Group,
        shadowBlurRoot: Konva.Group,
        shadowShape: Konva.Shape,
        shadowCutout: Konva.Shape,
        view: Konva.Group
    ): void {
        this._clearEffects(shadowGroup, shadowBlurRoot, shadowShape, shadowCutout, view);

        const dropShadow: DropShadowEffect | undefined = node.effect.get(EffectType.DropShadow);

        if (dropShadow?.visible) {
            const shadowColor =
                typeof dropShadow.color === "string"
                    ? dropShadow.color
                    : "#000000";

            const shadowOpacity = Math.max(0, Math.min(1, dropShadow.opacity ?? 1));
            const shadowBlur = Math.max(0, dropShadow.blur ?? 0);
            const shadowSpread = Math.max(0, dropShadow.spread ?? 0);

            shadowShape.setAttr("shadowSpread", shadowSpread);
            shadowCutout.setAttr("shadowSpread", 0);

            shadowGroup.visible(true);
            shadowGroup.position({ x: 0, y: 0 });
            shadowGroup.opacity(shadowOpacity);

            shadowBlurRoot.visible(true);
            shadowBlurRoot.position({
                x: Math.round(dropShadow.x ?? 0),
                y: Math.round(dropShadow.y ?? 0),
            });

            shadowShape.visible(true);
            shadowShape.fill(shadowColor);

            shadowCutout.visible(true);
            shadowCutout.fill("#000");

            if (shadowBlur > 0) {
                const bounds = this._getShadowCacheBounds(shadowShape, shadowBlur);
                shadowBlurRoot.cache(bounds);
                shadowBlurRoot.filters([Konva.Filters.Blur]);
                shadowBlurRoot.blurRadius(shadowBlur);
            }


        }

        const layerBlur = node.effect.get(EffectType.LayerBlur);
        if (layerBlur?.visible && layerBlur.blur > 0) {
            const width = node.getWidth();
            const height = node.getHeight();

            if (width > 0 && height > 0) {
                view.cache({
                    x: -layerBlur.blur * 2,
                    y: -layerBlur.blur * 2,
                    width: width + layerBlur.blur * 4,
                    height: height + layerBlur.blur * 4,
                });
                view.filters([Konva.Filters.Blur]);
                view.blurRadius(layerBlur.blur);
            }
        }
    }

    private _clearEffects(
        shadowGroup: Konva.Group,
        shadowBlurRoot: Konva.Group,
        shadowShape: Konva.Shape,
        shadowCutout: Konva.Shape,
        view: Konva.Group
    ): void {
        shadowGroup.visible(false);
        shadowGroup.position({ x: 0, y: 0 });
        shadowGroup.opacity(1);

        shadowBlurRoot.visible(false);
        shadowBlurRoot.filters([]);
        shadowBlurRoot.blurRadius(0);
        shadowBlurRoot.clearCache();

        shadowShape.visible(false);
        shadowShape.fill("rgba(0,0,0,0)");
        shadowShape.setAttr("shadowSpread", 0);

        shadowCutout.visible(false);
        shadowCutout.fill("#000");
        shadowCutout.setAttr("shadowSpread", 0);

        view.filters([]);
        view.blurRadius(0);
        view.clearCache();
    }

    private _getShadowCacheBounds(
        shadowShape: Konva.Shape,
        blur: number
    ): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const width = shadowShape.getAttr("rectWidth") ?? 0;
        const height = shadowShape.getAttr("rectHeight") ?? 0;

        const t = shadowShape.getAttr("strokeTop") ?? 0;
        const r = shadowShape.getAttr("strokeRight") ?? 0;
        const b = shadowShape.getAttr("strokeBottom") ?? 0;
        const l = shadowShape.getAttr("strokeLeft") ?? 0;

        const align = shadowShape.getAttr("strokeAlign") ?? StrokeAlign.Inside;
        const spread = Math.max(0, shadowShape.getAttr("shadowSpread") ?? 0);

        let outerX = 0;
        let outerY = 0;
        let outerWidth = width;
        let outerHeight = height;

        switch (align) {
            case StrokeAlign.Inside:
                outerX = 0 - spread;
                outerY = 0 - spread;
                outerWidth = width + spread * 2;
                outerHeight = height + spread * 2;
                break;

            case StrokeAlign.Center:
                outerX = -l / 2 - spread;
                outerY = -t / 2 - spread;
                outerWidth = width + l / 2 + r / 2 + spread * 2;
                outerHeight = height + t / 2 + b / 2 + spread * 2;
                break;

            case StrokeAlign.Outside:
                outerX = -l - spread;
                outerY = -t - spread;
                outerWidth = width + l + r + spread * 2;
                outerHeight = height + t + b + spread * 2;
                break;
        }

        const padding = Math.max(4, Math.ceil(blur * 3));

        return {
            x: Math.floor(outerX - padding),
            y: Math.floor(outerY - padding),
            width: Math.max(1, Math.ceil(outerWidth + padding * 2)),
            height: Math.max(1, Math.ceil(outerHeight + padding * 2)),
        };
    }
    private _appendShadowOuterPath(
        ctx: CanvasRenderingContext2D,
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

        this._appendRoundedRectPath(
            ctx,
            outerX,
            outerY,
            outerWidth,
            outerHeight,
            outerRadius
        );
    }
}
