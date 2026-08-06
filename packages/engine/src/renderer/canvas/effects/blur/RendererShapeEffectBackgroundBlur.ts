import Konva from "konva";

import {
  ShapeEffectType,
  type IShapeEffectBackgroundBlur,
  type Rect,
  type ShapePathCommand,
} from "../../../../nodes";

const BLUR_PADDING_FACTOR = 3;
const RASTER_PADDING = 2;

type DeviceRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;
type AppendPath = (
  context: Konva.Context,
  commands: readonly ShapePathCommand[],
) => void;

export class RendererEffectBackgroundBlur {
  public readonly type = ShapeEffectType.BackgroundBlur;

  private readonly _view: Konva.Shape;

  private _blurValues: readonly number[] = [];
  private _commands: readonly ShapePathCommand[] = [];
  private _sourceBounds: Rect | null = null;

  private _captureCanvas: HTMLCanvasElement | null = null;
  private _blurredCanvas: HTMLCanvasElement | null = null;

  constructor(private readonly _appendPath: AppendPath) {
    this._view = new Konva.Shape({
      listening: false,
      perfectDrawEnabled: false,
      visible: false,
      sceneFunc: (context, shape) => {
        this._draw(context, shape);
      },
    });
  }

  public getView(): Konva.Shape {
    return this._view;
  }

  public mount(target: Konva.Group): void {
    if (this._view.getParent() !== target) {
      this._view.remove();
      target.add(this._view);
    }

    this._view.moveToBottom();
  }

  public update(
    effects: readonly IShapeEffectBackgroundBlur[],
    commands: readonly ShapePathCommand[],
    sourceBounds: Rect,
  ): void {
    this._blurValues = effects
      .filter((effect) => effect.isVisible())
      .map((effect) => Math.max(0, effect.getBlur()))
      .filter((blur) => blur > 0);

    this._commands = commands;
    this._sourceBounds = { ...sourceBounds };

    this._view.visible(
      this._blurValues.length > 0 &&
      commands.length > 0 &&
      sourceBounds.width > 0 &&
      sourceBounds.height > 0,
    );
  }

  public clear(): void {
    this._blurValues = [];
    this._commands = [];
    this._sourceBounds = null;
    this._view.visible(false);
  }

  public destroy(): void {
    this.clear();
    this._view.destroy();
    this._releaseCanvas(this._captureCanvas);
    this._releaseCanvas(this._blurredCanvas);
    this._captureCanvas = null;
    this._blurredCanvas = null;
  }

  private _draw(context: Konva.Context, shape: Konva.Shape): void {
    if (
      this._blurValues.length === 0 ||
      this._commands.length === 0 ||
      !this._sourceBounds
    ) {
      return;
    }

    const currentCanvas = context.getCanvas();
    const nativeCanvas = currentCanvas._canvas;
    const nativeContext = context._context;
    const transform = nativeContext.getTransform();
    const deviceScale = this._getDeviceScale(transform);
    const totalBlur = this._blurValues.reduce((sum, blur) => sum + blur, 0);
    const padding =
      Math.ceil(totalBlur * deviceScale * BLUR_PADDING_FACTOR) + RASTER_PADDING;
    const captureRect = this._getCaptureRect(
      this._sourceBounds,
      transform,
      padding,
      nativeCanvas.width,
      nativeCanvas.height,
    );

    if (!captureRect) {
      return;
    }

    const captureCanvas = this._ensureCanvas(
      this._captureCanvas,
      captureRect.width,
      captureRect.height,
    );
    const blurredCanvas = this._ensureCanvas(
      this._blurredCanvas,
      captureRect.width,
      captureRect.height,
    );

    this._captureCanvas = captureCanvas;
    this._blurredCanvas = blurredCanvas;

    this._captureBackdrop(
      shape,
      currentCanvas.getPixelRatio(),
      nativeCanvas,
      captureCanvas,
      captureRect,
    );
    this._blurBackdrop(captureCanvas, blurredCanvas, deviceScale);
    this._drawMaskedBackdrop(context, blurredCanvas, captureRect);
  }

  private _captureBackdrop(
    shape: Konva.Shape,
    currentPixelRatio: number,
    currentCanvas: HTMLCanvasElement,
    destinationCanvas: HTMLCanvasElement,
    captureRect: DeviceRect,
  ): void {
    const destinationContext = this._getContext(destinationCanvas);
    const currentLayer = shape.getLayer();
    const stage = shape.getStage();

    destinationContext.clearRect(
      0,
      0,
      destinationCanvas.width,
      destinationCanvas.height,
    );

    if (
      stage &&
      currentLayer &&
      currentLayer.getCanvas()._canvas === currentCanvas
    ) {
      for (const layer of stage.getLayers()) {
        if (layer === currentLayer) {
          break;
        }

        if (!layer.isVisible()) {
          continue;
        }

        const layerCanvas = layer.getCanvas();
        const layerPixelRatio = layerCanvas.getPixelRatio();
        const ratio = layerPixelRatio / currentPixelRatio;

        this._drawCanvasRegion(
          destinationContext,
          layerCanvas._canvas,
          captureRect.x * ratio,
          captureRect.y * ratio,
          captureRect.width * ratio,
          captureRect.height * ratio,
          captureRect.width,
          captureRect.height,
        );
      }
    }

    this._drawCanvasRegion(
      destinationContext,
      currentCanvas,
      captureRect.x,
      captureRect.y,
      captureRect.width,
      captureRect.height,
      captureRect.width,
      captureRect.height,
    );
  }

