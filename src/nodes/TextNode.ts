import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface TextNodeOptions extends BaseNodeOptions {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: 'left' | 'center' | 'right';
  padding?: number;
}

export class TextNode extends BaseNode<Konva.Text> {
  constructor(options: TextNodeOptions = {}) {
    const node = new Konva.Text({
      x: options.x ?? 0,
      y: options.y ?? 0,
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
      text: options.text ?? 'Text',
      fontSize: options.fontSize ?? 16,
      fontFamily: options.fontFamily ?? 'Inter, Arial, sans-serif',
      fontStyle: options.fontStyle ?? 'normal',
      fill: options.fill ?? '#ffffff',
      align: options.align ?? 'left',
      padding: options.padding ?? 0,
    });
    super(node, options);
  }

  public getText(): string {
    return this.konvaNode.text();
  }

  public getFontSize(): number {
    return this.konvaNode.fontSize();
  }

  public getFontFamily(): string {
    return this.konvaNode.fontFamily();
  }

  public getFontStyle(): string {
    return this.konvaNode.fontStyle();
  }

  public getFill(): string | undefined {
    return this.konvaNode.fill() as string | undefined;
  }

  public getAlign(): 'left' | 'center' | 'right' {
    return this.konvaNode.align() as 'left' | 'center' | 'right';
  }

  public getPadding(): number {
    return this.konvaNode.padding();
  }

  public getSize(): { width: number; height: number } {
    return this.konvaNode.size();
  }

  public setText(text: string): this {
    this.konvaNode.text(text);
    return this;
  }

  public setFontSize(size: number): this {
    this.konvaNode.fontSize(size);
    return this;
  }

  public setFontFamily(family: string): this {
    this.konvaNode.fontFamily(family);
    return this;
  }

  public setFontStyle(style: string): this {
    this.konvaNode.fontStyle(style);
    return this;
  }

  public setFill(color: string): this {
    this.konvaNode.fill(color);
    return this;
  }

  public setAlign(align: 'left' | 'center' | 'right'): this {
    this.konvaNode.align(align);
    return this;
  }

  public setPadding(padding: number): this {
    this.konvaNode.padding(padding);
    return this;
  }

  public setSize({ width, height }: { width: number; height: number }): this {
    this.konvaNode.size({ width, height });
    return this;
  }
}
