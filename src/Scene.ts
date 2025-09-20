import Konva from 'konva';

import type { Plugin } from './plugins/Plugin';

export interface CanvasOptions {
  container: HTMLDivElement | string;
  width?: number;
  height?: number;
  autoResize?: boolean;
  backgroundColor?: string;
}

export class Scene extends Konva.Stage {
  private _rootLayer: Konva.Layer;
  private _world: Konva.Group;
  private _gridLayer: Konva.Layer;
  private _containerEl: HTMLDivElement;
  private _resizeObserver?: ResizeObserver;
  private _removeWindowResizeListener?: () => void;
  private _plugins: Plugin[] = [];

  constructor(_options: CanvasOptions) {
    const {
      container,
      width,
      height,
      autoResize = true,
      backgroundColor = 'transparent',
    } = _options;

    const containerEl =
      typeof container === 'string'
        ? (globalThis.document.getElementById(container) as HTMLDivElement | null)
        : container;
    if (!containerEl) {
      throw new Error('Canvas: container element not found');
    }
    const g = globalThis as unknown as {
      innerWidth?: number;
      innerHeight?: number;
    };
    const initialWidth =
      width ?? (containerEl.clientWidth || (typeof g.innerWidth === 'number' ? g.innerWidth : 0));
    const initialHeight =
      height ??
      (containerEl.clientHeight || (typeof g.innerHeight === 'number' ? g.innerHeight : 0));
    super({ container: containerEl, width: initialWidth, height: initialHeight });

    this._containerEl = containerEl;
    if (backgroundColor) {
      this._containerEl.style.background = backgroundColor;
    }

    // Prepare content layer + world group (affected by camera transforms)
    this._rootLayer = new Konva.Layer();
    this._world = new Konva.Group();
    this._rootLayer.add(this._world);

    // Grid layer (not affected by world transforms). Add first to be behind content.
    this._gridLayer = new Konva.Layer({ listening: false });
    this.add(this._gridLayer);

    // Now add content layer above grid so grid remains behind
    this.add(this._rootLayer);

    if (autoResize) {
      this._observeResize();
    }
  }

  public getRootLayer(): Konva.Layer {
    return this._rootLayer;
  }

  public getWorld(): Konva.Group {
    return this._world;
  }

  public getGridLayer(): Konva.Layer {
    return this._gridLayer;
  }

  public resize(width: number, height: number): void {
    this.size({ width, height });
    this.batchDraw();
  }

  public override destroy(): this {
    for (let i = this._plugins.length - 1; i >= 0; i--) {
      this._plugins[i]?.onDetach(this);
    }
    this._plugins = [];
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._removeWindowResizeListener) this._removeWindowResizeListener();
    return super.destroy();
  }

  public addPlugins(plugins: Plugin[]): void {
    plugins.forEach((p) => {
      this._plugins.push(p);
      p.onAttach(this);
    });
  }

  private _observeResize(): void {
    const applySize = () => {
      const w = this._getContainerWidth();
      const h = this._getContainerHeight();
      this.resize(w, h);
    };

    const g = globalThis as unknown as {
      ResizeObserver?: typeof ResizeObserver;
      addEventListener: typeof globalThis.addEventListener;
      removeEventListener: typeof globalThis.removeEventListener;
      innerWidth?: number;
      innerHeight?: number;
    };
    if (typeof g.ResizeObserver !== 'undefined') {
      this._resizeObserver = new g.ResizeObserver(() => {
        applySize();
      });
      this._resizeObserver.observe(this._containerEl);
    } else if (typeof g.addEventListener === 'function') {
      g.addEventListener('resize', applySize as EventListener, { passive: true });
      this._removeWindowResizeListener = () => {
        g.removeEventListener('resize', applySize as EventListener);
      };
    }
  }

  private _getContainerWidth(): number {
    const g = globalThis as unknown as { innerWidth?: number };
    return this._containerEl.clientWidth || (typeof g.innerWidth === 'number' ? g.innerWidth : 0);
  }

  private _getContainerHeight(): number {
    const g = globalThis as unknown as { innerHeight?: number };
    return (
      this._containerEl.clientHeight || (typeof g.innerHeight === 'number' ? g.innerHeight : 0)
    );
  }
}
