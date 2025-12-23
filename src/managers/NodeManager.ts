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
  // Текущий выбранный фрейм (для подсветки его label синим цветом)
  private _selectedFrame: FrameNode | null = null;

  // Cache for optimization
  private _batchDrawScheduled = false;
  private _listCache: BaseNode[] | null = null;
  private _listCacheInvalidated = true;
  private _hadFrameInLastMultiSelection = false;

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

    // Подсветка label для FrameNode: синий цвет только если фрейм входит в текущий selection
    this._eventBus.on('node:selected', (node) => {
      // Сбрасываем все label в базовый цвет
      for (const [, label] of this._frameLabels.entries()) {
        const baseFill = (label as unknown as { _baseFill?: string })._baseFill;
        label.fill(baseFill);
      }

      if (node instanceof FrameNode) {
        this._selectedFrame = node;
        const label = this._frameLabels.get(node);
        if (label) {
          const hoverFill = (label as unknown as { _hoverFill?: string })._hoverFill;
          label.fill(hoverFill);
        }

        // ЖЁСТКАЯ ГАРАНТИЯ: как только фрейм становится выбранным, приводим
        // его draggable в соответствие с инвариантом "draggable = !hasChildren".
        this._enforceFrameDraggableInvariant(node);
      } else {
        this._selectedFrame = null;
      }

      this._layer.batchDraw();
    });

    // При снятии выделения с FrameNode также жёстко восстанавливаем инвариант
    // draggable = !hasChildren, чтобы внешние вызовы draggable(true) не оставались висящими.
    this._eventBus.on('node:deselected', (node) => {
      if (node instanceof FrameNode) {
        this._enforceFrameDraggableInvariant(node);
      }
    });

    // Подсветка при мультивыделении: делаем синими только те фреймы,
    // которые присутствуют в selection:multi:created.
    this._eventBus.on('selection:multi:created', (nodes) => {
      // Сначала всем фреймам — базовый цвет
      for (const [, label] of this._frameLabels.entries()) {
        const baseFill = (label as unknown as { _baseFill?: string })._baseFill;
        label.fill(baseFill);
      }

      this._selectedFrame = null;

      this._hadFrameInLastMultiSelection = false;
      for (const n of nodes) {
        if (n instanceof FrameNode) {
          const label = this._frameLabels.get(n);
          if (label) {
            const hoverFill = (label as unknown as { _hoverFill?: string })._hoverFill;
            label.fill(hoverFill);
          }
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          if (!this._selectedFrame) this._selectedFrame = n;

          this._hadFrameInLastMultiSelection = true;
        }
      }

      this._layer.batchDraw();
    });

    this._eventBus.on('selection:multi:destroyed', () => {
      if (!this._hadFrameInLastMultiSelection) return;

      for (const [, label] of this._frameLabels.entries()) {
        const baseFill = (label as unknown as { _baseFill?: string })._baseFill;
        label.fill(baseFill);
      }

      this._hadFrameInLastMultiSelection = false;
      this._layer.batchDraw();
    });

    // Сброс подсветки label при полном снятии выделения
    (this._eventBus as unknown as { on: (e: string, h: (...args: unknown[]) => void) => void }).on(
      'selection:cleared',
      () => {
        this._selectedFrame = null;
        for (const [, label] of this._frameLabels.entries()) {
          const baseFill = (label as unknown as { _baseFill?: string })._baseFill;
          label.fill(baseFill);
        }
        this._layer.batchDraw();
        // Дополнительно: при полном снятии выделения жёстко приводим
        // все фреймы к инварианту draggable = !hasChildren.
        for (const node of this._nodes.values()) {
          if (node instanceof FrameNode) {
            this._enforceFrameDraggableInvariant(node);
          }
        }
      },
    );
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

  public addFrame(options: FrameNodeOptions): FrameNode {
    const frame = new FrameNode(options);
    this._world.add(frame.getKonvaNode());
    this._nodes.set(frame.id, frame);
    this._listCacheInvalidated = true;
    this._eventBus.emit('node:created', frame);
    this._scheduleBatchDraw();

    const labelText = options.label ?? options.name ?? 'Frame';
    const labelBaseColor = options.labelColor ?? '#ffffff';
    const labelHoverColor = options.labelHoverColor ?? '#2683ff';

    const label = new Konva.Text({
      text: labelText,
      fontSize: 12,
      fill: labelBaseColor,
      // align: 'start',
      listening: true,
    } as Konva.TextConfig);
    // Сохраняем базовый цвет и hover-цвет label на самом Konva.Text, чтобы
    // использовать их при всех последующих сбросах/подсветках
    // (selection/deselection/multi).
    (label as unknown as { _baseFill?: string; _hoverFill?: string })._baseFill = labelBaseColor;
    (label as unknown as { _baseFill?: string; _hoverFill?: string })._hoverFill = labelHoverColor;
    // Важно: добавляем label на основной layer, а не в world,
    // чтобы на него не влиял zoom/pan камеры (масштаб мира).
    this._layer.add(label);
    this._frameLabels.set(frame, label);

    const baseFill = label.fill();

    label.on('mouseenter.frame-label-ui', () => {
      label.fill(labelHoverColor);
      this._layer.batchDraw();
    });

    label.on('mouseleave.frame-label-ui', () => {
      // Если этот фрейм сейчас выбран, оставляем label синим
      if (this._selectedFrame === frame) return;
      label.fill(baseFill);
      this._layer.batchDraw();
    });

    label.on('click.frame-label-ui tap.frame-label-ui', (e: Konva.KonvaEventObject<MouseEvent>) => {
      const evt = e.evt;
      const shiftKey = evt.shiftKey;
      const ctrlKey = evt.ctrlKey || evt.metaKey;

      (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
        'frame:label-clicked',
        frame,
        { shiftKey, ctrlKey },
      );
    });

    // Drag фрейма при зажатии на его label (overlay‑текст над фреймом).
    // ВАЖНО: уважаем инвариант draggable для FrameNode — если фрейм
    // не draggable (есть дети), drag по label не запускаем.
    label.on('mousedown.frame-label-drag', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;

      const stage = this._stage;
      const frameKn = frame.getKonvaNode() as unknown as Konva.Node & {
        draggable?: (value?: boolean) => boolean;
        startDrag?: () => void;
      };

      // Если у фрейма сейчас запрещён drag — выходим, оставляя поведение
      // click/dblclick без изменений.
      // if (typeof frameKn.draggable !== 'function' || !frameKn.draggable()) {
      //   return;
      // }

      const threshold = 3;
      const startX = e.evt.clientX;
      const startY = e.evt.clientY;
      const prevStageDraggable = stage.draggable();
      let dragStarted = false;

      const onMove = (ev: Konva.KonvaEventObject<MouseEvent>) => {
        const dx = Math.abs(ev.evt.clientX - startX);
        const dy = Math.abs(ev.evt.clientY - startY);
        if (!dragStarted && (dx > threshold || dy > threshold)) {
          dragStarted = true;

          frameKn.on('dragstart.frame-label-drag-once', () => {
            stage.draggable(false);
            (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
              'frame:label-dragstart',
              frame,
            );
          });
          frameKn.on('dragend.frame-label-drag-once', () => {
            stage.draggable(prevStageDraggable);
            frameKn.off('.frame-label-drag-once');

            // По окончании drag по label явно эмулируем "клик по label",
            // чтобы SelectionPlugin выбрал этот фрейм.
            (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
              'frame:label-clicked',
              frame,
            );

            (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
              'frame:label-dragend',
              frame,
            );
          });

          if (typeof frameKn.startDrag === 'function') {
            frameKn.startDrag();
          }

          // Как только пошёл drag — не даём событию всплыть дальше,
          // чтобы не срабатывали click‑обработчики.
          e.cancelBubble = true;
        }
      };

      const onUp = () => {
        stage.off('mousemove.frame-label-drag-temp', onMove);
        stage.off('mouseup.frame-label-drag-temp', onUp);
      };

      stage.on('mousemove.frame-label-drag-temp', onMove);
      stage.on('mouseup.frame-label-drag-temp', onUp);
    });

    label.on('dblclick.frame-label-ui dbltap.frame-label-ui', (e) => {
      e.cancelBubble = true;

      const stageContainer = this._stage.container();
      const prevText = label.text();

      const input = globalThis.document.createElement('input');
      input.type = 'text';
      input.value = prevText;
      // Жёсткий лимит по вводу: не более 40 символов
      input.maxLength = 40;
      input.style.position = 'absolute';
      input.style.boxSizing = 'border-box';

      const rect = label.getClientRect({ skipShadow: true, skipStroke: true });
      input.style.left = String(rect.x) + 'px';
      input.style.top = String(rect.y) + 'px';
      input.style.width = String(rect.width || 80) + 'px';
      input.style.height = String(rect.height || 16) + 'px';
      input.style.backgroundColor = 'transparent';
      input.style.color = labelBaseColor;
      input.style.border = 'none';
      input.style.outline = 'none';

      const fontSizePx = String(label.fontSize()) + 'px';
      const fontFamily = label.fontFamily() || 'sans-serif';
      input.style.fontSize = fontSizePx;
      input.style.fontFamily = fontFamily;

      // На время редактирования скрываем исходный label, чтобы он не просвечивал,
      // когда значение input становится пустым.
      const prevVisible = label.visible();
      label.visible(false);
      this._layer.batchDraw();

      // Вспомогательный span для измерения ширины текста и авто-ресайза input
      const measureSpan = globalThis.document.createElement('span');
      measureSpan.style.position = 'absolute';
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.whiteSpace = 'pre';
      measureSpan.style.fontSize = fontSizePx;
      measureSpan.style.fontFamily = fontFamily;
      stageContainer.appendChild(measureSpan);

      const resizeToContent = () => {
        const text = input.value || ' ';
        measureSpan.textContent = text;
        const spanRect = measureSpan.getBoundingClientRect();
        const extra = 16; // небольшой отступ справа
        input.style.width = String(spanRect.width + extra) + 'px';
      };

      stageContainer.appendChild(input);
      input.focus();
      input.select();
      resizeToContent();

      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        input.removeEventListener('keydown', onKeyDown);
        input.removeEventListener('blur', onBlur);
        input.removeEventListener('input', onInput);
        if (input.parentNode === stageContainer) {
          stageContainer.removeChild(input);
        }
        if (measureSpan.parentNode === stageContainer) {
          stageContainer.removeChild(measureSpan);
        }
        label.visible(prevVisible);
        this._layer.batchDraw();
      };

      const commit = () => {
        if (finished) return;
        const next = input.value.trim();
        if (next.length >= 1 && next.length <= 40 && next !== prevText) {
          label.text(next);
          (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
            'frame:label-changed',
            frame,
            next,
          );
          this._layer.batchDraw();
        }
        cleanup();
      };

      const cancel = () => {
        if (finished) return;
        cleanup();
      };

      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          cancel();
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          commit();
        }
      };

      const onInput = () => {
        resizeToContent();
      };

      const onBlur = () => {
        commit();
      };

      input.addEventListener('keydown', onKeyDown);
      input.addEventListener('blur', onBlur);
      input.addEventListener('input', onInput);
    });

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

    return frame;
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
          const children = contentGroup.getChildren();
          const hasChildren = children.length > 0;
          const frameKn = currentFrame.getKonvaNode() as unknown as Konva.Node & {
            draggable?: (value?: boolean) => boolean;
          };
          if (typeof frameKn.draggable === 'function') {
            frameKn.draggable(!hasChildren);
          }

          // Сообщаем заинтересованным подсистемам (SelectionPlugin и др.), что
          // состав детей фрейма изменился, чтобы они могли обновить select/drag.
          (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
            'frame:children-changed',
            currentFrame,
            hasChildren,
          );
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

        // Уведомляем, что у фрейма поменялось наличие детей
        (this._eventBus as unknown as { emit: (...args: unknown[]) => void }).emit(
          'frame:children-changed',
          targetFrame,
          hasChildren,
        );
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

  // Жёстко соблюдаем инвариант для FrameNode: если во фрейме есть дети,
  // он не должен быть draggable. Если детей нет — draggable разрешён.
  private _enforceFrameDraggableInvariant(frame: FrameNode) {
    const contentGroup = frame.getContentGroup();
    const hasChildren = contentGroup.getChildren().length > 0;
    const frameKn = frame.getKonvaNode() as unknown as Konva.Node & {
      draggable?: (value?: boolean) => boolean;
    };

    if (typeof frameKn.draggable === 'function') {
      frameKn.draggable(!hasChildren);
    }
  }
}
