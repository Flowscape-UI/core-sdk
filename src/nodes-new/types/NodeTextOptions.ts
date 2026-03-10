import type { NodeRectOptions } from "./NodeRectOptions";

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextFontStyle = 'normal' | 'bold' | 'italic' | 'bold italic';
export type TextWrap = 'word' | 'char' | 'none';

export type NodeTextOptions = NodeRectOptions & {
    text?: string;

    fontSize?: number;
    fontFamily?: string;
    fontStyle?: TextFontStyle;

    align?: TextAlign;
    verticalAlign?: TextVerticalAlign;

    lineHeight?: number;
    wrap?: TextWrap;
    padding?: number;
};