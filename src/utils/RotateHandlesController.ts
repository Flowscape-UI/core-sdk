import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { restyleSideAnchorsForTr } from './OverlayAnchors';
import { makeRotateHandle } from './RotateHandleFactory';

export interface RotateHandlesControllerOpts {
  core: CoreEngine;
  getNode: () => Konva.Node | null;
  getTransformer: () => Konva.Transformer | null;
  onUpdate?: () => void;
  // Optional callbacks for custom rotated cursor
  setRotateCursor?: (angle: number) => void;
  clearRotateCursor?: () => void;
  // Optional callbacks to notify external code about rotation lifecycle
  onRotateStart?: () => void;
  onRotateMove?: () => void;
  onRotateEnd?: () => void;
}

export class RotateHandlesController {
  private core: CoreEngine;
  private getKonvaNode: () => Konva.Node | null;
  private getTransformer: () => Konva.Transformer | null;
  private onUpdate?: () => void;
  private setRotateCursor?: (angle: number) => void;
  private clearRotateCursor?: () => void;
  private onRotateStart?: () => void;
  private onRotateMove?: () => void;
  private onRotateEnd?: () => void;

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
  // Cached SVG cursor data URL for rotated rotate-cursor icon
  private cursorSvgCache: { angle: number; url: string } | null = null;

  constructor(opts: RotateHandlesControllerOpts) {
    this.core = opts.core;
    this.getKonvaNode = opts.getNode;
    this.getTransformer = opts.getTransformer;
    if (opts.onUpdate) {
      this.onUpdate = opts.onUpdate;
    }
    if (opts.setRotateCursor) this.setRotateCursor = opts.setRotateCursor;
    if (opts.clearRotateCursor) this.clearRotateCursor = opts.clearRotateCursor;
    if (opts.onRotateStart) this.onRotateStart = opts.onRotateStart;
    if (opts.onRotateMove) this.onRotateMove = opts.onRotateMove;
    if (opts.onRotateEnd) this.onRotateEnd = opts.onRotateEnd;
  }

  public attach(): void {
    const node = this.getKonvaNode();
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
      // Cursor: pointer on hover
      h.on('mouseenter.rotate', () => {
        const n = this.getKonvaNode();
        if (!n) {
          this.core.stage.container().style.cursor = 'pointer';
          return;
        }

        // Compute angle from node center to handle and either delegate to
        // external cursor callback or use the built-in rotated SVG cursor,
        // matching SelectionPlugin._applyRotatedCursor visuals.
        const center = this.getNodeCenterAbs(n);
        const handlePos = h.getAbsolutePosition();
        const dx = handlePos.x - center.x;
        const dy = handlePos.y - center.y;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI;
        const cursorAngle = angleDeg + 45;

        if (this.setRotateCursor) {
          this.setRotateCursor(cursorAngle);
        } else {
          this.applyRotatedCursor(cursorAngle);
        }
      });
      h.on('mouseleave.rotate', () => {
        // Return cursor to default or delegate to external clearer
        if (this.clearRotateCursor) {
          this.clearRotateCursor();
        } else {
          this.core.stage.container().style.cursor = 'default';
        }
      });
      h.on('dragstart.rotate', () => {
        const n = this.getKonvaNode();
        if (!n) return;
        const dec = n.getAbsoluteTransform().decompose();
        this.centerAbsStart = this.getNodeCenterAbs(n);
        const p = this.core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const start =
          (Math.atan2(p.y - this.centerAbsStart.y, p.x - this.centerAbsStart.x) * 180) / Math.PI;
        this.dragState = { base: dec.rotation || 0, start };
        // this.core.stage.draggable(false);
        // this.core.stage.container().style.cursor = 'grabbing';

        // start
        // Apply initial rotated cursor (same visual as in SelectionPlugin)
        const cursorAngle = start + 90;
        if (this.setRotateCursor) {
          this.setRotateCursor(cursorAngle);
        } else {
          this.applyRotatedCursor(cursorAngle);
        }
        //end

        // гарантируем правильный z-порядок: рамка сверху, кружки ниже
        this.getTransformer()?.moveToTop();
        this.placeBelowTransformer();

        // Notify external listeners (e.g., temp-multi controller)
        if (this.onRotateStart) this.onRotateStart();
        n.fire('rotate:start');
      });
      h.on('dragmove.rotate', (e: Konva.KonvaEventObject<DragEvent>) => {
        const n = this.getKonvaNode();
        if (!n || !this.dragState) return;
        const centerRef = this.centerAbsStart ?? this.getNodeCenterAbs(n);
        const pointer = this.core.stage.getPointerPosition() ?? h.getAbsolutePosition();
        const curr = (Math.atan2(pointer.y - centerRef.y, pointer.x - centerRef.x) * 180) / Math.PI;
        let rot = this.dragState.base + (curr - this.dragState.start);

        // start
        // Update rotated cursor dynamically during drag
        const cursorAngle = curr + 45;
        if (this.setRotateCursor) {
          this.setRotateCursor(cursorAngle);
        } else {
          this.applyRotatedCursor(cursorAngle);
        }
        //end

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
        // keep below Transformer while moving
        this.placeBelowTransformer();
        this.core.nodes.layer.batchDraw();
        // Notify OverlayFrameManager to update the label below
        if (this.onUpdate) this.onUpdate();

        // Notify listeners that rotation is in progress.
        if (this.onRotateMove) this.onRotateMove();
        n.fire('rotate:move');
      });
      h.on('dragend.rotate', () => {
        this.dragState = null;
        this.centerAbsStart = null;
        // IMPORTANT: DO NOT enable stage.draggable(true), so that LMB does not pan
        this.core.stage.draggable(false);
        this.updatePosition();
        this.placeBelowTransformer();
        // this.core.stage.container().style.cursor = 'pointer';

        // start
        // Restore cursor to grab (as in SelectionPlugin after rotation handler drag end)
        const container = this.core.stage.container();
        container.style.cursor = 'grab';
        //end

        if (this.onUpdate) this.onUpdate();

        const n = this.getKonvaNode();
        if (this.onRotateEnd) this.onRotateEnd();
        if (n) n.fire('rotate:end');
      });
    };

