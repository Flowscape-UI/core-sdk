import Konva from 'konva';

import type { BaseNode } from '../nodes/BaseNode';
import type { CoreEvents } from '../types/core.events.interface';
import type { FrameHandle, FrameOptions } from '../types/public/frame';
import { EventBus } from '../utils/EventBus';
import type { NodeManager } from './NodeManager';

interface InternalFrame extends FrameHandle {
  options: FrameOptions;
  layer: Konva.Layer;
  container: Konva.Group;
  rect: Konva.Rect;
  contentGroup: Konva.Group;
  label: Konva.Label;
}

export class FrameManager {
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;
  private _nodes: NodeManager;
  private _frames = new Map<string, InternalFrame>();
  private _idCounter = 0;

  constructor(stage: Konva.Stage, eventBus: EventBus<CoreEvents>, nodes: NodeManager) {
    this._stage = stage;
    this._eventBus = eventBus;
    this._nodes = nodes;

    this._eventBus.on('node:created', (node) => {
      this._attachNodeDragHandlers(node);
    });

    // Keep frame layers in sync with world transform (camera zoom/pan).
    const sync = () => this._syncWithWorld();
    this._eventBus.on('camera:zoom', sync);
    this._eventBus.on('camera:setZoom', sync);
    this._eventBus.on('camera:reset', sync);
    this._eventBus.on('camera:pan', sync);
  }

  public addFrame(options: FrameOptions): FrameHandle {
    const id = options.id ?? `frame-${String(++this._idCounter)}`;
    const width = options.width;
    const height = options.height;
    const background = options.background ?? '#ffffff';

    // Layer lives in stage coordinates, positioned at frame origin.
    // All children (rect, content, label) use local coordinates.
    const layer = new Konva.Layer({
      x: options.x,
      y: options.y,
    });

    // Group with clip to emulate overflow: hidden for frame content.
    const container = new Konva.Group({
      clip: {
        x: 0,
        y: 0,
        width,
        height,
      },
    });

    const rectConfig: Konva.RectConfig = {
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
    };

    if (options.cornerRadius !== undefined) {
      rectConfig.cornerRadius = options.cornerRadius;
    }

    const rect = new Konva.Rect(rectConfig);

    const contentGroup = new Konva.Group();

    const label = new Konva.Label({
      x: 0,
      y: -24,
    });

    const labelText = new Konva.Text({
      text: options.label ?? 'Frame',
      fontSize: 14,
      fill: '#cccccc',
    });

    label.add(labelText);

    label.on('mouseenter', () => {
      labelText.fill('#ffffff');
      label.getLayer()?.batchDraw();
    });

    label.on('mouseleave', () => {
      labelText.fill('#cccccc');
      label.getLayer()?.batchDraw();
    });

    container.add(rect);
    container.add(contentGroup);

    layer.add(container);
    layer.add(label);

    const frame: InternalFrame = {
      id,
      options: { ...options, id },
      layer,
      container,
      rect,
      contentGroup,
      label,
    };

    this._frames.set(id, frame);
    this._stage.add(layer);

    // Initial sync with current world transform
    this._syncWithWorld();

    return { id };
  }

  private _syncWithWorld() {
    const world = this._nodes.world;
    const scaleX = world.scaleX();
    const scaleY = world.scaleY();
    const pos = world.position();

    for (const frame of this._frames.values()) {
      frame.layer.scale({ x: scaleX, y: scaleY });
      frame.layer.position(pos);
    }
  }

  private _attachNodeDragHandlers(node: BaseNode) {
    const kn = node.getKonvaNode() as unknown as Konva.Node;

    kn.on('dragmove.frame-autogroup', () => {
      const pointer = this._stage.getPointerPosition();
      if (!pointer) return;

      const currentParent = kn.getParent();
      let currentFrame: InternalFrame | null = null;
      outer: for (const frame of this._frames.values()) {
        let parent: Konva.Node | null = currentParent;
        while (parent) {
          if (parent === frame.contentGroup) {
            currentFrame = frame;
            break outer;
          }
          parent = parent.getParent();
        }
      }

      // Find frame under cursor
      let targetFrame: InternalFrame | null = null;
      for (const frame of this._frames.values()) {
        const layer = frame.layer;
        const rect = frame.rect;
        const absX = layer.x();
        const absY = layer.y();
        const w = rect.width();
        const h = rect.height();
        const inside =
          pointer.x >= absX && pointer.x <= absX + w && pointer.y >= absY && pointer.y <= absY + h;
        if (inside) {
          targetFrame = frame;
          break;
        }
      }

      // Already inside some frame
      if (currentFrame) {
        if (!targetFrame || targetFrame !== currentFrame) {
          // Leave frame -> move back to world layer
          const absPos = kn.getAbsolutePosition();
          this._nodes.world.add(kn);
          kn.setAbsolutePosition(absPos);
          this._nodes.layer.batchDraw();
        }
        return;
      }

      // Not in frame, but pointer inside a frame -> move into frame
      if (targetFrame && currentParent !== targetFrame.contentGroup) {
        const absPos = kn.getAbsolutePosition();
        targetFrame.contentGroup.add(kn);
        kn.setAbsolutePosition(absPos);
        targetFrame.layer.batchDraw();
      }
    });
  }

  public list(): FrameHandle[] {
    return Array.from(this._frames.values()).map((frame) => ({ id: frame.id }));
  }

  public findById(id: string): FrameHandle | undefined {
    const frame = this._frames.get(id);
    if (!frame) return undefined;
    return { id: frame.id };
  }
}
