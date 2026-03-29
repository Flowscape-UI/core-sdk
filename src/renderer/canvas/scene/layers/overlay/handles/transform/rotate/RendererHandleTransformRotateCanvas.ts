import Konva from "konva";
import type { TransformRotateAxis } from "../../../../../../../../core/scene/layers/overlay/handles/transform/rotate";
import type { IRendererHandleTransformRotate } from "./types";
import type { IRendererHandleTransformRotateTarget } from "./types";

const HANDLE_NAMES: readonly TransformRotateAxis[] = ["ne", "nw", "se", "sw"];

const HANDLE_RADIUS = 18;
// const HANDLE_FILL = "#FFFFFF";
// const HANDLE_STROKE = "#4C8DFF";
// const HANDLE_STROKE_WIDTH = 1;

export class RendererHandleTransformRotateCanvas implements IRendererHandleTransformRotate {
    private _target: IRendererHandleTransformRotateTarget | null = null;

    private _group: Konva.Group;
    private _handles: Map<string, Konva.Circle>;

    constructor() {
        this._group = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._handles = new Map();
    }

    public attach(target: IRendererHandleTransformRotateTarget): void {
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

        // console.log(handle, camera, handle?.isEnabled(), handle?.hasNode())

        if (!handle || !camera || !handle.isEnabled() || !handle.hasNode()) {
            this._destroyView();
            return;
        }

        for (const axis of HANDLE_NAMES) {
            const worldPoint = handle.getHandleWorldPoint(axis);

            if (!worldPoint) {
                this._destroyHandle(axis);
                continue;
            }

            const screenPoint = camera.worldToScreen(worldPoint);
            const circle = this._getOrCreateHandle(axis);

            circle.position({
                x: screenPoint.x,
                y: screenPoint.y,
            });

            circle.visible(true);
        }
    }

    public destroy(): void {
        this.detach();
        this._group.destroy();
        this._handles.clear();
    }

    private _getOrCreateHandle(axis: string): Konva.Circle {
        const existing = this._handles.get(axis);

        if (existing) {
            return existing;
        }

        const circle = new Konva.Circle({
            name: `transform-rotate-handle-${axis}`,
            listening: false,
            radius: HANDLE_RADIUS,
            // fill: HANDLE_FILL,
            // stroke: HANDLE_STROKE,
            // strokeWidth: HANDLE_STROKE_WIDTH,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._handles.set(axis, circle);
        this._group.add(circle);

        return circle;
    }

    private _destroyHandle(axis: string): void {
        const handle = this._handles.get(axis);

        if (!handle) {
            return;
        }

        handle.destroy();
        this._handles.delete(axis);
    }

    private _destroyView(): void {
        for (const axis of Array.from(this._handles.keys())) {
            this._destroyHandle(axis);
        }
    }
}