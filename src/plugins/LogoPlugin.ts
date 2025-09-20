import Konva from 'konva';

import type { Scene } from '../Scene';

import type { Plugin } from './Plugin';

export interface LogoPluginOptions {
  src: string | HTMLImageElement;
  width: number;
  height: number;
  opacity?: number;
}

export class LogoPlugin implements Plugin {
  private _stage?: Konva.Stage;
  private _layer?: Konva.Layer;
  private _node?: Konva.Image;

  private _src: string | HTMLImageElement;
  private _width: number;
  private _height: number;
  private _opacity: number;

  constructor(options: LogoPluginOptions) {
    this._src = options.src;
    this._width = options.width;
    this._height = options.height;
    this._opacity = options.opacity ?? 1;
  }

  public onAttach(scene: Scene): void {
    this._stage = scene;
    this._layer = scene.getRootLayer();

    this._node = new Konva.Image({
      image: this._createPlaceholder(scene),
      name: 'flowscape-logo-background',
      listening: false,
      opacity: this._opacity,
    });

    this._layer.add(this._node);
    this._node.moveToBottom();

    this.setSource(this._src);

    this._stage.on('resize.logo', () => {
      this._layout();
    });
  }

  public onDetach(_scene: Scene): void {
    if (this._stage) this._stage.off('resize.logo');
    if (this._node) this._node.destroy();
  }

  public setOpacity(opacity: number): void {
    this._opacity = opacity;
    if (this._node) this._node.opacity(opacity);
    if (this._stage) this._stage.batchDraw();
  }

  public setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._layout();
    if (this._stage) this._stage.batchDraw();
  }

  public setSource(src: string | HTMLImageElement): void {
    this._src = src;
    if (typeof src === 'string') this._loadImageFromString(src);
    else this._setImage(src);
  }

  private _setImage(source: CanvasImageSource): void {
    if (!this._node) return;
    this._node.image(source);
    this._layout();
    if (this._stage) this._stage.batchDraw();
  }

  private _loadImageFromString(src: string): void {
    Konva.Image.fromURL(src, (imgNode) => {
      const source = imgNode.image();
      if (source) {
        this._setImage(source);
      }
    });
  }

  private _createPlaceholder(scene: Scene): CanvasImageSource {
    const doc = scene.container().ownerDocument;
    const c = doc.createElement('img');
    c.width = 1;
    c.height = 1;
    return c;
  }

  private _layout(): void {
    if (!this._stage || !this._node) return;
    const w = this._stage.width();
    const h = this._stage.height();
    const imgW = this._width;
    const imgH = this._height;
    this._node.size({ width: imgW, height: imgH });
    this._node.offset({ x: imgW / 2, y: imgH / 2 });
    this._node.position({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
    this._node.opacity(this._opacity);
  }
}
