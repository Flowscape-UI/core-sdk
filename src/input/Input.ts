import type { Vector2 } from "../core/transform";
import { KeyCode } from "./types";
import { getBrowserKeyCode } from "./utils";

type InputSurface = HTMLElement;

export type InputEventInfo = {
    keyCode?: KeyCode;
    mouseButton?: number;
    type:
    | "keydown" | "keyup"
    | "mousedown" | "mouseup" | "mousemove"
    | "mouseenter" | "mouseleave"
    | "wheel"
    | "pointerdown" | "pointermove" | "pointerup" | "pointercancel"
    | "pointerenter" | "pointerleave" | "pointerover" | "pointerout"
    | "gotpointercapture" | "lostpointercapture";
};

type InputOptions = {
    preventAltDefault?: boolean,
    preventContextMenu?: boolean;
    preventWheelDefault?: boolean;
    usePointerCapture?: boolean;
};

// =========================================================
// TODO (Input System Review / Future Improvements)
// =========================================================

// [Architecture] Decide single source of truth for input:
// Currently both Mouse and Pointer APIs are tracked in parallel.
// This can lead to duplicated input handling (same physical input triggers both).
// -> Decide: Pointer as primary? Mouse as legacy layer?

// [Pointer] Single-pointer limitation:
// _activePointerId stores only one pointer.
// This prevents multi-touch gestures (pinch, rotate, etc).
// -> Future: consider Map<pointerId, PointerState> if multi-touch is needed.

// [Pointer] Filter pointer events by activePointerId:
// _onPointerMove updates state for ANY pointer.
// -> Should we ignore events that are not from _activePointerId?

// [Reset] Incomplete state reset in _resetAll():
// Currently does NOT reset:
// - _pointerDown
// - _pointerInside
// - _pointerCaptured
// - _activePointerId
// - _pointerPressure
// - _coalescedEvents / _predictedEvents
// - _scrollCtrl / _scrollShift / _scrollAlt / _scrollMeta
// - _mouseInside
// -> Can cause "stuck" state after blur/destroy.

// [Pointer] setPointerCapture safety:
// _onPointerDown uses (e.currentTarget as Element) without instanceof check.
// Other handlers already validate this.
// -> Make consistent to avoid edge-case crashes.

// [Mouse] Drag origin timing:
// _mouseButtonDragOrigin is set BEFORE updating mouse position.
// -> Can cause incorrect drag delta on first frame in edge cases.

// [Pointer] pointerType casting:
// Currently forced via `as "mouse" | "pen" | "touch"`.
// -> Consider safe mapping with fallback ("unknown" or default).

// [Scroll] Modifier semantics:
// scrollCtrl/Shift/Alt/Meta reflect modifiers ONLY during wheel event,
// not global key state.
// -> Naming/API clarification may be needed.

// [Text Input] inputString limitations:
// Built via keydown only.
// Does NOT support IME, composition events, dead keys, etc.
// -> Not suitable for full text editing (only shortcuts / simple input).

// [Scope] Global singleton limitation:
// Input is static and global.
// -> Future: support multiple independent surfaces/scenes if needed.
export class Input {
    // --- Keyboard ---
    private static _keys = new Set<KeyCode>();
    private static _keysDown = new Set<KeyCode>();
    private static _keysUp = new Set<KeyCode>();
    private static _keyHoldStart = new Map<KeyCode, number>();
    private static _keyLastRepeat = new Map<KeyCode, number>();
    private static _onceKeyDownCallbacks = new Map<KeyCode, Set<() => void>>();

    // --- Mouse ---
    private static _mouseButtons = new Set<number>();
    private static _mouseButtonsDown = new Set<number>();
    private static _mouseButtonsUp = new Set<number>();
    private static _mouseButtonHoldStart = new Map<number, number>();
    private static _mouseButtonDragOrigin = new Map<number, Vector2>();
    private static _mouseButtonClickCount = new Map<number, number>();
    private static _mouseButtonLastClickTime = new Map<number, number>();
    private static _mousePosition: Vector2 = { x: 0, y: 0 };
    private static _mouseDelta: Vector2 = { x: 0, y: 0 };
    private static _mouseScroll: Vector2 = { x: 0, y: 0 };
    private static _mouseInside = false;

