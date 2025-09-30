import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

/**
 * Растянуть side-анкоры (top/right/bottom/left) на всю сторону ноды и скрыть их визуально,
 * оставив hit-area. Учитывает реальную геометрию при ротации (как в SelectionPlugin).
 */
export function restyleSideAnchorsForTr(
  core: CoreEngine | undefined,
  tr: Konva.Transformer | null,
  node: Konva.Node | null,
  thicknessPx = 6,
): void {
  if (!core || !tr || !node) return;

  const bbox = node.getClientRect({ skipShadow: true, skipStroke: false });
  const localRect = node.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
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
