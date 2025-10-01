import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { restyleSideAnchorsForTr } from './OverlayAnchors';
import { makeRotateHandle } from './RotateHandleFactory';

export interface RotateHandlesControllerOpts {
  core: CoreEngine;
  getNode: () => Konva.Node | null;
  getTransformer: () => Konva.Transformer | null;
  onUpdate?: () => void;
}

export class RotateHandlesController {
  private core: CoreEngine;
  private getNode: () => Konva.Node | null;
  private getTransformer: () => Konva.Transformer | null;
  private onUpdate?: () => void;

  private group: Konva.Group | null = null;
  private handles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = {
    tl: null,
    tr: null,
    br: null,
    bl: null,
  };
  private dragState: { base: number; start: number } | null = null;
  private centerAbsStart: Konva.Vector2d | null = null;

  constructor(opts: RotateHandlesControllerOpts) {
    this.core = opts.core;
    this.getNode = opts.getNode;
    this.getTransformer = opts.getTransformer;
    if (opts.onUpdate) {
      this.onUpdate = opts.onUpdate;
    }
  }

  public attach(): void {
    const node = this.getNode();
    if (!node) return;
    const layer = this.core.nodes.layer;
    this.detach();
    const group = new Konva.Group({ name: 'rotate-handles-group', listening: true });
    layer.add(group);
    this.group = group;

    const tl = makeRotateHandle('rotate-tl');
    const tr = makeRotateHandle('rotate-tr');
    const br = makeRotateHandle('rotate-br');
    const bl = makeRotateHandle('rotate-bl');
    group.add(tl);
    group.add(tr);
    group.add(br);
    group.add(bl);
    this.handles = { tl, tr, br, bl };

    const bindRotate = (h: Konva.Circle) => {
      // Cursor: pointer при наведении на хендлер ротации
      h.on('mouseenter.rotate', () => {
        this.core.stage.container().style.cursor = 'pointer';
      });
      h.on('mouseleave.rotate', () => {
        // Базовый курсор для интерактивных элементов поверхности
        this.core.stage.container().style.cursor = 'grab';
      });
      h.on('dragstart.rotate', () => {
        const n = this.getNode();
        if (!n) return;
        const dec = n.getAbsoluteTransform().decompose();
        this.centerAbsStart = this.getNodeCenterAbs(n);
        const p = this.core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const start =
          (Math.atan2(p.y - this.centerAbsStart.y, p.x - this.centerAbsStart.x) * 180) / Math.PI;
        this.dragState = { base: dec.rotation || 0, start };
        this.core.stage.draggable(false);
        this.core.stage.container().style.cursor = 'grabbing';
        // гарантируем правильный z-порядок: рамка сверху, кружки ниже
        this.getTransformer()?.moveToTop();
        this.placeBelowTransformer();
      });
      h.on('dragmove.rotate', (e: Konva.KonvaEventObject<DragEvent>) => {
        const n = this.getNode();
        if (!n || !this.dragState) return;
        const centerRef = this.centerAbsStart ?? this.getNodeCenterAbs(n);
        const pointer = this.core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const curr = (Math.atan2(pointer.y - centerRef.y, pointer.x - centerRef.x) * 180) / Math.PI;
        let rot = this.dragState.base + (curr - this.dragState.start);
        // Shift snaps через Transformer
        const tr = this.getTransformer();
        if (e.evt.shiftKey && tr) {
          const norm = (deg: number) => {
            let x = deg % 360;
            if (x < 0) x += 360;
            return x;
          };
          const angDiff = (a: number, b: number) => {
            let d = norm(a - b + 180) - 180;
            return d;
          };
          const snaps = Array.isArray(tr.rotationSnaps())
            ? tr.rotationSnaps().map((v) => norm(v))
            : undefined;
          let tol = typeof tr.rotationSnapTolerance === 'function' ? tr.rotationSnapTolerance() : 5;
          if (snaps?.length) {
            const rotN = norm(rot);
            let best = rot;
            let bestDiff = Infinity;
            for (const a of snaps) {
              const d = Math.abs(angDiff(rotN, a));
              if (d < bestDiff && d <= tol) {
                best = a;
                bestDiff = d;
              }
            }
            if (bestDiff !== Infinity) rot = best;
          }
        }
        n.rotation(rot);
        if (this.centerAbsStart) {
          const centerAfter = this.getNodeCenterAbs(n);
          const dxAbs = this.centerAbsStart.x - centerAfter.x;
          const dyAbs = this.centerAbsStart.y - centerAfter.y;
          const parent = n.getParent();
          if (parent) {
            const inv = parent.getAbsoluteTransform().copy().invert();
            const from = inv.point({ x: centerAfter.x, y: centerAfter.y });
            const to = inv.point({ x: centerAfter.x + dxAbs, y: centerAfter.y + dyAbs });
            const nx = n.x() + (to.x - from.x);
            const ny = n.y() + (to.y - from.y);
            n.position({ x: nx, y: ny });
          }
        }
        const tr2 = this.getTransformer();
        tr2?.forceUpdate();
        if (tr2) restyleSideAnchorsForTr(this.core, tr2, n);
        this.updatePosition();
        // держим ниже Transformer во время движения
        this.placeBelowTransformer();
        this.core.nodes.layer.batchDraw();
        // Уведомляем OverlayFrameManager для обновления label снизу
        if (this.onUpdate) this.onUpdate();
      });
      h.on('dragend.rotate', () => {
        this.dragState = null;
        this.centerAbsStart = null;
        // ВАЖНО: НЕ включаем stage.draggable(true), чтобы ЛКМ не панорамировала
        this.core.stage.draggable(false);
        this.updatePosition();
        this.placeBelowTransformer();
        this.core.stage.container().style.cursor = 'grab';
        if (this.onUpdate) this.onUpdate();
      });
    };

    bindRotate(tl);
    bindRotate(tr);
    bindRotate(br);
    bindRotate(bl);
    // начальная раскладка: кружки ниже рамки
    this.updatePosition();
    this.placeBelowTransformer();
  }

