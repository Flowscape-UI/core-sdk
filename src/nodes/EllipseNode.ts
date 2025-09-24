import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface EllipseNodeOptions extends BaseNodeOptions {
  radiusX?: number;
  radiusY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class EllipseNode extends BaseNode<Konva.Ellipse> {
  constructor(options: EllipseNodeOptions = {}) {
    const ellipse = new Konva.Ellipse({} as Konva.EllipseConfig);
    ellipse.x(options.x ?? 0);
    ellipse.y(options.y ?? 0);
    ellipse.radiusX(options.radiusX ?? 0);
    ellipse.radiusY(options.radiusY ?? 0);
    ellipse.fill(options.fill ?? 'black');
    ellipse.stroke(options.stroke ?? 'black');
    ellipse.strokeWidth(options.strokeWidth ?? 0);

    super(ellipse, options);
  }

  // ===== Getters =====
  public getRadiusX(): number {
    return this.konvaNode.radiusX();
  }

  public getRadiusY(): number {
    return this.konvaNode.radiusY();
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
  public setRadiusX(value: number): this {
    this.konvaNode.radiusX(value);
    return this;
  }

  public setRadiusY(value: number): this {
    this.konvaNode.radiusY(value);
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
