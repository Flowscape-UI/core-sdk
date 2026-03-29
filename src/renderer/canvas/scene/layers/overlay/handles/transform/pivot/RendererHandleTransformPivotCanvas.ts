import Konva from "konva";
import type {
    IRendererHandleTransformPivotTarget,
    IRendererHandleTransformPivot
} from "./types";
const HANDLE_RADIUS = 6;
const HANDLE_FILL = "#FFFFFF";
const HANDLE_STROKE = "#4C8DFF";
const HANDLE_STROKE_WIDTH = 1;

export class RendererHandleTransformPivotCanvas
    implements IRendererHandleTransformPivot {

    private _target: IRendererHandleTransformPivotTarget | null = null;

    private _group: Konva.Group;
    private _handle: Konva.Circle | null = null;

    constructor() {
        this._group = new Konva.Group({
            listening: false,
            visible: true,
        });
    }

    public attach(target: IRendererHandleTransformPivotTarget): void {
        this._target = target;
    }

    public detach(): void {
        this._target = null;
        this._destroyHandle();
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
            this._destroyHandle();
            return;
        }

        const worldPoint = handle.getPivotWorldPoint();

        if (!worldPoint) {
            this._destroyHandle();
            return;
        }

        const screenPoint = camera.worldToScreen(worldPoint);
        const circle = this._getOrCreateHandle();

        circle.position({
            x: screenPoint.x,
            y: screenPoint.y,
        });

        circle.visible(true);
    }

    public destroy(): void {
        this.detach();
        this._group.destroy();
        this._handle = null;
    }

    private _getOrCreateHandle(): Konva.Circle {
        if (this._handle) {
            return this._handle;
        }

        this._handle = new Konva.Circle({
            name: "transform-pivot-handle",
            listening: false,
            radius: HANDLE_RADIUS,
            fill: HANDLE_FILL,
            stroke: HANDLE_STROKE,
            strokeWidth: HANDLE_STROKE_WIDTH,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._group.add(this._handle);

        return this._handle;
    }

    private _destroyHandle(): void {
        if (!this._handle) {
            return;
        }

        this._handle.destroy();
        this._handle = null;
    }
}