  public detach(): void {
    if (this.group) {
      this.group.destroy();
      this.group = null;
    }
    this.handles = { tl: null, tr: null, br: null, bl: null };
    this.dragState = null;
    this.centerAbsStart = null;
  }

  public moveToTop(): void {
    // совместимость: не поднимаем выше рамки, а лишь размещаем ниже неё
    this.placeBelowTransformer();
  }

  public updatePosition(): void {
    const n = this.getNode();
    if (!n || !this.group) return;
    const local = n.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: false });
    const width = local.width;
    const height = local.height;
    if (width <= 0 || height <= 0) return;
    const tr = n.getAbsoluteTransform().copy();
    const mapAbs = (pt: { x: number; y: number }) => tr.point(pt);
    const offset = 12;
    const centerAbs = mapAbs({ x: local.x + width / 2, y: local.y + height / 2 });
    const c0 = mapAbs({ x: local.x, y: local.y });
    const c1 = mapAbs({ x: local.x + width, y: local.y });
    const c2 = mapAbs({ x: local.x + width, y: local.y + height });
    const c3 = mapAbs({ x: local.x, y: local.y + height });
    const dir = (c: { x: number; y: number }) => {
      const vx = c.x - centerAbs.x;
      const vy = c.y - centerAbs.y;
      const len = Math.hypot(vx, vy) || 1;
      return { x: vx / len, y: vy / len };
    };
    const d0 = dir(c0),
      d1 = dir(c1),
      d2 = dir(c2),
      d3 = dir(c3);
    const p0 = { x: c0.x + d0.x * offset, y: c0.y + d0.y * offset };
    const p1 = { x: c1.x + d1.x * offset, y: c1.y + d1.y * offset };
    const p2 = { x: c2.x + d2.x * offset, y: c2.y + d2.y * offset };
    const p3 = { x: c3.x + d3.x * offset, y: c3.y + d3.y * offset };
    if (this.handles.tl) this.handles.tl.absolutePosition(p0);
    if (this.handles.tr) this.handles.tr.absolutePosition(p1);
    if (this.handles.br) this.handles.br.absolutePosition(p2);
    if (this.handles.bl) this.handles.bl.absolutePosition(p3);
    this.placeBelowTransformer();
  }

  private placeBelowTransformer(): void {
    if (!this.group) return;
    const tr = this.getTransformer();
    const layer = this.core.nodes.layer;
    if (tr && tr.getLayer() === layer) {
      const idx = tr.zIndex();
      this.group.zIndex(Math.max(0, idx - 1));
    } else {
      this.group.moveToBottom();
    }
  }

  private getNodeCenterAbs(node: Konva.Node): Konva.Vector2d {
    const tr = node.getAbsoluteTransform().copy();
    const local = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: false });
    const cx = local.x + local.width / 2;
    const cy = local.y + local.height / 2;
    return tr.point({ x: cx, y: cy });
  }
}
