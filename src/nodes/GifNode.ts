import Konva from 'konva';

import { MediaPlaceholder, type MediaPlaceholderOptions } from '../utils/MediaPlaceholder';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

declare global {
  interface Window {
    gifler?: (url: string) => GiflerInstance;
  }

  interface GiflerInstance {
    frames: (
      canvas: HTMLCanvasElement,
      onDrawFrame: (ctx: CanvasRenderingContext2D, frame: GiflerFrame) => void,
    ) => void;
  }

  interface GiflerFrame {
    width: number;
    height: number;
    buffer: HTMLCanvasElement;
  }
}

export interface GifNodeOptions extends BaseNodeOptions {
  src?: string;
  width?: number;
  height?: number;
  cornerRadius?: number | number[];
  autoplay?: boolean;
  placeholder?: Partial<MediaPlaceholderOptions>;
  onLoad?: (node: GifNode) => void;
  onError?: (error: Error) => void;
  onFrame?: (node: GifNode, frameIndex: number) => void;
}

export class GifNode extends BaseNode<Konva.Image> {
  private _canvas: HTMLCanvasElement | null = null;
  private _placeholder: MediaPlaceholder;
  private _isLoaded = false;
  private _isPlaying = false;
  private _giflerLoaded = false;
  private _frameIndex = 0;

  constructor(options: GifNodeOptions = {}) {
    const node = new Konva.Image({} as Konva.ImageConfig);
    node.setAttr('flowscapeNodeType', 'gif');
    node.x(options.x ?? 0);
    node.y(options.y ?? 0);
    node.width(options.width ?? 150);
    node.height(options.height ?? 150);
    node.cornerRadius(options.cornerRadius ?? 0);
    node.setAttr('placeholder', options.placeholder ?? {});
    if (options.src) {
      node.setAttr('src', options.src); // Save src for serialization
    }
    super(node, options);

    this._placeholder = new MediaPlaceholder(this.konvaNode, options.placeholder);

    void this._ensureGiflerLibrary();

    if (options.src) {
      void this.setSrc(options.src, options);
    }
  }

  public async setSrc(
    url: string,
    options: Omit<GifNodeOptions, 'src' | 'x' | 'y' | 'width' | 'height'> = {},
  ): Promise<this> {
    this._cleanup();

    if (typeof document === 'undefined') {
      throw new Error('GifNode requires a browser environment with document object');
    }

    await this._ensureGiflerLibrary();

    this._placeholder.start();

    const canvas = globalThis.document.createElement('canvas');
    this._canvas = canvas;
    this.konvaNode.setAttr('src', url); // Save src for serialization

    return new Promise((resolve, reject) => {
      if (!globalThis.window.gifler) {
        const error = new Error('Gifler library is not loaded');
        if (options.onError) {
          options.onError(error);
        }
        reject(error);
        return;
      }

      try {
        globalThis.window
          .gifler(url)
          .frames(
            canvas,
            (
              ctx: CanvasRenderingContext2D,
              frame: { width: number; height: number; buffer: HTMLCanvasElement },
            ) => {
              canvas.width = frame.width;
              canvas.height = frame.height;

              ctx.drawImage(frame.buffer, 0, 0);

              if (!this._isLoaded) {
                this._placeholder.stop();
                this.konvaNode.image(canvas);
                this._isLoaded = true;
                this._isPlaying = options.autoplay ?? true;

                if (options.onLoad) {
                  options.onLoad(this);
                }

                resolve(this);
              }

              if (this._isPlaying) {
                this._frameIndex++;
                if (options.onFrame) {
                  options.onFrame(this, this._frameIndex);
                }

                const layer = this.konvaNode.getLayer();
                if (layer) {
                  layer.batchDraw();
                }
              }
            },
          );
      } catch (error) {
        this._placeholder.stop();
        const err = new Error(`Failed to load GIF: ${url}. ${(error as Error).message}`);
        this._isLoaded = false;

        if (options.onError) {
          options.onError(err);
        }

        reject(err);
      }
    });
  }

  public play(): this {
    this._isPlaying = true;
    return this;
  }

  public pause(): this {
    this._isPlaying = false;
    return this;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public isLoaded(): boolean {
    return this._isLoaded;
  }

  public getFrameIndex(): number {
    return this._frameIndex;
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  public getSize(): { width: number; height: number } {
    return this.konvaNode.size();
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

  private async _ensureGiflerLibrary(): Promise<void> {
    if (this._giflerLoaded || globalThis.window.gifler) {
      this._giflerLoaded = true;
      return;
    }

    if (typeof document === 'undefined') {
      throw new Error('GifNode requires a browser environment');
    }

    const existingScript = globalThis.document.querySelector('script[src*="gifler"]');

    if (existingScript) {
      return new Promise((resolve, reject) => {
        if (globalThis.window.gifler) {
          this._giflerLoaded = true;
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => {
          this._giflerLoaded = true;
          resolve();
        });

        existingScript.addEventListener('error', () => {
          reject(new Error('Failed to load gifler library'));
        });
      });
    }

    return new Promise((resolve, reject) => {
      const script = globalThis.document.createElement('script');
      script.src = 'https://unpkg.com/gifler@0.1.0/gifler.min.js';

      script.onload = () => {
        this._giflerLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load gifler library'));
      };

      globalThis.document.head.appendChild(script);
    });
  }

  private _cleanup(): void {
    this._placeholder.stop();
    this._isPlaying = false;
    this._isLoaded = false;
    this._frameIndex = 0;
    this._canvas = null;
  }

  public override remove(): void {
    this._cleanup();
    super.remove();
  }
}
