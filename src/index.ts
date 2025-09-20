import Konva from 'konva';
export { Canvas } from './Canvas';
export { Camera } from './Camera';

export interface EngineOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
}

export class Engine {
  private stage: Konva.Stage;

  constructor(options: EngineOptions) {
    const { container, width = 800, height = 600 } = options;
    this.stage = new Konva.Stage({
      container: typeof container === 'string' ? container : container,
      width,
      height,
    });
  }

  getStage(): Konva.Stage {
    return this.stage;
  }

  resize(width: number, height: number) {
    this.stage.size({ width, height });
  }
}

export default Engine;
