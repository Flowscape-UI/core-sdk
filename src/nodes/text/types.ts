import type { Color } from 'culori';
import type { IShapeBase } from '../shape';

export enum TextAlign {
    Left = 'left',
    Center = 'center',
    Right = 'right',
    Justify = 'justify',
}

export enum TextVerticalAlign {
    Top = 'top',
    Center = 'center',
    Bottom = 'bottom',
}

export enum TextWrapMode {
    None = 'none',
    Word = 'word',
    Character = 'character',
}

export enum FontStyle {
    Normal = 'normal',
    Italic = 'italic',
    Oblique = 'oblique',
}

export enum FontDecoration {
    None = 'none',
    Underline = 'underline',
    Striketrough = 'striketrough',
    Overline = 'overline',
}

export enum FontDecorationUnderlineStyle {
    Solid = 'solid',
    Dotted = 'dotted',
    Wavy = 'wavy',
}

export type UnderlineStyleOptions = {
    style: FontDecorationUnderlineStyle;
    skipInk: boolean;
    color: Color;
    thickness: number;
    offset: number;
};

export type FontWeight = number;

export interface INodeText extends IShapeBase {
    /*********************************************************/
    /*                          Font                         */
    /*********************************************************/

    /**
     * Returns the font family of the text.
     *
     * Возвращает семейство шрифта текста.
     */
    getFontFamily(): string;

    /**
     * Sets the font family of the text.
     *
     * Устанавливает семейство шрифта текста.
     */
    setFontFamily(value: string): void;

    /**
     * Returns the font size of the text.
     *
     * Возвращает размер шрифта текста.
     */
    getFontSize(): number;

    /**
     * Sets the font size of the text.
     *
     * Устанавливает размер шрифта текста.
     */
    setFontSize(value: number): void;

    /**
     * Returns the font weight of the text.
     *
     * Возвращает толщину шрифта текста.
     */
    getFontWeight(): number;

    /**
     * Sets the font weight of the text.
     *
     * Устанавливает толщину шрифта текста.
     */
    setFontWeight(value: number): void;

    /**
     * Returns the font style of the text.
     *
     * Возвращает стиль шрифта текста.
     */
    getFontStyle(): FontStyle;

    /**
     * Sets the font style of the text.
     *
     * Устанавливает стиль шрифта текста.
     */
    setFontStyle(value: FontStyle): void;

    /*********************************************************/
    /*                         Layout                        */
    /*********************************************************/

    /**
     * Returns the horizontal alignment of the text.
     *
     * Возвращает горизонтальное выравнивание текста.
     */
    getTextAlign(): TextAlign;

    /**
     * Sets the horizontal alignment of the text.
     *
     * Устанавливает горизонтальное выравнивание текста.
     */
    setTextAlign(value: TextAlign): void;

    /**
     * Returns the vertical alignment of the text.
     *
     * Возвращает вертикальное выравнивание текста.
     */
    getVerticalAlign(): TextVerticalAlign;

    /**
     * Sets the vertical alignment of the text.
     *
     * Устанавливает вертикальное выравнивание текста.
     */
    setVerticalAlign(value: TextVerticalAlign): void;

    /**
     * Returns the line height of the text.
     *
     * Возвращает межстрочный интервал текста.
     */
    getLineHeight(): number;

    /**
     * Sets the line height of the text.
     *
     * Устанавливает межстрочный интервал текста.
     */
    setLineHeight(value: number): void;

    /**
     * Returns the letter spacing of the text.
     *
     * Возвращает межбуквенный интервал текста.
     */
    getLetterSpacing(): number;

    /**
     * Sets the letter spacing of the text.
     *
     * Устанавливает межбуквенный интервал текста.
     */
    setLetterSpacing(value: number): void;

    /**
     * Returns the text wrapping mode.
     *
     * Возвращает режим переноса текста.
     */
    getWrapMode(): TextWrapMode;

    /**
     * Sets the text wrapping mode.
     *
     * Устанавливает режим переноса текста.
     */
    setWrapMode(value: TextWrapMode): void;

    /*********************************************************/
    /*                      Decoration                       */
    /*********************************************************/

    /**
     * Returns the text decoration mode.
     *
     * Возвращает режим декорации текста.
     */
    getFontDecoration(): FontDecoration;

    /**
     * Sets the text decoration mode.
     *
     * Устанавливает режим декорации текста.
     */
    setFontDecoration(value: FontDecoration): void;

    /**
     * Returns the underline style of the text.
     *
     * Возвращает стиль подчеркивания текста.
     */
    getUnderlineStyle(): FontDecorationUnderlineStyle;

    /**
     * Sets the underline style of the text.
     *
     * Устанавливает стиль подчеркивания текста.
     */
    setUnderlineStyle(value: FontDecorationUnderlineStyle): void;

    /**
     * Returns whether underline skip-ink is enabled.
     *
     * Возвращает, включен ли режим skip-ink для подчеркивания.
     */
    isUnderlineSkipInk(): boolean;

    /**
     * Enables or disables underline skip-ink.
     *
     * Включает или отключает режим skip-ink для подчеркивания.
     */
    setUnderlineSkipInk(value: boolean): void;

    /**
     * Returns the underline color in hex format.
     *
     * Возвращает цвет подчеркивания в формате hex.
     */
    getUnderlineColor(): string;

    /**
     * Sets the underline color.
     *
     * Accepts a CSS color string or a culori Color object.
     *
     * Устанавливает цвет подчеркивания.
     *
     * Принимает строку цвета CSS или объект цвета culori.
     */
    setUnderlineColor(value: string | Color): void;

    /**
     * Returns the underline thickness.
     *
     * Возвращает толщину подчеркивания.
     */
    getUnderlineThickness(): number;

    /**
     * Sets the underline thickness.
     *
     * Устанавливает толщину подчеркивания.
     */
    setUnderlineThickness(value: number): void;

    /**
     * Returns the underline offset.
     *
     * Возвращает смещение подчеркивания.
     */
    getUnderlineOffset(): number;

    /**
     * Sets the underline offset.
     *
     * Устанавливает смещение подчеркивания.
     */
    setUnderlineOffset(value: number): void;
}
