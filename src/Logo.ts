import Konva from 'konva';

export interface LogoOptions {
  stage: Konva.Stage;
  layer: Konva.Layer;
  src: string | HTMLImageElement;
  width: number;
  height: number;
  opacity?: number;
}

export class Logo {
  private _stage: Konva.Stage;
  private _layer: Konva.Layer;
  private _node: Konva.Image;
  private _opts: Required<Omit<LogoOptions, 'stage' | 'layer' | 'src'>> & {
    src: HTMLImageElement | string;
  };

  constructor(options: LogoOptions) {
    const { stage, layer, src, width, height, opacity = 1 } = options;
    this._stage = stage;
    this._layer = layer;
    this._opts = { src, width, height, opacity };

    this._node = new Konva.Image({
      image: this._createPlaceholder(),
      name: 'flowscape-logo-background',
      listening: false,
      opacity: opacity,
    });

    this._layer.add(this._node);
    this._node.moveToBottom();

    this.setSource(src);

    this._stage.on('resize.logo', () => {
      this._layout();
    });
  }

  public destroy(): void {
    this._stage.off('resize.logo');
    this._node.destroy();
  }

  public setOpacity(opacity: number): void {
    this._opts.opacity = opacity;
    this._node.opacity(opacity);
    this._stage.batchDraw();
  }

  public setSize(width: number, height: number): void {
    this._opts.width = width;
    this._opts.height = height;
    this._layout();
    this._stage.batchDraw();
  }

  public setSource(src: string | HTMLImageElement): void {
    this._opts.src = src;
    if (typeof src === 'string') this._loadImageFromString(src);
    else this._setImage(src);
  }

  private _setImage(source: CanvasImageSource): void {
    this._node.image(source);
    this._layout();
    this._stage.batchDraw();
  }

  private _loadImageFromString(src: string): void {
    Konva.Image.fromURL(src, (imgNode) => {
      const source = imgNode.image();
      if (source) {
        this._setImage(source);
      }
    });
  }

  private _createPlaceholder(): CanvasImageSource {
    const doc = this._stage.container().ownerDocument;
    const c = doc.createElement('img');
    c.width = 1;
    c.height = 1;
    return c;
  }

  private _layout(): void {
    const w = this._stage.width();
    const h = this._stage.height();
    const imgW = this._opts.width;
    const imgH = this._opts.height;
    this._node.size({ width: imgW, height: imgH });
    this._node.offset({ x: imgW / 2, y: imgH / 2 });
    this._node.position({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
    this._node.opacity(this._opts.opacity);
  }
}
