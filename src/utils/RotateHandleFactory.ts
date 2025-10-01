import Konva from 'konva';

/**
 * Единая фабрика ротационных хендлеров для рамки.
 * Параметры соответствуют реализованным в SelectionPlugin.
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
    // Делаем хендлер невидимым визуально, но сохраняем интерактивность
    opacity: 0,
    // Увеличим зону попадания курсора, чтобы было легче навести
    hitStrokeWidth: 16,
    draggable: true,
    dragOnTop: true,
    listening: true,
    cursor: 'pointer',
  });
}
