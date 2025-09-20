import Konva from 'konva';

export interface CanvasOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
  autoResize?: boolean;
  backgroundColor?: string;
}

export class Canvas {
  private stage: Konva.Stage;
  private rootLayer: Konva.Layer;
  private world: Konva.Group;
  private containerEl: HTMLDivElement;
  private resizeObserver?: ResizeObserver;
  private removeWindowResizeListener?: () => void;
  private options: Required<Omit<CanvasOptions, 'container'>>;

  constructor(_options: CanvasOptions) {
    const {
      container,
      width = window.innerWidth,
      height = window.innerHeight,
      autoResize = true,
      backgroundColor = 'transparent',
    } = _options;

    this.options = {
      width,
      height,
      autoResize,
      backgroundColor,
    };

    const containerEl =
      typeof container === 'string'
        ? (document.getElementById(container) as HTMLDivElement | null)
        : container;
    if (!containerEl) {
      throw new Error('Canvas: container element not found');
    }
    this.containerEl = containerEl;
    if (backgroundColor) {
      this.containerEl.style.background = backgroundColor;
    }

    this.stage = new Konva.Stage({
      container: this.containerEl,
      width: this._getContainerWidth(),
      height: this._getContainerHeight(),
    });

    this.rootLayer = new Konva.Layer();
    this.stage.add(this.rootLayer);

    // Infinite world container. All user content should be added to this group.
    this.world = new Konva.Group();
    this.rootLayer.add(this.world);

    if (autoResize) {
      this._observeResize();
    }
  }

  getStage(): Konva.Stage {
    return this.stage;
  }

  getLayer(): Konva.Layer {
    return this.rootLayer;
  }

  getWorld(): Konva.Group {
    return this.world;
  }

  resize(width: number, height: number) {
    this.stage.size({ width, height });
    this.stage.batchDraw();
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.removeWindowResizeListener) this.removeWindowResizeListener();
    this.stage.destroy();
  }

  private _observeResize() {
    const applySize = () => {
      const w = this._getContainerWidth();
      const h = this._getContainerHeight();
      this.resize(w, h);
    };

    const g = globalThis as unknown as { ResizeObserver?: typeof ResizeObserver; addEventListener: typeof addEventListener; removeEventListener: typeof removeEventListener };
    if (typeof g.ResizeObserver !== 'undefined') {
      this.resizeObserver = new g.ResizeObserver(() => applySize());
      this.resizeObserver.observe(this.containerEl);
    } else {
      g.addEventListener('resize', applySize as EventListener, { passive: true });
      this.removeWindowResizeListener = () => g.removeEventListener('resize', applySize as EventListener);
    }
  }

  private _getContainerWidth(): number {
    return this.containerEl.clientWidth || window.innerWidth;
  }

  private _getContainerHeight(): number {
    return this.containerEl.clientHeight || window.innerHeight;
  }
}

export default Canvas;


