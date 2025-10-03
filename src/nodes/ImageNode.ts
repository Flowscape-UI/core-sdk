import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export type ImageSource = HTMLImageElement;

export interface ImageNodeOptions extends BaseNodeOptions {
  image?: ImageSource;
  src?: string; // if src is provided, it will be loaded async and set to node
  width?: number;
  height?: number;
}

export class ImageNode extends BaseNode<Konva.Image> {
  constructor(options: ImageNodeOptions = {}) {
    const node = new Konva.Image({} as Konva.ImageConfig);
    node.x(options.x ?? 0);
    node.y(options.y ?? 0);
    node.width(options.width ?? 150);
    node.height(options.height ?? 150);
    node.image(options.image ?? null);
    super(node, options);

    // If src is provided, it will be loaded async and set to node
    if (!options.image && options.src) {
      void this.setSrc(options.src);
    }
  }

  public getSize(): { width: number; height: number } {
    return this.konvaNode.size();
  }

  // ===== Async helpers =====
  /**
   * Async loads image from URL and sets it to Konva.Image.
   * Returns this for chaining.
   */
  public async setSrc(
    url: string,
    crossOrigin: '' | 'anonymous' | 'use-credentials' | undefined = 'anonymous',
  ) {
    const img = await this._loadHTMLImage(url, crossOrigin);
    this.konvaNode.image(img);

    // If sizes are not set, Konva will use natural sizes from image
    // Request layer to redraw if it is already added
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  /**
   * Set already loaded image source (HTMLImageElement)
   */
  public setImage(image: ImageSource): this {
    this.konvaNode.image(image);
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public setSize({ width, height }: { width: number; height: number }): this {
    this.konvaNode.size({ width, height });
    return this;
  }

  // ===== Static helpers =====
  private _loadHTMLImage(
    url: string,
    crossOrigin: '' | 'anonymous' | 'use-credentials' | undefined = 'anonymous',
  ) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const ImgCtor =
        (globalThis as unknown as { Image?: new () => HTMLImageElement }).Image ?? null;
      if (!ImgCtor) {
        reject(new Error('Image constructor is not available in current environment'));
        return;
      }
      const img = new ImgCtor();
      // Setup crossOrigin with type safety
      const co: '' | 'anonymous' | 'use-credentials' = crossOrigin;
      img.crossOrigin = co;
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }
}
