import Konva from 'konva';

import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { BaseNode } from '../nodes/BaseNode';
import { EventBus } from '../utils/EventBus';

export class NodeManager {
  private _layer: Konva.Layer;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;
  private _eventBus: EventBus;

  constructor(stage: Konva.Stage, eventBus: EventBus) {
    this._layer = new Konva.Layer();
    this._stage = stage;
    this._stage.add(this._layer);
    this._eventBus = eventBus;
  }

  addShape(options: ShapeNodeOptions): ShapeNode {
    const shape = new ShapeNode(options);
    this._layer.add(shape.getNode());
    this._nodes.set(shape.id, shape);
    this._layer.batchDraw();
    return shape;
  }

  remove(node: BaseNode) {
    this._eventBus.emit('node:removed', node);
    node.remove();
    this._nodes.delete(node.id);
    this._layer.batchDraw();
  }

  findById(id: string): BaseNode | undefined {
    return this._nodes.get(id);
  }

  getAll(): BaseNode[] {
    return Array.from(this._nodes.values());
  }
}
