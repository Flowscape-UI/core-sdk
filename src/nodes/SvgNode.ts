import Konva from 'konva';

import { MediaPlaceholder, type MediaPlaceholderOptions } from '../utils/MediaPlaceholder';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface SvgNodeOptions extends BaseNodeOptions {
  src?: string;
  width?: number;
  height?: number;
  cornerRadius?: number | number[];
  placeholder?: Partial<MediaPlaceholderOptions>;
  onLoad?: (node: SvgNode) => void;
  onError?: (error: Error) => void;
}

export class SvgNode extends BaseNode<Konva.Image> {
  private _isLoading = false;
  private _isLoaded = false;
  private _placeholder: MediaPlaceholder;

  constructor(options: SvgNodeOptions = {}) {
    const node = new Konva.Image({} as Konva.ImageConfig);
    node.setAttr('flowscapeNodeType', 'svg');
    node.x(options.x ?? 0);
    node.y(options.y ?? 0);
    node.width(options.width ?? 150);
    node.height(options.height ?? 150);
    node.cornerRadius(options.cornerRadius ?? 0);
    node.setAttr('placeholder', options.placeholder ?? {});
    super(node, options);

    this._placeholder = new MediaPlaceholder(this.konvaNode, options.placeholder);

    if (options.src) {
      void this.setSrc(options.src, options.onLoad, options.onError);
    }
  }

  public isLoading(): boolean {
    return this._isLoading;
  }

  public isLoaded(): boolean {
    return this._isLoaded;
  }

  public getSize(): { width: number; height: number } {
    return this.konvaNode.size();
  }

  public async setSrc(
    url: string,
    onLoad?: (node: SvgNode) => void,
    onError?: (error: Error) => void,
  ): Promise<this> {
    this.konvaNode.setAttr('src', url);
    this._isLoading = true;
    this._isLoaded = false;
    this._placeholder.start();

    try {
      await new Promise<void>((resolve, reject) => {
        Konva.Image.fromURL(
          url,
          (imageNode) => {
            this._placeholder.stop();
            this.konvaNode.image(imageNode.image());

            const layer = this.konvaNode.getLayer();
            if (layer) {
              layer.batchDraw();
            }

            this._isLoading = false;
            this._isLoaded = true;

            if (onLoad) {
              onLoad(this);
            }

            resolve();
          },
          (error) => {
            this._placeholder.stop();
            this._isLoading = false;
            this._isLoaded = false;

            const errorMessage =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : 'Unknown error';
            const err = new Error(`Failed to load SVG: ${url}. ${errorMessage}`);

            if (onError) {
              onError(err);
            }

            reject(err);
          },
        );
      });
    } catch (error) {
      this._placeholder.stop();
      this._isLoading = false;
      this._isLoaded = false;
      throw error;
    }

    return this;
  }

  public setSize({ width, height }: { width: number; height: number }): this {
    this.konvaNode.size({ width, height });
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public setCornerRadius(radius: number | number[]): this {
    this.konvaNode.cornerRadius(radius);
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public getCornerRadius(): number {
    return this.konvaNode.cornerRadius() as number;
  }

  public setOpacity(opacity: number): this {
    this.konvaNode.opacity(opacity);
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public getOpacity(): number {
    return this.konvaNode.opacity();
  }

  public override remove(): void {
    this._placeholder.stop();
    super.remove();
  }
}
