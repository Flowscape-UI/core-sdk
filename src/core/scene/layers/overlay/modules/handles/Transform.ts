// overlay/handles/TransformHandle.ts
import Konva from "konva";
import { OffsetAnchor, type Point } from "../HandleView";
import { Handle, type HandleOptions } from "./Handle";

export type TransformDragEvent = {
    id: string;
    pointerScreen: Point;
    deltaScreen: Point;
    pointerWorld: Point;
};


const DEFAULT_OPTIONS: HandleOptions = {
    type: "square",
    size: 24,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.Center,
    style: {
        cursor: "pointer",
    },
};


export class HandleTransform extends Handle {
    private readonly _rect: Konva.Rect;
    // private readonly _cursor: string;

    // private _dragging = false;
    private _startPointer: Point | null = null;

    private readonly _listeners = new Set<(e: TransformDragEvent) => void>();

    constructor(id: string, options: HandleOptions = DEFAULT_OPTIONS) {
        const rect = new Konva.Rect({
            x: 0, y: 0, width: 0, height: 0,
            fill: "rgba(0,0,0,0)", // прозрачный hit-area
            listening: true,
            perfectDrawEnabled: false,
        });

        super(id, options, rect);
        this._rect = rect;
        // this._cursor = opts.cursor ?? "move";

        this._bindUX();
    }

    public onDrag(cb: (e: TransformDragEvent) => void) {
        this._listeners.add(cb);
        return () => this._listeners.delete(cb);
    }

    public override draw(): void {
        const box = this._getSelectionAabbScreen();
        if (!box) {
            this.node.visible(false);
            return;
        }

        this._rect.position({ x: box.x, y: box.y });
        this._rect.size({ width: box.width, height: box.height });
        this.node.visible(true);
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
                    this._startPointer = pointer.screen;
                    ctx.stage.container().style.cursor = this._cursor;
                },
                onMove: ({ pointer }) => {
                    if (!this.isDragging() || !this._startPointer) return;

                    const deltaScreen = {
                        x: pointer.screen.x - this._startPointer.x,
                        y: pointer.screen.y - this._startPointer.y,
                    };

                    const pointerWorld = ctx.world.camera.screenToWorld(pointer.screen);

                    const payload: TransformDragEvent = {
                        id: this.id,
                        pointerScreen: pointer.screen,
                        deltaScreen,
                        pointerWorld,
                    };

                    for (const cb of this._listeners) cb(payload);
                },
                onEnd: () => {
                    this.setIsDragging(false);
                    this._startPointer = null;
                    ctx.stage.container().style.cursor = "";
                },
            });
        });
    }
}