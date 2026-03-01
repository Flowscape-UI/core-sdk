import { OffsetAnchor, type HandlePositionSpec, type Point } from "../HandleView";
import { Handle, type HandleOptions } from "./Handle";

export type BorderRadiusEvent = {
    id: string;
    position: HandlePositionSpec;
    pointerScreen: Point;
};

const DEFAULT_OPTIONS: HandleOptions = {
    type: "circle",
    size: 8,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.TopLeft,
    style: {
        cursor: "pointer",
    },
};

export class HandleBorderRadius extends Handle {
    private readonly _listeners = new Set<(e: BorderRadiusEvent) => void>();

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
        super(id, opts);
        this._bindUX();
    }

    public onChange(cb: (e: BorderRadiusEvent) => void) {
        this._listeners.add(cb);
        return () => this._listeners.delete(cb);
    }

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
            if (!ctx?.selectionCornersWorld) return;

            ctx.drag.start(e.evt, {
                onStart: ({ pointer }) => {
                    this.setIsDragging(true);
                    ctx.stage.container().style.cursor = this._cursor;
                    this._emit(pointer.screen);
                },
                onMove: ({ pointer }) => {
                    if (!this.isDragging()) return;
                    this._emit(pointer.screen);
                },
                onEnd: ({ pointer }) => {
                    this.setIsDragging(false);
                    ctx.stage.container().style.cursor = "";
                    if (pointer) this._emit(pointer.screen);
                },
            });
        });
    }

    private _emit(pointerScreen: Point) {
        const payload: BorderRadiusEvent = {
            id: this.id,
            position: this._position,
            pointerScreen,
        };
        for (const cb of this._listeners) cb(payload);
    }
}