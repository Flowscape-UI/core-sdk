import type { BaseNode } from '../nodes/BaseNode';

/**
 * Base class for a node addon.
 *
 * Usage:
 *   class MyAddon extends NodeAddon<TextNode> {
 *     protected onAttach(node: TextNode) { ... }
 *     protected onDetach(node: TextNode) { ... }
 *   }
 */
export abstract class NodeAddon<TNode extends BaseNode = BaseNode> {
  protected abstract onAttach(node: TNode): void;
  protected abstract onDetach(node: TNode): void;

  /** Internal helper: called by the node's addon manager */
  attach(node: TNode): void {
    this.onAttach(node);
  }

  /** Internal helper: called by the node's addon manager */
  detach(node: TNode): void {
    this.onDetach(node);
  }
}
