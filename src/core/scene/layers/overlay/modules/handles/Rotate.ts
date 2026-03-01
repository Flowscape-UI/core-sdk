
import {
    type HandlePositionSpec,
    type Point,
    OffsetAnchor,
} from "../HandleView";
import { centerFromCorners, normalizeAngle } from "../../utils";
import { Handle, type HandleOptions } from "./Handle";

export type RotateHandleEvent = {
    id: string;
    position: HandlePositionSpec; // это spec, а не point
    pointerScreen: Point;
    angleRadians: number;
    deltaRadians: number;
};

const DEFAULT_OPTIONS: HandleOptions = {
    type: "circle",
    size: 24,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.TopLeft,
    style: {
        cursor: "crosshair",
    },
};

export class HandleRotate extends Handle {
    private _startAngle = 0;
    
    private _dragCenterWorld: Point | null = null;
    private _dragCenterScreen: Point | null = null;

    private readonly _listeners = new Set<(e: RotateHandleEvent) => void>();
    private readonly _startListeners = new Set<(e: RotateHandleEvent) => void>();
    private readonly _endListeners = new Set<(e: RotateHandleEvent) => void>();

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
        super(id, opts);
        this._bindUX();
    }

    public onRotate(cb: (e: RotateHandleEvent) => void) {
        this._listeners.add(cb);
        return () => this._listeners.delete(cb);
    }
    public onRotateStart(cb: (e: RotateHandleEvent) => void) {
        this._startListeners.add(cb);
        return () => this._startListeners.delete(cb);
    }
    public onRotateEnd(cb: (e: RotateHandleEvent) => void) {
        this._endListeners.add(cb);
        return () => this._endListeners.delete(cb);
    }

    public override destroy() {
        this._dragCenterWorld = null;
        this._dragCenterScreen = null;
        super.destroy();
    }

    // ---------------- private ----------------

    private _bindUX() {
        this.node.on("mouseenter", () => {
            const ctx = this._ctx;
            if (!ctx) return;
            ctx.stage.container().style.cursor = this._cursor;
        });

        this.node.on("mouseleave", () => {
            const ctx = this._ctx;
            if (!ctx) return;
            if (!this.isDragging()) ctx.stage.container().style.cursor = "";
        });

        this.node.on("mousedown touchstart", (e) => {
            const ctx = this._ctx;
            const sel = ctx?.selectionCornersWorld;
            if (!ctx || !sel) return;

            ctx.drag.start(e.evt, {
                onStart: ({ pointer, nativeEvent }) => {
                    // selection могла исчезнуть между down и start
                    const sel2 = ctx.selectionCornersWorld;
                    if (!sel2) {
                        ctx.stage.container().style.cursor = "";
                        ctx.drag.stop(nativeEvent);
                        return;
                    }

                    this.setIsDragging(true);
                    ctx.stage.container().style.cursor = this._cursor;

                    // фиксируем центр на старте
                    this._dragCenterWorld = centerFromCorners(sel2);
                    this._dragCenterScreen = ctx.world.camera.worldToScreen(this._dragCenterWorld);

                    this._startAngle = this._angle(pointer.screen);

                    const payload = this._makeEvent(pointer.screen, this._startAngle, 0);
                    for (const cb of this._startListeners) cb(payload);
                    for (const cb of this._listeners) cb(payload); // по желанию: старт тоже как rotate
                },

                onMove: ({ pointer }) => {
                    if (!this.isDragging()) return;

                    // если selection исчезла во время drag - аварийно завершаем
                    if (!ctx.selectionCornersWorld) {
                        this.setIsDragging(false);
                        this._dragCenterWorld = null;
                        this._dragCenterScreen = null;
                        ctx.stage.container().style.cursor = "";
                        ctx.drag.stop();
                        return;
                    }

                    const angle = this._angle(pointer.screen);
                    const delta = normalizeAngle(angle - this._startAngle);

                    const payload = this._makeEvent(pointer.screen, angle, delta);
                    for (const cb of this._listeners) cb(payload);
                },

                onEnd: ({ pointer }) => {
                    if (!this.isDragging()) return;

                    const endPos = pointer?.screen ?? { x: 0, y: 0 };
                    const angle = this._angle(endPos);
                    const delta = normalizeAngle(angle - this._startAngle);

                    const payload = this._makeEvent(endPos, angle, delta);
                    for (const cb of this._endListeners) cb(payload);
                    for (const cb of this._listeners) cb(payload);

                    this.setIsDragging(false);
                    this._dragCenterWorld = null;
                    this._dragCenterScreen = null;
                    ctx.stage.container().style.cursor = "";
                },
            });
        });
    }

    private _angle(pointerScreen: Point): number {
        const c = this._dragCenterScreen;
        if (!c) return 0;
        return Math.atan2(pointerScreen.y - c.y, pointerScreen.x - c.x);
    }

    private _makeEvent(pointerScreen: Point, angle: number, delta: number): RotateHandleEvent {
        return {
            id: this.id,
            position: this._position,
            pointerScreen,
            angleRadians: angle,
            deltaRadians: delta,
        };
    }
}