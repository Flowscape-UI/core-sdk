import Konva from 'konva';

import { ArcNode, type ArcNodeOptions } from '../nodes/ArcNode';
import { ArrowNode, type ArrowNodeOptions } from '../nodes/ArrowNode';
import { BaseNode } from '../nodes/BaseNode';
import { CircleNode, type CircleNodeOptions } from '../nodes/CircleNode';
import { EllipseNode, type EllipseNodeOptions } from '../nodes/EllipseNode';
import { FrameNode, type FrameNodeOptions } from '../nodes/FrameNode';
import { GifNode, type GifNodeOptions } from '../nodes/GifNode';
import { GroupNode, type GroupNodeOptions } from '../nodes/GroupNode';
import { ImageNode, type ImageNodeOptions } from '../nodes/ImageNode';
import { RegularPolygonNode, type RegularPolygonNodeOptions } from '../nodes/RegularPolygonNode';
import { RingNode, type RingNodeOptions } from '../nodes/RingNode';
import { ShapeNode, type ShapeNodeOptions } from '../nodes/ShapeNode';
import { StarNode, type StarNodeOptions } from '../nodes/StarNode';
import { SvgNode, type SvgNodeOptions } from '../nodes/SvgNode';
import { TextNode, type TextNodeOptions } from '../nodes/TextNode';
import { VideoNode, type VideoNodeOptions } from '../nodes/VideoNode';
import type { CoreEvents } from '../types/core.events.interface';
import type { FrameHandle } from '../types/public/frame';
import type {
  ArcNodeHandle,
  ArrowNodeHandle,
  CircleNodeHandle,
  EllipseNodeHandle,
  GifNodeHandle,
  GroupNodeHandle,
  ImageNodeHandle,
  RegularPolygonNodeHandle,
  RingNodeHandle,
  ShapeNodeHandle,
  StarNodeHandle,
  SvgNodeHandle,
  TextNodeHandle,
  VideoNodeHandle,
} from '../types/public/node-handles';
import { EventBus } from '../utils/EventBus';

export class NodeManager {
  private _layer: Konva.Layer;
  private _world: Konva.Group;
  private _nodes = new Map<string, BaseNode>();
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;

  // Overlay labels для фреймов (отдельные Konva.Text, не BaseNode)
  private _frameLabels = new Map<FrameNode, Konva.Text>();

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

    // Авто-группировка нод во фреймы при перетаскивании
    this._eventBus.on('node:created', (node) => {
      this._attachFrameAutogroupHandlers(node);
    });

    // Удаляем overlay label при удалении фрейма
    this._eventBus.on('node:removed', (node) => {
      if (node instanceof FrameNode) {
        const label = this._frameLabels.get(node);
        if (label) {
          label.destroy();
          this._frameLabels.delete(node);
        }
      }
    });

    // Синхронизация overlay label после трансформаций (resize/rotate)
    this._eventBus.on('node:transformed', (node) => {
      if (node instanceof FrameNode) {
        this._updateFrameLabelsPosition();
      }
    });

    // Обновляем позицию overlay label при изменении камеры (масштаб не компенсируем)
    const updateFrameLabelsOnCamera = () => {
      this._updateFrameLabelsPosition();
    };
    this._eventBus.on('camera:zoom', updateFrameLabelsOnCamera);
    this._eventBus.on('camera:setZoom', updateFrameLabelsOnCamera);
    this._eventBus.on('camera:reset', updateFrameLabelsOnCamera);
    this._eventBus.on('camera:pan', updateFrameLabelsOnCamera);
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

  public addSvg(options: SvgNodeOptions): SvgNodeHandle {
    const svg = new SvgNode(options);
    this._world.add(svg.getKonvaNode());
    this._nodes.set(svg.id, svg);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', svg);
    this._scheduleBatchDraw();
    return svg;
  }

  public addVideo(options: VideoNodeOptions): VideoNodeHandle {
    const video = new VideoNode(options);
    this._world.add(video.getKonvaNode());
    this._nodes.set(video.id, video);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', video);
    this._scheduleBatchDraw();
    return video;
  }

  public addGif(options: GifNodeOptions): GifNodeHandle {
    const gif = new GifNode(options);
    this._world.add(gif.getKonvaNode());
    this._nodes.set(gif.id, gif);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', gif);
    this._scheduleBatchDraw();
    return gif;
  }

