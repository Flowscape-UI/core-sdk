import Konva from 'konva';

import { MediaPlaceholder, type MediaPlaceholderOptions } from '../utils/MediaPlaceholder';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface VideoNodeOptions extends BaseNodeOptions {
  src?: string;
  width?: number;
  height?: number;
  cornerRadius?: number | number[];
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  currentTime?: number;
  volume?: number;
  playbackRate?: number;
  placeholder?: Partial<MediaPlaceholderOptions>;
  onLoadedMetadata?: (node: VideoNode, video: HTMLVideoElement) => void;
  onError?: (error: Error) => void;
  onPlay?: (node: VideoNode) => void;
  onPause?: (node: VideoNode) => void;
  onEnded?: (node: VideoNode) => void;
}

export class VideoNode extends BaseNode<Konva.Image> {
  private _videoElement: HTMLVideoElement | null = null;
  private _animation: Konva.Animation | null = null;
  private _placeholder: MediaPlaceholder;
  private _isPlaying = false;
  private _isLoaded = false;

  constructor(options: VideoNodeOptions = {}) {
    const node = new Konva.Image({} as Konva.ImageConfig);
    node.setAttr('flowscapeNodeType', 'video');
    node.x(options.x ?? 0);
    node.y(options.y ?? 0);
    node.width(options.width ?? 320);
    node.height(options.height ?? 240);
    node.cornerRadius(options.cornerRadius ?? 0);
    node.setAttr('src', options.src ?? '');
    node.setAttr('loop', options.loop ?? true);
    node.setAttr('muted', options.muted ?? false);
    node.setAttr('autoplay', options.autoplay ?? false);
    node.setAttr('currentTime', options.currentTime ?? 0);
    node.setAttr('volume', options.volume ?? 1);
    node.setAttr('playbackRate', options.playbackRate ?? 1);
    node.setAttr('placeholder', options.placeholder ?? {});
    super(node, options);

    this._placeholder = new MediaPlaceholder(this.konvaNode, {
      fallbackWidth: 320,
      fallbackHeight: 240,
      ...(options.placeholder ?? {}),
    });

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

    // Get saved attributes from Konva node if options not provided
    const attrs = this.konvaNode.getAttrs() as Record<string, unknown>;
    const loop = options.loop ?? (attrs['loop'] as boolean | undefined) ?? false;
    const muted = options.muted ?? (attrs['muted'] as boolean | undefined) ?? false;
    const autoplay = options.autoplay ?? (attrs['autoplay'] as boolean | undefined);
    const currentTime = options.currentTime ?? (attrs['currentTime'] as number | undefined) ?? 0;
    const savedVolume = options.volume ?? (attrs['volume'] as number | undefined) ?? 1;
    const savedPlaybackRate =
      options.playbackRate ?? (attrs['playbackRate'] as number | undefined) ?? 1;
    this._placeholder.start();

    const video = globalThis.document.createElement('video');
    video.preload = 'auto';
    video.src = url;
    video.loop = loop;
    video.muted = muted;
    video.currentTime = currentTime;
    video.volume = savedVolume;
    video.playbackRate = savedPlaybackRate;
    video.load();
    this._videoElement = video;
    this.konvaNode.setAttr('src', url);
    this.konvaNode.setAttr('loop', loop);
    this.konvaNode.setAttr('muted', muted);
    this.konvaNode.setAttr('currentTime', currentTime);
    this.konvaNode.setAttr('autoplay', autoplay);
    this._ensureAnimation();

    return new Promise((resolve, reject) => {
      let settled = false;

      const settleSuccess = () => {
        if (settled) return;
        settled = true;
        this._isLoaded = true;
        this._placeholder.stop();
        this.konvaNode.image(video);
        this.konvaNode.getLayer()?.batchDraw();
        if (autoplay) {
          void this.play();
        }
        resolve(this);
      };

      video.addEventListener('loadedmetadata', () => {
        if (options.onLoadedMetadata) {
          options.onLoadedMetadata(this, video);
        }
      });

      video.addEventListener('loadeddata', () => {
        settleSuccess();
      });

      video.addEventListener('canplay', () => {
        settleSuccess();
      });

      video.addEventListener('error', () => {
        if (settled) return;
        settled = true;
        this._placeholder.stop();
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
      // Browser autoplay policy: user interaction required
      // Just log warning instead of throwing error
      const err = error as Error;
      if (err.name === 'NotAllowedError' || err.message.includes("user didn't interact")) {
        globalThis.console.warn(
          'Video autoplay blocked by browser policy. User interaction required.',
          err.message,
        );
      } else {
        globalThis.console.error('Failed to play video:', err.message);
      }
      // Don't throw, just return this to allow chaining
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
    this.konvaNode.setAttr('currentTime', time);
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

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this._videoElement.volume = clampedVolume;
    this.konvaNode.setAttr('volume', clampedVolume);
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
    this.konvaNode.setAttr('muted', muted);
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
    this.konvaNode.setAttr('loop', loop);
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
    this.konvaNode.setAttr('playbackRate', rate);
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
    this._placeholder.stop();
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
