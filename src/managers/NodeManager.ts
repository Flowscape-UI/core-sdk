import Konva from 'konva';

import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { BaseNode } from '../nodes/BaseNode';
import { EventBus } from '../utils/EventBus';
import type { CoreEvents } from '../types/core.events.interface';
import { TextNode, type TextNodeOptions } from '../nodes/TextNode';
import { ImageNode, type ImageNodeOptions } from '../nodes/ImageNode';
import { CircleNode, type CircleNodeOptions } from '../nodes/CircleNode';
import { EllipseNode, type EllipseNodeOptions } from '../nodes/EllipseNode';
import { ArcNode, type ArcNodeOptions } from '../nodes/ArcNode';
import { ArrowNode, type ArrowNodeOptions } from '../nodes/ArrowNode';
import { RegularPolygonNode, type RegularPolygonNodeOptions } from '../nodes/RegularPolygonNode';
import { StarNode, type StarNodeOptions } from '../nodes/StarNode';
import { RingNode, type RingNodeOptions } from '../nodes/RingNode';
import { GroupNode, type GroupNodeOptions } from '../nodes/GroupNode';

export class NodeManager {
  private _layer: Konva.Layer;
  private _world: Konva.Group;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;

  // Кэш для оптимизации
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
  public addShape(options: ShapeNodeOptions): ShapeNode {
    const shape = new ShapeNode(options);
    this._world.add(shape.getNode());
    this._nodes.set(shape.id, shape);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', shape);
    this._scheduleBatchDraw();
    return shape;
  }

  public addText(options: TextNodeOptions): TextNode {
    const text = new TextNode(options);
    this._world.add(text.getNode());
    this._nodes.set(text.id, text);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', text);
    this._scheduleBatchDraw();
    return text;
  }

  public addImage(options: ImageNodeOptions): ImageNode {
    const image = new ImageNode(options);
    this._world.add(image.getNode());
    this._nodes.set(image.id, image);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', image);
    this._scheduleBatchDraw();
    return image;
  }

  public addCircle(options: CircleNodeOptions): CircleNode {
    const circle = new CircleNode(options);
    this._world.add(circle.getNode());
    this._nodes.set(circle.id, circle);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', circle);
    this._scheduleBatchDraw();
    return circle;
  }

  public addEllipse(options: EllipseNodeOptions): EllipseNode {
    const ellipse = new EllipseNode(options);
    this._world.add(ellipse.getNode());
    this._nodes.set(ellipse.id, ellipse);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', ellipse);
    this._scheduleBatchDraw();
    return ellipse;
  }

  public addArc(options: ArcNodeOptions): ArcNode {
    const arc = new ArcNode(options);
    this._world.add(arc.getNode());
    this._nodes.set(arc.id, arc);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', arc);
    this._scheduleBatchDraw();
    return arc;
  }

  public addStar(options: StarNodeOptions): StarNode {
    const star = new StarNode(options);
    this._world.add(star.getNode());
    this._nodes.set(star.id, star);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', star);
    this._scheduleBatchDraw();
    return star;
  }

  public addArrow(options: ArrowNodeOptions): ArrowNode {
    const arrow = new ArrowNode(options);
    this._world.add(arrow.getNode());
    this._nodes.set(arrow.id, arrow);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', arrow);
    this._scheduleBatchDraw();
    return arrow;
  }

  public addRing(options: RingNodeOptions): RingNode {
    const ring = new RingNode(options);
    this._world.add(ring.getNode());
    this._nodes.set(ring.id, ring);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', ring);
    this._scheduleBatchDraw();
    return ring;
  }

  public addRegularPolygon(options: RegularPolygonNodeOptions): RegularPolygonNode {
    const poly = new RegularPolygonNode(options);
    this._world.add(poly.getNode());
    this._nodes.set(poly.id, poly);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', poly);
    this._scheduleBatchDraw();
    return poly;
  }

  public addGroup(options: GroupNodeOptions): GroupNode {
    const group = new GroupNode(options);
    this._world.add(group.getNode());
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

  // Снять регистрацию BaseNode, НЕ удаляя его Konva-ноду из сцены.
  // Полезно при переносе Konva-ноды внутрь другой группы без разрушения экземпляра.
  // public unregister(node: BaseNode) {
  //   this._nodes.delete(node.id);
  //   this._layer.batchDraw();
  // }

  public findById(id: string): BaseNode | undefined {
    return this._nodes.get(id);
  }

  public list(): BaseNode[] {
    // КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: кэшируем результат
    if (this._listCacheInvalidated || !this._listCache) {
      this._listCache = Array.from(this._nodes.values());
      this._listCacheInvalidated = false;
    }
    return this._listCache;
  }

  /**
   * Отложенная перерисовка (throttling)
   * КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: группируем множественные добавления нод
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
