import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface RingNodeOptions extends BaseNodeOptions {
  innerRadius?: number;
  outerRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export class RingNode extends BaseNode<Konva.Ring> {
  constructor(options: RingNodeOptions = {}) {
    const ring = new Konva.Ring({} as Konva.RingConfig);
    ring.x(options.x ?? 0);
    ring.y(options.y ?? 0);
    ring.innerRadius(options.innerRadius ?? 20);
    ring.outerRadius(options.outerRadius ?? 40);
    ring.fill(options.fill ?? 'black');
    ring.stroke(options.stroke ?? 'black');
    ring.strokeWidth(options.strokeWidth ?? 0);

    super(ring, options);
  }

  // ===== Getters =====
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

  // ===== Chainable setters =====
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
