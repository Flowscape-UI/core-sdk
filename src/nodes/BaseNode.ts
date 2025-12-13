import Konva from 'konva';

import { NodeAddons } from '../addons/NodeAddons';
import type { NodeHandle } from '../types/public/node-handles';

export interface BaseNodeOptions {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export abstract class BaseNode<T extends Konva.Node = Konva.Node> implements NodeHandle<T> {
  protected konvaNode: T;
  public readonly id: string;
  /** Local addons attached to this node */
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

  /**
   * Public access to the low-level Konva object.
   * Use this method instead of importing `konva` directly.
   */
  public getKonvaNode(): T {
    return this.konvaNode;
  }

  public setPosition({ x, y }: { x: number; y: number }) {
    this.konvaNode.position({ x, y });
    return this;
  }

  public getPosition() {
    return this.konvaNode.position();
  }

  public remove() {
    // Detach all addons before destroying the node
    this.addons.clear();
    this.konvaNode.destroy();
  }
}
