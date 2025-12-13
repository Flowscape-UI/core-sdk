import type { BaseNode } from '../nodes/BaseNode';

import type { NodeAddon } from './NodeAddon';

/**
 * Addon manager for a specific node.
 * Allows adding/removing addons with a convenient API:
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

  /** Attach one or more addons to the node */
  public add(addons: NodeAddon<TNode> | NodeAddon<TNode>[]): TNode {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (this._addons.has(addon)) continue;
      this._addons.add(addon);
      addon.attach(this._node);
    }
    return this._node;
  }

  /** Detach one or more addons from the node */
  public remove(addons: NodeAddon<TNode> | NodeAddon<TNode>[]): TNode {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (!this._addons.has(addon)) continue;
      this._addons.delete(addon);
      addon.detach(this._node);
    }
    return this._node;
  }

  /** All attached addons (array copy) */
  public list(): NodeAddon<TNode>[] {
    return Array.from(this._addons);
  }

  /** Check if a specific addon is attached */
  public has(addon: NodeAddon<TNode>): boolean {
    return this._addons.has(addon);
  }

  /** Detach and clear all addons (used when removing the node) */
  public clear(): void {
    this._addons.forEach((addon) => {
      addon.detach(this._node);
    });
    this._addons.clear();
  }
}
