import type Konva from 'konva';

import type { Camera } from './Camera';

export interface CameraHotkeysOptions {
  // DOM target to attach key listeners to; default: globalThis (window in browser)
  target?: Window | Document | HTMLElement | EventTarget;
  // Base multiplicative zoom step per key press (e.g., 1.05)
  zoomStep?: number;
  // Prevent default browser behavior for handled keys
  preventDefault?: boolean;
  // Ignore events from editable elements (inputs, textareas, selects, contenteditable)
  ignoreEditableTargets?: boolean;
  // Enable/disable specific bindings
  enablePlusMinus?: boolean;

  // Mouse wheel zoom controls
  enableWheel?: boolean;
  // Wheel zoom step (multiplicative)
  wheelStep?: number;
  // Invert wheel direction (true: wheel down zooms in)
  invertWheel?: boolean;
  // Prevent default on wheel
  wheelPreventDefault?: boolean;
  // Require holding Ctrl (or Meta if enabled) to perform wheel zoom
  requireCtrlForWheel?: boolean;
  // Treat Meta (Cmd on macOS) as Ctrl for wheel zoom requirement
  treatMetaAsCtrl?: boolean;
  // When wheel zoom is disabled (e.g., Ctrl not held), perform panning with wheel
  wheelPanWhenNoCtrl?: boolean;
  // Base pan step (used for arrows and wheel-panning)
  panStep?: number;

  // Touchpad UX
  // Enable special handling for touchpads (smooth deltas, 2D pan via deltaX/Y)
  touchpadEnabled?: boolean;
  // Scale factor for touchpad pan deltas (pixels multiplier)
  touchpadPanScale?: number;
  // Zoom step for touchpad when modifier is held (separate from wheelStep)
  touchpadZoomStep?: number;

  // Mouse panning controls
  enablePanning?: boolean;
  // Allow middle button (1), right button (2), or Shift+Left for panning
  allowMiddleButtonPan?: boolean;
  allowRightButtonPan?: boolean;
  allowShiftLeftButtonPan?: boolean;
  // Prevent context menu on container to enable RMB panning
  preventContextMenu?: boolean;

  // Arrow keys panning
  enableArrows?: boolean;
}

/**
 * CameraHotkeys attaches keyboard listeners and controls Camera from the outside.
 * No event logic inside Camera itself.
 */
export class CameraHotkeys {
  private camera: Camera;
  private options: Required<Omit<CameraHotkeysOptions, 'target'>> & { target: EventTarget };
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleWheel: (e: WheelEvent) => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleMouseLeave: (e: MouseEvent) => void;
  private handleContextMenu: (e: MouseEvent) => void;
  private attached = false;
  private panning = false;
  private last: { x: number; y: number } | null = null;
  private pointerTarget!: HTMLElement;
  private prevCursor: string | null = null;

  constructor(camera: Camera, options: CameraHotkeysOptions = {}) {
    this.camera = camera;
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
    this.options = {
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

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (this.options.ignoreEditableTargets && this.isEditableTarget(e.target)) return;

      // Plus/Minus zoom controls
      if (this.options.enablePlusMinus) {
        const isPlus = e.code === 'Equal' || e.code === 'NumpadAdd';
        const isMinus = e.code === 'Minus' || e.code === 'NumpadSubtract';
        if (isPlus || isMinus) {
          if (this.options.preventDefault) e.preventDefault();
          const factor = this.options.zoomStep;
          this.camera.translate(0, 0, isPlus ? factor : 1 / factor);
          return;
        }
      }

      // Arrow keys pan controls
      if (this.options.enableArrows) {
        const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;
        if (arrows.includes(e.key as (typeof arrows)[number])) {
          if (this.options.preventDefault) e.preventDefault();
          const step = this.options.panStep;
          switch (e.key) {
            case 'ArrowLeft':
              this.camera.translate(step, 0);
              return;
            case 'ArrowRight':
              this.camera.translate(-step, 0);
              return;
            case 'ArrowUp':
              this.camera.translate(0, step);
              return;
            case 'ArrowDown':
              this.camera.translate(0, -step);
              return;
          }
        }
      }
    };

    // Wheel handler
    this.handleWheel = (e: WheelEvent) => {
      if (!this.options.enableWheel) return;
      const hasZoomModifier =
        e.ctrlKey ||
        (this.options.treatMetaAsCtrl && (e as unknown as { metaKey?: boolean }).metaKey === true);

      // Heuristic: touchpad typically reports pixel deltas (deltaMode === 0) with smooth small values and nonzero deltaX
      const isTouchpad =
        this.options.touchpadEnabled &&
        e.deltaMode === 0 &&
        (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 40);

      // If Ctrl/Cmd required and not held -> optionally pan instead of zoom
      if (this.options.requireCtrlForWheel && !hasZoomModifier) {
        if (!this.options.wheelPanWhenNoCtrl) return;
        if (this.options.wheelPreventDefault) e.preventDefault();
        if (isTouchpad) {
          // Touchpad pan: use smooth deltas. With Shift pressed, constrain to X only.
          const scale = this.options.touchpadPanScale;
          if (e.shiftKey) {
            // Prefer deltaX; if it's ~0, map deltaY horizontally to mimic mouse wheel + Shift UX
            const primary = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY;
            const dx = -primary * scale;
            this.camera.translate(dx, 0);
          } else {
            const dx = -e.deltaX * scale;
            const dy = -e.deltaY * scale;
            this.camera.translate(dx, dy);
          }
        } else {
          // Mouse wheel style: axis-by-axis using fixed step
          const panStep = this.options.panStep;
          if (e.shiftKey) {
            // Horizontal pan with Shift
            if (e.deltaY < 0) {
              // wheel up => move left
              this.camera.translate(panStep, 0);
            } else if (e.deltaY > 0) {
              // wheel down => move right
              this.camera.translate(-panStep, 0);
            }
          } else {
            // Vertical pan (match arrow keys behavior)
            if (e.deltaY < 0) {
              // wheel up => move up
              this.camera.translate(0, this.options.panStep);
            } else if (e.deltaY > 0) {
              // wheel down => move down
              this.camera.translate(0, -this.options.panStep);
            }
          }
        }
        return;
      }

      // Zoom path
      if (this.options.wheelPreventDefault) e.preventDefault();
      const step = isTouchpad ? this.options.touchpadZoomStep : this.options.wheelStep;
      const normal = e.deltaY > 0 ? step : 1 / step;
      const factor = this.options.invertWheel ? 1 / normal : normal;
      this.camera.translate(0, 0, factor);
    };

    // Panning handlers
    this.handleMouseDown = (e: MouseEvent) => {
      if (!this.options.enablePanning) return;
      const allow =
        (this.options.allowMiddleButtonPan && e.button === 1) ||
        (this.options.allowRightButtonPan && e.button === 2) ||
        (this.options.allowShiftLeftButtonPan && e.button === 0 && e.shiftKey);
      if (!allow) return;
      this.panning = true;
      this.last = { x: e.clientX, y: e.clientY };
      // set cursor while panning
      this.prevCursor = this.pointerTarget.style.cursor || null;
      this.pointerTarget.style.cursor = 'grabbing';
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!this.options.enablePanning) return;
      if (!this.panning || !this.last) return;
      this.camera.translate(e.clientX - this.last.x, e.clientY - this.last.y);
      this.last = { x: e.clientX, y: e.clientY };
    };

