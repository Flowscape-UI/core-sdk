import Konva from 'konva';

import { NodeManager } from '../managers/NodeManager';
import { EventBus } from '../utils/EventBus';
import { CameraManager } from '../managers/CameraManager';
import { Plugins } from '../plugins/Plugins';
import { Plugin } from '../plugins/Plugin';
import type { CoreEvents } from '../types/core.events.interface';

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

  public readonly container: HTMLDivElement;
  public readonly nodes: NodeManager;
  public readonly camera: CameraManager;
  public readonly plugins: Plugins;

  constructor(options: CoreEngineOptions) {
    this.container = options.container;
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
    // Слой для сетки (не трансформируется камерой)
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
    this.plugins = new Plugins(this, options.plugins ?? []);
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
  }

  public setBackgroundColor(color: string) {
    this.container.style.background = color;
  }

  public setDraggable(draggable: boolean) {
    this._stage.draggable(draggable);
    this._draggable = draggable;
  }
}