    // --- Scroll modifiers ---
    private static _scrollCtrl = false;
    private static _scrollShift = false;
    private static _scrollAlt = false;
    private static _scrollMeta = false;

    // --- Pointer ---
    private static _activePointerId: number | null = null;
    private static _pointerCaptured = false;
    private static _pointerInside = false;
    private static _pointerDown = false;
    private static _pointerPosition: Vector2 = { x: 0, y: 0 };
    private static _pointerDelta: Vector2 = { x: 0, y: 0 };
    private static _pointerType: "mouse" | "pen" | "touch" = "mouse";
    private static _pointerPressure = 0;
    private static _coalescedEvents: PointerEvent[] = [];
    private static _predictedEvents: PointerEvent[] = [];

    // --- Cursor ---
    private static _cursor: string = "default";

    // --- Idle ---
    private static _lastInputTime = performance.now();

    // --- Misc ---
    private static _inputString = "";
    private static _options: Required<InputOptions> = {
        preventAltDefault: false,
        preventContextMenu: false,
        preventWheelDefault: false,
        usePointerCapture: true,
    };

    private static _initialized = false;
    private static readonly _surfaces = new Set<InputSurface>();
    private static _onInputCallback: ((event: InputEventInfo) => void) | null = null;

    // =========================================================
    //  Public API
    // =========================================================

    public static onInput(callback: ((event: InputEventInfo) => void) | null): void {
        this._onInputCallback = callback;
    }

    public static configure(options: InputOptions): void {
        Object.assign(this._options, options);
    }

    // --- Keyboard getters ---
    public static get inputString(): string { return this._inputString; }
    public static get anyKey(): boolean { return this._keys.size > 0; }
    public static get anyKeyDown(): boolean { return this._keysDown.size > 0; }

    public static get ctrlPressed(): boolean {
        return this._keys.has(KeyCode.LeftControl) || this._keys.has(KeyCode.RightControl);
    }
    public static get shiftPressed(): boolean {
        return this._keys.has(KeyCode.LeftShift) || this._keys.has(KeyCode.RightShift);
    }
    public static get altPressed(): boolean {
        return this._keys.has(KeyCode.LeftAlt) || this._keys.has(KeyCode.RightAlt);
    }
    public static get metaPressed(): boolean {
        return this._keys.has(KeyCode.LeftCommand) || this._keys.has(KeyCode.RightCommand) ||
            this._keys.has(KeyCode.LeftWindows) || this._keys.has(KeyCode.RightWindows);
    }
    public static get isAnyModifierPressed(): boolean {
        return this.ctrlPressed || this.shiftPressed || this.altPressed || this.metaPressed;
    }

    // --- Mouse getters ---
    public static get mousePosition(): Vector2 { return { ...this._mousePosition }; }
    public static get mousePositionDelta(): Vector2 { return { ...this._mouseDelta }; }
    public static get mousePositionDeltaNormalized(): Vector2 {
        const dx = this._mouseDelta.x;
        const dy = this._mouseDelta.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return { x: 0, y: 0 };
        return { x: dx / len, y: dy / len };
    }
    public static get mouseScrollDelta(): Vector2 { return { ...this._mouseScroll }; }
    public static get mouseScrollX(): number { return this._mouseScroll.x; }
    public static get mouseScrollY(): number { return this._mouseScroll.y; }
    public static get mouseInside(): boolean { return this._mouseInside; }
    public static get anyMouseButton(): boolean { return this._mouseButtons.size > 0; }
    public static get anyMouseButtonDown(): boolean { return this._mouseButtonsDown.size > 0; }

    // --- Scroll modifiers ---
    public static get scrollCtrl(): boolean { return this._scrollCtrl; }
    public static get scrollShift(): boolean { return this._scrollShift; }
    public static get scrollAlt(): boolean { return this._scrollAlt; }
    public static get scrollMeta(): boolean { return this._scrollMeta; }

    // --- Cursor getters
    public static get cursor(): string {
        return this._cursor;
    }

