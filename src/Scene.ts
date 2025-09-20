import Konva from 'konva';

export interface CanvasGridOptions {
  stepX?: number; // in world units
  stepY?: number; // in world units
  color?: string;
  lineWidth?: number;
  visible?: boolean;
  snap?: boolean; // snap nodes to grid on drag
}

export interface CanvasOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
  autoResize?: boolean;
  backgroundColor?: string;
  grid?: CanvasGridOptions; // default 1x1 px in world units
}

export class Scene extends Konva.Stage {
  private rootLayer: Konva.Layer;
  private world: Konva.Group;
  private gridLayer: Konva.Layer;
  private gridShape: Konva.Shape;
  private containerEl: HTMLDivElement;
  private resizeObserver?: ResizeObserver;
  private removeWindowResizeListener?: () => void;
  private grid: Required<CanvasGridOptions>;
  private _onDragMoveBound: (e: Konva.KonvaEventObject<MouseEvent>) => void;

  private _gridSceneFunc = (con: Konva.Context, _shape: Konva.Shape) => {
    if (!this.grid.visible) return;
    const stageW = this.width();
    const stageH = this.height();
    const scale = this.world ? this.world.scaleX() || 1 : 1;
    const pos = this.world ? this.world.position() : { x: 0, y: 0 };
    const stepX = Math.max(1, this.grid.stepX) * scale;
    const stepY = Math.max(1, this.grid.stepY) * scale;

    // Align grid with world transform so that world (0,0) aligns consistently
    const offsetX = ((pos.x % stepX) + stepX) % stepX;
    const offsetY = ((pos.y % stepY) + stepY) % stepY;

    con.beginPath();
    con.lineWidth = this.grid.lineWidth;
    con.strokeStyle = this.grid.color;

    // Vertical lines
    for (let x = offsetX; x <= stageW; x += stepX) {
      const px = this.grid.lineWidth % 2 ? Math.round(x) + 0.5 : Math.round(x);
      con.moveTo(px, 0);
      con.lineTo(px, stageH);
    }
    // Horizontal lines
    for (let y = offsetY; y <= stageH; y += stepY) {
      const py = this.grid.lineWidth % 2 ? Math.round(y) + 0.5 : Math.round(y);
      con.moveTo(0, py);
      con.lineTo(stageW, py);
    }
    con.stroke();
  };

  public constructor(_options: CanvasOptions) {
    const {
      container,
      width = window.innerWidth,
      height = window.innerHeight,
      autoResize = true,
      backgroundColor = 'transparent',
      grid = {},
    } = _options;

    const containerEl =
      typeof container === 'string'
        ? (document.getElementById(container) as HTMLDivElement | null)
        : container;
    if (!containerEl) {
      throw new Error('Canvas: container element not found');
    }
    super({ container: containerEl, width, height });

    this.containerEl = containerEl;
    if (backgroundColor) {
      this.containerEl.style.background = backgroundColor;
    }

    // Grid config defaults
    this.grid = {
      stepX: grid.stepX ?? 1,
      stepY: grid.stepY ?? 1,
      color: grid.color ?? '#2b313a',
      lineWidth: grid.lineWidth ?? 1,
      visible: grid.visible ?? true,
      snap: grid.snap ?? true,
    };

    // Prepare content layer + world group (affected by camera transforms)
    this.rootLayer = new Konva.Layer();
    this.world = new Konva.Group();
    this.rootLayer.add(this.world);

    // Grid layer (not affected by world transforms). Add first to be behind content.
    this.gridLayer = new Konva.Layer({ listening: false });
    this.gridShape = new Konva.Shape({ listening: false, sceneFunc: this._gridSceneFunc });
    this.gridLayer.add(this.gridShape);
    this.add(this.gridLayer);

    // Now add content layer above grid
    this.add(this.rootLayer);

    if (autoResize) {
      this._observeResize();
    }

    // Delegated drag snapping for all nodes inside the world
    this._onDragMoveBound = (e) => this._onDragMove(e);
    this.on('dragmove', this._onDragMoveBound);
  }

  public getRootLayer(): Konva.Layer {
    return this.rootLayer;
  }

  public getWorld(): Konva.Group {
    return this.world;
  }

  public setGrid(stepX: number, stepY: number): void {
    this.grid.stepX = Math.max(1, stepX);
    this.grid.stepY = Math.max(1, stepY);
    this.batchDraw();
  }

  public setGridVisible(visible: boolean): void {
    this.grid.visible = visible;
    this.batchDraw();
  }

  public setGridSnap(enabled: boolean): void {
    this.grid.snap = enabled;
  }

  public resize(width: number, height: number): void {
    this.size({ width, height });
    this.batchDraw();
  }

  public override destroy(): any {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.removeWindowResizeListener) this.removeWindowResizeListener();
    this.off('dragmove', this._onDragMoveBound);
    return super.destroy();
  }

  private _observeResize(): void {
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

  private _onDragMove(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this.grid.snap) return;
    const node = e.target as Konva.Node;
    // Ignore stage, layers, and the world container itself
    if (node === this || node === this.world || node instanceof Konva.Layer) return;
    if (!this._isInWorld(node)) return;
    if (!(node as any).draggable || (typeof (node as any).draggable === 'function' && !(node as any).draggable())) return;

    const abs = node.getAbsolutePosition();
    const sx = this.world ? (this.world.scaleX() || 1) : 1;
    const sy = this.world ? (this.world.scaleY() || 1) : 1;
    const wx = (abs.x - (this.world ? this.world.x() : 0)) / sx;
    const wy = (abs.y - (this.world ? this.world.y() : 0)) / sy;

    const snappedX = Math.round(wx / this.grid.stepX) * this.grid.stepX;
    const snappedY = Math.round(wy / this.grid.stepY) * this.grid.stepY;

    const snappedAbsX = snappedX * sx + (this.world ? this.world.x() : 0);
    const snappedAbsY = snappedY * sy + (this.world ? this.world.y() : 0);

    if (Math.abs(snappedAbsX - abs.x) > 0.001 || Math.abs(snappedAbsY - abs.y) > 0.001) {
      node.absolutePosition({ x: snappedAbsX, y: snappedAbsY });
    }
  }

  private _isInWorld(node: Konva.Node): boolean {
    let p: Konva.Node | null = node.getParent();
    while (p) {
      if (p === this.world) return true;
      p = p.getParent();
    }
    return false;
  }
}


