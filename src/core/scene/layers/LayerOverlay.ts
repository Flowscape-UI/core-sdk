// LayerOverlay.ts
import Konva from "konva";
import type { LayerWorld, Point } from "./LayerWorld";

export type WorldCorners = [Point, Point, Point, Point]; // tl, tr, br, bl

// LayerOverlay.ts
export type RotateListener = (e: {
    centerScreen: Point;
    centerWorld: Point;
    deltaRadians: number;     // изменение от старта
    angleRadians: number;     // текущий абсолютный угол (screen)
}) => void;

export type OverlayOptions = {
    listening?: boolean;
    handleSize?: number;
    borderWidth?: number;
    showHandles?: boolean;
    showBorder?: boolean;

    // NEW
    showRotateHandle?: boolean;     // default true
    rotateHandleSize?: number;      // px, default 10
    rotateHandleOffset?: number;    // px from top-mid, default 28
};

const DEFAULTS: Required<OverlayOptions> = {
    listening: true,
    handleSize: 8,
    borderWidth: 1,
    showHandles: true,
    showBorder: true,

    showRotateHandle: true,
    rotateHandleSize: 10,
    rotateHandleOffset: 28,
};

export class LayerOverlay {
    private readonly _stage: Konva.Stage;
    private readonly _world: LayerWorld;
    private readonly _opts: Required<OverlayOptions>;

    private readonly _layer: Konva.Layer;
    private readonly _root: Konva.Group;


    private _width: number;
    private _height: number;
    private _rotating: boolean = false;


    private readonly _rotateListeners = new Set<RotateListener>();
    private readonly _rotateStartListeners = new Set<() => void>();
    private readonly _rotateEndListeners = new Set<() => void>();

    private _rotateStartAngle: number = 0;

    private _rafPending = false;

    // selection state (world)
    private _selectionCornersWorld: WorldCorners | null = null;

    // render nodes
    private readonly _borderLine: Konva.Line;
    private readonly _rotateLine: Konva.Line;
    private readonly _rotateHandle: Konva.Circle;

    private readonly _handles: Konva.Rect[] = [];

    private _unsubscribeCamera: (() => void) | null = null;

    constructor(stage: Konva.Stage, world: LayerWorld, width: number, height: number, opts: OverlayOptions = {}) {
        this._stage = stage;
        this._world = world;
        this._width = width;
        this._height = height;
        this._opts = { ...DEFAULTS, ...opts };

        this._layer = new Konva.Layer({
            listening: true,
            perfectDrawEnabled: false,
        });

        this._root = new Konva.Group({ listening: true });
        this._layer.add(this._root);
        this._stage.add(this._layer);

        // Border (use Line for rotation-friendly box)
        this._borderLine = new Konva.Line({
            points: [],         // set in _redrawSelection()
            closed: true,
            stroke: "#4da3ff",
            strokeWidth: this._opts.borderWidth,
            listening: false,
        });

        // Rotate line + handle
        this._rotateLine = new Konva.Line({
            points: [],
            stroke: "#4da3ff",
            strokeWidth: 1,
            listening: false,
        });

        this._rotateHandle = new Konva.Circle({
            x: 0,
            y: 0,
            radius: this._opts.rotateHandleSize / 2,
            fill: "#ffffff",
            stroke: "#4da3ff",
            strokeWidth: 1,
            listening: true,
        });

        this._root.add(this._rotateLine);
        this._root.add(this._rotateHandle);

        this._bindRotateEvents();

        this._root.add(this._borderLine);

        // Handles (8x)
        this._createHandles();

        // Subscribe to camera changes -> redraw overlay
        this._unsubscribeCamera = this._world.onCameraChange(() => {
            this.requestDraw();
        });

        // Initial
        this._syncVisibility();
        this.requestDraw();
    }

    // ---------- Lifecycle ----------
    public destroy() {
        this._unsubscribeCamera?.();
        this._unsubscribeCamera = null;

        this._layer.destroy();
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.requestDraw();
    }

