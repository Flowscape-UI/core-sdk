import Konva from 'konva';

import { Camera } from '../Camera';
import type { Scene } from '../Scene';

import type { Plugin } from './Plugin';

export interface CameraHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  zoomStep?: number;
  preventDefault?: boolean;
  ignoreEditableTargets?: boolean;
  enablePlusMinus?: boolean;
  enableWheel?: boolean;
  wheelStep?: number;
  invertWheel?: boolean;
  wheelPreventDefault?: boolean;
  requireCtrlForWheel?: boolean;
  treatMetaAsCtrl?: boolean;
  wheelPanWhenNoCtrl?: boolean;
  panStep?: number;
  touchpadEnabled?: boolean;
  touchpadPanScale?: number;
  touchpadZoomStep?: number;
  enablePanning?: boolean;
  allowMiddleButtonPan?: boolean;
  allowRightButtonPan?: boolean;
  allowShiftLeftButtonPan?: boolean;
  preventContextMenu?: boolean;
  enableArrows?: boolean;
}

export class CameraHotkeysPlugin implements Plugin {
  private _camera: Camera;
  private _options: Required<Omit<CameraHotkeysOptions, 'target'>> & { target: EventTarget };
  private _handleKeyDown!: (e: KeyboardEvent) => void;
  private _handleWheel!: (e: WheelEvent) => void;
  private _handleMouseDown!: (e: MouseEvent) => void;
  private _handleMouseMove!: (e: MouseEvent) => void;
  private _handleMouseUp!: (e: MouseEvent) => void;
  private _handleMouseLeave!: (e: MouseEvent) => void;
  private _handleContextMenu!: (e: MouseEvent) => void;
  private _attached = false;
  private _panning = false;
  private _last: { x: number; y: number } | null = null;
  private _pointerTarget!: HTMLElement;
  private _prevCursor: string | null = null;

  constructor(camera: Camera, options: CameraHotkeysOptions = {}) {
    this._camera = camera;
    const {
      target = globalThis as unknown as EventTarget,
      zoomStep = 1.1,
      preventDefault = true,
      ignoreEditableTargets = true,
      enablePlusMinus = true,
      enableWheel = true,
      wheelStep = 1.05,
      invertWheel = true,
      wheelPreventDefault = true,
      requireCtrlForWheel = false,
      treatMetaAsCtrl = true,
      wheelPanWhenNoCtrl = true,
      panStep = 40,
      enablePanning = true,
      allowMiddleButtonPan = true,
      allowRightButtonPan = true,
      allowShiftLeftButtonPan = true,
      preventContextMenu = true,
      enableArrows = false,
      touchpadEnabled = true,
      touchpadPanScale = 1,
      touchpadZoomStep = 1.05,
    } = options;
    this._options = {
      target,
      zoomStep,
      preventDefault,
      ignoreEditableTargets,
      enablePlusMinus,
      enableWheel,
      wheelStep,
      invertWheel,
      wheelPreventDefault,
      requireCtrlForWheel,
      treatMetaAsCtrl,
      wheelPanWhenNoCtrl,
      panStep,
      enablePanning,
      allowMiddleButtonPan,
      allowRightButtonPan,
      allowShiftLeftButtonPan,
      preventContextMenu,
      enableArrows,
      touchpadEnabled,
      touchpadPanScale,
      touchpadZoomStep,
    };

    this._handleKeyDown = (e: KeyboardEvent) => {
      if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) return;

      if (this._options.enablePlusMinus) {
        const isPlus = e.code === 'Equal' || e.code === 'NumpadAdd';
        const isMinus = e.code === 'Minus' || e.code === 'NumpadSubtract';
        if (isPlus || isMinus) {
          if (this._options.preventDefault) e.preventDefault();
          const factor = this._options.zoomStep;
          this._camera.translate(0, 0, isPlus ? factor : 1 / factor);
          return;
        }
      }

      if (this._options.enableArrows) {
        const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;
        if (arrows.includes(e.key as (typeof arrows)[number])) {
          if (this._options.preventDefault) e.preventDefault();
          const step = this._options.panStep;
          switch (e.key) {
            case 'ArrowLeft':
              this._camera.translate(step, 0);
              return;
            case 'ArrowRight':
              this._camera.translate(-step, 0);
              return;
            case 'ArrowUp':
              this._camera.translate(0, step);
              return;
            case 'ArrowDown':
              this._camera.translate(0, -step);
              return;
          }
        }
      }
    };

