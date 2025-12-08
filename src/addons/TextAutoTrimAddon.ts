import { TextNode, type TextChangeEvent } from '../nodes/TextNode';

import { NodeAddon } from './NodeAddon';

interface TextTrimState {
  handler: (event: TextChangeEvent) => void;
}

export class TextAutoTrimAddon extends NodeAddon<TextNode> {
  private readonly nodes = new WeakMap<TextNode, TextTrimState>();

  protected onAttach(node: TextNode): void {
    if (this.nodes.has(node)) return;

    const handler = (event: TextChangeEvent): void => {
      if (event.cancelled) return;

      const normalized = this.normalize(event.newText);
      if (normalized === event.newText) return;

      node.setText(normalized);
      node.getNode().getLayer()?.batchDraw();
    };

    node.onTextChange(handler);
    this.nodes.set(node, { handler });
  }

  protected onDetach(node: TextNode): void {
    const state = this.nodes.get(node);
    if (!state) return;

    node.offTextChange(state.handler);
    this.nodes.delete(node);
  }

  private normalize(text: string): string {
    if (!text) return '';
    const collapsed = text.replace(/[ \t]+/g, ' ');
    return collapsed.trim();
  }
}
