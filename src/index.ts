import Konva from 'konva';
export { Scene } from './Scene';
export { Camera } from './Camera';
export { CameraHotkeys } from './CameraHotkeys';
export { Logo } from './Logo';

export interface CoreOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
}

export class Core {
  private stage: Konva.Stage;

  constructor(options: CoreOptions) {
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

export default Core;
