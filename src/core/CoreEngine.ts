import Konva from 'konva';

import { CameraManager } from '../managers/CameraManager';
import { NodeManager } from '../managers/NodeManager';
import { VirtualizationManager } from '../managers/VirtualizationManager';
import { Plugin } from '../plugins/Plugin';
import { Plugins } from '../plugins/Plugins';
import type { CoreEvents } from '../types/core.events.interface';
import { EventBus } from '../utils/EventBus';

export interface CoreEngineOptions {
  container: HTMLDivElement;
  width?: number;
  height?: number;
  autoResize?: boolean;
  backgroundColor?: string;
  draggable?: boolean;
  plugins?: Plugin[];
  minScale?: number;
  maxScale?: number;
  virtualization?: {
    enabled?: boolean;
    bufferZone?: number;
    throttleMs?: number;
  };
}

export class CoreEngine {
  private _stage: Konva.Stage;
  private _eventBus: EventBus<CoreEvents>;
  private _initialWidth: number;
  private _initialHeight: number;
  private _autoResize: boolean;
  private _backgroundColor: string;
  private _draggable: boolean;
  private _minScale: number;
  private _maxScale: number;
  private _gridLayer: Konva.Layer;
  private _resizeObserver: ResizeObserver | null = null;

  public readonly container: HTMLDivElement;
  public readonly nodes: NodeManager;
  public readonly camera: CameraManager;
  public readonly virtualization: VirtualizationManager;
  public readonly plugins: Plugins;

  constructor(options: CoreEngineOptions) {
    this.container = options.container;
    // Hide container initially to prevent flicker
    this.container.style.visibility = 'hidden';
    this._initialWidth = options.width ?? 800;
    this._initialHeight = options.height ?? 800;
    this._autoResize = options.autoResize ?? true;
    this._backgroundColor = options.backgroundColor ?? '#1e1e1e';
    this._draggable = options.draggable ?? true;
    this._minScale = options.minScale ?? 0.1;
    this._maxScale = options.maxScale ?? 500;
    this._stage = new Konva.Stage({
      container: this.container,
      width: this._autoResize ? this.container.offsetWidth : this._initialWidth,
      height: this._autoResize ? this.container.offsetHeight : this._initialHeight,
      draggable: false,
    });
    if (!this._autoResize) {
      this.container.style.width = `${String(this._initialWidth)}px`;
      this.container.style.height = `${String(this._initialHeight)}px`;
    }
    this.container.style.background = this._backgroundColor;
    this._eventBus = new EventBus<CoreEvents>();
    // Layer for grid (not transformed by camera)
    this._gridLayer = new Konva.Layer({ listening: false });
    this._stage.add(this._gridLayer);

    this.nodes = new NodeManager(this._stage, this._eventBus);
    this.camera = new CameraManager({
      stage: this._stage,
      target: this.nodes.world,
      eventBus: this._eventBus,
      initialScale: 1,
      draggable: false,
      minScale: this._minScale,
      maxScale: this._maxScale,
    });
    this.virtualization = new VirtualizationManager(
      this._stage,
      this.nodes.world,
      this.nodes,
      options.virtualization,
    );

    // Initialize the plugin manager before actually attaching plugins,
    // so that core.plugins already exists inside plugin and addon onAttach methods.
    this.plugins = new Plugins(this);
    if (options.plugins?.length) {
      this.plugins.addPlugins(options.plugins);
    }

    // Setup auto-resize if enabled
    if (this._autoResize) {
      this._setupAutoResize();
    }
  }

  /**
   * Setup automatic canvas resize when container size changes
   */
  private _setupAutoResize() {
    // Use ResizeObserver for better performance and accuracy
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        this._handleResize();
      });
      this._resizeObserver.observe(this.container);
    } else {
      // Fallback to window resize event for older browsers
      globalThis.addEventListener('resize', this._handleResize);
    }
  }

  /**
   * Handle container resize
   */
  private _handleResize = () => {
    if (!this._autoResize) return;

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    // Only update if size actually changed
    if (width !== this._stage.width() || height !== this._stage.height()) {
      this.setSize({ width, height });
    }
  };

  /**
   * Cleanup resources
   */
  public destroy() {
    // Cleanup resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    } else {
      globalThis.removeEventListener('resize', this._handleResize);
    }

    // Destroy stage
    this._stage.destroy();
  }

  public get eventBus(): EventBus<CoreEvents> {
    return this._eventBus;
  }

  public get stage(): Konva.Stage {
    return this._stage;
  }

  public get gridLayer(): Konva.Layer {
    return this._gridLayer;
  }

  public get draggable(): boolean {
    return this._draggable;
  }

  public get autoResize(): boolean {
    return this._autoResize;
  }

  public get backgroundColor(): string {
    return this._backgroundColor;
  }

  public get initialWidth(): number {
    return this._initialWidth;
  }

  public get initialHeight(): number {
    return this._initialHeight;
  }

  public get minScale(): number {
    return this._minScale;
  }

  public get maxScale(): number {
    return this._maxScale;
  }

  public setSize({ width, height }: { width: number; height: number }) {
    this._stage.size({ width, height });
    // Notify plugins that rely on stage resize events
    this._stage.fire('resize');
    // Emit typed event for external subscribers
    this._eventBus.emit('stage:resized', { width, height });
  }

  public setBackgroundColor(color: string) {
    this.container.style.background = color;
  }

  public setDraggable(draggable: boolean) {
    this._stage.draggable(draggable);
    this._draggable = draggable;
  }

  /**
   * Enable or disable auto-resize
   */
  public setAutoResize(enabled: boolean) {
    if (this._autoResize === enabled) return;

    this._autoResize = enabled;

    if (enabled) {
      this._setupAutoResize();
      // Trigger immediate resize
      this._handleResize();
    } else {
      // Cleanup resize observer
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      } else {
        globalThis.removeEventListener('resize', this._handleResize);
      }
    }
  }

  /**
   * Show the canvas container after persistence restore completes
   */
  public showContainer() {
    this.container.style.visibility = 'visible';
  }
}
