import Konva from 'konva';

import { ArcNode, type ArcNodeOptions } from '../nodes/ArcNode';
import { ArrowNode, type ArrowNodeOptions } from '../nodes/ArrowNode';
import { BaseNode } from '../nodes/BaseNode';
import { CircleNode, type CircleNodeOptions } from '../nodes/CircleNode';
import { EllipseNode, type EllipseNodeOptions } from '../nodes/EllipseNode';
import { GroupNode, type GroupNodeOptions } from '../nodes/GroupNode';
import { ImageNode, type ImageNodeOptions } from '../nodes/ImageNode';
import { RegularPolygonNode, type RegularPolygonNodeOptions } from '../nodes/RegularPolygonNode';
import { RingNode, type RingNodeOptions } from '../nodes/RingNode';
import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { StarNode, type StarNodeOptions } from '../nodes/StarNode';
import { TextNode, type TextNodeOptions } from '../nodes/TextNode';
import type { CoreEvents } from '../types/core.events.interface';
import type {
  ArcNodeHandle,
  ArrowNodeHandle,
  CircleNodeHandle,
  EllipseNodeHandle,
  GroupNodeHandle,
  ImageNodeHandle,
  RegularPolygonNodeHandle,
  RingNodeHandle,
  ShapeNodeHandle,
  StarNodeHandle,
  TextNodeHandle,
} from '../types/public/node-handles';
import { EventBus } from '../utils/EventBus';

export class NodeManager {
  private _layer: Konva.Layer;
  private _world: Konva.Group;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;

  // Cache for optimization
  private _batchDrawScheduled = false;
  private _listCache: BaseNode[] | null = null;
  private _listCacheInvalidated = true;

  constructor(stage: Konva.Stage, eventBus: EventBus<CoreEvents>) {
    this._layer = new Konva.Layer();
    this._world = new Konva.Group();
    this._layer.add(this._world);
    this._stage = stage;
    this._stage.add(this._layer);
    this._eventBus = eventBus;
  }

  public get layer(): Konva.Layer {
    return this._layer;
  }

  public get world(): Konva.Group {
    return this._world;
  }

  public get stage(): Konva.Stage {
    return this._stage;
  }

  public get eventBus(): EventBus<CoreEvents> {
    return this._eventBus;
  }
  public addShape(options: ShapeNodeOptions): ShapeNodeHandle {
    const shape = new ShapeNode(options);
    this._world.add(shape.getKonvaNode());
    this._nodes.set(shape.id, shape);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', shape);
    this._scheduleBatchDraw();
    return shape;
  }

  public addText(options: TextNodeOptions): TextNodeHandle {
    const text = new TextNode(options);
    this._world.add(text.getKonvaNode());
    this._nodes.set(text.id, text);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', text);
    this._scheduleBatchDraw();
    return text;
  }

  public addImage(options: ImageNodeOptions): ImageNodeHandle {
    const image = new ImageNode(options);
    this._world.add(image.getKonvaNode());
    this._nodes.set(image.id, image);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', image);
    this._scheduleBatchDraw();
    return image;
  }

  public addCircle(options: CircleNodeOptions): CircleNodeHandle {
    const circle = new CircleNode(options);
    this._world.add(circle.getKonvaNode());
    this._nodes.set(circle.id, circle);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', circle);
    this._scheduleBatchDraw();
    return circle;
  }

  public addEllipse(options: EllipseNodeOptions): EllipseNodeHandle {
    const ellipse = new EllipseNode(options);
    this._world.add(ellipse.getKonvaNode());
    this._nodes.set(ellipse.id, ellipse);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', ellipse);
    this._scheduleBatchDraw();
    return ellipse;
  }

  public addArc(options: ArcNodeOptions): ArcNodeHandle {
    const arc = new ArcNode(options);
    this._world.add(arc.getKonvaNode());
    this._nodes.set(arc.id, arc);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', arc);
    this._scheduleBatchDraw();
    return arc;
  }

  public addStar(options: StarNodeOptions): StarNodeHandle {
    const star = new StarNode(options);
    this._world.add(star.getKonvaNode());
    this._nodes.set(star.id, star);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', star);
    this._scheduleBatchDraw();
    return star;
  }

  public addArrow(options: ArrowNodeOptions): ArrowNodeHandle {
    const arrow = new ArrowNode(options);
    this._world.add(arrow.getKonvaNode());
    this._nodes.set(arrow.id, arrow);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', arrow);
    this._scheduleBatchDraw();
    return arrow;
  }

  public addRing(options: RingNodeOptions): RingNodeHandle {
    const ring = new RingNode(options);
    this._world.add(ring.getKonvaNode());
    this._nodes.set(ring.id, ring);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', ring);
    this._scheduleBatchDraw();
    return ring;
  }

  public addRegularPolygon(options: RegularPolygonNodeOptions): RegularPolygonNodeHandle {
    const poly = new RegularPolygonNode(options);
    this._world.add(poly.getKonvaNode());
    this._nodes.set(poly.id, poly);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', poly);
    this._scheduleBatchDraw();
    return poly;
  }

  public addGroup(options: GroupNodeOptions): GroupNodeHandle {
    const group = new GroupNode(options);
    this._world.add(group.getKonvaNode());
    this._nodes.set(group.id, group);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', group);
    this._scheduleBatchDraw();
    return group;
  }

  public remove(node: BaseNode) {
    this._eventBus.emit('node:removed', node);
    node.remove();
    this._nodes.delete(node.id);
    this._listCacheInvalidated = true;
    this._scheduleBatchDraw();
  }

  public findById(id: string): BaseNode | undefined {
    return this._nodes.get(id);
  }

  public list(): BaseNode[] {
    // CRITICAL OPTIMIZATION: cache result
    if (this._listCacheInvalidated || !this._listCache) {
      this._listCache = Array.from(this._nodes.values());
      this._listCacheInvalidated = false;
    }
    return this._listCache;
  }

  /**
   * Deferred redraw (throttling)
   * CRITICAL OPTIMIZATION: group multiple node additions
   */
  private _scheduleBatchDraw() {
    if (this._batchDrawScheduled) return;

    this._batchDrawScheduled = true;
    const raf = globalThis.requestAnimationFrame;
    raf(() => {
      this._batchDrawScheduled = false;
      this._layer.batchDraw();
    });
  }
}
