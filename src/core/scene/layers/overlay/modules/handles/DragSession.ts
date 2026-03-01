// overlay/drag/DragSession.ts
import type Konva from "konva";

export type Point = { x: number; y: number };

export type DragPointer = {
    screen: Point; // stage coordinates (как Konva pointer)
};

export type DragStartPayload = {
    type: "start";
    pointer: DragPointer;
    nativeEvent: MouseEvent | TouchEvent;
};

export type DragMovePayload = {
    type: "move";
    pointer: DragPointer;
    nativeEvent: MouseEvent | TouchEvent;
};

export type DragEndPayload = {
    type: "end";
    pointer: DragPointer | null; // может не быть pointer на end
    nativeEvent: MouseEvent | TouchEvent;
};

export type DragHandlers = {
    onStart?: (e: DragStartPayload) => void;
    onMove?: (e: DragMovePayload) => void;
    onEnd?: (e: DragEndPayload) => void;
};

/**
 * DragSession
 * - берет Konva.Stage
 * - на start событии делает setPointersPositions и стартует global capture
 * - дальше onMove/onEnd приходят уже гарантированно, даже если курсор ушёл за canvas
 */
export class DragSession {
    private readonly _stage: Konva.Stage;
    private _active = false;

    private _handlers: DragHandlers | null = null;

    constructor(stage: Konva.Stage) {
        this._stage = stage;
    }

    public isActive(): boolean {
        return this._active;
    }

    public start(nativeEvent: MouseEvent | TouchEvent, handlers: DragHandlers) {
        if (this._active) this.stop(nativeEvent);
        this._active = true;
        this._handlers = handlers;

        this._prevent(nativeEvent);

        // sync Konva pointer
        this._stage.setPointersPositions(nativeEvent as any);

        const p = this._stage.getPointerPosition();
        if (p) {
            handlers.onStart?.({
                type: "start",
                pointer: { screen: { x: p.x, y: p.y } },
                nativeEvent,
            });
        } else {
            // start без pointer - редкий кейс, но пусть не падает
            handlers.onStart?.({
                type: "start",
                pointer: { screen: { x: 0, y: 0 } },
                nativeEvent,
            });
        }

        // global capture
        window.addEventListener("mousemove", this._onMove, { passive: false });
        window.addEventListener("mouseup", this._onUp, { passive: false });
        window.addEventListener("touchmove", this._onMove, { passive: false });
        window.addEventListener("touchend", this._onUp, { passive: false });
        window.addEventListener("touchcancel", this._onUp, { passive: false });
    }

    public stop(nativeEvent?: MouseEvent | TouchEvent) {
        if (!this._active) return;

        const handlers = this._handlers;
        this._active = false;
        this._handlers = null;

        window.removeEventListener("mousemove", this._onMove);
        window.removeEventListener("mouseup", this._onUp);
        window.removeEventListener("touchmove", this._onMove);
        window.removeEventListener("touchend", this._onUp);
        window.removeEventListener("touchcancel", this._onUp);

        if (nativeEvent && handlers?.onEnd) {
            this._prevent(nativeEvent);
            this._stage.setPointersPositions(nativeEvent as any);
            const p = this._stage.getPointerPosition();
            handlers.onEnd({
                type: "end",
                pointer: p ? { screen: { x: p.x, y: p.y } } : null,
                nativeEvent,
            });
        }
    }

    public destroy() {
        // безопасно остановить если активен
        this.stop();
    }

    // ---------- private ----------

    private _onMove = (ev: MouseEvent | TouchEvent) => {
        if (!this._active || !this._handlers) return;

        this._prevent(ev);

        this._stage.setPointersPositions(ev as any);
        const p = this._stage.getPointerPosition();
        if (!p) return;

        this._handlers.onMove?.({
            type: "move",
            pointer: { screen: { x: p.x, y: p.y } },
            nativeEvent: ev,
        });
    };

    private _onUp = (ev: MouseEvent | TouchEvent) => {
        if (!this._active) return;
        // stop() сам снимет listeners + отправит end
        this.stop(ev);
    };

    private _prevent(ev: MouseEvent | TouchEvent) {
        const anyEv = ev as any;
        if (anyEv.cancelable) anyEv.preventDefault();
    }
}