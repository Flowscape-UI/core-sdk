import Konva from 'konva';

export interface MediaPlaceholderOptions {
  text: string;
  textColor: string;
  font: string;
  backgroundColor: string;
  borderColor: string;
  baseSpinnerColor: string;
  accentSpinnerColor: string;
  lineWidth: number;
  fallbackWidth: number;
  fallbackHeight: number;
}

const defaultOptions: MediaPlaceholderOptions = {
  text: '',
  textColor: '#bdbdbd',
  font: '12px sans-serif',
  backgroundColor: '#1f1f1f',
  borderColor: 'transparent',
  baseSpinnerColor: '#6b6b6b',
  accentSpinnerColor: '#2b83ff',
  lineWidth: 2,
  fallbackWidth: 150,
  fallbackHeight: 150,
};

export class MediaPlaceholder {
  private readonly _node: Konva.Image;
  private _options: MediaPlaceholderOptions;
  private _rafId: number | null = null;
  private _startTime = 0;
  private _lastDrawTime = 0;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _logicalWidth = 0;
  private _logicalHeight = 0;
  private _pixelRatio = 1;

  private readonly _maxPixelRatio = 3;
  private readonly _maxCanvasPixels = 1_500_000;
  private readonly _targetFps = 30;

  constructor(node: Konva.Image, options?: Partial<MediaPlaceholderOptions>) {
    this._node = node;
    this._options = { ...defaultOptions, ...(options ?? {}) };
  }

  public setOptions(options: Partial<MediaPlaceholderOptions>): void {
    this._options = { ...this._options, ...options };
    this._draw(0);
    this._node.getLayer()?.batchDraw();
  }

  public start(): void {
    this.stop();

    if (typeof document === 'undefined') return;

    const canvas = globalThis.document.createElement('canvas');
    const size = this._node.size();
    const logicalWidth = Math.max(1, Math.round(size.width || this._options.fallbackWidth));
    const logicalHeight = Math.max(1, Math.round(size.height || this._options.fallbackHeight));

    const pixelRatio = this._getPixelRatio();
    canvas.width = Math.max(1, Math.round(logicalWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(logicalHeight * pixelRatio));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    this._canvas = canvas;
    this._ctx = ctx;
    this._logicalWidth = logicalWidth;
    this._logicalHeight = logicalHeight;
    this._pixelRatio = pixelRatio;

    this._node.image(canvas);
    this._startTime = globalThis.performance.now();
    this._lastDrawTime = 0;
    this._tick();
  }

  public stop(): void {
    if (this._rafId !== null) {
      globalThis.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._canvas = null;
    this._ctx = null;
    this._logicalWidth = 0;
    this._logicalHeight = 0;
    this._pixelRatio = 1;
    this._startTime = 0;
    this._lastDrawTime = 0;
  }

  private _tick = (): void => {
    const canvas = this._canvas;
    const ctx = this._ctx;
    if (!canvas || !ctx) return;

    const now = globalThis.performance.now();
    const frameIntervalMs = 1000 / this._targetFps;
    if (this._lastDrawTime !== 0 && now - this._lastDrawTime < frameIntervalMs) {
      this._rafId = globalThis.requestAnimationFrame(this._tick);
      return;
    }

    this._lastDrawTime = now;

    const tMs = now - this._startTime;
    const t = tMs / 1000;

    const pixelRatio = this._getPixelRatio();
    if (pixelRatio !== this._pixelRatio && this._logicalWidth > 0 && this._logicalHeight > 0) {
      canvas.width = Math.max(1, Math.round(this._logicalWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(this._logicalHeight * pixelRatio));
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this._pixelRatio = pixelRatio;
    }

    this._draw(t);
    this._node.getLayer()?.batchDraw();

    this._rafId = globalThis.requestAnimationFrame(this._tick);
  };

  private _getPixelRatio(): number {
    const dpr = globalThis.devicePixelRatio || 1;
    const absScale = this._node.getAbsoluteScale();
    const scale = Math.max(1e-6, Math.max(absScale.x, absScale.y));
    let pixelRatio = Math.max(1, dpr * scale);
    pixelRatio = Math.min(this._maxPixelRatio, pixelRatio);

    const lw =
      this._logicalWidth ||
      Math.max(1, Math.round(this._node.width() || this._options.fallbackWidth));
    const lh =
      this._logicalHeight ||
      Math.max(1, Math.round(this._node.height() || this._options.fallbackHeight));
    const pixels = lw * lh * pixelRatio * pixelRatio;
    if (pixels > this._maxCanvasPixels) {
      const limitRatio = Math.sqrt(this._maxCanvasPixels / (lw * lh));
      pixelRatio = Math.max(1, Math.min(pixelRatio, limitRatio));
    }

    return pixelRatio;
  }

  private _draw(t: number): void {
    const ctx = this._ctx;
    const canvas = this._canvas;
    if (!ctx || !canvas) return;

    const {
      backgroundColor,
      borderColor,
      baseSpinnerColor,
      accentSpinnerColor,
      text,
      textColor,
      font,
      lineWidth,
    } = this._options;

    const width = this._logicalWidth || Math.max(1, Math.round(canvas.width / this._pixelRatio));
    const height = this._logicalHeight || Math.max(1, Math.round(canvas.height / this._pixelRatio));

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(10, Math.min(width, height) * 0.12);

    ctx.beginPath();
    ctx.strokeStyle = baseSpinnerColor;
    ctx.lineWidth = Math.max(2, r * 0.25);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = accentSpinnerColor;
    ctx.lineWidth = Math.max(2, r * 0.25);
    ctx.lineCap = 'round';
    const a = t * Math.PI * 2;
    ctx.arc(cx, cy, r, a, a + Math.PI * 0.9);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, cx, Math.min(height - 14, cy + r + 8));
  }
}
