import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { restyleSideAnchorsForTr } from './OverlayAnchors';
import { RotateHandlesController } from './RotateHandlesController';

interface AttachOptions {
  keepRatioCornerOnlyShift?: () => boolean;
}

/**
 * OverlayFrameManager
 * Единый менеджер рамки Transformer + size label + hit-rect + ротационные хендлеры
 * для любой Konva-ноды/группы. Используется и для обычного выделения, и для временной группы.
 */
export class OverlayFrameManager {
  private core: CoreEngine;
  private tr: Konva.Transformer | null = null;
  private sizeLabel: Konva.Label | null = null;
  private rotateGroup: Konva.Group | null = null;
  private rotateHandles: {
    tl: Konva.Circle | null;
    tr: Konva.Circle | null;
    br: Konva.Circle | null;
    bl: Konva.Circle | null;
  } = { tl: null, tr: null, br: null, bl: null };
  private rotateCtrl: RotateHandlesController | null = null;
  private keepRatioPredicate: (() => boolean) | null = null;
  private boundNode: Konva.Node | null = null;
  private hitRect: Konva.Rect | null = null;
  private rotateDragState: { base: number; start: number } | null = null;
  private rotateCenterAbsStart: Konva.Vector2d | null = null;
  // Состояние видимости на время drag
  private trWasVisibleBeforeDrag = false;
  private labelWasVisibleBeforeDrag = false;
  private rotateWasVisibleBeforeDrag = false;
  private rotateCtrlWasAttachedBeforeDrag = false;

  constructor(core: CoreEngine) {
    this.core = core;
  }

  public attach(node: Konva.Node, options?: AttachOptions) {
    this.detach();
    this.boundNode = node;
    this.keepRatioPredicate = options?.keepRatioCornerOnlyShift ?? null;

    const layer = this.core.nodes.layer;

    // Transformer
    const tr = new Konva.Transformer({
      rotateEnabled: false,
      keepRatio: false,
      rotationSnapTolerance: 15,
      rotationSnaps: [
        0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285,
        300, 315, 330, 345, 360,
      ],
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
      borderEnabled: true,
      borderStroke: '#2b83ff',
      borderStrokeWidth: 1.5,
      name: 'overlay-transformer',
    });
    layer.add(tr);
    tr.nodes([node]);
    this.tr = tr;

    // Сайд‑анкоры в едином стиле
    restyleSideAnchorsForTr(this.core, tr, node);

    // Динамический keepRatio по Shift для угловых якорей
    const updateKeepRatio = () => {
      const active = typeof tr.getActiveAnchor === 'function' ? tr.getActiveAnchor() : '';
      const isCorner =
        active === 'top-left' ||
        active === 'top-right' ||
        active === 'bottom-left' ||
        active === 'bottom-right';
      const pressed = this.keepRatioPredicate ? this.keepRatioPredicate() : false;
      tr.keepRatio(isCorner && pressed);
    };
    tr.on('transformstart.overlayKeepRatio', updateKeepRatio);
    tr.on('transform.overlayKeepRatio', updateKeepRatio);

    // Обновление кастомных боковых якорей и ротационных кружков во время трансформации
    const onTransform = () => {
      if (!this.boundNode) return;
      this.tr?.forceUpdate();
      restyleSideAnchorsForTr(this.core, this.tr, this.boundNode);
      this.rotateCtrl?.updatePosition();
      // Держим Transformer выше ротационных хендлеров
      this.tr?.moveToTop();
      layer.batchDraw();
    };
    tr.on('transform.overlayFrameTransform', onTransform);
    tr.on('transformend.overlayFrameTransform', onTransform);

    // Size label
    this.ensureSizeLabel();
    this.updateSizeLabel();

    // Hit-rect
    this.updateHitRect();

    // Rotate handles (через общий контроллер)
    if (this.rotateCtrl) {
      this.rotateCtrl.detach();
      this.rotateCtrl = null;
    }
    this.rotateCtrl = new RotateHandlesController({
      core: this.core,
      getNode: () => this.boundNode,
      getTransformer: () => this.tr,
      onUpdate: () => {
        // Обновляем позицию label снизу при ротации (как при зуме)
        this.forceUpdate();
        this.core.nodes.layer.batchDraw();
      },
    });
    this.rotateCtrl.attach();
    // Сразу позиционировать хендлеры и гарантировать, что рамка выше них
    this.rotateCtrl.updatePosition();
    this.tr.moveToTop();

    layer.batchDraw();
  }

  public detach() {
    // remove transformer and overlays
    if (this.tr) {
      this.tr.off('.overlayKeepRatio');
      this.tr.off('.overlayFrameTransform');
      this.tr.destroy();
      this.tr = null;
    }
    if (this.sizeLabel) {
      this.sizeLabel.destroy();
      this.sizeLabel = null;
    }
    if (this.hitRect) {
      this.hitRect.destroy();
      this.hitRect = null;
    }
    if (this.rotateGroup) {
      this.rotateGroup.destroy();
      this.rotateGroup = null;
    }
    // rotate controller
    if (this.rotateCtrl) {
      this.rotateCtrl.detach();
      this.rotateCtrl = null;
    }
    this.rotateHandles = { tl: null, tr: null, br: null, bl: null };
    this.rotateDragState = null;
    this.rotateCenterAbsStart = null;
    this.boundNode = null;
  }

