import type { Point } from "../HandleView";
import { OffsetAnchor } from "../HandleView";
import { Handle, type HandleOptions } from "./Handle";

export type PivotHandleEvent = {
    id: string;
    pivotWorld: Point;
    pivotScreen: Point;
    pointerScreen: Point;
};

const DEFAULT_OPTIONS: HandleOptions = {
    type: "circle",
    size: 12,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.Center,
    style: {
        cursor: "move",
    },
};

export class HandlePivot extends Handle {
    private readonly _listeners = new Set<(e: PivotHandleEvent) => void>();

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            options,
        }
        super(id, opts);
        this._bindUX();
    }

    public onChange(cb: (e: PivotHandleEvent) => void) {
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
        const ctx = this._ctx!;
        const pivotWorld = ctx.world.camera.screenToWorld(pointerScreen);
        const pivotScreen = pointerScreen;

        const payload: PivotHandleEvent = {
            id: this.id,
            pivotWorld,
            pivotScreen,
            pointerScreen,
        };

        for (const cb of this._listeners) cb(payload);

        // ⚠️ handle сам pivot не хранит - только сигналит
        // внешний код обновит pivot и вызовет overlay.requestDraw()
    }
}