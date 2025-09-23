import Konva from 'konva';

import { EventBus } from '../utils/EventBus';

export interface CameraManagerOptions {
  stage: Konva.Stage;
  eventBus: EventBus;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  draggable?: boolean;
}

export class CameraManager {
  private _stage: Konva.Stage;
  private _eventBus: EventBus;
  private _scale: number;
  private _minScale: number;
  private _maxScale: number;

  constructor(options: CameraManagerOptions) {
    this._stage = options.stage;
    this._eventBus = options.eventBus;
    this._scale = options.initialScale ?? 1;
    this._minScale = options.minScale ?? 0.2;
    this._maxScale = options.maxScale ?? 5;
    this._stage.draggable(options.draggable);
    this._initWheelZoom();
  }

  private _initWheelZoom() {
    this._stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = this._stage.scaleX();
      const pointer = this._stage.getPointerPosition();
      if (!pointer) return;
      const scaleBy = 1.05;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(this._minScale, Math.min(this._maxScale, newScale));
      const mousePointTo = {
        x: (pointer.x - this._stage.x()) / oldScale,
        y: (pointer.y - this._stage.y()) / oldScale,
      };
      this._stage.scale({ x: newScale, y: newScale });
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      this._stage.position(newPos);
      this._stage.batchDraw();
      this._scale = newScale;
      this._eventBus.emit('camera:zoom', { scale: this._scale, position: newPos });
    });
  }

  public setZoom(zoom: number) {
    this._scale = Math.max(this._minScale, Math.min(this._maxScale, zoom));
    this._stage.scale({ x: this._scale, y: this._scale });
    this._stage.batchDraw();
    this._eventBus.emit('camera:setZoom', { scale: this._scale });
  }

  public zoomIn(step = 0.1) {
    this.setZoom(this._scale + step);
  }

  public zoomOut(step = 0.1) {
    this.setZoom(this._scale - step);
  }

  public reset() {
    this.setZoom(1);
    this._stage.position({ x: 0, y: 0 });
    this._stage.batchDraw();
    this._eventBus.emit('camera:reset');
  }

  public setDraggable(enabled: boolean) {
    this._stage.draggable(enabled);
  }
}