    bindRotate(tl);
    bindRotate(tr);
    bindRotate(br);
    bindRotate(bl);
    // initial layout: circles below transformer
    this.updatePosition();
    this.placeBelowTransformer();
  }

  // Apply rotated cursor using the same SVG icon as in SelectionPlugin.
  // Cached per angle to avoid re-encoding SVG on every hover.
  private applyRotatedCursor(angle: number): void {
    const container = this.core.stage.container();

    const normalized = ((angle % 360) + 360) % 360;
    if (this.cursorSvgCache && this.cursorSvgCache.angle === normalized) {
      container.style.cursor = this.cursorSvgCache.url;
      return;
    }

    const svg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${normalized.toString()} 12 12)">
          <g clip-path="url(#clip0_36_31)">
            <g filter="url(#filter0_d_36_31)">
              <path d="M4 6.15927C4 6.15927 9.71429 2.49547 15.4286 8.19463C21.1429 13.8938 18.2857 20 18.2857 20" stroke="white" stroke-width="2"/>
            </g>
            <g filter="url(#filter1_d_36_31)">
              <path d="M0.724195 7.73427L3.27834 2.11403L6.69072 9.31897L0.724195 7.73427Z" fill="black"/>
              <path d="M3.28396 2.82664L6.14311 8.86349L1.1435 7.53589L3.28396 2.82664Z" stroke="white" stroke-width="0.6"/>
            </g>
            <g filter="url(#filter2_d_36_31)">
              <path d="M17.26 22.5868L15.3995 16.7004L22.7553 19.774L17.26 22.5868Z" fill="black"/>
              <path d="M15.8803 17.2264L22.0436 19.8017L17.439 22.1588L15.8803 17.2264Z" stroke="white" stroke-width="0.6"/>
            </g>
            <path d="M4 6.15927C4 6.15927 9.71429 2.49547 15.4286 8.19463C21.1429 13.8938 18.2857 20 18.2857 20" stroke="black"/>
          </g>
          <defs>
            <filter id="filter0_d_36_31" x="-0.539062" y="2" width="22.5391" height="22.4229" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="-1" dy="1"/>
              <feGaussianBlur stdDeviation="1.5"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <filter id="filter1_d_36_31" x="-0.275879" y="2.11426" width="9.96631" height="11.2046" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="1" dy="2"/>
              <feGaussianBlur stdDeviation="1"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <filter id="filter2_d_36_31" x="12.3994" y="15.7002" width="11.3555" height="9.88672" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dx="-1" dy="1"/>
              <feGaussianBlur stdDeviation="1"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_36_31"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_36_31" result="shape"/>
            </filter>
            <clipPath id="clip0_36_31">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </g>
      </svg>
    `.trim();

    const encoded = encodeURIComponent(svg);
    const dataUrl = `url("data:image/svg+xml,${encoded}") 12 12, grab`;
    container.style.cursor = dataUrl;
    this.cursorSvgCache = { angle: normalized, url: dataUrl };
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
    // compatibility: do not raise above the frame, but only place below it
    this.placeBelowTransformer();
  }

  public updatePosition(): void {
    const n = this.getKonvaNode();
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
      // Fix: use moveDown() instead of zIndex(value)
      const trIndex = tr.zIndex();
      const groupIndex = this.group.zIndex();

      // Move the group so that it is below the transformer
      if (groupIndex >= trIndex) {
        const diff = groupIndex - trIndex + 1;
        for (let i = 0; i < diff && this.group.zIndex() > 0; i++) {
          this.group.moveDown();
        }
      }
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