    public requestDraw() {
        if (this._rafPending) return;
        this._rafPending = true;

        requestAnimationFrame(() => {
            this._rafPending = false;
            this._redraw();
            this._layer.batchDraw();
        });
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public onRotate(cb: RotateListener) {
        this._rotateListeners.add(cb);
        return () => this._rotateListeners.delete(cb);
    }

    public onRotateStart(cb: () => void) {
        this._rotateStartListeners.add(cb);
        return () => this._rotateStartListeners.delete(cb);
    }

    public onRotateEnd(cb: () => void) {
        this._rotateEndListeners.add(cb);
        return () => this._rotateEndListeners.delete(cb);
    }

    // ---------- Selection API ----------
    /** Provide 4 world corners (tl,tr,br,bl). Overlay converts them to screen and draws border+handles. */
    public setSelectionCornersWorld(corners: WorldCorners | null) {
        this._selectionCornersWorld = corners;
        this.requestDraw();
    }

    public clearSelection() {
        this._selectionCornersWorld = null;
        this.requestDraw();
    }

    public setShowBorder(show: boolean) {
        this._opts.showBorder = show;
        this._syncVisibility();
        this.requestDraw();
    }

    public setShowHandles(show: boolean) {
        this._opts.showHandles = show;
        this._syncVisibility();
        this.requestDraw();
    }

    // ---------- Private ----------
    private _syncVisibility() {
        this._borderLine.visible(this._opts.showBorder);
        for (const h of this._handles) h.visible(this._opts.showHandles);
    }

    private _createHandles() {
        const size = this._opts.handleSize;

        for (let i = 0; i < 8; i++) {
            const r = new Konva.Rect({
                x: 0,
                y: 0,
                width: size,
                height: size,
                offsetX: size / 2,
                offsetY: size / 2,
                fill: "#ffffff",
                stroke: "#4da3ff",
                strokeWidth: 1,
                listening: true,
                draggable: false, // later: true per-handle if you want
            });

            // TODO: bind events later (hover/drag)
            // r.on("mouseenter", ...) etc.

            this._handles.push(r);
            this._root.add(r);
        }
    }

    private _redraw() {
        // If nothing selected -> hide all
        if (!this._selectionCornersWorld) {
            this._borderLine.points([]);
            for (const h of this._handles) h.visible(false);
            return;
        }

        // 1) Convert corners world -> screen
        const cornersS = this._selectionCornersWorld.map((p) => this._world.camera.worldToScreen(p)) as WorldCorners;

        // 2) Border line points
        const pts: number[] = [];
        for (const p of cornersS) {
            pts.push(p.x, p.y);
        }
        this._borderLine.points(pts);

        // 3) Handles positions (8: 4 corners + 4 midpoints)
        const [tl, tr, br, bl] = cornersS;

        const tm = this._mid(tl, tr);
        const rm = this._mid(tr, br);
        const bm = this._mid(bl, br);
        const lm = this._mid(tl, bl);

        const handlePoints: Point[] = [tl, tm, tr, rm, br, bm, bl, lm];

        // show handles only if enabled
        const shouldShowHandles = this._opts.showHandles;

        for (let i = 0; i < this._handles.length; i++) {
            const h = this._handles[i];
            const p = handlePoints[i];

            h.position({ x: p.x, y: p.y });
            h.visible(shouldShowHandles);

            // later: set cursor based on handle index & rotation
        }

        // show border only if enabled
        this._borderLine.visible(this._opts.showBorder);


        // Rotate handle
        if (!this._opts.showRotateHandle) {
            this._rotateLine.points([]);
            this._rotateHandle.visible(false);
            return;
        }

        const center = this._mid(this._mid(tl, tr), this._mid(bl, br));
        const topMid = this._mid(tl, tr);

        // направление "наружу" от бокса (от центра к topMid)
        const dir = this._norm({ x: topMid.x - center.x, y: topMid.y - center.y });
        const offset = this._opts.rotateHandleOffset;

        const handlePos = { x: topMid.x + dir.x * offset, y: topMid.y + dir.y * offset };

        this._rotateLine.points([topMid.x, topMid.y, handlePos.x, handlePos.y]);
        this._rotateHandle.position(handlePos);
        this._rotateHandle.visible(true);
    }

    private _mid(a: Point, b: Point): Point {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    private _bindRotateEvents() {
    // hover курсор
    this._rotateHandle.on("mouseover", () => {
        this._stage.container().style.cursor = "crosshair";
    });

    this._rotateHandle.on("mouseout", () => {
        if (!this._rotating) {
            this._stage.container().style.cursor = "";
        }
    });

    // START ROTATE
    this._rotateHandle.on("mousedown touchstart", (e) => {
        if (!this._selectionCornersWorld) return;
        if (e.evt.cancelable) e.evt.preventDefault();

        // Обновляем pointer position из нативного события
        this._stage.setPointersPositions(e.evt);

        const p = this._stage.getPointerPosition();
        if (!p) return;

        this._rotating = true;
        this._rotateStartAngle = this._angleAroundSelectionCenter({ x: p.x, y: p.y });

        this._stage.container().style.cursor = "crosshair";

        // 🔥 Захватываем глобальные события (drag capture)
        window.addEventListener("mousemove", this._onRotateMove, { passive: false });
        window.addEventListener("mouseup", this._onRotateUp, { passive: false });
        window.addEventListener("touchmove", this._onRotateMove, { passive: false });
        window.addEventListener("touchend", this._onRotateUp, { passive: false });

        // emit start
        for (const cb of this._rotateStartListeners) cb();
    });
}

    private _onRotateMove = (ev: MouseEvent | TouchEvent) => {
        if (!this._rotating) return;
        if (!this._selectionCornersWorld) return;

        if ((ev as any).cancelable) ev.preventDefault();

        // важно: обновить pointer pos Konva из нативного события
        this._stage.setPointersPositions(ev as any);

        const p = this._stage.getPointerPosition();
        if (!p) return;

        const angle = this._angleAroundSelectionCenter({ x: p.x, y: p.y });
        const delta = this._normalizeAngle(angle - this._rotateStartAngle);

        const centerScreen = this._getSelectionCenterScreen();
        const centerWorld = this._getSelectionCenterWorld();

        for (const cb of this._rotateListeners) {
            cb({ centerScreen, centerWorld, deltaRadians: delta, angleRadians: angle });
        }
    };

    private _onRotateUp = (ev: MouseEvent | TouchEvent) => {
        if (!this._rotating) return;

        if ((ev as any).cancelable) ev.preventDefault();

        this._rotating = false;
        this._stage.container().style.cursor = "";

        window.removeEventListener("mousemove", this._onRotateMove);
        window.removeEventListener("mouseup", this._onRotateUp);
        window.removeEventListener("touchmove", this._onRotateMove);
        window.removeEventListener("touchend", this._onRotateUp);
    };

    private _getSelectionCenterWorld(): Point {
        const [tl, tr, br, bl] = this._selectionCornersWorld!;
        return this._mid(this._mid(tl, tr), this._mid(bl, br));
    }

    private _getSelectionCenterScreen(): Point {
        const centerW = this._getSelectionCenterWorld();
        return this._world.camera.worldToScreen(centerW);
    }

    private _angleAroundSelectionCenter(pointerScreen: Point): number {
        const c = this._getSelectionCenterScreen();
        return Math.atan2(pointerScreen.y - c.y, pointerScreen.x - c.x);
    }

    private _normalizeAngle(a: number): number {
        // привести к [-PI, PI] чтобы дельта не прыгала на 2π
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    private _norm(v: Point): Point {
        const len = Math.hypot(v.x, v.y) || 1;
        return { x: v.x / len, y: v.y / len };
    }
}

export function getNodeWorldCorners(node: Konva.Node, worldRoot: Konva.Group): WorldCorners {
    // локальный AABB ноды (без её transform)
    const r = node.getClientRect({ skipTransform: true });

    const local: Point[] = [
        { x: r.x, y: r.y },                       // tl
        { x: r.x + r.width, y: r.y },             // tr
        { x: r.x + r.width, y: r.y + r.height },  // br
        { x: r.x, y: r.y + r.height },            // bl
    ];

    // 1) local -> STAGE (включая камеру)
    const nodeAbs = node.getAbsoluteTransform();

    // 2) STAGE -> WORLD (убираем камеру)
    const worldAbs = worldRoot.getAbsoluteTransform().copy().invert();

    const world = local.map((p) => {
        const stageP = nodeAbs.point(p);
        const w = worldAbs.point(stageP);
        return { x: w.x, y: w.y };
    });

    return world as WorldCorners;
}