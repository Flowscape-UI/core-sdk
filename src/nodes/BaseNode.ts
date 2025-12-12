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

  /**
   * Публичный доступ к низкоуровневому Konva-объекту.
   * Используйте этот метод вместо импорта `konva` напрямую.
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
    // Отключаем все аддоны перед уничтожением ноды
    this.addons.clear();
    this.konvaNode.destroy();
  }
}
