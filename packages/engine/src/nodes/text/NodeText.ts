import { formatHex, parse, type Color } from "culori";
import { NodeType } from "../base";
import { ShapeBase, type ShapePathCommand } from "../shape";
import { matrixInvert } from "../utils/matrix-invert";
import type { Vector2 } from "../../core/transform/types";
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
import type { ID } from "../../core/types";

export class NodeText extends ShapeBase implements INodeText {
    private static _measureContext: CanvasRenderingContext2D | null = null;

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

    public getLineHitBoxes(): { x: number; y: number; width: number; height: number }[] {
        return this._computeLineHitBoxes().map((box) => ({ ...box }));
    }

    public override hitTest(worldPoint: Vector2): boolean {
        const bounds = this.getWorldAABB();

        if (
            worldPoint.x < bounds.x ||
            worldPoint.x > bounds.x + bounds.width ||
            worldPoint.y < bounds.y ||
            worldPoint.y > bounds.y + bounds.height
        ) {
            return false;
        }

        try {
            const invMatrix = matrixInvert(this.getWorldMatrix());
            const localPoint = this._applyMatrixToPoint(invMatrix, worldPoint);

            const hitBoxes = this._computeLineHitBoxes();
            if (hitBoxes.length === 0) {
                return false;
            }

            const padding = Math.max(1, this._fontSize * 0.08);

            for (const box of hitBoxes) {
                if (
                    localPoint.x >= box.x - padding &&
                    localPoint.x <= box.x + box.width + padding &&
                    localPoint.y >= box.y - padding &&
                    localPoint.y <= box.y + box.height + padding
                ) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    public override toPathCommands(): readonly ShapePathCommand[] {
        const lines = this._getLayoutLines();

        if (lines.length === 0) {
            return [];
        }

        const width = Math.max(0, this.getWidth());
        const height = Math.max(0, this.getHeight());

        const lineHeightPx = Math.max(1, this._fontSize * Math.max(0, this._lineHeight));
        const textHeight = lines.length * lineHeightPx;

        let offsetY = 0;

        switch (this._verticalAlign) {
            case TextVerticalAlign.Center:
                offsetY = (height - textHeight) / 2;
                break;
            case TextVerticalAlign.Bottom:
                offsetY = height - textHeight;
                break;
            case TextVerticalAlign.Top:
            default:
                offsetY = 0;
                break;
        }

        const commands: ShapePathCommand[] = [];

        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i]!;
            let lineWidth = line.width;

            if (this._textAlign === TextAlign.Justify && line.text.trim().length > 0) {
                lineWidth = width;
            }

            if (lineWidth <= 0) {
                continue;
            }

            let x = 0;

            switch (this._textAlign) {
                case TextAlign.Center:
                    x = (width - lineWidth) / 2;
                    break;
                case TextAlign.Right:
                    x = width - lineWidth;
                    break;
                case TextAlign.Left:
                case TextAlign.Justify:
                default:
                    x = 0;
                    break;
            }

            const y = offsetY + (i + 1) * lineHeightPx;

            commands.push({
                type: "moveTo",
                point: { x, y },
            });
            commands.push({
                type: "lineTo",
                point: { x: x + lineWidth, y },
            });
        }

        return commands;
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

    private _getLayoutLines(): { text: string; width: number }[] {
        const source = this._text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const paragraphs = source.split("\n");

        const maxWidth = Math.max(0, this.getWidth());
        const lines: string[] = [];

        for (const paragraph of paragraphs) {
            if (this._wrapMode === TextWrapMode.None || maxWidth <= 0) {
                lines.push(paragraph);
                continue;
            }

            const wrapped = this._wrapMode === TextWrapMode.Word
                ? this._wrapParagraphByWords(paragraph, maxWidth)
                : this._wrapParagraphByCharacters(paragraph, maxWidth);

            if (wrapped.length === 0) {
                lines.push("");
            } else {
                lines.push(...wrapped);
            }
        }

        if (lines.length === 0) {
            return [];
        }

        return lines.map((text) => ({
            text,
            width: this._measureTextWidth(text),
        }));
    }

    private _computeLineHitBoxes(): { x: number; y: number; width: number; height: number }[] {
        const lines = this._getLayoutLines();

        if (lines.length === 0) {
            return [];
        }

        const width = Math.max(0, this.getWidth());
        const height = Math.max(0, this.getHeight());

        const lineHeightPx = Math.max(1, this._fontSize * Math.max(0, this._lineHeight));
        const textHeight = lines.length * lineHeightPx;

        let offsetY = 0;

        switch (this._verticalAlign) {
            case TextVerticalAlign.Center:
                offsetY = (height - textHeight) / 2;
                break;
            case TextVerticalAlign.Bottom:
                offsetY = height - textHeight;
                break;
            case TextVerticalAlign.Top:
            default:
                offsetY = 0;
                break;
        }

        const boxes: { x: number; y: number; width: number; height: number }[] = [];

        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i]!;
            let lineWidth = line.width;

            if (this._textAlign === TextAlign.Justify && line.text.trim().length > 0) {
                lineWidth = width;
            }

            if (lineWidth <= 0) {
                continue;
            }

            let x = 0;

            switch (this._textAlign) {
                case TextAlign.Center:
                    x = (width - lineWidth) / 2;
                    break;
                case TextAlign.Right:
                    x = width - lineWidth;
                    break;
                case TextAlign.Left:
                case TextAlign.Justify:
                default:
                    x = 0;
                    break;
            }

            const baselineY = offsetY + (i + 1) * lineHeightPx;
            const glyphHeight = Math.max(1, this._fontSize);
            const glyphTop = baselineY - glyphHeight;

            boxes.push({
                x,
                y: glyphTop,
                width: lineWidth,
                height: glyphHeight,
            });
        }

        return boxes;
    }

