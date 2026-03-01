import { Handle, type HandleOptions } from "./Handle";
import {OffsetAnchor, type HandlePositionSpec, type Point } from "../HandleView";
import type { OverlayContext, WorldCorners } from "../../types";

export type ResizeBorderSideEvent = {
    id: string;
    position: HandlePositionSpec;
    pointerScreen: Point;
    cornersScreen: Point[]; // tl,tr,br,bl in SCREEN
};

// export type ResizeBorderSideOptions = {
//     id: string;
//     position: HandlePositionSpec;

//     // Visual
//     stroke?: string;          // default "#4da3ff"
//     opacity?: number;         // default 1
//     dash?: number[];

//     // Thickness
//     visualWidth?: number;     // default 1 (это то, что видно)
//     hitWidth?: number;        // default 8 (это то, за что удобно хватать)

//     // Cursor
//     cursor?: string;          // optional override
// };

const DEFAULT_OPTIONS: HandleOptions = {
    type: "line",
    size: 20,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.Top,
    style: {
        cursor: "nw-resize",
        borderColor: "#4da3ff",
        borderWidth: 2,
    },
};

export class HandleResizeBorderSide extends Handle {
    private readonly _listeners = new Set<(e: ResizeBorderSideEvent) => void>();

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        }
        super(id, opts);
        this._bindUX();
    }

    public onChange(cb: (e: ResizeBorderSideEvent) => void) {
        this._listeners.add(cb);
        return () => this._listeners.delete(cb);
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
        const corners = this._getSelectionCornersScreen();
        if (!corners) return;

        const payload: ResizeBorderSideEvent = {
            id: this.id,
            position: this._position,
            pointerScreen,
            cornersScreen: corners,
        };

        for (const cb of this._listeners) cb(payload);
    }
}