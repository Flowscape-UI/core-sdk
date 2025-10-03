import type Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface CameraHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  zoomStep?: number; // multiplier for zoom (e.g., 1.1)
  panStep?: number; // pixels for arrows
  ignoreEditableTargets?: boolean;
  enableArrows?: boolean;
  enablePanning?: boolean;
  allowMiddleButtonPan?: boolean;
  allowRightButtonPan?: boolean;
  disableContextMenu?: boolean;
}

export class CameraHotkeysPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<Omit<CameraHotkeysOptions, 'target'>> & { target: EventTarget };

  private _attached = false;
  private _panning = false;
  private _last: { x: number; y: number } | null = null;
  private _prevCursor: string | null = null;
  private _prevStageDraggable?: boolean;

  constructor(options: CameraHotkeysOptions = {}) {
    super();
    const {
      target = globalThis as unknown as EventTarget,
      zoomStep = 1.1,
      panStep = 40,
      ignoreEditableTargets = true,
      enableArrows = true,
      enablePanning = true,
      allowMiddleButtonPan = true,
      allowRightButtonPan = true,
      disableContextMenu = true,
    } = options;

    this._options = {
      target,
      zoomStep,
      panStep,
      ignoreEditableTargets,
      enableArrows,
      enablePanning,
      allowMiddleButtonPan,
      allowRightButtonPan,
      disableContextMenu,
    };
  }

  public setOptions(patch: Partial<CameraHotkeysOptions>): void {
    const prevDisableCtx = this._options.disableContextMenu;
    this._options = { ...this._options, ...patch } as typeof this._options;

    if (this._attached && this._core) {
      // Synchronization of zoom/pan steps
      if (typeof patch.zoomStep === 'number') {
        this._core.camera.setZoomStep(this._options.zoomStep);
      }
      if (typeof patch.panStep === 'number') {
        this._core.camera.setPanStep(this._options.panStep);
      }

      // Context menu toggle on the fly
      if (
        typeof patch.disableContextMenu === 'boolean' &&
        patch.disableContextMenu !== prevDisableCtx
      ) {
        const container = this._core.stage.container();
        if (this._options.disableContextMenu) {
          container.addEventListener('contextmenu', this._onContextMenuDOM as EventListener);
        } else {
          container.removeEventListener('contextmenu', this._onContextMenuDOM as EventListener);
        }
      }
    }
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    const stage: Konva.Stage = this._core.stage;

    if (typeof this._options.zoomStep === 'number') {
      this._core.camera.setZoomStep(this._options.zoomStep);
    }
    if (typeof this._options.panStep === 'number') {
      this._core.camera.setPanStep(this._options.panStep);
    }

    // Disable standard scene dragging with left mouse button, save previous state
    this._prevStageDraggable = stage.draggable();
    stage.draggable(false);

    // DOM keydown remains on target, since Konva does not generate key events
    const t = this._options.target as EventTarget & {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.addEventListener('keydown', this._handleKeyDown as EventListener);

    // Konva mouse events with namespace .cameraHotkeys
    if (this._options.enablePanning) {
      stage.on('mousedown.cameraHotkeys', this._onMouseDownKonva);
      stage.on('mousemove.cameraHotkeys', this._onMouseMoveKonva);
      stage.on('mouseup.cameraHotkeys', this._onMouseUpKonva);
      stage.on('mouseleave.cameraHotkeys', this._onMouseLeaveKonva);
      if (this._options.disableContextMenu) {
        // Prevent context menu on container
        stage.container().addEventListener('contextmenu', this._onContextMenuDOM as EventListener);
      }
    }

    // Wheel: intercept on DOM level to prevent zooming when Shift is pressed
    stage.container().addEventListener(
      'wheel',
      this._onWheelDOM as EventListener,
      {
        passive: false as unknown as boolean,
        capture: true as unknown as boolean,
      } as AddEventListenerOptions,
    );

    // Konva reserve protection: suppress wheel when ctrl is not pressed
    stage.on('wheel.cameraHotkeysGuard', (e: Konva.KonvaEventObject<WheelEvent>) => {
      if (!e.evt.ctrlKey) {
        e.evt.preventDefault();
        e.cancelBubble = true;
      }
    });

    this._attached = true;
  }

  protected onDetach(core: CoreEngine): void {
    if (!this._attached) return;

    const t = this._options.target as EventTarget & {
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.removeEventListener('keydown', this._handleKeyDown as EventListener);

    const stage = core.stage;
    stage.off('.cameraHotkeys');
    stage.off('.cameraHotkeysGuard');
    // снять DOM wheel/ctxmenu
    stage.container().removeEventListener('wheel', this._onWheelDOM as EventListener);
    if (this._options.enablePanning) {
      stage.container().removeEventListener('contextmenu', this._onContextMenuDOM as EventListener);
    }

    // Restore previous draggable state
    if (this._prevStageDraggable !== undefined) {
      stage.draggable(this._prevStageDraggable);
    }

    this._attached = false;
    this._last = null;
    this._prevCursor = null;
  }

  // ===================== Handlers (DOM wheel) =====================
  private _onWheelDOM = (e: WheelEvent) => {
    if (!this._core) return;

    // Zoom only when Ctrl is pressed. Meta is not considered.
    const isCtrlZoom = e.ctrlKey;
    if (isCtrlZoom) return;

    // Otherwise, pan according to rules and fully suppress the event
    e.preventDefault();
    // Stop event bubbling and immediate processing by other listeners (including Konva)
    e.stopPropagation();
    (e as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

    const { deltaX, deltaY, shiftKey } = e;

    if (this._isTouchpadWheel(e)) {
      // Touchpad: free panning
      if (shiftKey) {
        // With Shift held down, we use the dominant component (horizontal or vertical)
        // and project it onto the X axis (movement only along X). This allows swiping
        // both left/right and up/down for X movement.
        const primary = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
        const dx = -primary;
        this._pan(dx, 0);
      } else {
        // Without Shift, free panning along both axes
        const dx = -deltaX;
        const dy = -deltaY;
        this._pan(dx, dy);
      }
      return;
    }

    // Mouse: without Shift — Y axis; with Shift — X axis (up => left, down => right)
    if (shiftKey) {
      const dx = deltaY < 0 ? -Math.abs(deltaY) : Math.abs(deltaY);
      this._pan(dx, 0);
    } else {
      const dy = -deltaY;
      this._pan(0, dy);
    }
  };

  // ===================== Handlers (Konva) =====================
  private _onMouseDownKonva = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core || !this._options.enablePanning) return;
    const btn = e.evt.button;
    // Allow panning only for middle (1) and right (2) buttons. Left button is ignored.
    const allow =
      (this._options.allowMiddleButtonPan && btn === 1) ||
      (this._options.allowRightButtonPan && btn === 2);
    if (!allow) return;

    this._panning = true;
    const p = this._core.stage.getPointerPosition();
    if (p) this._last = { x: p.x, y: p.y };

    const container = this._core.stage.container();
    this._prevCursor = container.style.cursor || null;
    container.style.cursor = 'grabbing';

    e.evt.preventDefault();
  };

  private _onMouseMoveKonva = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._core || !this._options.enablePanning) return;
    if (!this._panning || !this._last) return;
    const p = this._core.stage.getPointerPosition();
    if (!p) return;
    const dx = p.x - this._last.x;
    const dy = p.y - this._last.y;
    this._pan(dx, dy);
    this._last = { x: p.x, y: p.y };
  };

  private _onMouseUpKonva = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._options.enablePanning) return;
    this._panning = false;
    this._last = null;
    if (!this._core) return;
    const container = this._core.stage.container();
    if (this._prevCursor !== null) {
      container.style.cursor = this._prevCursor;
      this._prevCursor = null;
    } else {
      container.style.removeProperty('cursor');
    }
  };

  private _onMouseLeaveKonva = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this._options.enablePanning) return;
    this._panning = false;
    this._last = null;
    if (!this._core) return;
    const container = this._core.stage.container();
    if (this._prevCursor !== null) {
      container.style.cursor = this._prevCursor;
      this._prevCursor = null;
    } else {
      container.style.removeProperty('cursor');
    }
  };

  private _onContextMenuDOM = (e: MouseEvent) => {
    if (this._options.disableContextMenu) e.preventDefault();
  };

  // ===================== Handlers (DOM keydown) =====================
  private _handleKeyDown = (e: KeyboardEvent) => {
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) return;
    if (!this._core) return;

    // +/- zoom through CameraManager (using zoomStep from camera)
    const isPlus = e.code === 'Equal' || e.code === 'NumpadAdd';
    const isMinus = e.code === 'Minus' || e.code === 'NumpadSubtract';
    if (isPlus || isMinus) {
      e.preventDefault();
      if (isPlus) this._core.camera.zoomIn();
      else this._core.camera.zoomOut();
      return;
    }

    // Arrows — panning by fixed step
    if (this._options.enableArrows) {
      const step = this._core.camera.panStep;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this._pan(step, 0);
          return;
        case 'ArrowRight':
          e.preventDefault();
          this._pan(-step, 0);
          return;
        case 'ArrowUp':
          e.preventDefault();
          this._pan(0, step);
          return;
        case 'ArrowDown':
          e.preventDefault();
          this._pan(0, -step);
          return;
      }
    }
  };

  // ===================== Utils =====================
  private _isEditableTarget(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private _isTouchpadWheel(e: WheelEvent): boolean {
    // Simple heuristics: pixel mode (deltaMode === 0) and presence of horizontal delta
    // or small deltaY values indicate touchpad
    const isPixel = e.deltaMode === 0;
    return isPixel && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 50);
  }

  private _pan(dx: number, dy: number) {
    if (!this._core) return;
    // Pan the world, not the stage, to keep grid and content in the same coordinate system
    const world = this._core.nodes.world;
    const newX = world.x() + dx;
    const newY = world.y() + dy;
    world.position({ x: newX, y: newY });
    // Emit camera pan event
    this._core.eventBus.emit('camera:pan', { dx, dy, position: { x: newX, y: newY } });
    this._core.stage.batchDraw();
  }
}
