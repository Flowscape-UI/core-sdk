import { formatHex, parse, type Color } from "culori";
import { NodeType, type ID } from "../base";
import { ShapeBase } from "../shape";
import {
    FontDecoration,
    FontDecorationUnderlineStyle,
    type INodeText,
    type UnderlineStyleOptions,
} from "./types";
import {
    FontStyle,
    TextAlign,
    TextVerticalAlign,
    TextWrapMode,
} from "./types";

export class NodeText extends ShapeBase implements INodeText {
    public static readonly TEXT_SCALE = {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
        "4xl": 36,
        "5xl": 48,
        "6xl": 60,
    } as const;

    public static readonly FONT_WEIGHT = {
        THIN: 100,
        EXTRA_LIGHT: 200,
        LIGHT: 300,
        REGULAR: 400,
        MEDIUM: 500,
        SEMI_BOLD: 600,
        BOLD: 700,
        EXTRA_BOLD: 800,
        BLACK: 900,
    } as const;

    private static readonly DEFAULT_TEXT_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 0,
    };

    private static readonly MIN_FONT_WEIGHT: number = 100;
    private static readonly MAX_FONT_WEIGHT: number = 900;

    private _text: string;

    private _fontFamily: string;
    private _fontSize: number;
    private _fontWeight: number;
    private _fontStyle: FontStyle;

    private _fontDecoration: FontDecoration;
    private _underline: UnderlineStyleOptions;

    private _textAlign: TextAlign;
    private _verticalAlign: TextVerticalAlign;

    private _lineHeight: number;
    private _letterSpacing: number;
    private _wrapMode: TextWrapMode;

    constructor(id: ID, name?: string) {
        super(id, NodeType.Text, name ?? "Text");

        this.setSize(160, 48);

        this._text = "Text";

        this._fontFamily = "Inter";
        this._fontSize = NodeText.TEXT_SCALE.base;
        this._fontWeight = NodeText.FONT_WEIGHT.REGULAR;
        this._fontStyle = FontStyle.Normal;
        this._fontDecoration = FontDecoration.None;

        this._underline = {
            style: FontDecorationUnderlineStyle.Solid,
            skipInk: false,
            color: NodeText.DEFAULT_TEXT_COLOR,
            thickness: 1,
            offset: 0.2,
        };

        this._textAlign = TextAlign.Left;
        this._verticalAlign = TextVerticalAlign.Top;

        this._lineHeight = 1.2;
        this._letterSpacing = 0;
        this._wrapMode = TextWrapMode.Word;
    }

    /*********************************************************/
    /*                          Text                         */
    /*********************************************************/
    public getText(): string {
        return this._text;
    }

    public setText(value: string): void {
        if (value === this._text) {
            return;
        }

        this._text = value;
    }

    /*********************************************************/
    /*                          Font                         */
    /*********************************************************/
    public getFontFamily(): string {
        return this._fontFamily;
    }

    public setFontFamily(value: string): void {
        if (value === this._fontFamily) {
            return;
        }
        this._fontFamily = value;
    }

    public getFontSize(): number {
        return this._fontSize;
    }

    public setFontSize(value: number): void {
        const next = Math.max(1, value);
        if (next === this._fontSize) {
            return;
        }
        this._fontSize = next;
    }

    public getFontWeight(): number {
        return this._fontWeight;
    }

    public setFontWeight(value: number): void {
        const next = Math.max(
            NodeText.MIN_FONT_WEIGHT,
            Math.min(NodeText.MAX_FONT_WEIGHT, Math.round(value))
        );
        if (next === this._fontWeight) {
            return;
        }
        this._fontWeight = next;
    }

    public getFontStyle(): FontStyle {
        return this._fontStyle;
    }

    public setFontStyle(value: FontStyle): void {
        if (value === this._fontStyle) {
            return;
        }
        this._fontStyle = value;
    }

    /*********************************************************/
    /*                         Layout                        */
    /*********************************************************/
    public getTextAlign(): TextAlign {
        return this._textAlign;
    }

    public setTextAlign(value: TextAlign): void {
        if (value === this._textAlign) {
            return;
        }
        this._textAlign = value;
    }

    public getVerticalAlign(): TextVerticalAlign {
        return this._verticalAlign;
    }

    public setVerticalAlign(value: TextVerticalAlign): void {
        if (value === this._verticalAlign) {
            return;
        }
        this._verticalAlign = value;
    }

    public getLineHeight(): number {
        return this._lineHeight;
    }

    public setLineHeight(value: number): void {
        const next = Math.max(0, value);

        if (next === this._lineHeight) {
            return;
        }
        this._lineHeight = next;
    }

    public getLetterSpacing(): number {
        return this._letterSpacing;
    }

    public setLetterSpacing(value: number): void {
        if (value === this._letterSpacing) {
            return;
        }
        this._letterSpacing = value;
    }

    public getWrapMode(): TextWrapMode {
        return this._wrapMode;
    }

    public setWrapMode(value: TextWrapMode): void {
        if (value === this._wrapMode) {
            return;
        }
        this._wrapMode = value;
    }


    /*********************************************************/
    /*                      Decoration                       */
    /*********************************************************/
    public getFontDecoration(): FontDecoration {
        return this._fontDecoration;
    }

    public setFontDecoration(value: FontDecoration): void {
        if (value === this._fontDecoration) {
            return;
        }
        this._fontDecoration = value;
    }

    public getUnderlineStyle(): FontDecorationUnderlineStyle {
        return this._underline.style;
    }

    public setUnderlineStyle(value: FontDecorationUnderlineStyle): void {
        if (value === this._underline.style) {
            return;
        }
        this._underline = {
            ...this._underline,
            style: value,
        };
    }

    public isUnderlineSkipInk(): boolean {
        return this._underline.skipInk;
    }

    public setUnderlineSkipInk(value: boolean): void {
        if (value === this._underline.skipInk) {
            return;
        }
        this._underline = {
            ...this._underline,
            skipInk: value,
        };
    }

    public getUnderlineColor(): string {
        return formatHex(this._underline.color);
    }

    public setUnderlineColor(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;

        if (!color) {
            return;
        }

        if (formatHex(this._underline.color) === formatHex(color)) {
            return;
        }

        this._underline = {
            ...this._underline,
            color,
        };
    }

    public getUnderlineThickness(): number {
        return this._underline.thickness;
    }

    public setUnderlineThickness(value: number): void {
        const next = Math.max(0, value);

        if (next === this._underline.thickness) {
            return;
        }

        this._underline = {
            ...this._underline,
            thickness: next,
        };
    }

    public getUnderlineOffset(): number {
        return this._underline.offset;
    }

    public setUnderlineOffset(value: number): void {
        if (value === this._underline.offset) {
            return;
        }

        this._underline = {
            ...this._underline,
            offset: value,
        };
    }
}