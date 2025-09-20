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
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private node: Konva.Image;
  private opts: Required<Omit<LogoOptions, 'stage' | 'layer' | 'src'>> & {
    src: HTMLImageElement | string;
  };

  constructor(options: LogoOptions) {
    const { stage, layer, src, width, height, opacity = 1 } = options;
    this.stage = stage;
    this.layer = layer;
    this.opts = { src, width, height, opacity };

    this.node = new Konva.Image({
      image: this.createPlaceholder(),
      name: 'flowscape-logo-background',
      listening: false,
      opacity: opacity,
    });

    this.layer.add(this.node);
    this.node.moveToBottom();

    this.setSource(src);

    this.stage.on('resize.logo', () => {
      this.layout();
    });
  }

  public destroy(): void {
    this.stage.off('resize.logo');
    this.node.destroy();
  }

  public setOpacity(opacity: number): void {
    this.opts.opacity = opacity;
    this.node.opacity(opacity);
    this.stage.batchDraw();
  }

  public setSize(width: number, height: number): void {
    this.opts.width = width;
    this.opts.height = height;
    this.layout();
    this.stage.batchDraw();
  }

  public setSource(src: string | HTMLImageElement): void {
    this.opts.src = src;
    if (typeof src === 'string') this.loadImageFromString(src);
    else this.setImage(src);
  }

  private setImage(source: CanvasImageSource): void {
    this.node.image(source);
    this.layout();
    this.stage.batchDraw();
  }

  private loadImageFromString(src: string): void {
    Konva.Image.fromURL(src, (imgNode) => {
      const source = imgNode.image();
      if (source) {
        this.setImage(source);
      }
    });
  }

  private createPlaceholder(): CanvasImageSource {
    const doc = this.stage.container().ownerDocument;
    const c = doc.createElement('img');
    c.width = 1;
    c.height = 1;
    return c;
  }

  private layout(): void {
    const w = this.stage.width();
    const h = this.stage.height();
    const imgW = this.opts.width;
    const imgH = this.opts.height;
    this.node.size({ width: imgW, height: imgH });
    this.node.offset({ x: imgW / 2, y: imgH / 2 });
    this.node.position({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
    this.node.opacity(this.opts.opacity);
  }
}
