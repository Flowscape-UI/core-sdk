// WorldInputController.ts
import Konva from "konva";
import { LayerWorld } from "./LayerWorld";
import type { Point } from "../../camera";

export type WorldInputOptions = {
    enabled?: boolean;

    // Как включать pan:
    // - "middle" = средняя кнопка мыши
    // - "right"  = правая
    // - "spaceLeft" = Space + ЛКМ
    panMode?: "middle" | "right" | "spaceLeft" | "left";

    // Zoom on wheel
    zoomEnabled?: boolean;
    zoomFactor?: number; // 1.1 = быстрее, 1.05 = плавнее

    // Prevent page scroll on wheel over canvas
    preventWheelDefault?: boolean;
};

const DEFAULTS: Required<WorldInputOptions> = {
    enabled: true,
    panMode: "right",
    zoomEnabled: true,
    zoomFactor: 1.08,
    preventWheelDefault: true,
};

export class LayerWorldInputController {
    private readonly _stage: Konva.Stage;
    private readonly _world: LayerWorld;
    private readonly _opts: Required<WorldInputOptions>;

    private _arrowsDown = new Set<string>();
    private _arrowRaf = 0;

    private _dragging = false;
    private _last: Point | null = null;

    constructor(stage: Konva.Stage, world: LayerWorld, opts: WorldInputOptions = {}) {
        this._stage = stage;
        this._world = world;
        this._opts = { ...DEFAULTS, ...opts };

        this._bind();
    }

    public destroy() {
        this._unbind();
    }

    public setEnabled(enabled: boolean) {
        this._opts.enabled = enabled;
        if (!enabled) this._stopDrag();
    }

    // ---------- bindings ----------
    private _bind() {
        // Keyboard (Space)
        window.addEventListener("keydown", this._onKeyDown, { passive: false });
        window.addEventListener("keyup", this._onKeyUp, { passive: false });

        // Mouse / pointer
        this._stage.on("mousedown touchstart", this._onDown);
        this._stage.on("mousemove touchmove", this._onMove);
        this._stage.on("mouseup touchend", this._onUp);
        this._stage.on("mouseleave", this._onUp);

        // Wheel zoom
        this._stage.on("wheel", this._onWheel);
    }

    private _unbind() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);

        this._stage.off("mousedown touchstart", this._onDown);
        this._stage.off("mousemove touchmove", this._onMove);
        this._stage.off("mouseup touchend", this._onUp);
        this._stage.off("mouseleave", this._onUp);

        this._stage.off("wheel", this._onWheel);
    }

    private _shouldStartPan(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
        // Touch: pan одним пальцем (MVP)
        if (e.evt instanceof TouchEvent) return true;

        const me = e.evt as MouseEvent;

        // MMB (button=1) or RMB (button=2)
        return me.button === 1 || me.button === 2;
    }

    private _getStagePointer(): Point | null {
        const p = this._stage.getPointerPosition();
        return p ? { x: p.x, y: p.y } : null;
    }

    private _startDrag(p: Point) {
        this._dragging = true;
        this._last = p;

        // UX: курсор "grab"
        const container = this._stage.container();
        container.style.cursor = "grab";
    }

    private _stopDrag() {
        this._dragging = false;
        this._last = null;

        const container = this._stage.container();
        container.style.cursor = "";
    }

    // ---------- handlers ----------
    private _onKeyDown = (e: KeyboardEvent) => {
        // zoom in: Shift + '+' (обычно Shift + '=')
        if ((e.key === "+" || (e.key === "=" && e.shiftKey)) && !e.repeat) {
            const center = { x: this._stage.width() / 2, y: this._stage.height() / 2 };
            this._world.camera.zoomAtScreen(center, this._opts.zoomFactor);
            return;
        }

        // zoom out: '-'
        if (e.key === "-" && !e.repeat) {
            const center = { x: this._stage.width() / 2, y: this._stage.height() / 2 };
            this._world.camera.zoomAtScreen(center, 1 / this._opts.zoomFactor);
            return;
        }

        // стрелки: стартуем "удержание"
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            this._startArrowPan(e);
        }
    };

    private _onKeyUp = (e: KeyboardEvent) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            this._stopArrowPan(e.key);
        }
    };

    private _onDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!this._opts.enabled) return;
        if (!this._shouldStartPan(e)) return;

        const p = this._getStagePointer();
        if (!p) return;

        // чтобы не выделялся текст/не дергался браузер
        if (e.evt.cancelable) e.evt.preventDefault();

        this._startDrag(p);
    };

    private _onMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!this._opts.enabled) return;
        if (!this._dragging) return;

        const p = this._getStagePointer();
        if (!p || !this._last) return;

        if (e.evt.cancelable) e.evt.preventDefault();

        const dx = p.x - this._last.x;
        const dy = p.y - this._last.y;
        this._last = p;

        // ВАЖНО: это screen delta (px)
        this._world.camera.panByScreen(dx, dy);
    };

    private _onUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!this._opts.enabled) return;
        if (!this._dragging) return;

        if (e.evt.cancelable) e.evt.preventDefault();
        this._stopDrag();
    };

    private _onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        if (!this._opts.enabled) return;

        const we = e.evt;
        if (this._opts.preventWheelDefault && we.cancelable) we.preventDefault();

        const p = this._getStagePointer();
        if (!p) return;

        // 1) ZOOM: CTRL + wheel (и часто pinch на тачпаде тоже сюда попадает)
        if (we.ctrlKey) {
            const dir = we.deltaY > 0 ? 1 : -1;
            const factor = dir > 0 ? 1 / this._opts.zoomFactor : this._opts.zoomFactor;
            this._world.camera.zoomAtScreen(p, factor);
            return;
        }

        // 2) PAN: обычное колесо/тачпад
        // На тачпаде deltaX часто не 0 -> горизонтальный пан уже естественный
        let dx = we.deltaX;
        let dy = we.deltaY;

        // Для мыши: shift + wheel обычно означает horizontal scroll
        // Если deltaX почти всегда 0, свапаем вручную
        if (we.shiftKey && Math.abs(dx) < 0.01) {
            dx = dy;
            dy = 0;
        }

        // Инверсия (если хочешь "natural", оставь как есть; если наоборот - умножай на -1)
        this._world.camera.panByScreen(-dx, -dy);
    };

    private _startArrowPan(e: KeyboardEvent) {
        this._arrowsDown.add(e.key);
        if (!this._arrowRaf) this._arrowLoop();
    }

    private _stopArrowPan(key: string) {
        this._arrowsDown.delete(key);
        if (this._arrowsDown.size === 0 && this._arrowRaf) {
            cancelAnimationFrame(this._arrowRaf);
            this._arrowRaf = 0;
        }
    }

    private _arrowLoop = () => {
        const base = 25; // px per frame-step feel
        // ускорение
        const speed = (window.event instanceof KeyboardEvent && window.event.shiftKey) ? base * 1 : base;

        let dx = 0, dy = 0;
        if (this._arrowsDown.has("ArrowLeft")) dx += speed;
        if (this._arrowsDown.has("ArrowRight")) dx -= speed;
        if (this._arrowsDown.has("ArrowUp")) dy += speed;
        if (this._arrowsDown.has("ArrowDown")) dy -= speed;

        if (dx || dy) this._world.camera.panByScreen(dx, dy);

        this._arrowRaf = requestAnimationFrame(this._arrowLoop);
    };
}