import Konva from 'konva';

import { NodeManager } from '../managers/NodeManager';

export interface CoreEngineOptions {
  container: HTMLDivElement;
  width?: number;
  height?: number;
  autoResize?: boolean;
  backgroundColor?: string;
  draggable?: boolean;
}

export class CoreEngine {
  private _stage: Konva.Stage;
  private _backgroundLayer: Konva.Layer;
  private _backgroundRect: Konva.Rect;
  public container: HTMLDivElement;
  public initialWidth: number;
  public initialHeight: number;
  public autoResize: boolean;
  public backgroundColor: string;
  public draggable: boolean;
  public nodes: NodeManager;

  constructor(options: CoreEngineOptions) {
    this.container = options.container;
    this.initialWidth = options.width ?? 800;
    this.initialHeight = options.height ?? 800;
    this.autoResize = options.autoResize ?? true;
    this.backgroundColor = options.backgroundColor ?? '#1e1e1e';
    this.draggable = options.draggable ?? false;
    this._stage = new Konva.Stage({
      container: this.container,
      width: this.autoResize ? this.container.offsetWidth : this.initialWidth,
      height: this.autoResize ? this.container.offsetHeight : this.initialHeight,
      draggable: this.draggable,
    });

    this._backgroundLayer = new Konva.Layer({ listening: false });
    this._backgroundRect = new Konva.Rect({
      width: this._stage.width(),
      height: this._stage.height(),
      fill: this.backgroundColor,
    });
    this._backgroundLayer.add(this._backgroundRect);
    this._stage.add(this._backgroundLayer);
    this._backgroundLayer.moveToBottom();
    this.nodes = new NodeManager(this._stage);
    this._initInfiniteBackground();
  }

  public setSize({ width, height }: { width: number; height: number }) {
    this._stage.size({ width, height });
    this._updateBackgroundRect();
  }

  public setBackgroundColor(color: string) {
    this._backgroundRect.fill(color);
    this._backgroundLayer.batchDraw();
  }

  public setDraggable(draggable: boolean) {
    this._stage.draggable(draggable);
  }

  private _updateBackgroundRect() {
    this._backgroundRect.size({ width: this._stage.width(), height: this._stage.height() });
    this._backgroundLayer.batchDraw();
  }

  private _initInfiniteBackground() {
    this._stage.on('dragmove', () => {
      this._backgroundRect.absolutePosition({ x: 0, y: 0 });
    });
  }
}
