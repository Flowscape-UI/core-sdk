import Konva from 'konva';
export { Scene } from './Scene';
export { Camera } from './Camera';
export { Logo } from './Logo';
export type { Plugin } from './plugins/Plugin';
export { GridPlugin } from './plugins/GridPlugin';
export { LogoPlugin } from './plugins/LogoPlugin';
export { CameraHotkeysPlugin } from './plugins/CameraHotkeysPlugin';

export interface CoreOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
}

export class Core {
  private _stage: Konva.Stage;

  constructor(options: CoreOptions) {
    const { container, width = 800, height = 600 } = options;
    this._stage = new Konva.Stage({
      container: typeof container === 'string' ? container : container,
      width,
      height,
    });
  }

  public getStage(): Konva.Stage {
    return this._stage;
  }

  public resize(width: number, height: number): void {
    this._stage.size({ width, height });
  }
}
