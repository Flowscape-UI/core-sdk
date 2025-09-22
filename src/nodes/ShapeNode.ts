import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface ShapeNodeOptions extends BaseNodeOptions {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
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
    });
    super(shape, options);
  }

  public setFill(color: string) {
    this.konvaNode.fill(color);
  }

  public setStroke(color: string) {
    this.konvaNode.stroke(color);
  }

  public setStrokeWidth(width: number) {
    this.konvaNode.strokeWidth(width);
  }

  public setCornerRadius(radius: number) {
    this.konvaNode.cornerRadius(radius);
  }
}
