import type { Color } from "culori";

export type CornerRadius = {
    tl: number;
    tr: number;
    br: number;
    bl: number;
};

export type StrokeWidth = {
    t: number;
    r: number;
    b: number;
    l: number;
};

export enum StrokeAlign {
    Inside = 0,
    Center = 1,
    Outside = 2,
}

export enum EffectType {
    None = "none",
    InnerShadow = "inner-shadow",
    DropShadow = "drop-shadow",
    LayerBlur = "layer-blur",
    BackgroundBlur = "background-blur",
    Noise = "noise",
    Texture = "texture",
    Glass = "glass",
}

export interface IShapeBase {
    /***********************************************************/
    /*                        Appearance                       */
    /***********************************************************/
    /**
     * Returns the corner radius values for the rectangle.
     *
     * Возвращает значения радиусов углов прямоугольника.
     */
    getCornerRadius(): CornerRadius;

    /**
     * Sets the corner radius values for the rectangle.
     *
     * Устанавливает радиусы углов прямоугольника.
     */
    setCornerRadius(value: CornerRadius): void;


    /**
     * Returns the fill color of the rectangle in hex format.
     *
     * Возвращает цвет заливки прямоугольника в формате hex.
     */
    getFill(): string;

    /**
     * Sets the fill color of the rectangle.
     * Accepts a CSS color string or a culori Color object.
     *
     * Устанавливает цвет заливки прямоугольника.
     * Принимает строку цвета CSS или объект цвета culori.
     */
    setFill(value: string | Color): void;


    /***********************************************************/
    /*                          Stroke                         */
    /***********************************************************/

    /**
     * Returns the stroke width for each side of the rectangle.
     *
     * Возвращает толщину обводки для каждой стороны прямоугольника.
     */
    getStrokeWidth(): StrokeWidth;

    /**
     * Sets the stroke width for each side of the rectangle.
     *
     * Устанавливает толщину обводки для каждой стороны прямоугольника.
     */
    setStrokeWidth(value: StrokeWidth): void;

    /**
     * Returns the stroke color in hex format.
     *
     * Возвращает цвет обводки в формате hex.
     */
    getStrokeFill(): string;

    /**
     * Sets the stroke color.
     * Accepts a CSS color string or a culori Color object.
     *
     * Устанавливает цвет обводки.
     * Принимает строку цвета CSS или объект цвета culori.
     */
    setStrokeFill(value: string | Color): void;

    /**
     * Returns the stroke alignment mode.
     *
     * Возвращает режим выравнивания обводки.
     */
    getStrokeAlign(): StrokeAlign;

    /**
     * Sets the stroke alignment mode.
     *
     * Устанавливает режим выравнивания обводки.
     */
    setStrokeAlign(value: StrokeAlign): void;


    /***********************************************************/
    /*                          Effect                         */
    /***********************************************************/

    /**
     * Returns the visual effect applied to the rectangle.
     *
     * Возвращает визуальный эффект, применённый к прямоугольнику.
     */
    getEffect(): EffectType;

    /**
     * Sets the visual effect applied to the rectangle.
     *
     * Устанавливает визуальный эффект для прямоугольника.
     */
    setEffect(value: EffectType): void;
}