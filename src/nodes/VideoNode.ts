import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface VideoNodeOptions extends BaseNodeOptions {
  src?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onLoadedMetadata?: (node: VideoNode, video: HTMLVideoElement) => void;
  onError?: (error: Error) => void;
  onPlay?: (node: VideoNode) => void;
  onPause?: (node: VideoNode) => void;
  onEnded?: (node: VideoNode) => void;
}

export class VideoNode extends BaseNode<Konva.Image> {
  private _videoElement: HTMLVideoElement | null = null;
  private _animation: Konva.Animation | null = null;
  private _isPlaying = false;
  private _isLoaded = false;

  constructor(options: VideoNodeOptions = {}) {
    const node = new Konva.Image({} as Konva.ImageConfig);
    node.x(options.x ?? 0);
    node.y(options.y ?? 0);
    node.width(options.width ?? 320);
    node.height(options.height ?? 240);
    super(node, options);

    if (options.src) {
      void this.setSrc(options.src, options);
    }
  }

  public async setSrc(
    url: string,
    options: Omit<VideoNodeOptions, 'src' | 'x' | 'y' | 'width' | 'height'> = {},
  ): Promise<this> {
    this._cleanup();

    if (typeof document === 'undefined') {
      throw new Error('VideoNode requires a browser environment with document object');
    }

    const video = globalThis.document.createElement('video');
    video.src = url;
    video.loop = options.loop ?? false;
    video.muted = options.muted ?? false;

    this._videoElement = video;

    this.konvaNode.image(video);

    this._ensureAnimation();

    return new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => {
        this._isLoaded = true;

        if (options.onLoadedMetadata) {
          options.onLoadedMetadata(this, video);
        }

        if (options.autoplay) {
          void this.play();
        }

        resolve(this);
      });

      video.addEventListener('error', () => {
        const error = new Error(`Failed to load video: ${url}`);
        this._isLoaded = false;

        if (options.onError) {
          options.onError(error);
        }

        reject(error);
      });

      if (options.onPlay) {
        video.addEventListener('play', () => {
          if (options.onPlay) {
            options.onPlay(this);
          }
        });
      }

      if (options.onPause) {
        video.addEventListener('pause', () => {
          if (options.onPause) {
            options.onPause(this);
          }
        });
      }

      if (options.onEnded) {
        video.addEventListener('ended', () => {
          if (options.onEnded) {
            options.onEnded(this);
          }
        });
      }
    });
  }

  public async play(): Promise<this> {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._ensureAnimation();

    try {
      await this._videoElement.play();
      this._isPlaying = true;
      this._animation?.start();
    } catch (error) {
      throw new Error(`Failed to play video: ${(error as Error).message}`);
    }

    return this;
  }

  public pause(): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.pause();
    this._isPlaying = false;
    this._animation?.stop();

    return this;
  }

  public stop(): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.pause();
    this._videoElement.currentTime = 0;
    this._isPlaying = false;
    this._animation?.stop();

    return this;
  }

  public setCurrentTime(time: number): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.currentTime = time;
    return this;
  }

  public getCurrentTime(): number {
    if (!this._videoElement) {
      return 0;
    }

    return this._videoElement.currentTime;
  }

  public getDuration(): number {
    if (!this._videoElement) {
      return 0;
    }

    return this._videoElement.duration;
  }

  public setVolume(volume: number): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.volume = Math.max(0, Math.min(1, volume));
    return this;
  }

  public getVolume(): number {
    if (!this._videoElement) {
      return 0;
    }

    return this._videoElement.volume;
  }

  public setMuted(muted: boolean): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.muted = muted;
    return this;
  }

  public isMuted(): boolean {
    if (!this._videoElement) {
      return false;
    }

    return this._videoElement.muted;
  }

  public setLoop(loop: boolean): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.loop = loop;
    return this;
  }

  public isLoop(): boolean {
    if (!this._videoElement) {
      return false;
    }

    return this._videoElement.loop;
  }

  public setPlaybackRate(rate: number): this {
    if (!this._videoElement) {
      throw new Error('Video element is not initialized');
    }

    this._videoElement.playbackRate = rate;
    return this;
  }

  public getPlaybackRate(): number {
    if (!this._videoElement) {
      return 1;
    }

    return this._videoElement.playbackRate;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public isLoaded(): boolean {
    return this._isLoaded;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this._videoElement;
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

  private _ensureAnimation(): void {
    if (this._animation) {
      return;
    }

    const layer = this.konvaNode.getLayer();
    if (layer) {
      this._animation = new Konva.Animation(() => {
        // Animation updates the layer automatically on each frame
      }, layer);
    }
  }

  private _cleanup(): void {
    if (this._animation) {
      this._animation.stop();
      this._animation = null;
    }

    if (this._videoElement) {
      this._videoElement.pause();
      this._videoElement.src = '';
      this._videoElement.load();
      this._videoElement = null;
    }

    this._isPlaying = false;
    this._isLoaded = false;
  }

  public override remove(): void {
    this._cleanup();
    super.remove();
  }
}
