import Konva from 'konva';

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
    startAngle: number; // в радианах
    startRotationDeg: number;
    center: { x: number; y: number }; // в координатах Stage
  } | null = null;

  // Кружки для скругления углов
  private _radHandles: {
    topLeft: Konva.Circle;
    topRight: Konva.Circle;
    bottomLeft: Konva.Circle;
    bottomRight: Konva.Circle;
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
    tSx: number,
    tSy: number,
  ): void {
    if (!this._rotHotspots) return;
    const sizePx = 14;
    const offsetPx = 18;
    const sizeLocalX = sizePx / tSx;
    const sizeLocalY = sizePx / tSy;

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

    // Локальные углы с учётом offset'а (центр вращения) -> в Stage
    const pTL = abs.point({ x: -ox, y: -oy });
    const pTR = abs.point({ x: width - ox, y: -oy });
    const pBL = abs.point({ x: -ox, y: height - oy });
    const pBR = abs.point({ x: width - ox, y: height - oy });

    // Центр фигуры в Stage
    const center = {
      x: (pTL.x + pTR.x + pBL.x + pBR.x) / 4,
      y: (pTL.y + pTR.y + pBL.y + pBR.y) / 4,
    };

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
      c.on('dragmove', (ev: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) => {
        this._onRadiusDrag(c, ev);
      });
      c.on('dragstart', () => {
        c.opacity(0.85);
      });
      c.on('dragend', () => {
        c.opacity(1);
        this.forceUpdate();
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
  }

  private _updateRadiusHandles(
    node: Konva.Node,
    parent: Konva.Container,
    rectStage: { x: number; y: number; width: number; height: number },
    tSx: number,
    tSy: number,
  ): void {
    if (!this._radHandles) return;
    const sizePx = 12;
    const offsetPx = 10;
    const sizeLocalX = sizePx / tSx;
    const sizeLocalY = sizePx / tSy;

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

    // Локальные углы с учётом offset'а (центр вращения) -> в Stage
    const pTL = abs.point({ x: -ox, y: -oy });
    const pTR = abs.point({ x: width - ox, y: -oy });
    const pBL = abs.point({ x: -ox, y: height - oy });
    const pBR = abs.point({ x: width - ox, y: height - oy });

    // Центр фигуры в Stage
    const center = {
      x: (pTL.x + pTR.x + pBL.x + pBR.x) / 4,
      y: (pTL.y + pTR.y + pBL.y + pBR.y) / 4,
    };

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

    const radLocal = Math.min(sizeLocalX, sizeLocalY) / 2;
    this._radHandles.topLeft.setAttrs({ x: topLeftCenter.x, y: topLeftCenter.y, radius: radLocal });
    this._radHandles.topRight.setAttrs({
      x: topRightCenter.x,
      y: topRightCenter.y,
      radius: radLocal,
    });
    this._radHandles.bottomLeft.setAttrs({
      x: bottomLeftCenter.x,
      y: bottomLeftCenter.y,
      radius: radLocal,
    });
    this._radHandles.bottomRight.setAttrs({
      x: bottomRightCenter.x,
      y: bottomRightCenter.y,
      radius: radLocal,
    });
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
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
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

    let w = 0;
    let h = 0;
    if (node instanceof Konva.Rect) {
      w = node.width();
      h = node.height();
    } else {
      w = box.width;
      h = box.height;
    }
    const ox = typeof node.offsetX === 'function' ? node.offsetX() : 0;
    const oy = typeof node.offsetY === 'function' ? node.offsetY() : 0;
    const localPivot = (() => {
      switch (corner) {
        case 'topLeft':
          return { x: -ox, y: -oy };
        case 'topRight':
          return { x: w - ox, y: -oy };
        case 'bottomLeft':
          return { x: -ox, y: h - oy };
        case 'bottomRight':
        default:
          return { x: w - ox, y: h - oy };
      }
    })();
    const abs = node.getAbsoluteTransform();
    const pivotWorldStart = abs.point(localPivot);
    const parentInv = parent.getAbsoluteTransform().copy();
    parentInv.invert();

    const onMove = () => {
      if (!this._rotDrag) return;
      const pt = stage.getPointerPosition();
      if (!pt) return;
      const curAngle = Math.atan2(pt.y - this._rotDrag.center.y, pt.x - this._rotDrag.center.x);
      const deltaRad = curAngle - this._rotDrag.startAngle;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      node.rotation(this._rotDrag.startRotationDeg + deltaDeg);
      const absNow = node.getAbsoluteTransform();
      const pivotWorldNow = absNow.point(localPivot);
      const dx = pivotWorldStart.x - pivotWorldNow.x;
      const dy = pivotWorldStart.y - pivotWorldNow.y;
      const p0 = parentInv.point({ x: 0, y: 0 });
      const p1 = parentInv.point({ x: dx, y: dy });
      const deltaParent = { x: p1.x - p0.x, y: p1.y - p0.y };
      node.position({ x: node.x() + deltaParent.x, y: node.y() + deltaParent.y });
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
