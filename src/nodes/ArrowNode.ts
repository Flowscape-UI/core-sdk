import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface ArrowNodeOptions extends BaseNodeOptions {
  points?: number[]; // [x1, y1, x2, y2, ...]
  tension?: number;
  pointerLength?: number;
  pointerWidth?: number;
  pointerAtBeginning?: boolean;
  pointerAtEnding?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class ArrowNode extends BaseNode<Konva.Arrow> {
  constructor(options: ArrowNodeOptions = {}) {
    const arrow = new Konva.Arrow({} as Konva.ArrowConfig);
    arrow.x(options.x ?? 0);
    arrow.y(options.y ?? 0);
    arrow.points(options.points ?? []);
    if (options.tension) arrow.tension(options.tension);
    if (options.pointerLength) arrow.pointerLength(options.pointerLength);
    if (options.pointerWidth) arrow.pointerWidth(options.pointerWidth);
    if (options.pointerAtBeginning) arrow.pointerAtBeginning(options.pointerAtBeginning);
    if (options.pointerAtEnding) arrow.pointerAtEnding(options.pointerAtEnding);
    arrow.fill(options.fill ?? 'black');
    arrow.stroke(options.stroke ?? 'black');
    arrow.strokeWidth(options.strokeWidth ?? 0);

    super(arrow, options);
  }

  public getPoints(): number[] {
    return this.konvaNode.points();
  }
  public getTension(): number {
    return this.konvaNode.tension();
  }
  public getPointerLength(): number {
    return this.konvaNode.pointerLength();
  }
  public getPointerWidth(): number {
    return this.konvaNode.pointerWidth();
  }
  public getPointerAtBeginning(): boolean {
    return this.konvaNode.pointerAtBeginning();
  }
  public getPointerAtEnding(): boolean {
    return this.konvaNode.pointerAtEnding();
  }

  public setPoints(v: number[]): this {
    this.konvaNode.points(v);
    return this;
  }
  public setTension(v: number): this {
    this.konvaNode.tension(v);
    return this;
  }
  public setPointerLength(v: number): this {
    this.konvaNode.pointerLength(v);
    return this;
  }
  public setPointerWidth(v: number): this {
    this.konvaNode.pointerWidth(v);
    return this;
  }
  public setPointerAtBeginning(v: boolean): this {
    this.konvaNode.pointerAtBeginning(v);
    return this;
  }
  public setPointerAtEnding(v: boolean): this {
    this.konvaNode.pointerAtEnding(v);
    return this;
  }
  public setFill(color: string): this {
    this.konvaNode.fill(color);
    return this;
  }
  public setStroke(color: string): this {
    this.konvaNode.stroke(color);
    return this;
  }
  public setStrokeWidth(width: number): this {
    this.konvaNode.strokeWidth(width);
    return this;
  }
}
