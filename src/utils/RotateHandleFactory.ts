import Konva from 'konva';

/**
 * Unified factory for rotation handles of the frame.
 * Parameters correspond to those implemented in SelectionPlugin.
 */
export function makeRotateHandle(name: string): Konva.Circle {
  return new Konva.Circle({
    name,
    radius: 4,
    width: 25,
    height: 25,
    fill: '#ffffff',
    stroke: '#2b83ff',
    strokeWidth: 1.5,
    // Make the handler invisible visually, but keep interactivity
    opacity: 0,
    // Increase cursor hit area to make it easier to hit
    hitStrokeWidth: 16,
    draggable: true,
    dragOnTop: true,
    listening: true,
    cursor: 'pointer',
  });
}
