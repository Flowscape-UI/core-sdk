import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface RegularPolygonNodeOptions extends BaseNodeOptions {
  sides?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class RegularPolygonNode extends BaseNode<Konva.RegularPolygon> {
  constructor(options: RegularPolygonNodeOptions = {}) {
    const poly = new Konva.RegularPolygon({} as Konva.RegularPolygonConfig);
    poly.x(options.x ?? 0);
    poly.y(options.y ?? 0);
    poly.sides(options.sides ?? 3);
    poly.radius(options.radius ?? 60);
    poly.fill(options.fill ?? 'black');
    poly.stroke(options.stroke ?? 'black');
    poly.strokeWidth(options.strokeWidth ?? 0);

    super(poly, options);
  }

  public getSides(): number {
    return this.konvaNode.sides();
  }
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

  public setSides(v: number): this {
    this.konvaNode.sides(v);
    return this;
  }
  public setRadius(v: number): this {
    this.konvaNode.radius(v);
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
