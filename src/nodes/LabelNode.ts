import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export type PointerDirection = 'up' | 'right' | 'down' | 'left' | 'none';

export interface LabelNodeOptions extends BaseNodeOptions {
  // Text options
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  textFill?: string;

  // Tag (background) options
  tagFill?: string;
  tagPointerDirection?: PointerDirection; // default: 'none'
  tagPointerWidth?: number;
  tagPointerHeight?: number;
  tagCornerRadius?: number | [number, number, number, number];
}

export class LabelNode extends BaseNode<Konva.Label> {
  private _tag: Konva.Tag;
  private _text: Konva.Text;

  constructor(options: LabelNodeOptions = {}) {
    const label = new Konva.Label({} as Konva.LabelConfig);

    // Position from BaseNodeOptions
    label.x(options.x ?? 0);
    label.y(options.y ?? 0);

    // Create child Tag and Text in consistent order
    const tag = new Konva.Tag({} as Konva.TagConfig);
    const text = new Konva.Text({} as Konva.TextConfig);

    // Configure Tag (background)
    tag.fill(options.tagFill ?? 'transparent');
    tag.pointerDirection(options.tagPointerDirection ?? 'none');
    if (options.tagPointerWidth !== undefined) tag.pointerWidth(options.tagPointerWidth);
    if (options.tagPointerHeight !== undefined) tag.pointerHeight(options.tagPointerHeight);
    if (options.tagCornerRadius !== undefined) tag.cornerRadius(options.tagCornerRadius as number);

    // Configure Text (content)
    text.text(options.text ?? '');
    text.fontFamily(options.fontFamily ?? 'Calibri');
    text.fontSize(options.fontSize ?? 18);
    text.padding(options.padding ?? 5);
    text.fill(options.textFill ?? 'black');

    // Assemble label
    label.add(tag);
    label.add(text);

    super(label, options);

    this._tag = tag;
    this._text = text;
  }

  // ===== Getters =====
  public getText(): string {
    return this._text.text();
  }

  public getFontFamily(): string {
    return this._text.fontFamily();
  }

  public getFontSize(): number {
    return this._text.fontSize();
  }

  public getPadding(): number {
    return this._text.padding();
  }

  public getTextFill(): string | undefined {
    return this._text.fill() as string | undefined;
  }

  public getTagFill(): string | undefined {
    return this._tag.fill() as string | undefined;
  }

  public getTagPointerDirection(): PointerDirection {
    return this._tag.pointerDirection() as PointerDirection;
  }

  public getTagPointerWidth(): number {
    return this._tag.pointerWidth();
  }

  public getTagPointerHeight(): number {
    return this._tag.pointerHeight();
  }

  public getTagCornerRadius(): number | [number, number, number, number] {
    return this._tag.cornerRadius() as number | [number, number, number, number];
  }

  // ===== Chainable setters =====
  public setText(value: string): this {
    this._text.text(value);
    return this;
  }

  public setFontFamily(value: string): this {
    this._text.fontFamily(value);
    return this;
  }

  public setFontSize(value: number): this {
    this._text.fontSize(value);
    return this;
  }

  public setPadding(value: number): this {
    this._text.padding(value);
    return this;
  }

  public setTextFill(color: string): this {
    this._text.fill(color);
    return this;
  }

  public setTagFill(color: string): this {
    this._tag.fill(color);
    return this;
  }

  public setTagPointerDirection(direction: PointerDirection): this {
    this._tag.pointerDirection(direction);
    return this;
  }

  public setTagPointerWidth(value: number): this {
    this._tag.pointerWidth(value);
    return this;
  }

  public setTagPointerHeight(value: number): this {
    this._tag.pointerHeight(value);
    return this;
  }

  public setTagCornerRadius(value: number | [number, number, number, number]): this {
    this._tag.cornerRadius(value as number);
    return this;
  }
}
