import Konva from 'konva';

import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { BaseNode } from '../nodes/BaseNode';

export class NodeManager {
  private _layer: Konva.Layer;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;

  constructor(stage: Konva.Stage) {
    this._layer = new Konva.Layer();
    this._stage = stage;
    this._stage.add(this._layer);
  }

  addShape(options: ShapeNodeOptions): ShapeNode {
    const shape = new ShapeNode(options);
    this._layer.add(shape.getNode());
    this._nodes.set(shape.id, shape);
    this._layer.batchDraw();
    return shape;
  }

  remove(node: BaseNode) {
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
