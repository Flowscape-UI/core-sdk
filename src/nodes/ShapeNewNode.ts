import Konva from 'konva';

import { Transform } from '../core/transform/Transform';
import type { Vector2 } from '../core/transform/types';

import { Node } from './Node';

export interface ShapeNewNodeOptions {
  id: string;
  parentId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number | number[];
}

export class ShapeNewNode extends Node {
  private readonly _konvaNode: Konva.Rect;

  constructor(options: ShapeNewNodeOptions) {
    const transform = new Transform();

    super({
      id: options.id,
      parentId: options.parentId ?? null,
      transform,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    });

    this._konvaNode = new Konva.Rect({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      fill: options.backgroundColor ?? 'lightgray',
      stroke: options.stroke ?? 'black',
      strokeWidth: options.strokeWidth ?? 1,
      cornerRadius: options.borderRadius ?? 0,
      draggable: true,
    });
  }

  public getKonvaNode(): Konva.Rect {
    return this._konvaNode;
  }

  public override getPosition(): Vector2 {
    return super.getPosition();
  }

  public override setPosition(x: number, y: number): void {
    super.setPosition(x, y);
    this._konvaNode.position({ x, y });
  }

  public override getRotation(): number {
    return super.getRotation();
  }

  public override setRotation(deg: number): void {
    super.setRotation(deg);
    this._konvaNode.rotation(deg);
  }

  public override getScale(): Vector2 {
    return super.getScale();
  }

  public override setScale(sx: number, sy: number): void {
    super.setScale(sx, sy);
    this._konvaNode.scale({ x: sx, y: sy });
  }

  public override getPivot(): Vector2 {
    return super.getPivot();
  }

  public override setPivot(px: number, py: number): void {
    super.setPivot(px, py);
    this._konvaNode.offset({ x: px * this.getWidth(), y: py * this.getHeight() }); // ??
  }

  public override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this._konvaNode.size({ width, height });
  }

  public getBackgroundColor(): string {
    return this._konvaNode.fill() as string;
  }

  public setBackgroundColor(color: string): void {
    this._konvaNode.fill(color);
  }

  public getStroke(): string | undefined {
    return this._konvaNode.stroke() as string | undefined;
  }

  public setStroke(color: string): void {
    this._konvaNode.stroke(color);
  }

  public getStrokeWidth(): number {
    return this._konvaNode.strokeWidth();
  }

  public setStrokeWidth(width: number): void {
    this._konvaNode.strokeWidth(width);
  }

  public getBorderRadius(): number {
    return this._konvaNode.cornerRadius() as number;
  }

  public setBorderRadius(radius: number | number[]): void {
    this._konvaNode.cornerRadius(radius);
  }
}
