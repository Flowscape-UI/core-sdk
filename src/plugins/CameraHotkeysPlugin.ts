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

  private _onMouseDownDOM: ((e: MouseEvent) => void) | null = null;
  private _onMouseMoveDOM: ((e: MouseEvent) => void) | null = null;
  private _onMouseUpDOM: ((e: MouseEvent) => void) | null = null;
  private _onMouseLeaveDOM: ((e: MouseEvent) => void) | null = null;

  private _panningCursorRafId: number | null = null;

  private _onCameraPanEvent = (_payload: {
    dx: number;
    dy: number;
    position: { x: number; y: number };
  }) => {
    if (!this._core) return;
    if (!this._panning) return;
    this._applyPanningCursor();
  };

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

    // Panning
    if (this._options.enablePanning) {
      const container = stage.container();

      // Use DOM capture listeners so panning starts reliably even when events are stopped by other Konva handlers.
      this._onMouseDownDOM = (e: MouseEvent) => {
        if (!this._core || !this._options.enablePanning) return;
        const btn = e.button;
        const allow =
          (this._options.allowMiddleButtonPan && btn === 1) ||
          (this._options.allowRightButtonPan && btn === 2);
        if (!allow) return;

        this._panning = true;

        // Make Konva pointer position consistent with the DOM event.
        this._core.stage.setPointersPositions(e);
        const p = this._core.stage.getPointerPosition();
        if (p) this._last = { x: p.x, y: p.y };

        this._applyPanningCursor();
        this._startPanningCursorLoop();
        this._core.eventBus.emit('camera:panStart', { button: btn });

        e.preventDefault();
      };

      this._onMouseMoveDOM = (e: MouseEvent) => {
        if (!this._core || !this._options.enablePanning) return;
        if (!this._panning || !this._last) return;

        this._applyPanningCursor();

        this._core.stage.setPointersPositions(e);
        const p = this._core.stage.getPointerPosition();
        if (!p) return;

        const dx = p.x - this._last.x;
        const dy = p.y - this._last.y;
        this._pan(dx, dy);
        this._last = { x: p.x, y: p.y };

        e.preventDefault();
      };

      this._onMouseUpDOM = (_e: MouseEvent) => {
        if (!this._options.enablePanning) return;
        if (!this._panning) return;
        this._panning = false;
        this._last = null;
        this._stopPanningCursorLoop();
        this._restoreCursor();
        if (this._core) this._core.eventBus.emit('camera:panEnd');
      };

      this._onMouseLeaveDOM = (_e: MouseEvent) => {
        if (!this._options.enablePanning) return;
        if (!this._panning) return;
        this._panning = false;
        this._last = null;
        this._stopPanningCursorLoop();
        this._restoreCursor();
        if (this._core) this._core.eventBus.emit('camera:panEnd');
      };

      container.addEventListener('mousedown', this._onMouseDownDOM, {
        capture: true,
      } as AddEventListenerOptions);
      container.addEventListener('mousemove', this._onMouseMoveDOM, {
        capture: true,
      } as AddEventListenerOptions);
      container.addEventListener('mouseup', this._onMouseUpDOM, {
        capture: true,
      } as AddEventListenerOptions);
      container.addEventListener('mouseleave', this._onMouseLeaveDOM, {
        capture: true,
      } as AddEventListenerOptions);

      if (this._options.disableContextMenu) {
        // Prevent context menu on container
        container.addEventListener('contextmenu', this._onContextMenuDOM as EventListener);
      }

      // Keep grab cursor during panning even if other plugins temporarily override it.
      this._core.eventBus.on('camera:pan', this._onCameraPanEvent);
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

    this._stopPanningCursorLoop();

    const t = this._options.target as EventTarget & {
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.removeEventListener('keydown', this._handleKeyDown as EventListener);

    const stage = core.stage;
    stage.off('.cameraHotkeysGuard');
    // Remove DOM wheel/ctxmenu listeners
    stage.container().removeEventListener('wheel', this._onWheelDOM as EventListener);
    if (this._options.enablePanning) {
      const container = stage.container();
      container.removeEventListener('contextmenu', this._onContextMenuDOM as EventListener);

      if (this._onMouseDownDOM) container.removeEventListener('mousedown', this._onMouseDownDOM);
      if (this._onMouseMoveDOM) container.removeEventListener('mousemove', this._onMouseMoveDOM);
      if (this._onMouseUpDOM) container.removeEventListener('mouseup', this._onMouseUpDOM);
      if (this._onMouseLeaveDOM) container.removeEventListener('mouseleave', this._onMouseLeaveDOM);
      this._onMouseDownDOM = null;
      this._onMouseMoveDOM = null;
      this._onMouseUpDOM = null;
      this._onMouseLeaveDOM = null;

      core.eventBus.off('camera:pan', this._onCameraPanEvent);
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

  private _applyPanningCursor(): void {
    if (!this._core) return;
    const container = this._core.stage.container();
    this._prevCursor ??= container.style.cursor || null;
    container.style.cursor = 'grabbing';
  }

  private _startPanningCursorLoop(): void {
    if (this._panningCursorRafId != null) return;
    const tick = () => {
      this._panningCursorRafId = null;
      if (!this._panning || !this._core) return;
      this._applyPanningCursor();
      this._panningCursorRafId = globalThis.requestAnimationFrame(tick);
    };
    this._panningCursorRafId = globalThis.requestAnimationFrame(tick);
  }

  private _stopPanningCursorLoop(): void {
    if (this._panningCursorRafId == null) return;
    globalThis.cancelAnimationFrame(this._panningCursorRafId);
    this._panningCursorRafId = null;
  }

  private _restoreCursor(): void {
    if (!this._core) return;
    const container = this._core.stage.container();
    if (this._prevCursor !== null) {
      container.style.cursor = this._prevCursor;
      this._prevCursor = null;
    } else {
      container.style.removeProperty('cursor');
    }
  }

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
