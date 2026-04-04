import Konva from "konva";
import type { LayerWorld } from "../core/scene/layers/world";
import type { Point } from "../core/camera";

export type WorldInputOptions = {
    enabled?: boolean;

    /**
     * Pan activation mode.
     *
     * Режим активации pan.
     */
    panMode?: "middle" | "right" | "spaceLeft" | "left";

    /**
     * Enables zoom on Ctrl + wheel.
     *
     * Включает зум по Ctrl + wheel.
     */
    zoomEnabled?: boolean;

    /**
     * Zoom factor.
     *
     * Коэффициент зума.
     */
    zoomFactor?: number;

    /**
     * Prevents browser wheel default behavior over stage.
     *
     * Запрещает стандартное поведение wheel браузера над stage.
     */
    preventWheelDefault?: boolean;

    /**
     * Arrow pan speed in pixels per second.
     *
     * Скорость pan по стрелкам в пикселях в секунду.
     */
    keyboardPanSpeed?: number;

    /**
     * Shift multiplier for keyboard pan speed.
     *
     * Множитель скорости pan по стрелкам при Shift.
     */
    keyboardPanShiftMultiplier?: number;
};

const DEFAULTS: Required<WorldInputOptions> = {
    enabled: true,
    panMode: "right",
    zoomEnabled: true,
    zoomFactor: 1.08,
    preventWheelDefault: true,
    keyboardPanSpeed: 900,
    keyboardPanShiftMultiplier: 1.5,
};

export class LayerWorldInputController {
    private readonly _stage: Konva.Stage;
    private readonly _world: LayerWorld;
    private readonly _opts: Required<WorldInputOptions>;

    private readonly _arrowsDown = new Set<string>();

    private _arrowRaf: number = 0;
    private _lastArrowFrameTime: number = 0;

    private _dragging: boolean = false;
    private _last: Point | null = null;
    private _spacePressed: boolean = false;
    private _shiftPressed: boolean = false;
    private readonly _onChange: (() => void) | undefined;

    constructor(
        stage: Konva.Stage,
        world: LayerWorld,
        options: WorldInputOptions = {},
        onChange?: () => void
    ) {
        this._stage = stage;
        this._world = world;
        this._opts = { ...DEFAULTS, ...options };
        this._onChange = onChange;

        this._bind();
    }

    public destroy(): void {
        this._stopDrag();
        this._stopArrowPanLoop();
        this._unbind();
    }

    public setEnabled(enabled: boolean): void {
        this._opts.enabled = enabled;

        if (!enabled) {
            this._stopDrag();
            this._stopArrowPanLoop();
            this._arrowsDown.clear();
        }
    }

    /****************************************************************/
    /*                           Bindings                           */
    /****************************************************************/
    private _emitChange(): void {
        this._onChange?.();
    }

    private _bind(): void {
        window.addEventListener("keydown", this._onKeyDown, { passive: false });
        window.addEventListener("keyup", this._onKeyUp, { passive: false });

        this._stage.on("mousedown touchstart", this._onDown);
        this._stage.on("mousemove touchmove", this._onMove);
        this._stage.on("mouseup touchend", this._onUp);
        this._stage.on("mouseleave", this._onUp);
        this._stage.on("wheel", this._onWheel);

        this._stage.container().addEventListener("contextmenu", this._onContextMenu);
    }

    private _unbind(): void {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);

        this._stage.off("mousedown touchstart", this._onDown);
        this._stage.off("mousemove touchmove", this._onMove);
        this._stage.off("mouseup touchend", this._onUp);
        this._stage.off("mouseleave", this._onUp);
        this._stage.off("wheel", this._onWheel);

