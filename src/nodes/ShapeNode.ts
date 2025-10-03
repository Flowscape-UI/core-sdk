import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface ShapeNodeOptions extends BaseNodeOptions {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number | number[];
}

export class ShapeNode extends BaseNode<Konva.Rect> {
  constructor(options: ShapeNodeOptions) {
    const shape = new Konva.Rect({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.width ?? 100,
      height: options.height ?? 100,
      fill: options.fill ?? 'lightgray',
      stroke: options.stroke ?? 'black',
      strokeWidth: options.strokeWidth ?? 1,
      cornerRadius: options.cornerRadius ?? 0,
      draggable: true,
    });
    super(shape, options);
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

  public setCornerRadius(radius: number | number[]): this {
    this.konvaNode.cornerRadius(radius);
    return this;
  }

  public setSize({ width, height }: { width: number; height: number }): this {
    this.konvaNode.size({ width, height });
    return this;
  }

  public getFill(): string | undefined {
    return this.konvaNode.fill() as string | undefined;
  }

  public getStroke(): string | undefined {
    return this.konvaNode.stroke() as string | undefined;
  }

  public getStrokeWidth(): number {
    return this.konvaNode.strokeWidth();
  }

  public getCornerRadius(): number {
    return this.konvaNode.cornerRadius() as number;
  }
}