    // --- Pointer getters ---
    public static get pointerPosition(): Vector2 { return { ...this._pointerPosition }; }
    public static get pointerDelta(): Vector2 { return { ...this._pointerDelta }; }
    public static get pointerDown(): boolean { return this._pointerDown; }
    public static get pointerInside(): boolean { return this._pointerInside; }
    public static get pointerCaptured(): boolean { return this._pointerCaptured; }
    public static get pointerType(): "mouse" | "pen" | "touch" { return this._pointerType; }
    public static get pointerPressure(): number { return this._pointerPressure; }
    public static get activePointerId(): number | null { return this._activePointerId; }

    // --- Coalesced / Predicted ---
    public static get coalescedEvents(): ReadonlyArray<PointerEvent> { return this._coalescedEvents; }
    public static get predictedEvents(): ReadonlyArray<PointerEvent> { return this._predictedEvents; }

    // =========================================================
    //  Keyboard API
    // =========================================================

    public static getKey(key: KeyCode): boolean {
        return this._keys.has(key);
    }

    public static getKeyDown(key: KeyCode): boolean {
        return this._keysDown.has(key);
    }

    public static getKeyUp(key: KeyCode): boolean {
        return this._keysUp.has(key);
    }

    /** Все клавиши зажаты одновременно. */
    public static getKeyCombo(...keys: KeyCode[]): boolean {
        return keys.every((key) => this._keys.has(key));
    }

        public static setCursor(value: string): void {
        if (this._cursor === value) {
            return;
        }

        this._cursor = value;
        this._applyCursor();
    }

    public static resetCursor(): void {
        this.setCursor("default");
    }

    /**
     * Комбо сработало именно в этот кадр — все клавиши зажаты
     * и хотя бы одна из них нажата именно сейчас.
     */
    public static getKeyDownCombo(...keys: KeyCode[]): boolean {
        return keys.every((key) => this._keys.has(key)) &&
            keys.some((key) => this._keysDown.has(key));
    }

    public static getKeyRepeat(key: KeyCode, options?: { delay?: number; interval?: number }): boolean {
        const delay = options?.delay ?? 400;
        const interval = options?.interval ?? 16;
        const now = performance.now();

        if (this.getKeyDown(key)) {
            this._keyHoldStart.set(key, now);
            this._keyLastRepeat.set(key, now);
            return true;
        }

        if (!this.getKey(key)) {
            this._keyHoldStart.delete(key);
            this._keyLastRepeat.delete(key);
            return false;
        }

        const start = this._keyHoldStart.get(key);
        const last = this._keyLastRepeat.get(key);
        if (start === undefined || last === undefined) return false;
        if (now - start < delay) return false;

        if (now - last >= interval) {
            this._keyLastRepeat.set(key, now);
            return true;
        }

        return false;
    }

    /** Подписка на одиночное нажатие клавиши с автоотпиской после первого срабатывания. */
    public static onceKeyDown(key: KeyCode, callback: () => void): void {
        if (!this._onceKeyDownCallbacks.has(key)) {
            this._onceKeyDownCallbacks.set(key, new Set());
        }
        this._onceKeyDownCallbacks.get(key)!.add(callback);
    }

    // =========================================================
    //  Mouse API
    // =========================================================

    public static getMouseButton(button: number): boolean {
        return this._mouseButtons.has(button);
    }

    public static getMouseButtonPressOrigin(button: number): Vector2 {
        const origin = this._mouseButtonDragOrigin.get(button);
        if (!origin) return { x: 0, y: 0 };
        return { ...origin };
    }

    public static getMouseButtonDown(button: number): boolean {
        return this._mouseButtonsDown.has(button);
    }

    public static getMouseButtonUp(button: number): boolean {
        return this._mouseButtonsUp.has(button);
    }

    /** Сколько миллисекунд зажата кнопка мыши. */
    public static getMouseButtonHoldDuration(button: number): number {
        const start = this._mouseButtonHoldStart.get(button);
        if (start === undefined) return 0;
        return performance.now() - start;
    }

