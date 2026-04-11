import Konva from "konva";
import type { IRendererHandleTransform } from "./types";
import type { IRendererHandleTransformTarget } from "./types";

const OUTLINE_NAME = "transform-outline";

export class RendererHandleTransformCanvas implements IRendererHandleTransform {
    private _target: IRendererHandleTransformTarget | null = null;

    private _group: Konva.Group;
    private _outline: Konva.Line | null = null;

    constructor() {
        this._group = new Konva.Group({
            listening: false,
            visible: true,
        });
    }

    public attach(target: IRendererHandleTransformTarget): void {
        this._target = target;
    }

    public detach(): void {
        this._target = null;
        this._destroyOutline();
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
            this._destroyOutline();
            return;
        }

        const corners = handle.getObbCorners();

        if (corners.length < 4) {
            this._destroyOutline();
            return;
        }

        const outline = this._getOrCreateOutline();

        const p0 = camera.worldToScreen(corners[0]!);
        const p1 = camera.worldToScreen(corners[1]!);
        const p2 = camera.worldToScreen(corners[2]!);
        const p3 = camera.worldToScreen(corners[3]!);

        outline.points([
            p0.x, p0.y,
            p1.x, p1.y,
            p2.x, p2.y,
            p3.x, p3.y,
            p0.x, p0.y,
        ]);

        outline.visible(true);
    }

    public destroy(): void {
        this.detach();
        this._group.destroy();
        this._outline = null;
    }

    /****************************************************************/
    /*                            View                              */
    /****************************************************************/

    private _getOrCreateOutline(): Konva.Line {
        if (this._outline) {
            return this._outline;
        }

        this._outline = new Konva.Line({
            name: OUTLINE_NAME,
            listening: false,
            stroke: "#4C8DFF",
            strokeWidth: 1,
            perfectDrawEnabled: false,
        });

        this._group.add(this._outline);

        return this._outline;
    }

    private _destroyOutline(): void {
        if (this._outline) {
            this._outline.destroy();
            this._outline = null;
        }
    }
}