    this.handleMouseUp = () => {
      if (!this.options.enablePanning) return;
      this.panning = false;
      this.last = null;
      // restore cursor
      if (this.prevCursor !== null) {
        this.pointerTarget.style.cursor = this.prevCursor;
        this.prevCursor = null;
      } else {
        this.pointerTarget.style.removeProperty('cursor');
      }
    };

    this.handleMouseLeave = () => {
      if (!this.options.enablePanning) return;
      this.panning = false;
      this.last = null;
      // restore cursor
      if (this.prevCursor !== null) {
        this.pointerTarget.style.cursor = this.prevCursor;
        this.prevCursor = null;
      } else {
        this.pointerTarget.style.removeProperty('cursor');
      }
    };

    this.handleContextMenu = (e: MouseEvent) => {
      if (this.options.preventContextMenu) e.preventDefault();
    };

    this.attach();
  }

  public attach(): void {
    if (this.attached) return;
    const t = this.options.target as EventTarget & {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.addEventListener('keydown', this.handleKeyDown as EventListener);

    // Pointer target is stage container when available
    const stage: Konva.Stage = this.camera.getStage();
    const container = stage.container();
    this.pointerTarget = container as unknown as HTMLElement;

    if (this.options.enableWheel) {
      this.pointerTarget.addEventListener(
        'wheel',
        this.handleWheel as EventListener,
        { passive: false as unknown as boolean } as AddEventListenerOptions,
      );
    }
    if (this.options.enablePanning) {
      this.pointerTarget.addEventListener('mousedown', this.handleMouseDown as EventListener);
      this.pointerTarget.addEventListener('mousemove', this.handleMouseMove as EventListener);
      this.pointerTarget.addEventListener('mouseup', this.handleMouseUp as EventListener);
      this.pointerTarget.addEventListener('mouseleave', this.handleMouseLeave as EventListener);
      if (this.options.preventContextMenu) {
        this.pointerTarget.addEventListener('contextmenu', this.handleContextMenu as EventListener);
      }
    }
    this.attached = true;
  }

  public detach(): void {
    if (!this.attached) return;
    const t = this.options.target as EventTarget & {
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.removeEventListener('keydown', this.handleKeyDown as EventListener);

    if (this.options.enableWheel) {
      this.pointerTarget.removeEventListener('wheel', this.handleWheel as EventListener);
    }
    if (this.options.enablePanning) {
      this.pointerTarget.removeEventListener('mousedown', this.handleMouseDown as EventListener);
      this.pointerTarget.removeEventListener('mousemove', this.handleMouseMove as EventListener);
      this.pointerTarget.removeEventListener('mouseup', this.handleMouseUp as EventListener);
      this.pointerTarget.removeEventListener('mouseleave', this.handleMouseLeave as EventListener);
      if (this.options.preventContextMenu) {
        this.pointerTarget.removeEventListener(
          'contextmenu',
          this.handleContextMenu as EventListener,
        );
      }
    }
    this.attached = false;
  }

  private isEditableTarget(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }
}
