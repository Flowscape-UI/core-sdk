import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface LogoOptions {
  src: string;
  width: number;
  height: number;
  opacity?: number;
}

export class LogoPlugin extends Plugin {
  private _core?: CoreEngine;
  private _layer?: Konva.Layer;
  private _image?: Konva.Image;
  private _src: string;
  private _width: number;
  private _height: number;
  private _opacity: number;

  constructor(options: LogoOptions) {
    super();
    this._src = options.src;
    this._width = options.width;
    this._height = options.height;
    this._opacity = options.opacity ?? 1;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    this._layer = new Konva.Layer({ name: 'logo-layer', listening: false });
    this._core.stage.add(this._layer);

    this._image = new Konva.Image({
      image: undefined,
      width: this._width,
      height: this._height,
      name: 'logo-background',
      listening: false,
      opacity: this._opacity,
    });

    this._layer.add(this._image);
    this.setSource(this._src);

    // Namespace `.logo` for easy removal of all handlers
    // Monitor stage property changes to react to any panning/zooming source
    const stage = this._core.stage;
    stage.on('resize.logo', () => {
      this._layout();
    });
    stage.on('xChange.logo yChange.logo scaleXChange.logo scaleYChange.logo', () => {
      this._layout();
    });

    this._layout();
    this._core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    core.stage.off('.logo');
    if (this._image) this._image.destroy();
    if (this._layer) this._layer.destroy();
  }

  public setOpacity(opacity: number): void {
    this._opacity = opacity;
    if (this._image && this._core) {
      this._image.opacity(opacity);
      this._core.stage.batchDraw();
    }
  }

  public setSize({ width, height }: { width: number; height: number }): void {
    this._width = width;
    this._height = height;
    this._layout();
    if (this._core) this._core.stage.batchDraw();
  }

  public setSource(src: string): void {
    this._src = src;
    this._loadImageFromString(src);
  }

  private _setImage(source: CanvasImageSource): void {
    if (!this._image) return;
    this._image.image(source);
    this._layout();
    if (this._core) this._core.stage.batchDraw();
  }

  private _loadImageFromString(src: string): void {
    Konva.Image.fromURL(src, (imgNode) => {
      const source = imgNode.image();
      if (source) {
        this._setImage(source);
      }
    });
  }

  private _layout(): void {
    if (!this._core || !this._image) return;
    const stage = this._core.stage;
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const scale = stage.scaleX();
    const stagePos = stage.position();

    const screenCenter = { x: Math.floor(stageWidth / 2), y: Math.floor(stageHeight / 2) };

    this._image.scale({ x: 1 / scale, y: 1 / scale });

    const imageWidth = this._width;
    const imageHeight = this._height;
    this._image.size({ width: imageWidth, height: imageHeight });
    this._image.offset({ x: imageWidth / 2, y: imageHeight / 2 });

    const worldX = (screenCenter.x - stagePos.x) / scale;
    const worldY = (screenCenter.y - stagePos.y) / scale;
    this._image.position({ x: worldX, y: worldY });
    this._image.opacity(this._opacity);

    if (this._layer) this._layer.moveToBottom();
  }
}
