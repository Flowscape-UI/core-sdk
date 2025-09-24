import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export type ImageSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export interface ImageNodeOptions extends BaseNodeOptions {
  image?: ImageSource;
  src?: string; // если задан, загрузим изображение и установим в node
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

    // Если источник задан как URL — загрузим асинхронно
    if (!options.image && options.src) {
      void this.setSrc(options.src);
    }
  }

  public getSize(): { width: number; height: number } {
    return this.konvaNode.size();
  }

  // ===== Async helpers =====
  /**
   * Асинхронно загружает изображение по URL и устанавливает в Konva.Image.
   * Возвращает this для чейнинга.
   */
  public async setSrc(
    url: string,
    crossOrigin: '' | 'anonymous' | 'use-credentials' | undefined = 'anonymous',
  ) {
    const img = await this._loadHTMLImage(url, crossOrigin);
    this.konvaNode.image(img);

    // Если размеры не заданы, можно оставить естественные (конва возьмёт из image)
    // Попросим слой перерисоваться, если он уже добавлен
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  /**
   * Установить уже готовый источник изображения (HTMLImageElement/Canvas/Video)
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

  // public getImage(): ImageSource | null {
  //   // typings: image(): HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | undefined
  //   return (this.konvaNode.image() as ImageSource | undefined) ?? null;
  // }

  // ===== Static helpers =====
  private _loadHTMLImage(
    url: string,
    crossOrigin: '' | 'anonymous' | 'use-credentials' | undefined = 'anonymous',
  ) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      // Достаём конструктор из globalThis для совместимости с браузером и тестами
      const ImgCtor =
        (globalThis as unknown as { Image?: new () => HTMLImageElement }).Image ?? null;
      if (!ImgCtor) {
        reject(new Error('Image constructor is not available in current environment'));
        return;
      }
      const img = new ImgCtor();
      // Устанавливаем crossOrigin c безопасной типизацией
      const co: '' | 'anonymous' | 'use-credentials' = crossOrigin;
      img.crossOrigin = co; // совместимость с DOM typings
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