  private _blurBackdrop(
    sourceCanvas: HTMLCanvasElement,
    destinationCanvas: HTMLCanvasElement,
    deviceScale: number,
  ): void {
    const context = this._getContext(destinationCanvas);

    context.clearRect(0, 0, destinationCanvas.width, destinationCanvas.height);
    context.save();
    context.filter = this._blurValues
      .map((blur) => `blur(${blur * deviceScale}px)`)
      .join(" ");
    context.drawImage(sourceCanvas, 0, 0);
    context.restore();
  }

  private _drawMaskedBackdrop(
    context: Konva.Context,
    blurredCanvas: HTMLCanvasElement,
    captureRect: DeviceRect,
  ): void {
    context.save();
    context.beginPath();
    this._appendPath(context, this._commands);
    context.clip("evenodd");

    context._context.setTransform(1, 0, 0, 1, 0, 0);
    context._context.filter = "none";
    context._context.drawImage(blurredCanvas, captureRect.x, captureRect.y);
    context.restore();
  }

  private _getCaptureRect(
    bounds: Rect,
    transform: DOMMatrix,
    padding: number,
    canvasWidth: number,
    canvasHeight: number,
  ): DeviceRect | null {
    const x1 = bounds.x;
    const y1 = bounds.y;
    const x2 = bounds.x + bounds.width;
    const y2 = bounds.y + bounds.height;
    const corners = [
      this._transformPoint(transform, x1, y1),
      this._transformPoint(transform, x2, y1),
      this._transformPoint(transform, x2, y2),
      this._transformPoint(transform, x1, y2),
    ];
    const minX = Math.max(
      0,
      Math.floor(Math.min(...corners.map((point) => point.x)) - padding),
    );
    const minY = Math.max(
      0,
      Math.floor(Math.min(...corners.map((point) => point.y)) - padding),
    );
    const maxX = Math.min(
      canvasWidth,
      Math.ceil(Math.max(...corners.map((point) => point.x)) + padding),
    );
    const maxY = Math.min(
      canvasHeight,
      Math.ceil(Math.max(...corners.map((point) => point.y)) + padding),
    );

    if (maxX <= minX || maxY <= minY) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private _transformPoint(
    transform: DOMMatrix,
    x: number,
    y: number,
  ): { x: number; y: number } {
    return {
      x: transform.a * x + transform.c * y + transform.e,
      y: transform.b * x + transform.d * y + transform.f,
    };
  }

  private _getDeviceScale(transform: DOMMatrix): number {
    return Math.max(
      Number.EPSILON,
      Math.hypot(transform.a, transform.b),
      Math.hypot(transform.c, transform.d),
    );
  }

  private _drawCanvasRegion(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    destinationWidth: number,
    destinationHeight: number,
  ): void {
    const clippedX = Math.max(0, sourceX);
    const clippedY = Math.max(0, sourceY);
    const clippedMaxX = Math.min(canvas.width, sourceX + sourceWidth);
    const clippedMaxY = Math.min(canvas.height, sourceY + sourceHeight);

    if (clippedMaxX <= clippedX || clippedMaxY <= clippedY) {
      return;
    }

    const scaleX = destinationWidth / sourceWidth;
    const scaleY = destinationHeight / sourceHeight;

    context.drawImage(
      canvas,
      clippedX,
      clippedY,
      clippedMaxX - clippedX,
      clippedMaxY - clippedY,
      (clippedX - sourceX) * scaleX,
      (clippedY - sourceY) * scaleY,
      (clippedMaxX - clippedX) * scaleX,
      (clippedMaxY - clippedY) * scaleY,
    );
  }

  private _ensureCanvas(
    canvas: HTMLCanvasElement | null,
    width: number,
    height: number,
  ): HTMLCanvasElement {
    const nextCanvas = canvas ?? document.createElement("canvas");

    if (nextCanvas.width !== width) {
      nextCanvas.width = width;
    }

    if (nextCanvas.height !== height) {
      nextCanvas.height = height;
    }

    return nextCanvas;
  }

  private _getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    return context;
  }

  private _releaseCanvas(canvas: HTMLCanvasElement | null): void {
    if (!canvas) {
      return;
    }

    canvas.width = 0;
    canvas.height = 0;
  }
}
