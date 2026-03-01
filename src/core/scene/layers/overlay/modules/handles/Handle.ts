import Konva from "konva";
import type { OverlayContext } from "../../types";
import type { Point } from "./DragSession";
import { centerFromCorners } from "../../utils";
import { OverlayHandleView, type HandlePositionSpec } from "../HandleView";


export type HandleOptions = {
    type: 'circle' | 'square' | 'line',
    size: number,
    offset: Point,
    position: HandlePositionSpec,
    style: {
        cursor?: Cursor;
        background?: string;
        borderColor?: string;
        borderWidth?: number;
        opacity?: number;
    }
}

export type Cursor = 
    'auto' |
    'default' |
    'nonce' |
    'context-menu' |
    'help' |
    'pointer' |
    'progress' |
    'wait' |
    'cell' |
    'crosshair' |
    'text' |
    'vertical-text' |
    'alias' |
    'copy' |
    'move' |
    'no-drop' |
    'not-allowed' |
    'grab' |
    'grabbing' |
    'all-scroll' |
    'col-resize' |
    'row-resize' |
    'n-resize' |
    'e-resize' |
    's-resize' |
    'w-resize' |
    'ne-resize' |
    'nw-resize' |
    'se-resize' |
    'sw-resize' |
    'ew-resize' |
    'ns-resize' |
    'nesw-resize' |
    'nwse-resize' |
    'zoom-in' |
    'zoom-out'
;


export abstract class Handle {
    public readonly id: string;
    public readonly node: Konva.Group | Konva.Shape;

    private readonly _view: OverlayHandleView;

    protected readonly _position: HandlePositionSpec;
    protected readonly _cursor: Cursor;
    protected _ctx: OverlayContext | null = null;

    private _invalidate: (() => void) | null = null;

    private _isDragging: boolean;
    private _isInteractionEnabled: boolean;


    constructor(
        id: string,
        options: HandleOptions,
        node?: Konva.Group | Konva.Shape,
    ) {
        this.id = id;
        
        this._isDragging = false;
        this._isInteractionEnabled = true;
        this._cursor = options.style.cursor ?? 'auto';
        this._position = options.position;
        
        this._view = new OverlayHandleView({
            type: options.type,
            size: options.size,
            style: options.style,
        });
        
        this.node = node ?? this._view.getRoot();
        this._view.setOffset(options.offset.x, options.offset.y);
        this._view.setPosition(this._position);
    }

    public isDragging(): boolean {
        return this._isDragging;
    }

    public isInteractionEnabled(): boolean {
        return this._isInteractionEnabled;
    }

    public setIsDragging(value: boolean): void {
        this._isDragging = value;
    }

    public setIsInteractionEnabled(value: boolean): void {
        this._isInteractionEnabled = value;
    }

    // ----- lifecycle -----

    public setContext(ctx: OverlayContext) {
        this._ctx = ctx;
    }

    public draw() {
        const box = this._getSelectionAabbScreen();
        if (!box) {
            this.node.visible(false);
            return;
        }

        this._view.updateByBox(box);
        this.node.visible(true);
    }

    public destroy(): void {
        const context = this._ctx;

        this._isDragging = false;
        this._isInteractionEnabled = false;
        if (context) {
            context.drag.stop();
            context.stage.container().style.cursor = "";
        }
        this.node.destroy();

        this._ctx = null;
        this._invalidate = null;
    }

    // ----- redraw control -----

    public setInvalidate(fn: () => void) {
        this._invalidate = fn;
    }

    // Handle.ts (добавь внутрь класса Handle)
    protected _getSelectionCornersScreen(): Point[] | null {
        const ctx = this._ctx;
        const sel = ctx?.selectionCornersWorld;
        if (!ctx || !sel) return null;
        return sel.map((p) => ctx.world.camera.worldToScreen(p));
    }

    protected _getSelectionCenterWorld(): Point | null {
        const ctx = this._ctx;
        const sel = ctx?.selectionCornersWorld;
        if (!ctx || !sel) return null;
        return centerFromCorners(sel);
    }

    protected _getSelectionCenterScreen(): Point | null {
        const ctx = this._ctx;
        const cW = this._getSelectionCenterWorld();
        if (!ctx || !cW) return null;
        return ctx.world.camera.worldToScreen(cW);
    }

    protected _callInvalidate() {
        this._invalidate?.();
    }

    protected _getSelectionAabbScreen() {
        if (!this._ctx?.selectionCornersWorld) return null;

        const sel = this._ctx.selectionCornersWorld;
        const camera = this._ctx.world.camera;

        const cornersS = sel.map(p => camera.worldToScreen(p));

        const xs = cornersS.map(p => p.x);
        const ys = cornersS.map(p => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            center: {
                x: (minX + maxX) / 2,
                y: (minY + maxY) / 2,
            },
            corners: cornersS,
        };
    }
}