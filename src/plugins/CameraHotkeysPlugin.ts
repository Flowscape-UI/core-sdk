import type Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface CameraHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  zoomStep?: number; // мультипликатор масштаба (например, 1.1
  panStep?: number; // пиксели для стрелок
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
      // Синхронизация шагов зума/панорамирования
      if (typeof patch.zoomStep === 'number') {
        this._core.camera.setZoomStep(this._options.zoomStep);
      }
      if (typeof patch.panStep === 'number') {
        this._core.camera.setPanStep(this._options.panStep);
      }

      // Переключение контекстного меню на лету
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

      // Примечание: смена target/enablePanning/allow* на лету поддерживается
      // за счёт проверок в рантайме. Переинициализация слушателей под новый target
      // намеренно не выполняется во избежание неожиданных побочных эффектов.
    }
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    const stage: Konva.Stage = this._core.stage;

    // Синхронизируем шаги зума/панорамирования с CameraManager (источник правды — плагин)
    // Пользователь задаёт zoomStep/panStep через конструктор CameraHotkeysPlugin
    // Если хотите, можно убрать эти строки, чтобы плагин только «читал» из камеры.
    if (typeof this._options.zoomStep === 'number') {
      this._core.camera.setZoomStep(this._options.zoomStep);
    }
    if (typeof this._options.panStep === 'number') {
      this._core.camera.setPanStep(this._options.panStep);
    }

    // Запрещаем стандартное перетаскивание сцены левой кнопкой, сохраняем предыдущее состояние
    this._prevStageDraggable = stage.draggable();
    stage.draggable(false);

    // DOM keydown остаётся на target, т.к. Konva не генерирует key события
    const t = this._options.target as EventTarget & {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: unknown,
      ) => void;
    };
    t.addEventListener('keydown', this._handleKeyDown as EventListener);

    // Konva-события мыши с namespace .cameraHotkeys
    if (this._options.enablePanning) {
      stage.on('mousedown.cameraHotkeys', this._onMouseDownKonva);
      stage.on('mousemove.cameraHotkeys', this._onMouseMoveKonva);
      stage.on('mouseup.cameraHotkeys', this._onMouseUpKonva);
      stage.on('mouseleave.cameraHotkeys', this._onMouseLeaveKonva);
      if (this._options.disableContextMenu) {
        // предотвращаем контекстное меню на контейнере
        stage.container().addEventListener('contextmenu', this._onContextMenuDOM as EventListener);
      }
    }

    // Колесо: перехват на DOM-уровне, чтобы не допускать зума при Shift
    stage.container().addEventListener(
      'wheel',
      this._onWheelDOM as EventListener,
      {
        passive: false as unknown as boolean,
        capture: true as unknown as boolean,
      } as AddEventListenerOptions,
    );

    // Резервная защита на уровне Konva: гасим wheel при отсутствии ctrl
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

    // Восстанавливаем предыдущее состояние draggable
    if (this._prevStageDraggable !== undefined) {
      stage.draggable(this._prevStageDraggable);
      // this._prevStageDraggable = undefined;
    }

    this._attached = false;
    this._last = null;
    this._prevCursor = null;
  }

  // ===================== Handlers (DOM wheel) =====================
  private _onWheelDOM = (e: WheelEvent) => {
    if (!this._core) return;

    // Зум — только при Ctrl. Meta не учитываем.
    const isCtrlZoom = e.ctrlKey;
    if (isCtrlZoom) return;

    // Иначе — панорамируем по правилам и полностью гасим событие
    e.preventDefault();
    // Останавливаем всплытие и немедленную обработку другими слушателями (в т.ч. Konva)
    e.stopPropagation();
    (e as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

    const { deltaX, deltaY, shiftKey } = e;

    if (this._isTouchpadWheel(e)) {
      // Touchpad: свободное панорамирование
      if (shiftKey) {
        // При зажатом Shift — используем доминирующую компоненту (горизонтальную или вертикальную)
        // и проецируем её на ось X (движение только по X). Это позволяет свайпать как влево/вправо,
        // так и вверх/вниз для перемещения по X.
        const primary = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
        const dx = -primary;
        this._pan(dx, 0);
      } else {
        // Без Shift — свободное панорамирование по обеим осям
        const dx = -deltaX;
        const dy = -deltaY;
        this._pan(dx, dy);
      }
      return;
    }

    // Мышь: без Shift — ось Y; с Shift — ось X (вверх => влево, вниз => вправо)
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
    // Разрешаем панорамирование только для средней (1) и правой (2) кнопок. Левую кнопку игнорируем.
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

    // +/- zoom через CameraManager (используем zoomStep камеры)
    const isPlus = e.code === 'Equal' || e.code === 'NumpadAdd';
    const isMinus = e.code === 'Minus' || e.code === 'NumpadSubtract';
    if (isPlus || isMinus) {
      e.preventDefault();
      if (isPlus) this._core.camera.zoomIn();
      else this._core.camera.zoomOut();
      return;
    }

    // Стрелки — панорамирование на фиксированный шаг
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
    // Простая эвристика: пиксельный режим (deltaMode === 0) и наличие горизонтальной дельты
    // или небольшие значения deltaY указывают на тачпад
    const isPixel = e.deltaMode === 0;
    return isPixel && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 50);
  }

  private _pan(dx: number, dy: number) {
    if (!this._core) return;
    // Панорамируем мир, а не stage, чтобы сетка и контент были в одной системе координат
    const world = this._core.nodes.world;
    const newX = world.x() + dx;
    const newY = world.y() + dy;
    world.position({ x: newX, y: newY });
    // Эмитим событие панорамирования камеры
    this._core.eventBus.emit('camera:pan', { dx, dy, position: { x: newX, y: newY } });
    this._core.stage.batchDraw();
  }
}
