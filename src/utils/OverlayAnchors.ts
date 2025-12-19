import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

export interface LocalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns local rect for a node:
 * - for groups — via getClientRect(skipTransform)
 * - for single nodes — via width/height at (0,0)
 *
 * This mirrors the existing logic used in SelectionPlugin and OverlayFrameManager.
 */
export function getLocalRectForNode(node: Konva.Node): LocalRect {
  if (node instanceof Konva.Group) {
    const clientRect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: false,
    });
    return {
      x: clientRect.x,
      y: clientRect.y,
      width: clientRect.width,
      height: clientRect.height,
    };
  }

  if (
    node instanceof Konva.Shape &&
    typeof (
      node as unknown as {
        getSelfRect?: () => { x: number; y: number; width: number; height: number };
      }
    ).getSelfRect === 'function'
  ) {
    const selfRect = (
      node as unknown as {
        getSelfRect: () => { x: number; y: number; width: number; height: number };
      }
    ).getSelfRect();
    return {
      x: selfRect.x,
      y: selfRect.y,
      width: selfRect.width,
      height: selfRect.height,
    };
  }

  return {
    x: 0,
    y: 0,
    width: node.width(),
    height: node.height(),
  };
}

/**
 * Maps active anchor name to local reference point on the opposite corner/edge.
 * Used to keep this point fixed during resize.
 *
 * The mapping is intentionally identical to the existing switch-statements
 * in SelectionPlugin and OverlayFrameManager.
 */
export function getResizeReferencePoint(
  anchorName: string,
  rect: LocalRect,
): { x: number; y: number } | null {
  const { x, y, width, height } = rect;

  switch (anchorName) {
    case 'top-left':
      // opposite corner: bottom-right
      return { x: x + width, y: y + height };
    case 'top-right':
      // opposite corner: bottom-left
      return { x, y: y + height };
    case 'bottom-right':
      // opposite corner: top-left
      return { x, y };
    case 'bottom-left':
      // opposite corner: top-right
      return { x: x + width, y };
    case 'middle-left':
      // opposite edge center: middle of right side
      return { x: x + width, y: y + height / 2 };
    case 'middle-right':
      // opposite edge center: middle of left side
      return { x, y: y + height / 2 };
    case 'top-center':
      // opposite edge center: middle of bottom side
      return { x: x + width / 2, y: y + height };
    case 'bottom-center':
      // opposite edge center: middle of top side
      return { x: x + width / 2, y };
    default:
      return null;
  }
}

/**
 * Stretches side anchors (top/right/bottom/left) to the full side of the node and hides them visually,
 * leaving hit-area. Takes real geometry into account when rotating (as in SelectionPlugin).
 */
export function restyleSideAnchorsForTr(
  core: CoreEngine | undefined,
  tr: Konva.Transformer | null,
  node: Konva.Node | null,
  thicknessPx = 6,
): void {
  if (!core || !tr || !node) return;

  // For temp-multi overlay we want stable dimensions based on the inner invisible rect.
  // Group.getClientRect() may be unstable here and causes short side anchors.
  const isTempMultiOverlay =
    node instanceof Konva.Group &&
    typeof node.name === 'function' &&
    node.name().includes('temp-multi-overlay');
  const overlayRect = isTempMultiOverlay ? node.findOne('.temp-multi-overlay-rect') : null;

  const bbox = overlayRect
    ? overlayRect.getClientRect({ skipShadow: true, skipStroke: true })
    : node.getClientRect({ skipShadow: true, skipStroke: false });
  const localRect = overlayRect
    ? overlayRect.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true })
    : node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
  const abs = node.getAbsoluteScale();
  const absX = Math.abs(abs.x) || 1;
  const absY = Math.abs(abs.y) || 1;
  const sideLenW = localRect.width * absX; // верх/низ в экранных координатах
  const sideLenH = localRect.height * absY; // лево/право в экранных координатах
  const rotDeg = (() => {
    const d = node.getAbsoluteTransform().decompose();
    return typeof d.rotation === 'number' ? d.rotation : 0;
  })();
  const isRotated = Math.abs(((rotDeg % 180) + 180) % 180) > 0.5;

  const aTop = tr.findOne<Konva.Rect>('.top-center');
  const aRight = tr.findOne<Konva.Rect>('.middle-right');
  const aBottom = tr.findOne<Konva.Rect>('.bottom-center');
  const aLeft = tr.findOne<Konva.Rect>('.middle-left');

  if (aTop) {
    const width = isRotated ? sideLenW : bbox.width;
    const height = thicknessPx;
    aTop.setAttrs({ opacity: 0, width, height, offsetX: width / 2, offsetY: 0 });
  }
  if (aBottom) {
    const width = isRotated ? sideLenW : bbox.width;
    const height = thicknessPx;
    aBottom.setAttrs({ opacity: 0, width, height, offsetX: width / 2, offsetY: height });
  }
  if (aLeft) {
    const width = thicknessPx;
    const height = isRotated ? sideLenH : bbox.height;
    aLeft.setAttrs({ opacity: 0, width, height, offsetX: 0, offsetY: height / 2 });
  }
  if (aRight) {
    const width = thicknessPx;
    const height = isRotated ? sideLenH : bbox.height;
    aRight.setAttrs({ opacity: 0, width, height, offsetX: width, offsetY: height / 2 });
  }
}
