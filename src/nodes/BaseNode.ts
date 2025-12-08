import Konva from 'konva';

import { NodeAddons } from '../addons/NodeAddons';

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
  /** Локальные аддоны, привязанные к этой ноде */
  public readonly addons: NodeAddons<this>;

  constructor(node: T, options: BaseNodeOptions = {}) {
    this.konvaNode = node;
    this.id = options.id ?? `node_${String(Date.now())}_${String(Math.random())}`;
    this.addons = new NodeAddons<this>(this);
    if (options.x) this.konvaNode.x(options.x);
    if (options.y) this.konvaNode.y(options.y);
    if (options.width) this.konvaNode.width(options.width);
    if (options.height) this.konvaNode.height(options.height);
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
    // Отключаем все аддоны перед уничтожением ноды
    this.addons.clear();
    this.konvaNode.destroy();
  }
}
