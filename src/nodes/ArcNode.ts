import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface ArcNodeOptions extends BaseNodeOptions {
  innerRadius?: number;
  outerRadius?: number;
  angle?: number; // degrees
  rotation?: number; // degrees (start angle by rotation)
  clockwise?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class ArcNode extends BaseNode<Konva.Arc> {
  constructor(options: ArcNodeOptions = {}) {
    const arc = new Konva.Arc({} as Konva.ArcConfig);
    arc.x(options.x ?? 0);
    arc.y(options.y ?? 0);
    arc.innerRadius(options.innerRadius ?? 0);
    arc.outerRadius(options.outerRadius ?? 0);
    arc.angle(options.angle ?? 0);
    arc.rotation(options.rotation ?? 0);
    if (options.clockwise !== undefined) arc.clockwise(options.clockwise);
    arc.fill(options.fill ?? 'black');
    arc.stroke(options.stroke ?? 'black');
    arc.strokeWidth(options.strokeWidth ?? 0);

    super(arc, options);
  }

  // Getters
  public getInnerRadius(): number {
    return this.konvaNode.innerRadius();
  }
  public getOuterRadius(): number {
    return this.konvaNode.outerRadius();
  }
  public getAngle(): number {
    return this.konvaNode.angle();
  }
  public isClockwise(): boolean {
    return this.konvaNode.clockwise();
  }

  // Setters (chainable)
  public setInnerRadius(v: number): this {
    this.konvaNode.innerRadius(v);
    return this;
  }
  public setOuterRadius(v: number): this {
    this.konvaNode.outerRadius(v);
    return this;
  }
  public setAngle(v: number): this {
    this.konvaNode.angle(v);
    return this;
  }
  public setRotationDeg(v: number): this {
    this.konvaNode.rotation(v);
    return this;
  }
  public setClockwise(v: boolean): this {
    this.konvaNode.clockwise(v);
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
