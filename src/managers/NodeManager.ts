import Konva from 'konva';

import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { BaseNode } from '../nodes/BaseNode';
import { EventBus } from '../utils/EventBus';
import type { CoreEvents } from '../types/events';

export class NodeManager {
  private _layer: Konva.Layer;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;

  constructor(stage: Konva.Stage, eventBus: EventBus<CoreEvents>) {
    this._layer = new Konva.Layer();
    this._stage = stage;
    this._stage.add(this._layer);
    this._eventBus = eventBus;
  }

  public get layer(): Konva.Layer {
    return this._layer;
  }

  public get stage(): Konva.Stage {
    return this._stage;
  }

  public get eventBus(): EventBus<CoreEvents> {
    return this._eventBus;
  }

  public addShape(options: ShapeNodeOptions): ShapeNode {
    const shape = new ShapeNode(options);
    this._layer.add(shape.getNode());
    this._nodes.set(shape.id, shape);
    this._layer.batchDraw();
    return shape;
  }

  public remove(node: BaseNode) {
    this._eventBus.emit('node:removed', node);
    node.remove();
    this._nodes.delete(node.id);
    this._layer.batchDraw();
  }

  public findById(id: string): BaseNode | undefined {
    return this._nodes.get(id);
  }

  public list(): BaseNode[] {
    return Array.from(this._nodes.values());
  }
}