    this._handleWheel = (e: WheelEvent) => {
      if (!this._options.enableWheel) return;
      const hasZoomModifier =
        e.ctrlKey ||
        (this._options.treatMetaAsCtrl && (e as unknown as { metaKey?: boolean }).metaKey === true);

      const isTouchpad =
        this._options.touchpadEnabled &&
        e.deltaMode === 0 &&
        (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 40);

      if (this._options.requireCtrlForWheel && !hasZoomModifier) {
        if (!this._options.wheelPanWhenNoCtrl) return;
        if (this._options.wheelPreventDefault) e.preventDefault();
        if (isTouchpad) {
          const scale = this._options.touchpadPanScale;
          if (e.shiftKey) {
            const primary = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY;
            const dx = -primary * scale;
            this._camera.translate(dx, 0);
          } else {
            const dx = -e.deltaX * scale;
            const dy = -e.deltaY * scale;
            this._camera.translate(dx, dy);
          }
        } else {
          const panStep = this._options.panStep;
          if (e.shiftKey) {
            if (e.deltaY < 0) {
              this._camera.translate(panStep, 0);
            } else if (e.deltaY > 0) {
              this._camera.translate(-panStep, 0);
            }
          } else {
            if (e.deltaY < 0) {
              this._camera.translate(0, this._options.panStep);
            } else if (e.deltaY > 0) {
              this._camera.translate(0, -this._options.panStep);
            }
          }
        }
        return;
      }

      if (this._options.wheelPreventDefault) e.preventDefault();
      const step = isTouchpad ? this._options.touchpadZoomStep : this._options.wheelStep;
      const normal = e.deltaY > 0 ? step : 1 / step;
      const factor = this._options.invertWheel ? 1 / normal : normal;
      this._camera.translate(0, 0, factor);
    };

    this._handleMouseDown = (e: MouseEvent) => {
      if (!this._options.enablePanning) return;
      const allow =
        (this._options.allowMiddleButtonPan && e.button === 1) ||
        (this._options.allowRightButtonPan && e.button === 2) ||
        (this._options.allowShiftLeftButtonPan && e.button === 0 && e.shiftKey);
      if (!allow) return;
      this._panning = true;
      this._last = { x: e.clientX, y: e.clientY };
      this._prevCursor = this._pointerTarget.style.cursor || null;
      this._pointerTarget.style.cursor = 'grabbing';
    };

    this._handleMouseMove = (e: MouseEvent) => {
      if (!this._options.enablePanning) return;
      if (!this._panning || !this._last) return;
      this._camera.translate(e.clientX - this._last.x, e.clientY - this._last.y);
      this._last = { x: e.clientX, y: e.clientY };
    };

    this._handleMouseUp = () => {
      if (!this._options.enablePanning) return;
      this._panning = false;
      this._last = null;
      if (this._prevCursor !== null) {
        this._pointerTarget.style.cursor = this._prevCursor;
        this._prevCursor = null;
      } else {
        this._pointerTarget.style.removeProperty('cursor');
      }
    };

    this._handleMouseLeave = () => {
      if (!this._options.enablePanning) return;
      this._panning = false;
      this._last = null;
      if (this._prevCursor !== null) {
        this._pointerTarget.style.cursor = this._prevCursor;
        this._prevCursor = null;
      } else {
        this._pointerTarget.style.removeProperty('cursor');
      }
    };

    this._handleContextMenu = (e: MouseEvent) => {
      if (this._options.preventContextMenu) e.preventDefault();
    };
  }

  public attach(): void {
    if (this._attached) return;
    const t = this._options.target as EventTarget & {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.addEventListener('keydown', this._handleKeyDown as EventListener);

    const stage: Konva.Stage = this._camera.getStage();
    const container = stage.container();
    this._pointerTarget = container as unknown as HTMLElement;

    if (this._options.enableWheel) {
      this._pointerTarget.addEventListener(
        'wheel',
        this._handleWheel as EventListener,
        { passive: false as unknown as boolean } as AddEventListenerOptions,
      );
    }
    if (this._options.enablePanning) {
      this._pointerTarget.addEventListener('mousedown', this._handleMouseDown as EventListener);
      this._pointerTarget.addEventListener('mousemove', this._handleMouseMove as EventListener);
      this._pointerTarget.addEventListener('mouseup', this._handleMouseUp as EventListener);
      this._pointerTarget.addEventListener('mouseleave', this._handleMouseLeave as EventListener);
      if (this._options.preventContextMenu) {
        this._pointerTarget.addEventListener(
          'contextmenu',
          this._handleContextMenu as EventListener,
        );
      }
    }
    this._attached = true;
  }

  public detach(): void {
    if (!this._attached) return;
    const t = this._options.target as EventTarget & {
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.removeEventListener('keydown', this._handleKeyDown as EventListener);

    if (this._options.enableWheel) {
      this._pointerTarget.removeEventListener('wheel', this._handleWheel as EventListener);
    }
    if (this._options.enablePanning) {
      this._pointerTarget.removeEventListener('mousedown', this._handleMouseDown as EventListener);
      this._pointerTarget.removeEventListener('mousemove', this._handleMouseMove as EventListener);
      this._pointerTarget.removeEventListener('mouseup', this._handleMouseUp as EventListener);
      this._pointerTarget.removeEventListener(
        'mouseleave',
        this._handleMouseLeave as EventListener,
      );
      if (this._options.preventContextMenu) {
        this._pointerTarget.removeEventListener(
          'contextmenu',
          this._handleContextMenu as EventListener,
        );
      }
    }
    this._attached = false;
  }

  public onAttach(_arg: Scene | Camera): void {
    this.attach();
  }

  public onDetach(_arg: Scene | Camera): void {
    this.detach();
  }

  private _isEditableTarget(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }
}
