import type { INode } from "./INode";
import type { TextAlign, TextFontStyle, TextVerticalAlign, TextWrap } from "./NodeTextOptions";

export interface INodeText extends INode {
    getText(): string;
    setText(text: string): void;

    getFontSize(): number;
    setFontSize(size: number): void;

    getFontFamily(): string;
    setFontFamily(family: string): void;

    getFontStyle(): TextFontStyle;
    setFontStyle(style: TextFontStyle): void;

    getAlign(): TextAlign;
    setAlign(align: TextAlign): void;

    getVerticalAlign(): TextVerticalAlign;
    setVerticalAlign(align: TextVerticalAlign): void;

    getLineHeight(): number;
    setLineHeight(value: number): void;

    getWrap(): TextWrap;
    setWrap(wrap: TextWrap): void;

    getPadding(): number;
    setPadding(value: number): void;
}