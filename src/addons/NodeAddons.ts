import type { BaseNode } from '../nodes/BaseNode';

import type { NodeAddon } from './NodeAddon';

/**
 * Менеджер аддонов для конкретной ноды.
 * Позволяет добавлять/удалять аддоны удобным API:
 *   node.addons.add(addon)
 *   node.addons.add([a, b])
 *   node.addons.remove(addon)
 *   node.addons.list()
 */
export class NodeAddons<TNode extends BaseNode = BaseNode> {
  private readonly _node: TNode;
  private readonly _addons = new Set<NodeAddon<TNode>>();

  constructor(node: TNode) {
    this._node = node;
  }

  /** Подключить один или несколько аддонов к ноде */
  public add(addons: NodeAddon<TNode> | NodeAddon<TNode>[]): TNode {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (this._addons.has(addon)) continue;
      this._addons.add(addon);
      addon.attach(this._node);
    }
    return this._node;
  }

  /** Отключить один или несколько аддонов от ноды */
  public remove(addons: NodeAddon<TNode> | NodeAddon<TNode>[]): TNode {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (!this._addons.has(addon)) continue;
      this._addons.delete(addon);
      addon.detach(this._node);
    }
    return this._node;
  }

  /** Все подключённые аддоны (копия массива) */
  public list(): NodeAddon<TNode>[] {
    return Array.from(this._addons);
  }

  /** Проверить, подключён ли конкретный аддон */
  public has(addon: NodeAddon<TNode>): boolean {
    return this._addons.has(addon);
  }

  /** Отключить и очистить все аддоны (используется при удалении ноды) */
  public clear(): void {
    this._addons.forEach((addon) => {
      addon.detach(this._node);
    });
    this._addons.clear();
  }
}
