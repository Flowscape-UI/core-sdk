import { ShapeNode } from '../nodes/ShapeNode';

import { NodeAddon } from './NodeAddon';

export interface ShapeHoverHighlightAddonOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  mode?: 'stroke' | 'fill' | 'both';
}

interface ShapeHoverState {
  mouseEnterHandler: () => void;
  mouseLeaveHandler: () => void;
  prevStroke: string | undefined;
  prevStrokeWidth: number;
  prevStrokeEnabled: boolean;
  prevFill: string | undefined;
  prevFillEnabled: boolean;
  hadHover: boolean;
}

export class ShapeHoverHighlightAddon extends NodeAddon<ShapeNode> {
  private readonly stroke: string;
  private readonly strokeWidth: number;
  private readonly fill: string;
  private readonly mode: 'stroke' | 'fill' | 'both';
  private readonly nodes = new WeakMap<ShapeNode, ShapeHoverState>();

  constructor(options: ShapeHoverHighlightAddonOptions = {}) {
    super();
    this.stroke = options.stroke ?? '#1976d2';
    this.strokeWidth = options.strokeWidth ?? 2;
    this.fill = options.fill ?? 'rgba(255, 255, 0, 0.25)';
    this.mode = options.mode ?? 'stroke';
  }

  protected onAttach(node: ShapeNode): void {
    if (this.nodes.has(node)) return;

    const konvaRect = node.getNode();

    const state: ShapeHoverState = {
      mouseEnterHandler: () => undefined,
      mouseLeaveHandler: () => undefined,
      prevStroke: node.getStroke(),
      prevStrokeWidth: node.getStrokeWidth(),
      prevStrokeEnabled: konvaRect.strokeEnabled(),
      prevFill: konvaRect.fill() as string | undefined,
      prevFillEnabled: konvaRect.fillEnabled(),
      hadHover: false,
    };

    state.mouseEnterHandler = () => {
      state.prevStroke = node.getStroke();
      state.prevStrokeWidth = node.getStrokeWidth();
      state.prevStrokeEnabled = konvaRect.strokeEnabled();
      state.prevFill = konvaRect.fill() as string | undefined;
      state.prevFillEnabled = konvaRect.fillEnabled();
      state.hadHover = true;

      if (this.mode === 'stroke' || this.mode === 'both') {
        konvaRect.strokeEnabled(true);
        konvaRect.stroke(this.stroke);
        konvaRect.strokeWidth(this.strokeWidth);
      }

      if (this.mode === 'fill' || this.mode === 'both') {
        konvaRect.fillEnabled(true);
        konvaRect.fill(this.fill);
      }
      konvaRect.getLayer()?.batchDraw();
    };

    state.mouseLeaveHandler = () => {
      if (!state.hadHover) return;

      konvaRect.strokeEnabled(state.prevStrokeEnabled);
      if (typeof state.prevStroke === 'string') {
        konvaRect.stroke(state.prevStroke);
      }
      konvaRect.strokeWidth(state.prevStrokeWidth);

      konvaRect.fillEnabled(state.prevFillEnabled);
      if (typeof state.prevFill === 'string') {
        konvaRect.fill(state.prevFill);
      }
      konvaRect.getLayer()?.batchDraw();
    };

    konvaRect.on('mouseenter.shapeHoverHighlightAddon', state.mouseEnterHandler);
    konvaRect.on('mouseleave.shapeHoverHighlightAddon', state.mouseLeaveHandler);

    this.nodes.set(node, state);
  }

  protected onDetach(node: ShapeNode): void {
    const state = this.nodes.get(node);
    if (!state) return;

    const konvaRect = node.getNode();

    konvaRect.off('mouseenter.shapeHoverHighlightAddon', state.mouseEnterHandler);
    konvaRect.off('mouseleave.shapeHoverHighlightAddon', state.mouseLeaveHandler);

    if (state.hadHover) {
      konvaRect.strokeEnabled(state.prevStrokeEnabled);
      if (typeof state.prevStroke === 'string') {
        konvaRect.stroke(state.prevStroke);
      }
      konvaRect.strokeWidth(state.prevStrokeWidth);

      konvaRect.fillEnabled(state.prevFillEnabled);
      if (typeof state.prevFill === 'string') {
        konvaRect.fill(state.prevFill);
      }
      konvaRect.getLayer()?.batchDraw();
    }

    this.nodes.delete(node);
  }
}
