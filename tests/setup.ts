import { beforeAll, afterAll } from 'vitest';

// Настройка окружения для тестов
beforeAll(() => {
  // Mock canvas для Konva
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
      } as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }
});

afterAll(() => {
  // Cleanup
});
