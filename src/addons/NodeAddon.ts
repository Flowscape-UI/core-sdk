import type { BaseNode } from '../nodes/BaseNode';

/**
 * Базовый класс аддона для конкретной ноды.
 *
 * Использование:
 *   class MyAddon extends NodeAddon<TextNode> {
 *     protected onAttach(node: TextNode) { ... }
 *     protected onDetach(node: TextNode) { ... }
 *   }
 */
export abstract class NodeAddon<TNode extends BaseNode = BaseNode> {
  protected abstract onAttach(node: TNode): void;
  protected abstract onDetach(node: TNode): void;

  /** Внутренний хелпер: вызывается менеджером аддонов ноды */
  attach(node: TNode): void {
    this.onAttach(node);
  }

  /** Внутренний хелпер: вызывается менеджером аддонов ноды */
  detach(node: TNode): void {
    this.onDetach(node);
  }
}