    /**
     * Дельта от точки mousedown до текущей позиции мыши.
     * Не сбрасывается каждый кадр в отличие от mousePositionDelta.
     */
    public static getMouseDragDelta(button: number): Vector2 {
        const origin = this._mouseButtonDragOrigin.get(button);
        if (origin === undefined) return { x: 0, y: 0 };
        return {
            x: this._mousePosition.x - origin.x,
            y: this._mousePosition.y - origin.y,
        };
    }

    /**
     * Количество последовательных кликов кнопкой мыши.
     * Сбрасывается если между кликами прошло больше doubleClickThreshold мс.
     */
    public static getMouseButtonClickCount(button: number, doubleClickThreshold = 300): number {
        const lastTime = this._mouseButtonLastClickTime.get(button);
        if (lastTime === undefined) return 0;
        if (performance.now() - lastTime > doubleClickThreshold) return 0;
        return this._mouseButtonClickCount.get(button) ?? 0;
    }

    /** true именно в кадр когда зафиксирован двойной клик. */
    public static getMouseButtonDoubleClick(button: number, threshold = 300): boolean {
        return this.getMouseButtonDown(button) &&
            this.getMouseButtonClickCount(button, threshold) === 2;
    }

    /** true именно в кадр когда зафиксирован тройной клик. */
    public static getMouseButtonTripleClick(button: number, threshold = 300): boolean {
        return this.getMouseButtonDown(button) &&
            this.getMouseButtonClickCount(button, threshold) === 3;
    }

    /** Расстояние в пикселях от точки mousedown до текущей позиции. */
    public static getMouseDragDistance(button: number): number {
        const d = this.getMouseDragDelta(button);
        return Math.sqrt(d.x * d.x + d.y * d.y);
    }

    /** true если кнопка зажата дольше указанного времени в мс. */
    public static isMouseButtonHeld(button: number, duration: number): boolean {
        return this.getMouseButtonHoldDuration(button) >= duration;
    }

    // =========================================================
    //  Pointer API
    // =========================================================

    /** Захватить указатель на элементе (Pointer Lock API). */
    public static lockPointer(element: Element): void {
        element.requestPointerLock();
    }

    /** Освободить захваченный указатель. */
    public static unlockPointer(): void {
        document.exitPointerLock();
    }

    /** Указатель сейчас захвачен через Pointer Lock API. */
    public static get isPointerLocked(): boolean {
        return document.pointerLockElement !== null;
    }

    // =========================================================
    //  General API
    // =========================================================

