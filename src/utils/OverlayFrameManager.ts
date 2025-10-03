import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { restyleSideAnchorsForTr } from './OverlayAnchors';
import { RotateHandlesController } from './RotateHandlesController';

interface AttachOptions {
  keepRatioCornerOnlyShift?: () => boolean;
}

/**
 * OverlayFrameManager
 * Unified manager for Transformer + size label + hit-rect + rotation handles
 * for any Konva node/group. Used both for regular selection and temporary group.
 */
export class OverlayFrameManager {
  private core: CoreEngine;
  private tr: Konva.Transformer | null = null;
  private sizeLabel: Konva.Label | null = null;
  private rotateGroup: Konva.Group | null = null;
  private rotateCtrl: RotateHandlesController | null = null;
  private keepRatioPredicate: (() => boolean) | null = null;
  private boundNode: Konva.Node | null = null;
  private hitRect: Konva.Rect | null = null;
  // Saved position of opposite corner at start of transformation (for fixing origin)
  private transformOppositeCorner: { x: number; y: number } | null = null;
  // Visibility state during drag
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
    // Global size constraint: prevent collapsing to 0
    tr.boundBoxFunc((_, newBox) => {
      const MIN = 1; // px
      const w = Math.max(MIN, Math.abs(newBox.width));
      const h = Math.max(MIN, Math.abs(newBox.height));
      return { ...newBox, width: w, height: h };
    });
    this.tr = tr;

    // Side anchors in a unified style
    restyleSideAnchorsForTr(this.core, tr, node);

    // Dynamic keepRatio by Shift for corner anchors
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
    tr.on('transformstart.overlayKeepRatio', () => {
      updateKeepRatio();

      // Save absolute position of opposite corner for fixing origin
      // ONLY for corner anchors
      const activeAnchor = typeof tr.getActiveAnchor === 'function' ? tr.getActiveAnchor() : '';
      const isCornerAnchor =
        activeAnchor === 'top-left' ||
        activeAnchor === 'top-right' ||
        activeAnchor === 'bottom-left' ||
        activeAnchor === 'bottom-right';

      if (isCornerAnchor) {
        // For groups use clientRect, for single nodes — width/height
        const isGroup = node instanceof Konva.Group;
        let width: number;
        let height: number;
        let localX = 0;
        let localY = 0;

        if (isGroup) {
          const clientRect = node.getClientRect({
            skipTransform: true,
            skipShadow: true,
            skipStroke: false,
          });
          width = clientRect.width;
          height = clientRect.height;
          localX = clientRect.x;
          localY = clientRect.y;
        } else {
          width = node.width();
          height = node.height();
        }

        const absTransform = node.getAbsoluteTransform();

        // Determine local coordinates of opposite corner
        let oppositeX = 0;
        let oppositeY = 0;

        if (activeAnchor === 'top-left') {
          oppositeX = localX + width;
          oppositeY = localY + height;
        } else if (activeAnchor === 'top-right') {
          oppositeX = localX;
          oppositeY = localY + height;
        } else if (activeAnchor === 'bottom-right') {
          oppositeX = localX;
          oppositeY = localY;
        } else {
          oppositeX = localX + width;
          oppositeY = localY;
        }

        // Convert to absolute coordinates
        this.transformOppositeCorner = absTransform.point({ x: oppositeX, y: oppositeY });
      } else {
        // For side anchors do not fix angle
        this.transformOppositeCorner = null;
      }
    });
    tr.on('transform.overlayKeepRatio', updateKeepRatio);

    // Update custom side anchors and rotation handles during transformation
    const onTransform = () => {
      if (!this.boundNode) return;

      // Correct node position to keep opposite corner in place
      if (this.transformOppositeCorner) {
        const activeAnchor = typeof tr.getActiveAnchor === 'function' ? tr.getActiveAnchor() : '';
        const absTransform = this.boundNode.getAbsoluteTransform();

        // For groups use clientRect, for single nodes — width/height
        const isGroup = this.boundNode instanceof Konva.Group;
        let width: number;
        let height: number;
        let localX = 0;
        let localY = 0;

        if (isGroup) {
          const clientRect = this.boundNode.getClientRect({
            skipTransform: true,
            skipShadow: true,
            skipStroke: false,
          });
          width = clientRect.width;
          height = clientRect.height;
          localX = clientRect.x;
          localY = clientRect.y;
        } else {
          width = this.boundNode.width();
          height = this.boundNode.height();
        }

        // Determine local coordinates of opposite corner
        let oppositeX = 0;
        let oppositeY = 0;

        if (activeAnchor === 'top-left') {
          oppositeX = localX + width;
          oppositeY = localY + height;
        } else if (activeAnchor === 'top-right') {
          oppositeX = localX;
          oppositeY = localY + height;
        } else if (activeAnchor === 'bottom-right') {
          oppositeX = localX;
          oppositeY = localY;
        } else if (activeAnchor === 'bottom-left') {
          oppositeX = localX + width;
          oppositeY = localY;
        }

        // Current absolute position of opposite corner
        const currentOpposite = absTransform.point({ x: oppositeX, y: oppositeY });

        // Calculate offset
        const dx = this.transformOppositeCorner.x - currentOpposite.x;
        const dy = this.transformOppositeCorner.y - currentOpposite.y;

        // Correct node position in local coordinates of parent
        const parent = this.boundNode.getParent();
        if (parent && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
          const parentInv = parent.getAbsoluteTransform().copy().invert();
          const currentPosAbs = this.boundNode.getAbsolutePosition();
          const newPosAbs = { x: currentPosAbs.x + dx, y: currentPosAbs.y + dy };
          const newPosLocal = parentInv.point(newPosAbs);
          this.boundNode.position(newPosLocal);
        }
      }

      this.tr?.forceUpdate();
      restyleSideAnchorsForTr(this.core, this.tr, this.boundNode);
      this.rotateCtrl?.updatePosition();
      // Keep Transformer above rotation handles
      this.tr?.moveToTop();
      layer.batchDraw();
    };
    tr.on('transform.overlayFrameTransform', onTransform);
    tr.on('transformend.overlayFrameTransform', () => {
      // Reset saved opposite corner after transformation
      this.transformOppositeCorner = null;
      onTransform();
    });

    // Size label
    this.ensureSizeLabel();
    this.updateSizeLabel();

    // Hit-rect
    this.updateHitRect();

    // Rotate handles (through common controller)
    if (this.rotateCtrl) {
      this.rotateCtrl.detach();
      this.rotateCtrl = null;
    }
    this.rotateCtrl = new RotateHandlesController({
      core: this.core,
      getNode: () => this.boundNode,
      getTransformer: () => this.tr,
      onUpdate: () => {
        // Update position of label below on rotation (like on zoom)
        this.forceUpdate();
        this.core.nodes.layer.batchDraw();
      },
    });
    this.rotateCtrl.attach();
    // Position handles immediately and guarantee that the frame is above them
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
    this.transformOppositeCorner = null;
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
    // Hide rotation handles of the controller (if any): through detach
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
    // Restore rotation handles of the controller through re-attach
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
