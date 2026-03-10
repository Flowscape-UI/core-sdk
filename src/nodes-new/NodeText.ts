import type { TextNodeOptions } from '../nodes/TextNode';
import { NodeRect } from './NodeRect';
import type { INodeText, TextAlign, TextFontStyle, TextVerticalAlign, TextWrap } from './types';

export class NodeText extends NodeRect implements INodeText {
    private _text: string;

    private _fontSize: number;
    private _fontFamily: string;
    private _fontStyle: TextFontStyle;

    private _align: TextAlign;
    private _verticalAlign: TextVerticalAlign;

    private _lineHeight: number;
    private _wrap: TextWrap;
    private _padding: number;

    constructor(params: TextNodeOptions) {
        super({
            ...params,
            id: params.id ?? "text-id",
            x: params.x ?? 0,
            y: params.y ?? 0,
            width: params.width ?? 100,
            height: params.height ?? 100,
        });

        this._text = params.text ?? 'Text';

        this._fontSize = Math.max(1, params.fontSize ?? 16);
        this._fontFamily = params.fontFamily ?? 'Arial';
        this._fontStyle = params.fontStyle ?? 'normal';

        this._align = params.align ?? 'left';
        this._verticalAlign = params.verticalAlign ?? 'top';

        this._lineHeight = Math.max(0.1, params.lineHeight ?? 1.2);
        this._wrap = params.wrap ?? 'word';
        this._padding = Math.max(0, params.padding ?? 0);
    }

    public getText(): string {
        return this._text;
    }

    public setText(text: string): void {
        this._text = text;
    }

    public getFontSize(): number {
        return this._fontSize;
    }

    public setFontSize(size: number): void {
        this._fontSize = Math.max(1, size);
    }

    public getFontFamily(): string {
        return this._fontFamily;
    }

    public setFontFamily(family: string): void {
        this._fontFamily = family;
    }

    public getFontStyle(): TextFontStyle {
        return this._fontStyle;
    }

    public setFontStyle(style: TextFontStyle): void {
        this._fontStyle = style;
    }

    public getAlign(): TextAlign {
        return this._align;
    }

    public setAlign(align: TextAlign): void {
        this._align = align;
    }

    public getVerticalAlign(): TextVerticalAlign {
        return this._verticalAlign;
    }

    public setVerticalAlign(align: TextVerticalAlign): void {
        this._verticalAlign = align;
    }

    public getLineHeight(): number {
        return this._lineHeight;
    }

    public setLineHeight(value: number): void {
        this._lineHeight = Math.max(0.1, value);
    }

    public getWrap(): TextWrap {
        return this._wrap;
    }

    public setWrap(wrap: TextWrap): void {
        this._wrap = wrap;
    }

    public getPadding(): number {
        return this._padding;
    }

    public setPadding(value: number): void {
        this._padding = Math.max(0, value);
    }
}