  public addFrame(options: FrameNodeOptions): FrameHandle {
    const frame = new FrameNode(options);
    this._world.add(frame.getKonvaNode());
    this._nodes.set(frame.id, frame);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', frame);
    this._scheduleBatchDraw();

    const labelText = options.label ?? options.name ?? 'Frame';
    const label = new Konva.Text({
      text: labelText,
      fontSize: 12,
      fill: '#ffffff',
      // align: 'start',
      listening: false,
    } as Konva.TextConfig);
    // Важно: добавляем label на основной layer, а не в world,
    // чтобы на него не влиял zoom/pan камеры (масштаб мира).
    this._layer.add(label);
    this._frameLabels.set(frame, label);

    // Обновлять позицию при перемещении/трансформации фрейма
    const kn = frame.getKonvaNode() as unknown as Konva.Node;
    kn.on('dragmove.frame-label', () => {
      this._updateFrameLabelsPosition();
    });

    kn.on('transform.frame-label', () => {
      this._updateFrameLabelsPosition();
    });

    // Во время работы Transformer (resize/rotate) Konva шлёт события изменения атрибутов
    // width/height/scale/rotation/x/y. Подпишемся на них, чтобы обновлять label в realtime,
    // а не только по окончании трансформации.
    kn.on(
      'xChange.frame-label yChange.frame-label widthChange.frame-label heightChange.frame-label ' +
        'scaleXChange.frame-label scaleYChange.frame-label rotationChange.frame-label',
      () => {
        this._updateFrameLabelsPosition();
      },
    );

    // Первичная установка позиции
    this._updateFrameLabelsPosition();

    return { id: frame.id };
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

  // ==================== Frames auto-grouping ====================

  private _listFrames(): FrameNode[] {
    const frames: FrameNode[] = [];
    for (const node of this._nodes.values()) {
      if (node instanceof FrameNode) {
        frames.push(node);
      }
    }
    return frames;
  }

  private _attachFrameAutogroupHandlers(node: BaseNode) {
    // Не навешиваем обработчики на сами фреймы
    if (node instanceof FrameNode) return;

    const kn = node.getKonvaNode() as unknown as Konva.Node;

    kn.on('dragmove.frame-autogroup', () => {
      const pointer = this._stage.getPointerPosition();
      if (!pointer) return;

      const currentParent = kn.getParent();
      const world = this._world;

      // Определяем, находится ли нода уже внутри какого-либо фрейма
      let currentFrame: FrameNode | null = null;
      outer: for (const frame of this._listFrames()) {
        let parent: Konva.Node | null = currentParent;
        const contentGroup = frame.getContentGroup();
        while (parent && parent !== world) {
          if (parent === (contentGroup as unknown as Konva.Node)) {
            currentFrame = frame;
            break outer;
          }
          parent = parent.getParent();
        }
      }

      // Ищем фрейм под курсором
      let targetFrame: FrameNode | null = null;
      for (const frame of this._listFrames()) {
        const rect = frame.getRect();
        const r = rect.getClientRect({ skipShadow: true, skipStroke: true });
        const inside =
          pointer.x >= r.x &&
          pointer.x <= r.x + r.width &&
          pointer.y >= r.y &&
          pointer.y <= r.y + r.height;
        if (inside) {
          targetFrame = frame;
          break;
        }
      }

      // Уже внутри какого-то фрейма
      if (currentFrame) {
        if (!targetFrame || targetFrame !== currentFrame) {
          // Покидаем фрейм -> возвращаем ноду в world
          const absPos = kn.getAbsolutePosition();
          this._world.add(kn as unknown as Konva.Shape | Konva.Group);
          kn.setAbsolutePosition(absPos);
          this._layer.batchDraw();

          // Если во фрейме больше не осталось детей — разрешаем его drag/select по клику
          const contentGroup = currentFrame.getContentGroup();
          const hasChildren = contentGroup.getChildren().length > 0;
          const frameKn = currentFrame.getKonvaNode() as unknown as Konva.Node & {
            draggable?: (value?: boolean) => boolean;
          };
          if (typeof frameKn.draggable === 'function') {
            frameKn.draggable(!hasChildren);
          }
        }
        return;
      }

      // Нода не во фрейме, но курсор внутри фрейма -> перемещаем в contentGroup
      if (
        targetFrame &&
        currentParent !== (targetFrame.getContentGroup() as unknown as Konva.Node)
      ) {
        const absPos = kn.getAbsolutePosition();
        const contentGroup = targetFrame.getContentGroup();
        contentGroup.add(kn as unknown as Konva.Shape | Konva.Group);
        kn.setAbsolutePosition(absPos);
        this._layer.batchDraw();

        // Как только во фрейме появляется хотя бы один ребёнок — запрещаем drag самого фрейма
        const hasChildren = contentGroup.getChildren().length > 0;
        const frameKn = targetFrame.getKonvaNode() as unknown as Konva.Node & {
          draggable?: (value?: boolean) => boolean;
        };
        if (typeof frameKn.draggable === 'function') {
          frameKn.draggable(!hasChildren);
        }
      }
    });
  }

  /**
   * Обновить позицию overlay label над соответствующими фреймами
   * (используется при создании и drag фреймов)
   */
  private _updateFrameLabelsPosition() {
    for (const [frame, label] of this._frameLabels.entries()) {
      const frameNode = frame.getKonvaNode() as unknown as Konva.Node;

      // Позиционируем label у левого верхнего угла фрейма,
      // примерно как старый Konva.Label (x:0, y:-24 относительно фрейма).
      const bbox = frameNode.getClientRect({ skipShadow: true, skipStroke: false });
      const verticalOffset = 16; // расстояние вверх от верхней границы фрейма

      const x = bbox.x;
      const y = bbox.y - verticalOffset;

      label.absolutePosition({ x, y });
      // Текст рисуем без горизонтального смещения (по левому краю)
      label.offsetX(0);
      label.offsetY(0);
    }

    this._layer.batchDraw();
  }
}
