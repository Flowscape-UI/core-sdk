import Konva from "konva";
import { ShadowMode, type EffectShadow } from "../../../effect";
import { EffectType } from "../../../../nodes/shape/effect";

const SHADOW_GROUP_NAME = "effect-shadow-group";
const SHADOW_SHAPE_NAME = "effect-shadow-shape";
const SHADOW_CUTOUT_NAME = "effect-shadow-cutout";

export class RendererEffectShadow {
    public readonly type: EffectType;
    private readonly _effect: EffectShadow;
    private readonly _group: Konva.Group;
    private readonly _shadowShape: Konva.Shape;
    private readonly _cutoutShape: Konva.Shape;

    constructor(
        effect: EffectShadow,
        node: Konva.Node
    ) {
        this.type = EffectType.DropShadow;
        this._effect = effect;

        this._group = new Konva.Group({
            name: SHADOW_GROUP_NAME,
            listening: false,
        });

        // Clining node for shadow and cutout
        this._shadowShape = node.clone() as Konva.Shape;
        this._shadowShape.name(SHADOW_SHAPE_NAME);
        this._shadowShape.listening(false);

        this._cutoutShape = node.clone() as Konva.Shape;
        this._cutoutShape.name(SHADOW_CUTOUT_NAME);
        this._cutoutShape.listening(false);
        this._cutoutShape.globalCompositeOperation("destination-out");

        this._group.add(this._shadowShape, this._cutoutShape);
    }

    public getShadowShape(): Konva.Shape {
        return this._shadowShape;
    }

    public getView(): Konva.Group {
        return this._group;
    }

    public mount(parent: Konva.Group): void {
        parent.add(this._group);
        this._group.moveToBottom();
    }

    public update(): void {
        this._shadowShape.filters([]);
        this._shadowShape.blurRadius(0);
        this._shadowShape.clearCache();
        this._group.clearCache();

        if (!this._effect.isVisible()) {
            this._group.visible(false);
            return;
        }

        const blur = Math.max(0, this._effect.getBlur());
        const spread = this._effect.getSpread();
        const opacity = this._effect.getOpacity();
        const mode = this._effect.getMode();

        this._group.visible(true);
        this._group.opacity(opacity);
        this._group.position({
            x: Math.round(this._effect.getX()),
            y: Math.round(this._effect.getY()),
        });

        this._shadowShape.visible(true);
        this._shadowShape.fill(this._effect.getFill());
        this._shadowShape.setAttr("shadowSpread", spread);

        if (mode === ShadowMode.Cutout) {
            this._cutoutShape.setAttrs({
                rectWidth: this._shadowShape.getAttr("rectWidth"),
                rectHeight: this._shadowShape.getAttr("rectHeight"),
                strokeTop: this._shadowShape.getAttr("strokeTop"),
                strokeRight: this._shadowShape.getAttr("strokeRight"),
                strokeBottom: this._shadowShape.getAttr("strokeBottom"),
                strokeLeft: this._shadowShape.getAttr("strokeLeft"),
                strokeAlign: this._shadowShape.getAttr("strokeAlign"),
                radiusTopLeft: this._shadowShape.getAttr("radiusTopLeft"),
                radiusTopRight: this._shadowShape.getAttr("radiusTopRight"),
                radiusBottomRight: this._shadowShape.getAttr("radiusBottomRight"),
                radiusBottomLeft: this._shadowShape.getAttr("radiusBottomLeft"),
                shadowSpread: 0,
            });

            // Cutout должен быть на позиции оригинальной фигуры
            // _group смещён на offsetX/offsetY, поэтому cutout смещаем обратно
            this._cutoutShape.position({
                x: -Math.round(this._effect.getX()),
                y: -Math.round(this._effect.getY()),
            });

            this._cutoutShape.visible(true);
            this._cutoutShape.fill("#000");
        } else {
            this._cutoutShape.visible(false);
            this._cutoutShape.position({ x: 0, y: 0 });
        }

        const bounds = this._getShadowCacheBounds(this._shadowShape, blur);

        // 1. Сначала blur на shadowShape
        if (blur > 0) {
            this._shadowShape.cache(bounds);
            this._shadowShape.filters([Konva.Filters.Blur]);
            this._shadowShape.blurRadius(blur);
        }

        // 2. Потом group.cache — ТОЛЬКО после blur на shadowShape
        if (mode === ShadowMode.Cutout) {
            const width = this._shadowShape.getAttr("rectWidth") ?? 0;
            const height = this._shadowShape.getAttr("rectHeight") ?? 0;
            const padding = Math.max(4, Math.ceil(blur * 3)) + Math.max(0, spread);

            this._group.cache({
                x: Math.floor(-spread - padding),
                y: Math.floor(-spread - padding),
                width: Math.max(1, Math.ceil(width + spread * 2 + padding * 2)),
                height: Math.max(1, Math.ceil(height + spread * 2 + padding * 2)),
            });
        }
    }

    public clear(): void {
        this._group.visible(false);
        this._shadowShape.visible(false);
        this._shadowShape.filters([]);
        this._shadowShape.blurRadius(0);
        this._shadowShape.clearCache();
        this._group.clearCache();
    }

    public destroy(): void {
        this._group.destroy();
    }

    private _getShadowCacheBounds(shadowShape: Konva.Shape, blur: number) {
        const width = shadowShape.getAttr("rectWidth") ?? 0;
        const height = shadowShape.getAttr("rectHeight") ?? 0;
        const spread = Math.max(0, shadowShape.getAttr("shadowSpread") ?? 0);
        const padding = Math.max(4, Math.ceil(blur * 3));

        return {
            x: Math.floor(-spread - padding),
            y: Math.floor(-spread - padding),
            width: Math.max(1, Math.ceil(width + spread * 2 + padding * 2)),
            height: Math.max(1, Math.ceil(height + spread * 2 + padding * 2)),
        };
    }
}