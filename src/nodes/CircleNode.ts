import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface CircleNodeOptions extends BaseNodeOptions {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class CircleNode extends BaseNode<Konva.Circle> {
  constructor(options: CircleNodeOptions = {}) {
    const circle = new Konva.Circle({} as Konva.CircleConfig);
    circle.x(options.x ?? 0);
    circle.y(options.y ?? 0);
    circle.radius(options.radius ?? 0);
    circle.fill(options.fill ?? 'black');
    circle.stroke(options.stroke ?? 'black');
    circle.strokeWidth(options.strokeWidth ?? 0);
    circle.draggable(true);

    super(circle, options);
  }

  // ===== Getters =====
  public getRadius(): number {
    return this.konvaNode.radius();
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

  // ===== Chainable setters =====
  public setRadius(radius: number): this {
    this.konvaNode.radius(radius);
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
