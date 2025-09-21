import Konva from 'konva';

import { FlowscapeLabel } from './FlowscapeLabel';

export interface EdgeTransformerOptions extends Konva.TransformerConfig {
  edgeHitWidth?: number;
}

export class EdgeTransformer extends Konva.Transformer {
  private _edgeHitWidth: number;
  private _rotHotspots: {
    topLeft: Konva.Rect;
    topRight: Konva.Rect;
    bottomLeft: Konva.Rect;
    bottomRight: Konva.Rect;
  } | null = null;
  private _rotBound = false;
  private _rotDrag: {
    startAngle: number;
    startRotationDeg: number;
    center: { x: number; y: number };
  } | null = null;

  private _radHandles: {
    topLeft: Konva.Circle;
    topRight: Konva.Circle;
    bottomLeft: Konva.Circle;
    bottomRight: Konva.Circle;
  } | null = null;
  private _radLabels: {
    topLeft: FlowscapeLabel;
    topRight: FlowscapeLabel;
    bottomLeft: FlowscapeLabel;
    bottomRight: FlowscapeLabel;
  } | null = null;

  // Определяем, какой угол (topLeft/topRight/bottomLeft/bottomRight) занимает хот-спот в данный момент
  private _effectiveCornerFor(
    hot: Konva.Rect,
    node: Konva.Node,
  ): 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' {
    const stage = this.getStage();
    if (!stage) {
      const attr = hot.getAttr('rotKey') as
        | 'topLeft'
        | 'topRight'
        | 'bottomLeft'
        | 'bottomRight'
        | undefined;
      return attr ?? 'topLeft';
    }
    const box = node.getClientRect({ relativeTo: stage, skipShadow: true, skipStroke: false });
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const absHot = hot.getAbsoluteTransform();
    const hotCenterStage = absHot.point({ x: hot.width() / 2, y: hot.height() / 2 });
    const dx = hotCenterStage.x - center.x;
    const dy = hotCenterStage.y - center.y;
    // Классифицируем по квадрантам относительно центра ноды
    if (dy < 0) {
      return dx < 0 ? 'topLeft' : 'topRight';
    }
    return dx < 0 ? 'bottomLeft' : 'bottomRight';
  }

  // Генерация курсора из SVG, ориентированного под нужный угол
  private _cursorUrlFor(corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): string {
    // Базовый путь — изогнутая стрелка, рисуем в 24x24 с центром около (12,12)
    // Повернём всю группу на нужный угол, чтобы соответствовать углу хот-спота
    const rotateDeg =
      corner === 'topLeft' ? 0 : corner === 'topRight' ? 90 : corner === 'bottomRight' ? 180 : 270;
    const rotateStr = String(rotateDeg);
    const stroke = '#ffaa33';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <g transform="rotate(${rotateStr},12,12)">
    <path d="M8 17a6 6 0 1 1 6-6" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 5l0 4l4 0" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 12 12, alias`;
    return url;
  }

  private _destroyRotationHotspots(): void {
    if (!this._rotHotspots) return;
    const st = this.getStage();
    if (st) st.container().style.cursor = 'default';
    // Удаляем из слоя/родителя
    this._rotHotspots.topLeft.destroy();
    this._rotHotspots.topRight.destroy();
    this._rotHotspots.bottomLeft.destroy();
    this._rotHotspots.bottomRight.destroy();
    this._rotHotspots = null;
    this._rotBound = false;
  }

  // Удаление ручек скругления углов
  private _destroyRadiusHandles(): void {
    if (!this._radHandles) return;
    this._radHandles.topLeft.destroy();
    this._radHandles.topRight.destroy();
    this._radHandles.bottomLeft.destroy();
    this._radHandles.bottomRight.destroy();
    this._radHandles = null;
  }

  constructor(opts: EdgeTransformerOptions = {}) {
    super(opts);
    this.rotateEnabled(false);
    this._edgeHitWidth = opts.edgeHitWidth ?? 10;
    this.anchorStyleFunc((anchor) => {
      const node = this.nodes()[0];
      if (!node) {
        this._destroyRotationHotspots();
        this._destroyRadiusHandles();
        return;
      }
      const parent = node.getParent();
      if (!parent) return;
      const stage = this.getStage();
      if (!stage) return;
      const rectStage = node.getClientRect({
        skipShadow: true,
        skipStroke: false,
        relativeTo: stage,
      });
      const raw = anchor.name() || '';
      const name = raw.replace(' _anchor', '');
      if (!name) return;

      const tScale = this.getAbsoluteScale();
      const tSx = tScale.x || 1;
      const tSy = tScale.y || 1;

      if (name === 'middle-left' || name === 'middle-right') {
        const desiredScreenH = rectStage.height;
        const localH = desiredScreenH / tSy;
        const thick = this._edgeHitWidth;
        anchor.opacity(0);
        anchor.strokeEnabled(false);
        anchor.listening(true);
        anchor.width(thick);
        anchor.height(localH);
        anchor.offsetX(thick / 2);
        anchor.offsetY(localH / 2);
        anchor.hitStrokeWidth(desiredScreenH);
        anchor.scaleY(1);
        anchor.strokeScaleEnabled(false);
        anchor.moveToBottom();
      } else if (name === 'top-center' || name === 'bottom-center') {
        const desiredScreenW = rectStage.width;
        const localW = desiredScreenW / tSx;
        const thick = this._edgeHitWidth;
        anchor.opacity(0);
        anchor.strokeEnabled(false);
        anchor.listening(true);
        anchor.width(localW);
        anchor.height(thick);
        anchor.offsetX(localW / 2);
        anchor.offsetY(thick / 2);
        anchor.hitStrokeWidth(desiredScreenW);
        anchor.scaleX(1);
        anchor.strokeScaleEnabled(false);
        anchor.moveToBottom();
      }

      // Обновим/создадим хот-споты ротации один раз за вызов (не на каждый anchor)
      this._ensureRotationHotspots(parent);
      this._updateRotationHotspots(node, parent, rectStage, tSx, tSy);

      // Обновим/создадим ручки скругления углов
      this._ensureRadiusHandles(parent);
      this._updateRadiusHandles(node, parent, rectStage, tSx, tSy);

      // Сразу показать кастомные хендлеры после выбора/обновления, без необходимости повторного наведения
      this._setCustomHandlesVisible(true);

      // Один раз навешиваем слушатели для обновления хот-спотов при любых изменениях мира/узла
      if (!this._rotBound) {
        this._rotBound = true;
        const st = this.getStage();
        // Зум колесом
        st?.on('wheel.edge-rot-update', () => {
          this.forceUpdate();
        });
        // Перемещения/трансформации выделенного узла
        const n = this.nodes()[0];
        n?.on(
          'dragmove.edge-rot-update transform.edge-rot-update rotationChange.edge-rot-update scaleXChange.edge-rot-update scaleYChange.edge-rot-update xChange.edge-rot-update yChange.edge-rot-update',
          () => {
            this.forceUpdate();
          },
        );
        n?.on('dragstart.edge-transformer-visibility', () => {
          this.visible(false);
          this._destroyRotationHotspots();
          this._destroyRadiusHandles();
        });
        n?.on('dragend.edge-transformer-visibility', () => {
          this.visible(true);
          this.forceUpdate();
          // after drag, immediately show custom handles so no extra hover is needed
          this._setCustomHandlesVisible(true);
        });
        // Show handles only on hover over node or transformer
        n?.on('mouseenter.edge-custom-handles', () => {
          this._setCustomHandlesVisible(true);
        });
        n?.on('mouseleave.edge-custom-handles', () => {
          if (!this._isPointerOverInteractiveArea()) {
            this._setCustomHandlesVisible(false);
          }
        });
        this.on('mouseenter.edge-custom-handles', () => {
          this._setCustomHandlesVisible(true);
        });
        this.on('mouseleave.edge-custom-handles', () => {
          if (!this._isPointerOverInteractiveArea()) {
            this._setCustomHandlesVisible(false);
          }
        });
      }
    });

    this.getStage()?.on('wheel.edge-transformer', () => {
      this.forceUpdate();
    });

    const node = this.nodes()[0];
    node?.on('dragmove.edge-rot transform.edge-rot', () => {
      this.forceUpdate();
    });

    const st = this.getStage();
    st?.on(
      'mousedown.edge-rot-visibility click.edge-rot-visibility tap.edge-rot-visibility',
      () => {
        if (this.nodes().length === 0) {
          this._destroyRotationHotspots();
          this._destroyRadiusHandles();
        }
      },
    );
  }

  // Toggle visibility of our custom rotation hotspots and radius handles
  private _setCustomHandlesVisible(show: boolean): void {
    const n = this.nodes()[0];
    // do not show while dragging
    if (n && typeof n.isDragging === 'function' && n.isDragging()) {
      show = false;
    }
    if (this._rotHotspots) {
      this._rotHotspots.topLeft.visible(show);
      this._rotHotspots.topRight.visible(show);
      this._rotHotspots.bottomLeft.visible(show);
      this._rotHotspots.bottomRight.visible(show);
    }
    if (this._radHandles) {
      this._radHandles.topLeft.visible(show);
      this._radHandles.topRight.visible(show);
      this._radHandles.bottomLeft.visible(show);
      this._radHandles.bottomRight.visible(show);
    }
    this.getStage()?.batchDraw();
  }

  // Check if pointer is currently over the node, transformer, or any custom handle
  private _isPointerOverInteractiveArea(): boolean {
    const stage = this.getStage();
    if (!stage) return false;
    const pos = stage.getPointerPosition();
    if (!pos) return false;
    const shape = stage.getIntersection(pos);
    if (!shape) return false;
    const selected = this.nodes()[0];
    let p: Konva.Node | null = shape as Konva.Node;
    while (p) {
      if (p === this) return true;
      if (selected && p === selected) return true;
      if (
        this._rotHotspots &&
        (p === this._rotHotspots.topLeft ||
          p === this._rotHotspots.topRight ||
          p === this._rotHotspots.bottomLeft ||
          p === this._rotHotspots.bottomRight)
      ) {
        return true;
      }
      if (
        this._radHandles &&
        (p === this._radHandles.topLeft ||
          p === this._radHandles.topRight ||
          p === this._radHandles.bottomLeft ||
          p === this._radHandles.bottomRight)
      ) {
        return true;
      }
      p = p.getParent();
    }
    return false;
  }

  private _ensureRotationHotspots(parent: Konva.Container): void {
    if (this._rotHotspots) return;
    const mk = (key: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): Konva.Rect => {
      const r = new Konva.Rect({
        width: 1,
        height: 1,
        fill: 'transparent',
        strokeWidth: 1,
        strokeScaleEnabled: false,
        listening: true,
      });
      r.setAttr('rotKey', key);
      // make hit area stable in screen pixels
      r.hitStrokeWidth(24);
      // initially hidden; we control visibility via hover
      r.visible(false);
      r.on('mouseenter', () => {
        const st = this.getStage();
        if (st) {
          const node = this.nodes()[0];
          const attr = r.getAttr('rotKey') as
            | 'topLeft'
            | 'topRight'
            | 'bottomLeft'
            | 'bottomRight'
            | undefined;
          const k: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' = node
            ? this._effectiveCornerFor(r, node)
            : (attr ?? 'topLeft');
          const cursor = this._cursorUrlFor(k);
          st.container().style.cursor = cursor;
        }
      });
      r.on('mouseleave', () => {
        const st = this.getStage();
        if (st) st.container().style.cursor = 'default';
      });
      r.on('mousedown', () => {
        const node = this.nodes()[0];
        const k = r.getAttr('rotKey') as
          | 'topLeft'
          | 'topRight'
          | 'bottomLeft'
          | 'bottomRight'
          | undefined;
        // ensure they are visible during interaction
        this._setCustomHandlesVisible(true);
        if (node && k) this._startRotationDrag(node, k);
      });
      return r;
    };
    this._rotHotspots = {
      topLeft: mk('topLeft'),
      topRight: mk('topRight'),
      bottomLeft: mk('bottomLeft'),
      bottomRight: mk('bottomRight'),
    };
    parent.add(this._rotHotspots.topLeft);
    parent.add(this._rotHotspots.topRight);
    parent.add(this._rotHotspots.bottomLeft);
    parent.add(this._rotHotspots.bottomRight);
  }

  private _updateRotationHotspots(
    node: Konva.Node,
    parent: Konva.Container,
    rectStage: { x: number; y: number; width: number; height: number },
    _tSx: number,
    _tSy: number,
  ): void {
    if (!this._rotHotspots) return;
    const sizePx = 14; // hotspot size on screen
    const offsetPx = 18; // outward offset on screen
    const world = parent.getAbsoluteScale();
    const sizeLocalX = sizePx / (Math.abs(world.x) || 1);
    const sizeLocalY = sizePx / (Math.abs(world.y) || 1);

    const inv = parent.getAbsoluteTransform().copy();
    inv.invert();
    const toLocal = (p: { x: number; y: number }) => inv.point(p);

    const abs = node.getAbsoluteTransform();
    let width = 0;
    let height = 0;
    if (node instanceof Konva.Rect) {
      width = node.width();
      height = node.height();
    } else {
      width = rectStage.width;
      height = rectStage.height;
    }
    const ox = typeof node.offsetX === 'function' ? node.offsetX() : 0;
    const oy = typeof node.offsetY === 'function' ? node.offsetY() : 0;

    // Corners in Stage coords
    const pTL = abs.point({ x: -ox, y: -oy });
    const pTR = abs.point({ x: width - ox, y: -oy });
    const pBL = abs.point({ x: -ox, y: height - oy });
    const pBR = abs.point({ x: width - ox, y: height - oy });

    // Center in Stage coords
    const center = {
      x: (pTL.x + pTR.x + pBL.x + pBR.x) / 4,
      y: (pTL.y + pTR.y + pBL.y + pBR.y) / 4,
    };

    // Move points outward from the center by offsetPx screen pixels
    const addOutward = (corner: { x: number; y: number }) => {
      const dx = corner.x - center.x;
      const dy = corner.y - center.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: corner.x + (dx / len) * offsetPx, y: corner.y + (dy / len) * offsetPx };
    };

    const topLeftStage = addOutward(pTL);
    const topRightStage = addOutward(pTR);
    const bottomLeftStage = addOutward(pBL);
    const bottomRightStage = addOutward(pBR);

    const topLeftCenter = toLocal(topLeftStage);
    const topRightCenter = toLocal(topRightStage);
    const bottomLeftCenter = toLocal(bottomLeftStage);
    const bottomRightCenter = toLocal(bottomRightStage);

    this._rotHotspots.topLeft.setAttrs({
      x: topLeftCenter.x - sizeLocalX / 2,
      y: topLeftCenter.y - sizeLocalY / 2,
      width: sizeLocalX,
      height: sizeLocalY,
    });
    this._rotHotspots.topRight.setAttrs({
      x: topRightCenter.x - sizeLocalX / 2,
      y: topRightCenter.y - sizeLocalY / 2,
      width: sizeLocalX,
      height: sizeLocalY,
    });
    this._rotHotspots.bottomLeft.setAttrs({
      x: bottomLeftCenter.x - sizeLocalX / 2,
      y: bottomLeftCenter.y - sizeLocalY / 2,
      width: sizeLocalX,
      height: sizeLocalY,
    });
    this._rotHotspots.bottomRight.setAttrs({
      x: bottomRightCenter.x - sizeLocalX / 2,
      y: bottomRightCenter.y - sizeLocalY / 2,
      width: sizeLocalX,
      height: sizeLocalY,
    });
  }

  private _ensureRadiusHandles(parent: Konva.Container): void {
    if (this._radHandles) return;
    const mk = (key: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): Konva.Circle => {
      const c = new Konva.Circle({
        fill: '#1f232a',
        stroke: '#22a6f2',
        strokeWidth: 2,
        listening: true,
        draggable: true,
      });
      c.setAttr('radKey', key);
      c.strokeScaleEnabled(false);
      // start hidden; shown on hover of node/transformer
      c.visible(false);
      // show label on hover near the handle
      c.on('mouseenter', () => {
        if (!this._radLabels) return;
        const keyNow = c.getAttr('radKey') as
          | 'topLeft'
          | 'topRight'
          | 'bottomLeft'
          | 'bottomRight'
          | undefined;
        if (!keyNow) return;
        const lbl = this._radLabels[keyNow];
        lbl.updateFor(c, parent);
        // set text with current radius
        const node = this.nodes()[0];
        if (node && node instanceof Konva.Rect) {
          const existing = node.cornerRadius();
          let arr: [number, number, number, number] = [0, 0, 0, 0];
          if (Array.isArray(existing))
            arr = [existing[0] ?? 0, existing[1] ?? 0, existing[2] ?? 0, existing[3] ?? 0];
          else if (typeof existing === 'number') arr = [existing, existing, existing, existing];
          const idx =
            keyNow === 'topLeft' ? 0 : keyNow === 'topRight' ? 1 : keyNow === 'bottomRight' ? 2 : 3;
          const radiusNow = Math.max(0, arr[idx]);
          const textNode = lbl.findOne<Konva.Text>('Text');
          if (textNode) textNode.text(String(Math.round(radiusNow)) + ' px');
        }
        lbl.visible(true);
      });
      c.on('mouseleave', () => {
        if (!this._radLabels) return;
        // keep shown if currently dragging this handle
        if (typeof c.isDragging === 'function' && c.isDragging()) return;
        const keyNow = c.getAttr('radKey') as
          | 'topLeft'
          | 'topRight'
          | 'bottomLeft'
          | 'bottomRight'
          | undefined;
        if (!keyNow) return;
        this._radLabels[keyNow].visible(false);
      });
      c.on('dragmove', (ev: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) => {
        // 1) apply radius logic
        this._onRadiusDrag(c, ev);
        // 2) update and pin label near the handle
        const node = this.nodes()[0];
        if (!node || !(node instanceof Konva.Rect) || !this._radLabels) return;
        const keyNow = c.getAttr('radKey') as
          | 'topLeft'
          | 'topRight'
          | 'bottomLeft'
          | 'bottomRight'
          | undefined;
        if (!keyNow) return;
        const lbl = this._radLabels[keyNow];
        // read current radii
        const existing = node.cornerRadius();
        let arr: [number, number, number, number] = [0, 0, 0, 0];
        if (Array.isArray(existing)) {
          arr = [existing[0] ?? 0, existing[1] ?? 0, existing[2] ?? 0, existing[3] ?? 0];
        } else if (typeof existing === 'number') {
          arr = [existing, existing, existing, existing];
        }
        const idx =
          keyNow === 'topLeft' ? 0 : keyNow === 'topRight' ? 1 : keyNow === 'bottomRight' ? 2 : 3;
        const radiusNow = Math.max(0, arr[idx]);
        // position/scale the label using its helper and then override text to radius
        lbl.updateFor(c, parent);
        const textNode = lbl.findOne<Konva.Text>('Text');
        if (textNode) textNode.text(String(Math.round(radiusNow)) + ' px');
        lbl.visible(true);
      });
      c.on('dragstart', () => {
        c.opacity(0.85);
        this._setCustomHandlesVisible(true);
        // show label at start
        if (this._radLabels) {
          const keyNow = c.getAttr('radKey') as
            | 'topLeft'
            | 'topRight'
            | 'bottomLeft'
            | 'bottomRight'
            | undefined;
          if (keyNow) {
            const lbl = this._radLabels[keyNow];
            lbl.updateFor(c, parent);
            lbl.visible(true);
          }
        }
      });
      c.on('dragend', () => {
        c.opacity(1);
        this.forceUpdate();
        // hide label on end
        if (this._radLabels) {
          const keyNow = c.getAttr('radKey') as
            | 'topLeft'
            | 'topRight'
            | 'bottomLeft'
            | 'bottomRight'
            | undefined;
          if (keyNow) this._radLabels[keyNow].visible(false);
        }
      });
      return c;
    };
    this._radHandles = {
      topLeft: mk('topLeft'),
      topRight: mk('topRight'),
      bottomLeft: mk('bottomLeft'),
      bottomRight: mk('bottomRight'),
    };
    parent.add(this._radHandles.topLeft);
    parent.add(this._radHandles.topRight);
    parent.add(this._radHandles.bottomLeft);
    parent.add(this._radHandles.bottomRight);

    // Create labels for each handle using FlowscapeLabel and add to same parent
    if (!this._radLabels) {
      this._radLabels = {
        topLeft: new FlowscapeLabel(),
        topRight: new FlowscapeLabel(),
        bottomLeft: new FlowscapeLabel(),
        bottomRight: new FlowscapeLabel(),
      };
      parent.add(this._radLabels.topLeft);
      parent.add(this._radLabels.topRight);
      parent.add(this._radLabels.bottomLeft);
      parent.add(this._radLabels.bottomRight);
      this._radLabels.topLeft.visible(false);
      this._radLabels.topRight.visible(false);
      this._radLabels.bottomLeft.visible(false);
      this._radLabels.bottomRight.visible(false);
    }
  }

  private _updateRadiusHandles(
    node: Konva.Node,
    parent: Konva.Container,
    rectStage: { x: number; y: number; width: number; height: number },
    _tSx: number,
    _tSy: number,
  ): void {
    if (!this._radHandles) return;
    const sizePx = 12;
    const handleRadiusPx = sizePx / 2;
    const innerMarginPx = 2; // extra gap from the edge so the whole circle stays inside
    const offsetFromEdgePx = handleRadiusPx + innerMarginPx;

    const inv = parent.getAbsoluteTransform().copy();
    inv.invert();
    const toLocal = (p: { x: number; y: number }) => inv.point(p);

    const abs = node.getAbsoluteTransform();
    let width = 0;
    let height = 0;
    if (node instanceof Konva.Rect) {
      width = node.width();
      height = node.height();
    } else {
      width = rectStage.width;
      height = rectStage.height;
    }
    const ox = typeof node.offsetX === 'function' ? node.offsetX() : 0;
    const oy = typeof node.offsetY === 'function' ? node.offsetY() : 0;

    const absScale = node.getAbsoluteScale();
    let offLocalX = offsetFromEdgePx / (Math.abs(absScale.x) || 1);
    let offLocalY = offsetFromEdgePx / (Math.abs(absScale.y) || 1);
    offLocalX = Math.min(offLocalX, Math.max(0, width) / 4);
    offLocalY = Math.min(offLocalY, Math.max(0, height) / 4);

    const pTL_stage = abs.point({ x: -ox + offLocalX, y: -oy + offLocalY });
    const pTR_stage = abs.point({ x: width - ox - offLocalX, y: -oy + offLocalY });
    const pBL_stage = abs.point({ x: -ox + offLocalX, y: height - oy - offLocalY });
    const pBR_stage = abs.point({ x: width - ox - offLocalX, y: height - oy - offLocalY });

    const topLeftCenter = toLocal(pTL_stage);
    const topRightCenter = toLocal(pTR_stage);
    const bottomLeftCenter = toLocal(pBL_stage);
    const bottomRightCenter = toLocal(pBR_stage);

    const world = parent.getAbsoluteScale();
    const invSx = 1 / (Math.abs(world.x) || 1);
    const invSy = 1 / (Math.abs(world.y) || 1);
    const pixelRadius = sizePx / 2; // target radius in screen pixels

    this._radHandles.topLeft.setAttrs({
      x: topLeftCenter.x,
      y: topLeftCenter.y,
      radius: pixelRadius,
    });
    this._radHandles.topRight.setAttrs({
      x: topRightCenter.x,
      y: topRightCenter.y,
      radius: pixelRadius,
    });
    this._radHandles.bottomLeft.setAttrs({
      x: bottomLeftCenter.x,
      y: bottomLeftCenter.y,
      radius: pixelRadius,
    });
    this._radHandles.bottomRight.setAttrs({
      x: bottomRightCenter.x,
      y: bottomRightCenter.y,
      radius: pixelRadius,
    });

    this._radHandles.topLeft.scale({ x: invSx, y: invSy });
    this._radHandles.topRight.scale({ x: invSx, y: invSy });
    this._radHandles.bottomLeft.scale({ x: invSx, y: invSy });
    this._radHandles.bottomRight.scale({ x: invSx, y: invSy });
    // ensure radius handles are above other helpers
    this._radHandles.topLeft.moveToTop();
    this._radHandles.topRight.moveToTop();
    this._radHandles.bottomLeft.moveToTop();
    this._radHandles.bottomRight.moveToTop();
  }

  private _onRadiusDrag(
    handle: Konva.Circle,
    ev: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent>,
  ): void {
    const node = this.nodes()[0];
    if (!node || !(node instanceof Konva.Rect)) return;
    const parent = node.getParent();
    const stage = this.getStage();
    if (!parent || !stage) return;

    const attr = handle.getAttr('radKey') as
      | 'topLeft'
      | 'topRight'
      | 'bottomLeft'
      | 'bottomRight'
      | undefined;
    if (!attr) return;

    const abs = node.getAbsoluteTransform();
    const w = node.width();
    const h = node.height();
    const ox = typeof node.offsetX === 'function' ? node.offsetX() : 0;
    const oy = typeof node.offsetY === 'function' ? node.offsetY() : 0;
    const corners = {
      topLeft: abs.point({ x: -ox, y: -oy }),
      topRight: abs.point({ x: w - ox, y: -oy }),
      bottomRight: abs.point({ x: w - ox, y: h - oy }),
      bottomLeft: abs.point({ x: -ox, y: h - oy }),
    } as const;
    const center = {
      x:
        (corners.topLeft.x + corners.topRight.x + corners.bottomRight.x + corners.bottomLeft.x) / 4,
      y:
        (corners.topLeft.y + corners.topRight.y + corners.bottomRight.y + corners.bottomLeft.y) / 4,
    };
    const corner = corners[attr];
    const handleAbs = handle.getAbsolutePosition(stage);
    const vx = center.x - corner.x;
    const vy = center.y - corner.y;
    const vlen = Math.hypot(vx, vy) || 1;
    const ux = vx / vlen;
    const uy = vy / vlen;
    const hx = handleAbs.x - corner.x;
    const hy = handleAbs.y - corner.y;
    const distStage = Math.max(0, hx * ux + hy * uy);

    const absScale = node.getAbsoluteScale();
    const sx = Math.abs(absScale.x) || 1;
    const sy = Math.abs(absScale.y) || 1;
    const rLocal = Math.min(distStage / sx, distStage / sy);
    const maxLocal = Math.min(w, h) / 2;
    const rClamped = Math.max(0, Math.min(rLocal, maxLocal));

    const existing = node.cornerRadius();
    const arr: [number, number, number, number] = Array.isArray(existing)
      ? [existing[0] ?? 0, existing[1] ?? 0, existing[2] ?? 0, existing[3] ?? 0]
      : [
          typeof existing === 'number' ? existing : 0,
          typeof existing === 'number' ? existing : 0,
          typeof existing === 'number' ? existing : 0,
          typeof existing === 'number' ? existing : 0,
        ];

    const setCorner = (val: number) => {
      if (attr === 'topLeft') arr[0] = val;
      else if (attr === 'topRight') arr[1] = val;
      else if (attr === 'bottomRight') arr[2] = val;
      else arr[3] = val;
    };
    let shiftPressed = false;
    const eAny = ev.evt as { shiftKey?: boolean } | undefined;
    if (eAny && typeof eAny.shiftKey === 'boolean') {
      shiftPressed = eAny.shiftKey;
    }
    if (shiftPressed) {
      arr[0] = arr[1] = arr[2] = arr[3] = rClamped;
    } else {
      setCorner(rClamped);
    }

    node.cornerRadius(arr);
    this.forceUpdate();
    stage.batchDraw();
  }

  private _startRotationDrag(
    node: Konva.Node,
    _corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  ): void {
    const stage = this.getStage();
    if (!stage) return;
    const parent = node.getParent();
    if (!parent) return;

    const box = node.getClientRect({ relativeTo: stage, skipShadow: true, skipStroke: false });
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const p = stage.getPointerPosition();
    if (!p) return;
    const startAngle = Math.atan2(p.y - center.y, p.x - center.x);
    const startRotationDeg = node.rotation();
    this._rotDrag = { startAngle, startRotationDeg, center };

    const onMove = (ev: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this._rotDrag) return;
      const pt = stage.getPointerPosition();
      if (!pt) return;
      const curAngle = Math.atan2(pt.y - this._rotDrag.center.y, pt.x - this._rotDrag.center.x);
      const deltaRad = curAngle - this._rotDrag.startAngle;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      let newRotation = this._rotDrag.startRotationDeg + deltaDeg;

      // Apply snapping similar to Konva.Transformer
      const snapsRaw = (this as Konva.Transformer).rotationSnaps();
      const snaps: number[] = Array.isArray(snapsRaw)
        ? snapsRaw.filter((v): v is number => typeof v === 'number')
        : [];
      const tolVal = (this as Konva.Transformer).rotationSnapTolerance();
      const tolerance = typeof tolVal === 'number' ? Math.max(0, tolVal) : 0;
      const evt = ev.evt as MouseEvent | undefined;
      const shift = !!evt?.shiftKey;
      const norm = (a: number) => {
        let r = a % 360;
        if (r < 0) r += 360;
        return r;
      };
      const angDist = (a: number, b: number) => {
        const da = Math.abs(norm(a) - norm(b));
        return Math.min(da, 360 - da);
      };
      if (snaps.length > 0) {
        // snap to nearest provided angle within tolerance
        let best: number | null = null;
        let bestDist = Infinity;
        for (const cand of snaps) {
          const d = angDist(newRotation, cand);
          if (d < bestDist) {
            best = cand;
            bestDist = d;
          }
        }
        if (best !== null && bestDist <= tolerance) {
          newRotation = best;
        }
      } else if (shift) {
        // shift-key snapping to 15 degrees
        newRotation = Math.round(newRotation / 15) * 15;
      }

      // Keep visual center fixed during rotation (Konva Transformer behavior)
      const targetCenter = this._rotDrag.center; // in Stage coords
      // rotate
      node.rotation(newRotation);
      // compute new center after rotation
      const boxNow = node.getClientRect({ relativeTo: stage, skipShadow: true, skipStroke: false });
      const nowCenter = { x: boxNow.x + boxNow.width / 2, y: boxNow.y + boxNow.height / 2 };
      const dxStage = targetCenter.x - nowCenter.x;
      const dyStage = targetCenter.y - nowCenter.y;
      if (dxStage !== 0 || dyStage !== 0) {
        const parentInv = parent.getAbsoluteTransform().copy();
        parentInv.invert();
        const p0 = parentInv.point({ x: 0, y: 0 });
        const p1 = parentInv.point({ x: dxStage, y: dyStage });
        const deltaParent = { x: p1.x - p0.x, y: p1.y - p0.y };
        node.position({ x: node.x() + deltaParent.x, y: node.y() + deltaParent.y });
      }
      this.forceUpdate();
      stage.batchDraw();
    };

    const onUp = () => {
      stage.off('mousemove.edge-rot', onMove);
      stage.off('mouseup.edge-rot', onUp);
      this._rotDrag = null;
      this.forceUpdate();
      stage.batchDraw();
    };

    stage.on('mousemove.edge-rot', onMove);
    stage.on('mouseup.edge-rot', onUp);
  }
}