        this._stage.container().removeEventListener("contextmenu", this._onContextMenu);
    }

    /****************************************************************/
    /*                            Utils                             */
    /****************************************************************/

    private _getCamera() {
        return this._world.getCamera();
    }

    private _getStagePointer(): Point | null {
        const point = this._stage.getPointerPosition();

        if (!point) {
            return null;
        }

        return {
            x: point.x,
            y: point.y,
        };
    }

    private _isArrowKey(key: string): boolean {
        return (
            key === "ArrowUp" ||
            key === "ArrowDown" ||
            key === "ArrowLeft" ||
            key === "ArrowRight"
        );
    }

    private _shouldStartPan(
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ): boolean {
        if (e.evt instanceof TouchEvent) {
            return true;
        }

        const event = e.evt as MouseEvent;
        const mode = this._opts.panMode;

        if (mode === "middle") {
            return event.button === 1;
        }

        if (mode === "right") {
            return event.button === 2;
        }

        if (mode === "left") {
            return event.button === 0;
        }

        if (mode === "spaceLeft") {
            return event.button === 0 && this._spacePressed;
        }

        return false;
    }

    private _startDrag(point: Point): void {
        this._dragging = true;
        this._last = point;
        this._stage.container().style.cursor = "grab";
    }

    private _stopDrag(): void {
        this._dragging = false;
        this._last = null;
        this._stage.container().style.cursor = "";
    }

    private _startArrowPanLoop(): void {
        if (this._arrowRaf !== 0) {
            return;
        }

        this._lastArrowFrameTime = performance.now();
        this._arrowRaf = requestAnimationFrame(this._arrowLoop);
    }

    private _stopArrowPanLoop(): void {
        if (this._arrowRaf !== 0) {
            cancelAnimationFrame(this._arrowRaf);
            this._arrowRaf = 0;
        }

        this._lastArrowFrameTime = 0;
    }

    /****************************************************************/
    /*                           Handlers                           */
    /****************************************************************/

    private _onContextMenu = (e: Event): void => {
        if (!this._opts.enabled) {
            return;
        }

        if (this._opts.panMode === "right") {
            e.preventDefault();
        }
    };

    private _onKeyDown = (e: KeyboardEvent): void => {
        this._spacePressed = e.code === "Space" ? true : this._spacePressed;
        this._shiftPressed = e.shiftKey;

        if (!this._opts.enabled) {
            return;
        }

        if (this._opts.zoomEnabled) {
            if ((e.key === "+" || (e.key === "=" && e.shiftKey)) && !e.repeat) {
                const center = {
                    x: this._stage.width() / 2,
                    y: this._stage.height() / 2,
                };

                this._getCamera().zoomAtScreen(center, this._opts.zoomFactor);
                e.preventDefault();
                return;
            }

            if (e.key === "-" && !e.repeat) {
                const center = {
                    x: this._stage.width() / 2,
                    y: this._stage.height() / 2,
                };

                this._getCamera().zoomAtScreen(center, 1 / this._opts.zoomFactor);
                e.preventDefault();
                return;
            }
        }

        if (this._isArrowKey(e.key)) {
            this._arrowsDown.add(e.key);
            this._startArrowPanLoop();
            e.preventDefault();
        }
    };

    private _onKeyUp = (e: KeyboardEvent): void => {
        if (e.code === "Space") {
            this._spacePressed = false;
        }

        this._shiftPressed = e.shiftKey;

        if (this._isArrowKey(e.key)) {
            this._arrowsDown.delete(e.key);

            if (this._arrowsDown.size === 0) {
                this._stopArrowPanLoop();
            }
        }
    };

    private _onDown = (
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ): void => {
        if (!this._opts.enabled) {
            return;
        }

        if (!this._shouldStartPan(e)) {
            return;
        }

        const point = this._getStagePointer();

        if (!point) {
            return;
        }

        if (e.evt.cancelable) {
            e.evt.preventDefault();
        }

        this._startDrag(point);
    };

    private _onMove = (
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ): void => {
        if (!this._opts.enabled || !this._dragging) {
            return;
        }

        const point = this._getStagePointer();

        if (!point || !this._last) {
            return;
        }

        if (e.evt.cancelable) {
            e.evt.preventDefault();
        }

        const dx = point.x - this._last.x;
        const dy = point.y - this._last.y;

        this._last = point;
        this._getCamera().panByScreen(dx, dy);
        this._emitChange();
    };

    private _onUp = (
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ): void => {
        if (!this._dragging) {
            return;
        }

        if (e.evt.cancelable) {
            e.evt.preventDefault();
        }

        this._stopDrag();
        this._emitChange();
    };

    private _onWheel = (e: Konva.KonvaEventObject<WheelEvent>): void => {
        if (!this._opts.enabled) {
            return;
        }

        const event = e.evt;

        if (this._opts.preventWheelDefault && event.cancelable) {
            event.preventDefault();
        }

        const point = this._getStagePointer();

        if (!point) {
            return;
        }

        if (event.ctrlKey) {
            if (!this._opts.zoomEnabled) {
                return;
            }

            const direction = event.deltaY > 0 ? 1 : -1;
            const factor =
                direction > 0
                    ? 1 / this._opts.zoomFactor
                    : this._opts.zoomFactor;

            this._getCamera().zoomAtScreen(point, factor);
            this._emitChange();
            return;
        }

        let dx = event.deltaX;
        let dy = event.deltaY;

        if (event.shiftKey && Math.abs(dx) < 0.01) {
            dx = dy;
            dy = 0;
        }

        this._getCamera().panByScreen(-dx, -dy);
        this._emitChange();
    };

    private _arrowLoop = (time: number): void => {
        if (!this._opts.enabled) {
            this._stopArrowPanLoop();
            return;
        }

        const deltaSeconds =
            this._lastArrowFrameTime > 0
                ? (time - this._lastArrowFrameTime) / 1000
                : 0;

        this._lastArrowFrameTime = time;

        let speed = this._opts.keyboardPanSpeed;

        if (this._shiftPressed) {
            speed *= this._opts.keyboardPanShiftMultiplier;
        }

        const step = speed * deltaSeconds;

        let dx = 0;
        let dy = 0;

        if (this._arrowsDown.has("ArrowLeft")) {
            dx += step;
        }

        if (this._arrowsDown.has("ArrowRight")) {
            dx -= step;
        }

        if (this._arrowsDown.has("ArrowUp")) {
            dy += step;
        }

        if (this._arrowsDown.has("ArrowDown")) {
            dy -= step;
        }

        if (dx !== 0 || dy !== 0) {
            this._getCamera().panByScreen(dx, dy);
        }

        this._arrowRaf = requestAnimationFrame(this._arrowLoop);
        this._emitChange();
    };
}