    public static getModifiers(): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
        return {
            ctrl: this.ctrlPressed,
            shift: this.shiftPressed,
            alt: this.altPressed,
            meta: this.metaPressed,
        };
    }

    /**
     * Alias для getKeyDown — явно подчёркивает что срабатывает
     * ровно один раз в кадр нажатия.
     */
    public static getKeyDownOnce(key: KeyCode): boolean {
        return this.getKeyDown(key);
    }

    /**
     * Возвращает -1, 0 или 1 по двум клавишам.
     * Удобно для навигации: getAxisValue(KeyCode.A, KeyCode.D)
     */
    public static getAxisValue(negativeKey: KeyCode, positiveKey: KeyCode): number {
        const neg = this._keys.has(negativeKey) ? -1 : 0;
        const pos = this._keys.has(positiveKey) ? 1 : 0;
        return neg + pos;
    }

    /**
     * Нормализованный вектор из 4 клавиш.
     * getVector(KeyCode.A, KeyCode.D, KeyCode.W, KeyCode.S)
     * вернёт { x: 0.707, y: -0.707 } при зажатых D+W.
     */
    public static getVector(
        leftKey: KeyCode,
        rightKey: KeyCode,
        upKey: KeyCode,
        downKey: KeyCode
    ): Vector2 {
        const x = this.getAxisValue(leftKey, rightKey);
        const y = this.getAxisValue(upKey, downKey);
        const len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: x / len, y: y / len };
    }

    /**
     * Возвращает true если не было никакого ввода дольше timeout мс.
     * Полезно для автосохранения, скрытия UI, screen saver.
     */
    public static isIdle(timeout: number): boolean {
        return performance.now() - this._lastInputTime > timeout;
    }

    // =========================================================
    //  Engine lifecycle
    // =========================================================

    public static _initialize(): void {
        if (this._initialized) return;
        this._initialized = true;
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        window.addEventListener("blur", this._resetAll);
    }

    public static _registerSurface(surface: InputSurface): void {
        this._initialize();
        if (this._surfaces.has(surface)) return;

        // Mouse
        surface.addEventListener("mousedown", this._onMouseDown as EventListener);
        surface.addEventListener("mouseup", this._onMouseUp as EventListener);
        surface.addEventListener("mousemove", this._onMouseMove as EventListener);
        surface.addEventListener("mouseenter", this._onMouseEnter as EventListener);
        surface.addEventListener("mouseleave", this._onMouseLeave as EventListener);
        surface.addEventListener("wheel", this._onWheel as EventListener, { passive: false });
        surface.addEventListener("contextmenu", this._onContextMenu as EventListener);

        // Pointer
        surface.addEventListener("pointerdown", this._onPointerDown as EventListener);
        surface.addEventListener("pointermove", this._onPointerMove as EventListener);
        surface.addEventListener("pointerup", this._onPointerUp as EventListener);
        surface.addEventListener("pointercancel", this._onPointerCancel as EventListener);
        surface.addEventListener("pointerenter", this._onPointerEnter as EventListener);
        surface.addEventListener("pointerleave", this._onPointerLeave as EventListener);
        surface.addEventListener("pointerover", this._onPointerOver as EventListener);
        surface.addEventListener("pointerout", this._onPointerOut as EventListener);
        surface.addEventListener("gotpointercapture", this._onGotPointerCapture as EventListener);
        surface.addEventListener("lostpointercapture", this._onLostPointerCapture as EventListener);

        this._surfaces.add(surface);

        surface.style.cursor = this._cursor;
    }

    public static _unregisterSurface(surface: InputSurface): void {
        if (!this._surfaces.has(surface)) return;

        // Mouse
        surface.removeEventListener("mousedown", this._onMouseDown as EventListener);
        surface.removeEventListener("mouseup", this._onMouseUp as EventListener);
        surface.removeEventListener("mousemove", this._onMouseMove as EventListener);
        surface.removeEventListener("mouseenter", this._onMouseEnter as EventListener);
        surface.removeEventListener("mouseleave", this._onMouseLeave as EventListener);
        surface.removeEventListener("wheel", this._onWheel as EventListener);
        surface.removeEventListener("contextmenu", this._onContextMenu as EventListener);

        // Pointer
        surface.removeEventListener("pointerdown", this._onPointerDown as EventListener);
        surface.removeEventListener("pointermove", this._onPointerMove as EventListener);
        surface.removeEventListener("pointerup", this._onPointerUp as EventListener);
        surface.removeEventListener("pointercancel", this._onPointerCancel as EventListener);
        surface.removeEventListener("pointerenter", this._onPointerEnter as EventListener);
        surface.removeEventListener("pointerleave", this._onPointerLeave as EventListener);
        surface.removeEventListener("pointerover", this._onPointerOver as EventListener);
        surface.removeEventListener("pointerout", this._onPointerOut as EventListener);
        surface.removeEventListener("gotpointercapture", this._onGotPointerCapture as EventListener);
        surface.removeEventListener("lostpointercapture", this._onLostPointerCapture as EventListener);

        this._surfaces.delete(surface);
    }

    public static _destroy(): void {
        if (!this._initialized) return;
        this._surfaces.forEach((surface) => this._unregisterSurface(surface));
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
        window.removeEventListener("blur", this._resetAll);
        this._initialized = false;
        this._resetAll();
        this._mouseDelta = { x: 0, y: 0 };
        this._mouseScroll = { x: 0, y: 0 };
        this._pointerDelta = { x: 0, y: 0 };
        this._inputString = "";
        this._onceKeyDownCallbacks.clear();
    }

    public static _endFrame(): void {
        this._keysDown.clear();
        this._keysUp.clear();
        this._mouseButtonsDown.clear();
        this._mouseButtonsUp.clear();
        this._mouseDelta = { x: 0, y: 0 };
        this._mouseScroll = { x: 0, y: 0 };
        this._pointerDelta = { x: 0, y: 0 };
        this._coalescedEvents = [];
        this._predictedEvents = [];
        this._inputString = "";

    }

    // =========================================================
    //  Handlers — Keyboard
    // =========================================================

    private static _onKeyDown = (e: KeyboardEvent): void => {
        const key = getBrowserKeyCode(e.code);
        if (key === KeyCode.None) return;
        if (this.altPressed && e.cancelable && this._options.preventAltDefault) {
            e.preventDefault();
        }

        if (!this._keys.has(key)) {
            this._keysDown.add(key);

            // onceKeyDown callbacks
            const callbacks = this._onceKeyDownCallbacks.get(key);
            if (callbacks) {
                callbacks.forEach((cb) => cb());
                this._onceKeyDownCallbacks.delete(key);
            }
        }

        this._keys.add(key);
        if (e.key.length === 1) this._inputString += e.key;
        this._lastInputTime = performance.now();
        this._emitInput({ type: "keydown", keyCode: key });
    };

    private static _onKeyUp = (e: KeyboardEvent): void => {
        const key = getBrowserKeyCode(e.code);
        if (key === KeyCode.None) return;
        if (this.altPressed && e.cancelable && this._options.preventAltDefault) {
            e.preventDefault();
        }
        this._keys.delete(key);
        this._keysUp.add(key);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "keyup", keyCode: key });
    };

    // =========================================================
    //  Handlers — Mouse
    // =========================================================

    private static _onMouseDown = (e: MouseEvent): void => {
        if (!this._mouseButtons.has(e.button)) {
            this._mouseButtonsDown.add(e.button);
            this._mouseButtonHoldStart.set(e.button, performance.now());
            this._mouseButtonDragOrigin.set(e.button, { ...this._mousePosition });

            // click count
            const now = performance.now();
            const lastTime = this._mouseButtonLastClickTime.get(e.button) ?? 0;
            const count = this._mouseButtonClickCount.get(e.button) ?? 0;
            this._mouseButtonClickCount.set(e.button, now - lastTime < 300 ? count + 1 : 1);
            this._mouseButtonLastClickTime.set(e.button, now);
        }

        this._mouseButtons.add(e.button);
        this._updateMousePosition(e);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "mousedown", mouseButton: e.button });
    };

    private static _onMouseUp = (e: MouseEvent): void => {
        this._mouseButtons.delete(e.button);
        this._mouseButtonsUp.add(e.button);
        this._mouseButtonHoldStart.delete(e.button);
        this._mouseButtonDragOrigin.delete(e.button);
        this._updateMousePosition(e);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "mouseup", mouseButton: e.button });
    };

    private static _onMouseMove = (e: MouseEvent): void => {
        this._updateMousePosition(e);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "mousemove" });
    };

    private static _onMouseEnter = (e: MouseEvent): void => {
        this._mouseInside = true;
        this._updateMousePosition(e);
        this._emitInput({ type: "mouseenter" });
    };

    private static _onMouseLeave = (e: MouseEvent): void => {
        this._mouseInside = false;
        this._updateMousePosition(e);
        this._mouseDelta = { x: 0, y: 0 };
        this._emitInput({ type: "mouseleave" });
    };

    private static _onWheel = (e: WheelEvent): void => {
        if (this._options.preventWheelDefault && e.cancelable) e.preventDefault();
        this._mouseScroll = { x: e.deltaX, y: e.deltaY };
        this._scrollCtrl = e.ctrlKey;
        this._scrollShift = e.shiftKey;
        this._scrollAlt = e.altKey;
        this._scrollMeta = e.metaKey;
        this._updateMousePosition(e);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "wheel" });
    };

    private static _onContextMenu = (e: MouseEvent): void => {
        if (this._options.preventContextMenu) e.preventDefault();
    };

    // =========================================================
    //  Handlers — Pointer
    // =========================================================

    private static _onPointerDown = (e: PointerEvent): void => {
        this._pointerDown = true;
        this._activePointerId = e.pointerId;
        this._pointerType = e.pointerType as "mouse" | "pen" | "touch";
        this._pointerPressure = e.pressure;
        this._updatePointerPosition(e);
        this._lastInputTime = performance.now();

        if (this._options.usePointerCapture) {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }

        this._emitInput({ type: "pointerdown", mouseButton: e.button });
    };

    private static _onPointerMove = (e: PointerEvent): void => {
        this._pointerPressure = e.pressure;
        this._coalescedEvents = e.getCoalescedEvents?.() ?? [];
        this._predictedEvents = e.getPredictedEvents?.() ?? [];
        this._updatePointerPosition(e);
        this._lastInputTime = performance.now();
        this._emitInput({ type: "pointermove" });
    };

    private static _onPointerUp = (e: PointerEvent): void => {
        this._pointerDown = false;
        this._pointerPressure = 0;
        this._updatePointerPosition(e);
        this._lastInputTime = performance.now();

        if (
            this._options.usePointerCapture &&
            e.currentTarget instanceof Element &&
            e.currentTarget.hasPointerCapture(e.pointerId)
        ) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        if (this._activePointerId === e.pointerId) this._activePointerId = null;

        this._emitInput({ type: "pointerup", mouseButton: e.button });
    };

    private static _onPointerCancel = (e: PointerEvent): void => {
        this._pointerDown = false;
        this._pointerPressure = 0;
        this._activePointerId = null;

        this._mouseButtons.clear();
        this._mouseButtonsDown.clear();
        this._mouseButtonsUp.clear();
        this._mouseButtonHoldStart.clear();
        this._mouseButtonDragOrigin.clear();

        if (
            this._options.usePointerCapture &&
            e.currentTarget instanceof Element &&
            e.currentTarget.hasPointerCapture(e.pointerId)
        ) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        this._emitInput({ type: "pointercancel" });
    };

    private static _onPointerEnter = (e: PointerEvent): void => {
        this._pointerInside = true;
        this._updatePointerPosition(e);
        this._emitInput({ type: "pointerenter" });
    };

    private static _onPointerLeave = (e: PointerEvent): void => {
        this._pointerInside = false;
        this._updatePointerPosition(e);
        this._pointerDelta = { x: 0, y: 0 };
        this._emitInput({ type: "pointerleave" });
    };

    private static _onPointerOver = (e: PointerEvent): void => {
        this._pointerInside = true;
        this._updatePointerPosition(e);
        this._emitInput({ type: "pointerover" });
    };

    private static _onPointerOut = (e: PointerEvent): void => {
        this._updatePointerPosition(e);
        this._emitInput({ type: "pointerout" });
    };

    private static _onGotPointerCapture = (_: PointerEvent): void => {
        this._pointerCaptured = true;
        this._emitInput({ type: "gotpointercapture" });
    };

    private static _onLostPointerCapture = (_: PointerEvent): void => {
        this._pointerCaptured = false;
        this._emitInput({ type: "lostpointercapture" });
    };

    // =========================================================
    //  Helpers
    // =========================================================

    private static _updateMousePosition(e: MouseEvent): void {
        const newPos = { x: e.clientX, y: e.clientY };
        this._mouseDelta.x += newPos.x - this._mousePosition.x;
        this._mouseDelta.y += newPos.y - this._mousePosition.y;
        this._mousePosition = newPos;
    }

    private static _updatePointerPosition(e: PointerEvent): void {
        const newPos = { x: e.clientX, y: e.clientY };
        this._pointerDelta = {
            x: newPos.x - this._pointerPosition.x,
            y: newPos.y - this._pointerPosition.y,
        };
        this._pointerPosition = newPos;
    }

    private static _resetAll = (): void => {
        this._keys.clear();
        this._keysDown.clear();
        this._keysUp.clear();
        this._mouseButtons.clear();
        this._mouseButtonsDown.clear();
        this._mouseButtonsUp.clear();
        this._mouseButtonHoldStart.clear();
        this._mouseButtonDragOrigin.clear();
    };

    private static _applyCursor(): void {
        for (const surface of this._surfaces) {
            surface.style.cursor = this._cursor;
        }
    }

    private static _emitInput(event: InputEventInfo): void {
        this._onInputCallback?.(event);
    }
}