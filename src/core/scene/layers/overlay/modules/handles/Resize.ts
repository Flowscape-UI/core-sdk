import { OffsetAnchor, type HandlePositionSpec, type Point } from "../HandleView";
import { Handle, type HandleOptions } from "./Handle";

export type ResizeEvent = {
    id: string;
    position: HandlePositionSpec;
    pointerScreen: Point;
    cornersScreen: Point[];
};

const DEFAULT_OPTIONS: HandleOptions = {
    type: "square",
    size: 8,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.TopLeft,
    style: {
        cursor: "nwse-resize",
    },
};

export class HandleResize extends Handle {
    private readonly _listeners = new Set<(e: ResizeEvent) => void>();

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
        super(id, opts);
        this._bindUX();
    }

    public onChange(cb: (e: ResizeEvent) => void) {
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

    /**
     * Emits a resize event to all registered listeners.
     * 
     * Отправляет событие изменения размера всем зарегистрированным слушателям.
     * * @param pointerScreen
     * Current pointer position in screen coordinates.
     *
     * Текущая позиция указателя в экранных координатах.
     */
    private _emit(pointerScreen: Point) {
        const corners = this._getSelectionCornersScreen();

        // Safety check: if selection is lost during drag, we shouldn't emit.
        // Проверка безопасности: если выделение пропало во время драга, не генерируем событие.
        if(!corners || corners.length < 4) {
            return;
        }

        const payload: ResizeEvent = {
            id: this.id,
            position: this._position,
            pointerScreen,
            cornersScreen: corners,
        };

        for (const listener of this._listeners) {
            listener(payload);
        }
    }
}