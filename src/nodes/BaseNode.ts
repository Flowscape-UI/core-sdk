import Konva from 'konva';

export interface BaseNodeOptions {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export abstract class BaseNode<T extends Konva.Node = Konva.Node> {
  protected konvaNode: T;
  public readonly id: string;

  constructor(node: T, options: BaseNodeOptions = {}) {
    this.konvaNode = node;
    this.id = options.id ?? `node_${String(Date.now())}_${String(Math.random())}`;
    this.konvaNode.x(options.x);
    this.konvaNode.y(options.y);
    this.konvaNode.width(options.width);
    this.konvaNode.height(options.height);
  }

  public getNode(): T {
    return this.konvaNode;
  }

  public setPosition({ x, y }: { x: number; y: number }) {
    this.konvaNode.position({ x, y });
  }

  public getPosition() {
    return this.konvaNode.position();
  }

  public remove() {
    this.konvaNode.destroy();
  }
}
