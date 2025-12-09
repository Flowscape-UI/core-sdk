import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface VisualGuidesPluginOptions {
  guidelineColor?: string;
  guidelineWidth?: number;
  guidelineDash?: number[];
  thresholdPx?: number;
}

interface LineGuideStops {
  vertical: number[];
  horizontal: number[];
}

interface ObjectSnappingEdges {
  vertical: {
    guide: number;
    offset: number;
    snap: 'start' | 'center' | 'end';
  }[];
  horizontal: {
    guide: number;
    offset: number;
    snap: 'start' | 'center' | 'end';
  }[];
}

interface GuideDescriptor {
  lineGuide: number;
  offset: number;
  orientation: 'V' | 'H';
  snap: 'start' | 'center' | 'end';
}

/**
 * VisualGuidesPlugin — snapping of nodes and groups relative to other nodes/groups + stage borders.
 *
 * Implemented directly on top of Konva, based on the official guidelines example:
 * https://konvajs.org/docs/sandbox/Guides.html
 */
export class VisualGuidesPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<VisualGuidesPluginOptions>;
  private _layer: Konva.Layer | null = null;

  private _dragMoveHandler: ((e: Konva.KonvaEventObject<DragEvent>) => void) | null = null;
  private _dragEndHandler: ((e: Konva.KonvaEventObject<DragEvent>) => void) | null = null;
  private _nodesAddHandler: ((e: Konva.KonvaEventObject<Event>) => void) | null = null;
  private _nodesRemoveHandler: ((e: Konva.KonvaEventObject<Event>) => void) | null = null;

  constructor(options: VisualGuidesPluginOptions = {}) {
    super();
    const {
      guidelineColor = '#8e3e2c',
      guidelineWidth = 1,
      guidelineDash = [0, 0],
      thresholdPx = 20,
    } = options;

    this._options = {
      guidelineColor,
      guidelineWidth,
      guidelineDash,
      thresholdPx,
    };
  }

  // Hard snapping for drag based on gaps between the dragged node and neighbors.
  // Keeps existing alignment snapping, and additionally zeroes small gaps (within thresholdPx).
  private _applyGapSnappingForDrag(
    target: Konva.Node,
    originalPos: { x: number; y: number },
    absPos: { x: number; y: number },
  ): void {
    if (!this._core) return;

    const threshold = this._options.thresholdPx;

    // Box of the node before snapping
    const origBox = target.getClientRect({ skipShadow: true, skipStroke: false });
    const dxAlign = absPos.x - originalPos.x;
    const dyAlign = absPos.y - originalPos.y;

    // Box after alignment snapping (but before gap snapping)
    const box = {
      x: origBox.x + dxAlign,
      y: origBox.y + dyAlign,
      width: origBox.width,
      height: origBox.height,
    };

    const others = this._collectOtherNodeBoxes(target);

    let bestGapX = threshold + 1;
    let bestDx = 0;
    let bestGapY = threshold + 1;
    let bestDy = 0;

    for (const other of others) {
      const ob = other.box;

      // Horizontal gaps (left/right) — require vertical overlap
      const overlapY = !(box.y > ob.y + ob.height || box.y + box.height < ob.y);
      if (overlapY) {
        const boxLeft = box.x;
        const boxRight = box.x + box.width;
        const obLeft = ob.x;
        const obRight = ob.x + ob.width;

        // Neighbor strictly to the right
        if (obLeft >= boxRight) {
          const gap = obLeft - boxRight;
          if (gap > 0 && gap < bestGapX) {
            bestGapX = gap;
            bestDx = gap;
          }
        }

        // Neighbor strictly to the left
        if (obRight <= boxLeft) {
          const gap = boxLeft - obRight;
          if (gap > 0 && gap < bestGapX) {
            bestGapX = gap;
            bestDx = -gap;
          }
        }
      }

      // Vertical gaps (up/down) — require horizontal overlap
      const overlapX = !(box.x > ob.x + ob.width || box.x + box.width < ob.x);
      if (overlapX) {
        const boxTop = box.y;
        const boxBottom = box.y + box.height;
        const obTop = ob.y;
        const obBottom = ob.y + ob.height;

        // Neighbor strictly below
        if (obTop >= boxBottom) {
          const gap = obTop - boxBottom;
          if (gap > 0 && gap < bestGapY) {
            bestGapY = gap;
            bestDy = gap;
          }
        }

        // Neighbor strictly above
        if (obBottom <= boxTop) {
          const gap = boxTop - obBottom;
          if (gap > 0 && gap < bestGapY) {
            bestGapY = gap;
            bestDy = -gap;
          }
        }
      }
    }

    if (bestGapX <= threshold) {
      absPos.x += bestDx;
    }
    if (bestGapY <= threshold) {
      absPos.y += bestDy;
    }
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Separate overlay layer for snap-guides, above nodes.layer
    const layer = new Konva.Layer({ name: 'snap-guides-layer' });
    core.stage.add(layer);
    layer.moveToTop();
    this._layer = layer;

    this._dragMoveHandler = (e: Konva.KonvaEventObject<DragEvent>) => {
      this._onDragMove(e);
    };
    this._dragEndHandler = () => {
      this._clearGuides();
    };

    core.stage.on('dragmove.snap-guides', this._dragMoveHandler);
    core.stage.on('dragend.snap-guides', this._dragEndHandler);

    // Attach to existing and future Transformers to show guides during resize
    const nodesLayer = core.nodes.layer;
    this._nodesAddHandler = (e: Konva.KonvaEventObject<Event>) => {
      const anyE = e as unknown as { child?: Konva.Node };
      const added = anyE.child ?? (e.target as Konva.Node);
      this._walkAttachTransformers(added);
    };
    this._nodesRemoveHandler = (e: Konva.KonvaEventObject<Event>) => {
      const anyE = e as unknown as { child?: Konva.Node };
      const removed = anyE.child ?? (e.target as Konva.Node);
      this._walkDetachTransformers(removed);
    };
    nodesLayer.on('add.snap-guides', this._nodesAddHandler);
    nodesLayer.on('remove.snap-guides', this._nodesRemoveHandler);

    this._attachExistingTransformers();
  }

  protected onDetach(core: CoreEngine): void {
    core.stage.off('.snap-guides');

    // Detach from nodes layer and transformers
    core.nodes.layer.off('.snap-guides');
    const transformers = core.nodes.layer.find('Transformer');
    for (const tr of transformers) {
      (tr as Konva.Transformer).off('.snap-guides-resize');
    }

    if (this._layer) {
      this._layer.destroy();
      this._layer = null;
    }

    this._dragMoveHandler = null;
    this._dragEndHandler = null;
    this._nodesAddHandler = null;
    this._nodesRemoveHandler = null;
    this._core = undefined as unknown as CoreEngine;
  }

  private _onDragMove(e: Konva.KonvaEventObject<DragEvent>): void {
    if (!this._core || !this._layer) return;

    // During rotation via SelectionPlugin's rotate handles, do not show guides
    if (this._isRotatingNow(e.target as Konva.Node)) {
      this._clearGuides();
      return;
    }

    const stage = this._core.stage;
    const worldLayer = this._core.nodes.layer;
    const target = e.target as Konva.Node;

    // Skip stage and layers
    if (target === (stage as unknown as Konva.Node) || target instanceof Konva.Layer) return;

    // Only react to nodes that belong to nodes.layer subtree
    let p: Konva.Node | null = target;
    let inNodesLayer = false;
    while (p) {
      if (p === (worldLayer as unknown as Konva.Node)) {
        inNodesLayer = true;
        break;
      }
      p = p.getParent();
    }
    if (!inNodesLayer) return;

    // Only for draggable nodes
    const anyNode = target as unknown as { draggable?: () => boolean };
    if (typeof anyNode.draggable === 'function' && !anyNode.draggable()) return;

    this._clearGuides();

    // 1) Alignment snapping (centers/edges) — existing behavior
    const lineGuideStops = this._getLineGuideStops(target);
    const itemBounds = this._getObjectSnappingEdges(target);
    const guides = this._getGuides(lineGuideStops, itemBounds);

    if (!guides.length) return;

    const originalPos = target.absolutePosition();
    const absPos = { ...originalPos };

    for (const lg of guides) {
      if (lg.orientation === 'V') {
        absPos.x = lg.lineGuide + lg.offset;
      } else if (lg.orientation === 'H') {
        absPos.y = lg.lineGuide + lg.offset;
      }
    }

    // 2) Gap snapping: snap border-to-border if the gap is within threshold
    this._applyGapSnappingForDrag(target, originalPos, absPos);

    target.absolutePosition(absPos);

    // Rich visual guides for drag: rays from center/edges/corners with intersections
    this._drawDragGuides(target);
  }

  private _clearGuides(): void {
    if (!this._layer) return;
    const lines = this._layer.find('.snap-guid-line');
    for (const l of lines) {
      l.destroy();
    }
    this._layer.batchDraw();
  }

  // ===== Rich drag guides (multiple rays with intersections and distances) =====

  private _drawDragGuides(target: Konva.Node): void {
    if (!this._core || !this._layer) return;

    const targetBox = target.getClientRect({ skipShadow: true, skipStroke: false });
    const rays = this._buildDragRays(targetBox);

    const others = this._collectOtherNodeBoxes(target);
    if (!others.length) return;

    const maxPerRay = 16;

    for (const ray of rays) {
      const hits: {
        tEnter: number;
        tExit: number;
        box: { x: number; y: number; width: number; height: number };
      }[] = [];

      for (const other of others) {
        const seg = this._intersectRayWithBox(ray.origin, ray.dir, other.box);
        if (seg) {
          hits.push({ ...seg, box: other.box });
        }
      }

      if (!hits.length) continue;

      hits.sort((a, b) => a.tEnter - b.tEnter);
      const limited = hits.slice(0, maxPerRay);
      if (!limited.length) continue;

      let maxT = 0;
      for (const h of limited) {
        if (h.tExit > maxT) maxT = h.tExit;
      }
      if (maxT <= 0) continue;

      // Draw main ray line
      let points: number[];
      if (ray.dir === 'right') points = [0, 0, maxT, 0];
      else if (ray.dir === 'left') points = [0, 0, -maxT, 0];
      else if (ray.dir === 'down') points = [0, 0, 0, maxT];
      else points = [0, 0, 0, -maxT];

      const line = new Konva.Line({
        points,
        stroke: this._options.guidelineColor,
        strokeWidth: this._options.guidelineWidth,
        name: 'snap-guid-line',
        dash: this._options.guidelineDash,
        listening: false,
      });
      this._layer.add(line);
      line.absolutePosition({ x: ray.origin.x, y: ray.origin.y });

      // Draw entry/exit markers and distances
      for (const h of limited) {
        const t1 = h.tEnter;
        const t2 = h.tExit;

        const p1 = this._pointOnRay(ray.origin, ray.dir, t1);
        const p2 = this._pointOnRay(ray.origin, ray.dir, t2);

        // Distances: from dragged element boundary to neighbor boundaries along the ray
        const otherBox = h.box;
        let distEntry = 0;
        let distExit = 0;

        if (ray.dir === 'right') {
          const ref = targetBox.x + targetBox.width;
          const otherLeft = otherBox.x;
          const otherRight = otherBox.x + otherBox.width;
          distEntry = otherLeft - ref;
          distExit = otherRight - ref;
        } else if (ray.dir === 'left') {
          const ref = targetBox.x;
          const otherLeft = otherBox.x;
          const otherRight = otherBox.x + otherBox.width;
          distEntry = ref - otherRight;
          distExit = ref - otherLeft;
        } else if (ray.dir === 'down') {
          const ref = targetBox.y + targetBox.height;
          const otherTop = otherBox.y;
          const otherBottom = otherBox.y + otherBox.height;
          distEntry = otherTop - ref;
          distExit = otherBottom - ref;
        } else {
          // up
          const ref = targetBox.y;
          const otherTop = otherBox.y;
          const otherBottom = otherBox.y + otherBox.height;
          distEntry = ref - otherBottom;
          distExit = ref - otherTop;
        }

        // Clamp negative values (overlaps) to zero to show non-negative distances
        distEntry = Math.max(0, distEntry);
        distExit = Math.max(0, distExit);

        this._drawRayMarkerWithLabel(p1.x, p1.y, distEntry, ray.dir);
        this._drawRayMarkerWithLabel(p2.x, p2.y, distExit, ray.dir);
      }
    }

    this._layer.batchDraw();
  }

  private _pointOnRay(
    origin: { x: number; y: number },
    dir: 'left' | 'right' | 'up' | 'down',
    t: number,
  ): { x: number; y: number } {
    if (dir === 'right') return { x: origin.x + t, y: origin.y };
    if (dir === 'left') return { x: origin.x - t, y: origin.y };
    if (dir === 'down') return { x: origin.x, y: origin.y + t };
    return { x: origin.x, y: origin.y - t };
  }

  private _drawRayMarkerWithLabel(
    x: number,
    y: number,
    distance: number,
    dir: 'left' | 'right' | 'up' | 'down',
  ): void {
    if (!this._layer) return;

    // Old circle marker:
    // const circle = new Konva.Circle({
    //   x,
    //   y,
    //   radius: 3,
    //   fill: this._options.guidelineColor,
    //   strokeWidth: 0,
    //   name: 'snap-guid-line',
    //   listening: false,
    // });
    // this._layer.add(circle);

    // New cross marker made of two diagonal segments (X-shape)
    const size = 4; // half-size of the cross

    const crossMain = new Konva.Line({
      points: [
        -size,
        -size,
        size,
        size, // main diagonal
      ],
      stroke: this._options.guidelineColor,
      strokeWidth: 1,
      name: 'snap-guid-line',
      listening: false,
    });
    this._layer.add(crossMain);
    crossMain.absolutePosition({ x, y });

    const crossSecondary = new Konva.Line({
      points: [
        -size,
        size,
        size,
        -size, // secondary diagonal
      ],
      stroke: this._options.guidelineColor,
      strokeWidth: 1,
      name: 'snap-guid-line',
      listening: false,
    });
    this._layer.add(crossSecondary);
    crossSecondary.absolutePosition({ x, y });

    // Label drawing (distance text) is temporarily disabled:
    // const textValue = Math.round(distance).toString();
    // let textX = x;
    // let textY = y;
    //
    // const offset = 6;
    // if (dir === 'right') {
    //   textX += offset;
    //   textY -= offset;
    // } else if (dir === 'left') {
    //   textX -= offset * 2;
    //   textY -= offset;
    // } else if (dir === 'down') {
    //   textX += offset;
    //   textY += offset;
    // } else {
    //   // up
    //   textX += offset;
    //   textY -= offset * 2;
    // }
    //
    // const label = new Konva.Text({
    //   x: textX,
    //   y: textY,
    //   text: textValue,
    //   fontSize: 10,
    //   fill: this._options.guidelineColor,
    //   name: 'snap-guid-line',
    //   listening: false,
    // });
    // this._layer.add(label);
  }

  private _buildDragRays(box: { x: number; y: number; width: number; height: number }) {
    type RayDir = 'left' | 'right' | 'up' | 'down';
    interface RaySpec {
      origin: { x: number; y: number };
      dir: RayDir;
    }

    const rays: RaySpec[] = [];
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // From center — up to 4 rays
    rays.push(
      { origin: { x: cx, y: cy }, dir: 'up' },
      { origin: { x: cx, y: cy }, dir: 'down' },
      { origin: { x: cx, y: cy }, dir: 'left' },
      { origin: { x: cx, y: cy }, dir: 'right' },
    );

    // From each edge midpoint — one ray
    rays.push(
      { origin: { x: cx, y: box.y }, dir: 'up' },
      { origin: { x: cx, y: box.y + box.height }, dir: 'down' },
      { origin: { x: box.x, y: cy }, dir: 'left' },
      { origin: { x: box.x + box.width, y: cy }, dir: 'right' },
    );

    // From each corner — up to 2 rays
    const tl = { x: box.x, y: box.y };
    const tr = { x: box.x + box.width, y: box.y };
    const br = { x: box.x + box.width, y: box.y + box.height };
    const bl = { x: box.x, y: box.y + box.height };

    rays.push(
      { origin: tl, dir: 'up' },
      { origin: tl, dir: 'left' },
      { origin: tr, dir: 'up' },
      { origin: tr, dir: 'right' },
      { origin: br, dir: 'down' },
      { origin: br, dir: 'right' },
      { origin: bl, dir: 'down' },
      { origin: bl, dir: 'left' },
    );

    return rays;
  }

  private _collectOtherNodeBoxes(skipShape: Konva.Node): {
    node: Konva.Node;
    box: { x: number; y: number; width: number; height: number };
  }[] {
    const result: {
      node: Konva.Node;
      box: { x: number; y: number; width: number; height: number };
    }[] = [];

    if (!this._core) return result;

    const nodes = this._core.nodes.list();
    for (const bn of nodes) {
      const kn = bn.getNode() as unknown as Konva.Node;

      // Skip the node being dragged and its ancestors/descendants
      if (kn === skipShape) continue;
      const anyKn = kn as unknown as {
        isAncestorOf?: (n: Konva.Node) => boolean;
      };
      const anySkip = skipShape as unknown as {
        isAncestorOf?: (n: Konva.Node) => boolean;
      };
      if (
        (typeof anyKn.isAncestorOf === 'function' && anyKn.isAncestorOf(skipShape)) ||
        (typeof anySkip.isAncestorOf === 'function' && anySkip.isAncestorOf(kn))
      ) {
        continue;
      }

      const box = kn.getClientRect({ skipShadow: true, skipStroke: false });
      result.push({
        node: kn,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
    }

    return result;
  }

  private _intersectRayWithBox(
    origin: { x: number; y: number },
    dir: 'left' | 'right' | 'up' | 'down',
    box: { x: number; y: number; width: number; height: number },
  ): { tEnter: number; tExit: number } | null {
    const x0 = origin.x;
    const y0 = origin.y;
    const x1 = box.x;
    const y1 = box.y;
    const x2 = box.x + box.width;
    const y2 = box.y + box.height;

    if (dir === 'right' || dir === 'left') {
      // vertical overlap
      if (y0 < y1 || y0 > y2) return null;

      if (dir === 'right') {
        if (x2 <= x0) return null;
        const entry = Math.max(x1, x0);
        const exit = x2;
        const tEnter = entry - x0;
        const tExit = exit - x0;
        if (tExit <= 0 || tExit <= tEnter) return null;
        return { tEnter, tExit };
      } else {
        if (x1 >= x0) return null;
        const entry = Math.min(x2, x0);
        const exit = x1;
        const tEnter = x0 - entry;
        const tExit = x0 - exit;
        if (tExit <= 0 || tExit <= tEnter) return null;
        return { tEnter, tExit };
      }
    }

    // up/down: horizontal overlap
    if (x0 < x1 || x0 > x2) return null;

    if (dir === 'down') {
      if (y2 <= y0) return null;
      const entry = Math.max(y1, y0);
      const exit = y2;
      const tEnter = entry - y0;
      const tExit = exit - y0;
      if (tExit <= 0 || tExit <= tEnter) return null;
      return { tEnter, tExit };
    } else {
      // up
      if (y1 >= y0) return null;
      const entry = Math.min(y2, y0);
      const exit = y1;
      const tEnter = y0 - entry;
      const tExit = y0 - exit;
      if (tExit <= 0 || tExit <= tEnter) return null;
      return { tEnter, tExit };
    }
  }

  // Collect all potential snapping lines: stage borders/center + edges/centers of other nodes/groups
  private _getLineGuideStops(skipShape: Konva.Node): LineGuideStops {
    if (!this._core) {
      return { vertical: [], horizontal: [] };
    }

    const stage = this._core.stage;
    const vertical: number[] = [0, stage.width() / 2, stage.width()];
    const horizontal: number[] = [0, stage.height() / 2, stage.height()];

    const nodes = this._core.nodes.list();
    for (const bn of nodes) {
      const kn = bn.getNode() as unknown as Konva.Node;

      // Skip the node being dragged and its ancestors/descendants
      if (kn === skipShape) continue;
      const anyKn = kn as unknown as {
        isAncestorOf?: (n: Konva.Node) => boolean;
      };
      const anySkip = skipShape as unknown as {
        isAncestorOf?: (n: Konva.Node) => boolean;
      };
      if (
        (typeof anyKn.isAncestorOf === 'function' && anyKn.isAncestorOf(skipShape)) ||
        (typeof anySkip.isAncestorOf === 'function' && anySkip.isAncestorOf(kn))
      ) {
        continue;
      }

      const box = kn.getClientRect({ skipShadow: true, skipStroke: false });
      vertical.push(box.x, box.x + box.width, box.x + box.width / 2);
      horizontal.push(box.y, box.y + box.height, box.y + box.height / 2);
    }

    return { vertical, horizontal };
  }

  // What points of the object will trigger snapping?
  private _getObjectSnappingEdges(node: Konva.Node): ObjectSnappingEdges {
    const box = node.getClientRect({ skipShadow: true, skipStroke: false });
    const absPos = node.absolutePosition();

    return {
      vertical: [
        {
          guide: Math.round(box.x),
          offset: Math.round(absPos.x - box.x),
          snap: 'start',
        },
        {
          guide: Math.round(box.x + box.width / 2),
          offset: Math.round(absPos.x - box.x - box.width / 2),
          snap: 'center',
        },
        {
          guide: Math.round(box.x + box.width),
          offset: Math.round(absPos.x - box.x - box.width),
          snap: 'end',
        },
      ],
      horizontal: [
        {
          guide: Math.round(box.y),
          offset: Math.round(absPos.y - box.y),
          snap: 'start',
        },
        {
          guide: Math.round(box.y + box.height / 2),
          offset: Math.round(absPos.y - box.y - box.height / 2),
          snap: 'center',
        },
        {
          guide: Math.round(box.y + box.height),
          offset: Math.round(absPos.y - box.y - box.height),
          snap: 'end',
        },
      ],
    };
  }

  // Find all snapping possibilities and select the closest ones
  private _getGuides(stops: LineGuideStops, edges: ObjectSnappingEdges): GuideDescriptor[] {
    const resultV: {
      lineGuide: number;
      diff: number;
      snap: 'start' | 'center' | 'end';
      offset: number;
    }[] = [];
    const resultH: {
      lineGuide: number;
      diff: number;
      snap: 'start' | 'center' | 'end';
      offset: number;
    }[] = [];

    const offset = this._options.thresholdPx;

    for (const lineGuide of stops.vertical) {
      for (const itemBound of edges.vertical) {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < offset) {
          resultV.push({
            lineGuide,
            diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          });
        }
      }
    }

    for (const lineGuide of stops.horizontal) {
      for (const itemBound of edges.horizontal) {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < offset) {
          resultH.push({
            lineGuide,
            diff,
            snap: itemBound.snap,
            offset: itemBound.offset,
          });
        }
      }
    }

    const guides: GuideDescriptor[] = [];

    if (resultV.length > 0) {
      const minV = [...resultV].sort((a, b) => a.diff - b.diff)[0];
      guides.push({
        lineGuide: minV.lineGuide,
        offset: minV.offset,
        orientation: 'V',
        snap: minV.snap,
      });
    }

    if (resultH.length > 0) {
      const minH = [...resultH].sort((a, b) => a.diff - b.diff)[0];
      guides.push({
        lineGuide: minH.lineGuide,
        offset: minH.offset,
        orientation: 'H',
        snap: minH.snap,
      });
    }

    return guides;
  }

  private _drawGuides(guides: GuideDescriptor[]): void {
    if (!this._layer) return;

    for (const lg of guides) {
      if (lg.orientation === 'H') {
        const line = new Konva.Line({
          points: [-6000, 0, 6000, 0],
          stroke: this._options.guidelineColor,
          strokeWidth: this._options.guidelineWidth,
          name: 'snap-guid-line',
          dash: this._options.guidelineDash,
          listening: false,
        });
        this._layer.add(line);
        line.absolutePosition({ x: 0, y: lg.lineGuide });
      } else if (lg.orientation === 'V') {
        const line = new Konva.Line({
          points: [0, -6000, 0, 6000],
          stroke: this._options.guidelineColor,
          strokeWidth: this._options.guidelineWidth,
          name: 'snap-guid-line',
          dash: this._options.guidelineDash,
          listening: false,
        });
        this._layer.add(line);
        line.absolutePosition({ x: lg.lineGuide, y: 0 });
      }
    }

    this._layer.batchDraw();
  }

  // ===== Resize support via Transformer events (visual guides only) =====

  private _attachExistingTransformers(): void {
    if (!this._core) return;
    const root = this._core.nodes.layer as unknown as Konva.Node;
    this._walkAttachTransformers(root);
  }

  private _walkAttachTransformers(node: Konva.Node): void {
    this._attachTransformer(node);
    const anyN = node as unknown as { getChildren?: () => Konva.Node[] };
    const children = typeof anyN.getChildren === 'function' ? anyN.getChildren() : [];
    for (const ch of children) {
      this._walkAttachTransformers(ch);
    }
  }

  private _attachTransformer(node: Konva.Node): void {
    const anyN = node as unknown as { getClassName?: () => string };
    const cls = typeof anyN.getClassName === 'function' ? anyN.getClassName() : '';
    if (cls !== 'Transformer') return;

    const tr = node as Konva.Transformer;
    // Remove old handlers for safety
    tr.off('.snap-guides-resize');

    tr.on('transform.snap-guides-resize', () => {
      this._handleTransformerTransform(tr);
    });
    tr.on('transformend.snap-guides-resize', () => {
      this._clearGuides();
    });
  }

  private _walkDetachTransformers(node: Konva.Node): void {
    const anyN = node as unknown as {
      getClassName?: () => string;
      getChildren?: () => Konva.Node[];
    };
    const cls = typeof anyN.getClassName === 'function' ? anyN.getClassName() : '';
    if (cls === 'Transformer') {
      (node as Konva.Transformer).off('.snap-guides-resize');
    }
    const children = typeof anyN.getChildren === 'function' ? anyN.getChildren() : [];
    for (const ch of children) {
      this._walkDetachTransformers(ch);
    }
  }

  private _handleTransformerTransform(tr: Konva.Transformer): void {
    if (!this._core || !this._layer) return;

    const activeAnchor = typeof tr.getActiveAnchor === 'function' ? tr.getActiveAnchor() : '';

    // Do not draw guides during rotation (node, real group, or temp group):
    // either when rotater anchor is active, or when event originates from rotate-handles tree.
    if (activeAnchor === 'rotater' || this._isRotatingNow(tr as unknown as Konva.Node)) {
      this._clearGuides();
      return;
    }
    const nodes = typeof tr.nodes === 'function' ? tr.nodes() : [];
    const target = nodes[0];
    if (!target) return;

    // Only if target belongs to engine's nodes.layer
    const anyNode = target as unknown as { getLayer?: () => Konva.Layer | null };
    const layer = typeof anyNode.getLayer === 'function' ? anyNode.getLayer() : null;
    if (!layer || layer !== this._core.nodes.layer) return;

    this._clearGuides();

    const stops = this._getLineGuideStops(target);
    const edges = this._getObjectSnappingEdges(target);
    const guides = this._getGuides(stops, edges);
    if (!guides.length) return;

    // Hard snapping during resize/rotation: adjust absolute position (not size/rotation)
    const absPos = target.absolutePosition();
    for (const lg of guides) {
      if (lg.orientation === 'V') {
        absPos.x = lg.lineGuide + lg.offset;
      } else if (lg.orientation === 'H') {
        absPos.y = lg.lineGuide + lg.offset;
      }
    }
    target.absolutePosition(absPos);

    // Visual: for resize draw ray-based guides from active anchor
    this._drawResizeGuides(tr, target, guides);
  }

  private _drawResizeGuides(
    tr: Konva.Transformer,
    target: Konva.Node,
    guides: GuideDescriptor[],
  ): void {
    if (!this._core || !this._layer) return;

    const anchor = typeof tr.getActiveAnchor === 'function' ? tr.getActiveAnchor() : '';
    if (!anchor) return;

    const targetBox = target.getClientRect({ skipShadow: true, skipStroke: false });

    // Use guides only as a signal about vertical/horizontal snapping presence
    const hasV = guides.some((g) => g.orientation === 'V');
    const hasH = guides.some((g) => g.orientation === 'H');

    // Build rays for this anchor and filter by available orientations
    const allRays = this._buildResizeRays(anchor, targetBox);
    const rays = allRays.filter((ray) => {
      if ((ray.dir === 'left' || ray.dir === 'right') && !hasH) return false;
      if ((ray.dir === 'up' || ray.dir === 'down') && !hasV) return false;
      return true;
    });

    if (!rays.length) return;

    const others = this._collectOtherNodeBoxes(target);
    if (!others.length) return;

    const maxPerRay = 16;

    for (const ray of rays) {
      const hits: {
        tEnter: number;
        tExit: number;
        box: { x: number; y: number; width: number; height: number };
      }[] = [];

      for (const other of others) {
        const seg = this._intersectRayWithBox(ray.origin, ray.dir, other.box);
        if (seg) {
          hits.push({ ...seg, box: other.box });
        }
      }

      if (!hits.length) continue;

      hits.sort((a, b) => a.tEnter - b.tEnter);
      const limited = hits.slice(0, maxPerRay);
      if (!limited.length) continue;

      let maxT = 0;
      for (const h of limited) {
        if (h.tExit > maxT) maxT = h.tExit;
      }
      if (maxT <= 0) continue;

      // Draw main ray line from origin
      let points: number[];
      if (ray.dir === 'right') points = [0, 0, maxT, 0];
      else if (ray.dir === 'left') points = [0, 0, -maxT, 0];
      else if (ray.dir === 'down') points = [0, 0, 0, maxT];
      else points = [0, 0, 0, -maxT];

      const line = new Konva.Line({
        points,
        stroke: this._options.guidelineColor,
        strokeWidth: this._options.guidelineWidth,
        name: 'snap-guid-line',
        dash: this._options.guidelineDash,
        listening: false,
      });
      this._layer.add(line);
      line.absolutePosition({ x: ray.origin.x, y: ray.origin.y });

      // Mark entry/exit points with cross markers and (optionally) distances
      for (const h of limited) {
        const t1 = h.tEnter;
        const t2 = h.tExit;

        const p1 = this._pointOnRay(ray.origin, ray.dir, t1);
        const p2 = this._pointOnRay(ray.origin, ray.dir, t2);

        const otherBox = h.box;
        let distEntry = 0;
        let distExit = 0;

        if (ray.dir === 'right') {
          const ref = targetBox.x + targetBox.width;
          const otherLeft = otherBox.x;
          const otherRight = otherBox.x + otherBox.width;
          distEntry = otherLeft - ref;
          distExit = otherRight - ref;
        } else if (ray.dir === 'left') {
          const ref = targetBox.x;
          const otherLeft = otherBox.x;
          const otherRight = otherBox.x + otherBox.width;
          distEntry = ref - otherRight;
          distExit = ref - otherLeft;
        } else if (ray.dir === 'down') {
          const ref = targetBox.y + targetBox.height;
          const otherTop = otherBox.y;
          const otherBottom = otherBox.y + otherBox.height;
          distEntry = otherTop - ref;
          distExit = otherBottom - ref;
        } else {
          // up
          const ref = targetBox.y;
          const otherTop = otherBox.y;
          const otherBottom = otherBox.y + otherBox.height;
          distEntry = ref - otherBottom;
          distExit = ref - otherTop;
        }

        distEntry = Math.max(0, distEntry);
        distExit = Math.max(0, distExit);

        this._drawRayMarkerWithLabel(p1.x, p1.y, distEntry, ray.dir);
        this._drawRayMarkerWithLabel(p2.x, p2.y, distExit, ray.dir);
      }
    }

    this._layer.batchDraw();
  }

  private _buildResizeRays(
    anchor: string,
    box: { x: number; y: number; width: number; height: number },
  ): { origin: { x: number; y: number }; dir: 'left' | 'right' | 'up' | 'down' }[] {
    type RayDir = 'left' | 'right' | 'up' | 'down';
    interface RaySpec {
      origin: { x: number; y: number };
      dir: RayDir;
    }

    const tl = { x: box.x, y: box.y };
    const trPt = { x: box.x + box.width, y: box.y };
    const br = { x: box.x + box.width, y: box.y + box.height };
    const bl = { x: box.x, y: box.y + box.height };

    const rays: RaySpec[] = [];

    switch (anchor) {
      case 'top-left':
        rays.push({ origin: tl, dir: 'up' }, { origin: tl, dir: 'left' });
        break;
      case 'top-right':
        rays.push({ origin: trPt, dir: 'up' }, { origin: trPt, dir: 'right' });
        break;
      case 'bottom-right':
        rays.push({ origin: br, dir: 'down' }, { origin: br, dir: 'right' });
        break;
      case 'bottom-left':
        rays.push({ origin: bl, dir: 'down' }, { origin: bl, dir: 'left' });
        break;
      case 'middle-left':
        // Side anchor: behave like top-left, lines up and left
        rays.push({ origin: tl, dir: 'up' }, { origin: tl, dir: 'left' });
        break;
      case 'middle-right':
        rays.push({ origin: trPt, dir: 'up' }, { origin: trPt, dir: 'right' });
        break;
      case 'top-center':
        // Use top-left corner as origin, as agreed
        rays.push({ origin: tl, dir: 'up' }, { origin: tl, dir: 'left' });
        break;
      case 'bottom-center':
        rays.push({ origin: bl, dir: 'down' }, { origin: bl, dir: 'left' });
        break;
      default:
        break;
    }

    return rays;
  }

  private _isRotatingNow(target: Konva.Node | null): boolean {
    // Treat any drag/transform coming from rotate handles (for single node, real group or temp group)
    // as rotation. Rotate handles live in a group named 'rotate-handles-group' and have names
    // like 'rotate-tl', 'rotate-tr', etc.

    let node: Konva.Node | null = target;
    while (node) {
      const anyNode = node as unknown as { name?: () => string };
      const name = typeof anyNode.name === 'function' ? anyNode.name() : '';
      if (name.startsWith('rotate-') || name === 'rotate-handles-group') {
        return true;
      }
      node = node.getParent();
    }

    return false;
  }
}