  public forceUpdate() {
    if (!this.boundNode) return;
    this.tr?.forceUpdate();
    restyleSideAnchorsForTr(this.core, this.tr, this.boundNode);
    this.rotateCtrl?.updatePosition();
    // Держим Transformer выше ротационных хендлеров
    this.tr?.moveToTop();
    this.updateSizeLabel();
    this.updateHitRect();
  }

  public onWorldChanged() {
    this.forceUpdate();
  }
  // ===== Drag visibility control =====
  public hideOverlaysForDrag() {
    if (this.tr) {
      this.trWasVisibleBeforeDrag = this.tr.visible();
      this.tr.visible(false);
    } else {
      this.trWasVisibleBeforeDrag = false;
    }
    if (this.sizeLabel) {
      this.labelWasVisibleBeforeDrag = this.sizeLabel.visible();
      this.sizeLabel.visible(false);
    } else {
      this.labelWasVisibleBeforeDrag = false;
    }
    if (this.rotateGroup) {
      this.rotateWasVisibleBeforeDrag = this.rotateGroup.visible();
      this.rotateGroup.visible(false);
    } else {
      this.rotateWasVisibleBeforeDrag = false;
    }
    // Скрыть ротационные кружки контроллера (если есть): через detach
    if (this.rotateCtrl) {
      this.rotateCtrlWasAttachedBeforeDrag = true;
      this.rotateCtrl.detach();
    } else {
      this.rotateCtrlWasAttachedBeforeDrag = false;
    }
  }

  public restoreOverlaysAfterDrag() {
    if (this.tr && this.trWasVisibleBeforeDrag) this.tr.visible(true);
    if (this.sizeLabel && this.labelWasVisibleBeforeDrag) this.sizeLabel.visible(true);
    if (this.rotateGroup && this.rotateWasVisibleBeforeDrag) this.rotateGroup.visible(true);
    // Вернуть ротационные кружки контроллера через повторный attach
    if (this.rotateCtrl && this.rotateCtrlWasAttachedBeforeDrag) {
      this.rotateCtrl.attach();
      this.rotateCtrl.updatePosition();
      this.tr?.moveToTop();
    }
    this.trWasVisibleBeforeDrag = false;
    this.labelWasVisibleBeforeDrag = false;
    this.rotateWasVisibleBeforeDrag = false;
    this.rotateCtrlWasAttachedBeforeDrag = false;
    this.forceUpdate();
  }

  // ===== Overlays: Size Label =====
  private ensureSizeLabel() {
    const layer = this.core.nodes.layer;
    if (this.sizeLabel) this.sizeLabel.destroy();
    const label = new Konva.Label({ listening: false, opacity: 0.95 });
    const tag = new Konva.Tag({ fill: '#2b83ff', cornerRadius: 4, lineJoin: 'round' });
    const text = new Konva.Text({
      text: '',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell',
      fontSize: 12,
      fill: '#ffffff',
      padding: 6,
      align: 'center',
    });
    label.add(tag);
    label.add(text);
    layer.add(label);
    this.sizeLabel = label;
  }

  private updateSizeLabel() {
    if (!this.boundNode || !this.sizeLabel) return;
    const world = this.core.nodes.world;
    const bbox = this.boundNode.getClientRect({ skipShadow: true, skipStroke: true });
    const logicalW = bbox.width / Math.max(1e-6, world.scaleX());
    const logicalH = bbox.height / Math.max(1e-6, world.scaleY());
    const w = Math.max(0, Math.round(logicalW));
    const h = Math.max(0, Math.round(logicalH));
    const text = this.sizeLabel.getText();
    text.text(String(w) + ' × ' + String(h));
    const offset = 8;
    const bottomX = bbox.x + bbox.width / 2;
    const bottomY = bbox.y + bbox.height + offset;
    const rect = this.sizeLabel.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const labelW = rect.width;
    this.sizeLabel.setAttrs({ x: bottomX - labelW / 2, y: bottomY });
    this.sizeLabel.moveToTop();
  }

  // ===== Overlays: Hit Rect =====
  private updateHitRect() {
    if (!this.boundNode) return;
    const layer = this.core.nodes.layer;
    const local = this.boundNode.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: true,
    });
    const topLeft = { x: local.x, y: local.y };
    const w = local.width;
    const h = local.height;
    if (!this.hitRect) {
      const rect = new Konva.Rect({
        name: 'overlay-hit',
        x: topLeft.x,
        y: topLeft.y,
        width: w,
        height: h,
        fill: 'rgba(0,0,0,0.001)',
        listening: true,
        perfectDrawEnabled: false,
      });
      rect.on('mousedown.overlayHit', (ev: Konva.KonvaEventObject<MouseEvent>) => {
        if (ev.evt.button !== 0) return;
        ev.cancelBubble = true;
        const anyGrp = this.boundNode as unknown as { startDrag?: () => void };
        if (typeof anyGrp.startDrag === 'function') anyGrp.startDrag();
      });
      if (this.boundNode instanceof Konva.Container) {
        this.boundNode.add(rect);
        rect.moveToBottom();
        this.hitRect = rect;
        layer.batchDraw();
      } else {
        rect.destroy();
      }
      return;
    }
    this.hitRect.position(topLeft);
    this.hitRect.size({ width: w, height: h });
    this.hitRect.moveToBottom();
  }
}
