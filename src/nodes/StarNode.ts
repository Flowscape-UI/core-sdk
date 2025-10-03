import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface StarNodeOptions extends BaseNodeOptions {
  numPoints?: number; // points count
  innerRadius?: number;
  outerRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class StarNode extends BaseNode<Konva.Star> {
  constructor(options: StarNodeOptions = {}) {
    const star = new Konva.Star({} as Konva.StarConfig);
    star.x(options.x ?? 0);
    star.y(options.y ?? 0);
    star.numPoints(options.numPoints ?? 5);
    star.innerRadius(options.innerRadius ?? 20);
    star.outerRadius(options.outerRadius ?? 40);
    star.fill(options.fill ?? 'black');
    star.stroke(options.stroke ?? 'black');
    star.strokeWidth(options.strokeWidth ?? 0);

    super(star, options);
  }

  public getNumPoints(): number {
    return this.konvaNode.numPoints();
  }

  public getInnerRadius(): number {
    return this.konvaNode.innerRadius();
  }

  public getOuterRadius(): number {
    return this.konvaNode.outerRadius();
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

  public setNumPoints(v: number): this {
    this.konvaNode.numPoints(v);
    return this;
  }

  public setInnerRadius(v: number): this {
    this.konvaNode.innerRadius(v);
    return this;
  }

  public setOuterRadius(v: number): this {
    this.konvaNode.outerRadius(v);
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