    private _wrapParagraphByWords(paragraph: string, maxWidth: number): string[] {
        if (paragraph.length === 0) {
            return [""];
        }

        const words = paragraph.trim().split(/\s+/).filter((word) => word.length > 0);

        if (words.length === 0) {
            return [""];
        }

        const lines: string[] = [];
        let current = "";

        for (const word of words) {
            const candidate = current.length === 0 ? word : `${current} ${word}`;

            if (current.length > 0 && this._measureTextWidth(candidate) > maxWidth) {
                lines.push(current);

                if (this._measureTextWidth(word) > maxWidth) {
                    const splitWord = this._wrapParagraphByCharacters(word, maxWidth);
                    lines.push(...splitWord.slice(0, -1));
                    current = splitWord[splitWord.length - 1] ?? "";
                } else {
                    current = word;
                }
            } else {
                current = candidate;
            }
        }

        if (current.length > 0) {
            lines.push(current);
        }

        return lines;
    }

    private _wrapParagraphByCharacters(paragraph: string, maxWidth: number): string[] {
        if (paragraph.length === 0) {
            return [""];
        }

        const lines: string[] = [];
        let current = "";

        for (const char of paragraph) {
            const candidate = current + char;

            if (current.length > 0 && this._measureTextWidth(candidate) > maxWidth) {
                lines.push(current);
                current = char;
            } else {
                current = candidate;
            }
        }

        if (current.length > 0) {
            lines.push(current);
        }

        return lines;
    }

    private _measureTextWidth(value: string): number {
        if (value.length === 0) {
            return 0;
        }

        const context = NodeText._getMeasureContext();

        let width = value.length * this._fontSize * 0.6;

        if (context) {
            context.font = this._getFontShorthand();
            width = context.measureText(value).width;
        }

        if (this._letterSpacing !== 0 && value.length > 1) {
            width += this._letterSpacing * (value.length - 1);
        }

        return Math.max(0, width);
    }

    private _getFontShorthand(): string {
        const style = this._fontStyle === FontStyle.Normal
            ? "normal"
            : this._fontStyle;

        return `${style} ${this._fontWeight} ${this._fontSize}px ${this._fontFamily}`;
    }

    private static _getMeasureContext(): CanvasRenderingContext2D | null {
        if (NodeText._measureContext) {
            return NodeText._measureContext;
        }

        if (typeof document === "undefined") {
            return null;
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            return null;
        }

        NodeText._measureContext = context;
        return NodeText._measureContext;
    }
}
