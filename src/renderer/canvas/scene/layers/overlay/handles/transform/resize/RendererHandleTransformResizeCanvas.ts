import Konva from "konva";
import type { IRendererHandleTransformResize } from "./types";
import type { IRendererHandleTransformResizeTarget } from "./types";
import type { TransformResizeAxis } from "../../../../../../../../scene/layers";

const EDGE_NAMES: readonly ["n", "e", "s", "w"] = ["n", "e", "s", "w"];
const HANDLE_NAMES: readonly TransformResizeAxis[] = [
    "ne",
    "nw",
    "se",
    "sw",
];

const HANDLE_SIZE = 8;
const EDGE_STROKE = "#4C8DFF";
const EDGE_STROKE_WIDTH = 2;
const HANDLE_FILL = "#FFFFFF";
const HANDLE_STROKE = "#4C8DFF";
const HANDLE_STROKE_WIDTH = 1;

export class RendererHandleTransformResizeCanvas
    implements IRendererHandleTransformResize {

    private _target: IRendererHandleTransformResizeTarget | null = null;

    private _group: Konva.Group;
    private _edgesGroup: Konva.Group;
    private _handlesGroup: Konva.Group;

    private _edges: Map<string, Konva.Line>;
    private _handles: Map<string, Konva.Rect>;

    constructor() {
        this._group = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._edgesGroup = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._handlesGroup = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._edges = new Map();
        this._handles = new Map();

        this._group.add(this._edgesGroup);
        this._group.add(this._handlesGroup);
    }

    public attach(target: IRendererHandleTransformResizeTarget): void {
        this._target = target;
    }

    public detach(): void {
        this._target = null;
        this._destroyView();
    }

    public getRoot(): Konva.Group {
        return this._group;
    }

    public render(): void {

    }

    public update(): void {
        const handle = this._target?.getHandle();
        const camera = this._target?.getCamera();

        if (!handle || !camera || !handle.isEnabled() || !handle.hasNode()) {
            this._destroyView();
            return;
        }

        this._updateEdges();
        this._updateHandles();
    }

    public destroy(): void {
        this.detach();
        this._group.destroy();
        this._edges.clear();
        this._handles.clear();
    }

    /****************************************************************/
    /*                           Update                             */
    /****************************************************************/

    private _updateEdges(): void {
        const handle = this._target?.getHandle();
        const camera = this._target?.getCamera();

        if (!handle || !camera) {
            this._destroyEdges();
            return;
        }

        for (const axis of EDGE_NAMES) {
            const edge = handle.getEdgeWorldPoints(axis);

            if (!edge) {
                this._destroyEdge(axis);
                continue;
            }

            const p0 = camera.worldToScreen(edge[0]);
            const p1 = camera.worldToScreen(edge[1]);

            const line = this._getOrCreateEdge(axis);
            line.points([
                p0.x, p0.y,
                p1.x, p1.y,
            ]);
            line.visible(true);
        }
    }

    private _updateHandles(): void {
    const handle = this._target?.getHandle();
    const camera = this._target?.getCamera();

    if (!handle || !camera) {
        this._destroyHandles();
        return;
    }

    const topEdge = handle.getEdgeWorldPoints("n");

    if (!topEdge) {
        this._destroyHandles();
        return;
    }

    const topStart = camera.worldToScreen(topEdge[0]);
    const topEnd = camera.worldToScreen(topEdge[1]);

    const angleRad = Math.atan2(topEnd.y - topStart.y, topEnd.x - topStart.x);
    const angleDeg = angleRad * 180 / Math.PI;

    for (const axis of HANDLE_NAMES) {
        const point = handle.getHandleWorldPoint(axis);

        if (!point) {
            this._destroyHandle(axis);
            continue;
        }

        const screenPoint = camera.worldToScreen(point);
        const rect = this._getOrCreateHandle(axis);

        rect.position({
            x: screenPoint.x,
            y: screenPoint.y,
        });

        rect.rotation(angleDeg);
        rect.visible(true);
    }
}

    /****************************************************************/
    /*                            View                              */
    /****************************************************************/

    private _getOrCreateEdge(axis: string): Konva.Line {
        const existing = this._edges.get(axis);

        if (existing) {
            return existing;
        }

        const line = new Konva.Line({
            name: `transform-resize-edge-${axis}`,
            listening: false,
            stroke: EDGE_STROKE,
            strokeWidth: EDGE_STROKE_WIDTH,
            perfectDrawEnabled: false,
        });

        this._edges.set(axis, line);
        this._edgesGroup.add(line);

        return line;
    }

    private _getOrCreateHandle(axis: string): Konva.Rect {
    const existing = this._handles.get(axis);

    if (existing) {
        return existing;
    }

    const rect = new Konva.Rect({
        name: `transform-resize-handle-${axis}`,
        listening: false,
        fill: HANDLE_FILL,
        stroke: HANDLE_STROKE,
        strokeWidth: HANDLE_STROKE_WIDTH,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        offsetX: HANDLE_SIZE * 0.5,
        offsetY: HANDLE_SIZE * 0.5,
        perfectDrawEnabled: false,
        visible: true,
    });

    this._handles.set(axis, rect);
    this._handlesGroup.add(rect);

    return rect;
}

    private _destroyEdge(axis: string): void {
        const edge = this._edges.get(axis);

        if (!edge) {
            return;
        }

        edge.destroy();
        this._edges.delete(axis);
    }

    private _destroyHandle(axis: string): void {
        const handle = this._handles.get(axis);

        if (!handle) {
            return;
        }

        handle.destroy();
        this._handles.delete(axis);
    }

    private _destroyEdges(): void {
        for (const axis of Array.from(this._edges.keys())) {
            this._destroyEdge(axis);
        }
    }

    private _destroyHandles(): void {
        for (const axis of Array.from(this._handles.keys())) {
            this._destroyHandle(axis);
        }
    }

    private _destroyView(): void {
        this._destroyEdges();
        this._destroyHandles();
    }
}