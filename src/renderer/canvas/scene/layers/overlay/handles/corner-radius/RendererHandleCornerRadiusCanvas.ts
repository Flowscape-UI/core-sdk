import Konva from "konva";

import type { IRendererHandleCornerRadius } from "./types";
import type { IRendererHandleCornerRadiusTarget } from "./types";
import type { CornerRadiusAxis, CornerRadiusSection } from "../../../../../../../core/scene/layers/overlay";
import type { Point } from "../../../../../../../core/camera";

const AXES: readonly CornerRadiusAxis[] = ["tl", "tr", "br", "bl"];

/**
 * Main handle style
 */
const HANDLE_RADIUS = 5;
const HANDLE_FILL = "#FFFFFF";
const HANDLE_STROKE = "#4C8DFF";
const HANDLE_STROKE_WIDTH = 1;


const DEBUG_SECTION_STROKE = "#FF9F0A";
const DEBUG_SECTION_STROKE_WIDTH = 1;
const DEBUG_SECTION_OPACITY = 0.9;

const DEBUG_DIAGONAL_STROKE = "#FF2D55";
const DEBUG_DIAGONAL_STROKE_WIDTH = 1;

const DEBUG_ORIGIN_RADIUS = 2.5;
const DEBUG_ORIGIN_FILL = "#FF2D55";

export class RendererHandleCornerRadiusCanvas implements IRendererHandleCornerRadius {

    private _target: IRendererHandleCornerRadiusTarget | null = null;

    private readonly _group: Konva.Group;
    private readonly _debugGroup: Konva.Group;
    private readonly _handlesGroup: Konva.Group;

    private readonly _handles: Map<CornerRadiusAxis, Konva.Circle>;
    private readonly _debugSections: Map<CornerRadiusAxis, Konva.Line>;
    private readonly _debugDiagonals: Map<CornerRadiusAxis, Konva.Line>;
    private readonly _debugOrigins: Map<CornerRadiusAxis, Konva.Circle>;

    constructor() {
        this._group = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._debugGroup = new Konva.Group({
            listening: false,
            visible: false,
        });

        this._handlesGroup = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._handles = new Map();
        this._debugSections = new Map();
        this._debugDiagonals = new Map();
        this._debugOrigins = new Map();

        this._group.add(this._debugGroup);
        this._group.add(this._handlesGroup);
    }

    public attach(target: IRendererHandleCornerRadiusTarget): void {
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

        if (!handle || !handle.isEnabled() || !handle.hasNode()) {
            this._destroyView();
            return;
        }

        this._updateHandles();

        if (handle.isDebugEnabled()) {
            this._updateDebugSections();
        } else {
            this._destroyDebug();
        }
    }

    public destroy(): void {
        this.detach();
        this._group.destroy();

        this._handles.clear();
        this._debugSections.clear();
        this._debugDiagonals.clear();
        this._debugOrigins.clear();
    }

    /****************************************************************/
    /*                           Update                             */
    /****************************************************************/

    private _updateHandles(): void {
        const handle = this._target?.getHandle();
        const camera = this._target?.getCamera();

        if (!handle || !camera) {
            this._destroyHandles();
            return;
        }

        for (const axis of AXES) {
            const point = handle.getHandleWorldPoint(axis);

            if (!point) {
                this._destroyHandle(axis);
                continue;
            }

            const screenPoint = camera.worldToScreen(point);
            const circle = this._getOrCreateHandle(axis);

            circle.position({
                x: screenPoint.x,
                y: screenPoint.y,
            });

            circle.visible(true);
        }
    }

    private _updateDebugSections(): void {
        const handle = this._target?.getHandle();
        const camera = this._target?.getCamera();

        if (!handle || !camera) {
            this._destroyDebug();
            return;
        }

        for (const axis of AXES) {
            const section = handle.getSection(axis);

            if (!section) {
                this._destroyDebugAxis(axis);
                continue;
            }

            this._updateDebugSection(axis, section, camera);
            this._updateDebugDiagonal(axis, section, camera);
            this._updateDebugOrigin(axis, section, camera);
        }
    }

    private _updateDebugSection(
        axis: CornerRadiusAxis,
        section: CornerRadiusSection,
        camera: IRendererHandleCornerRadiusTarget["getCamera"] extends () => infer T ? T : never,
    ): void {
        const polygon = this._getOrCreateDebugSection(axis);

        const p0 = camera.worldToScreen(section.origin);
        const p1 = camera.worldToScreen(section.xAxisPoint);
        const p2 = camera.worldToScreen(this._getSectionDiagonalPoint(section));
        const p3 = camera.worldToScreen(section.yAxisPoint);

        polygon.points([
            p0.x, p0.y,
            p1.x, p1.y,
            p2.x, p2.y,
            p3.x, p3.y,
        ]);

        polygon.closed(true);
        polygon.visible(true);
    }

    private _updateDebugDiagonal(
        axis: CornerRadiusAxis,
        section: CornerRadiusSection,
        camera: IRendererHandleCornerRadiusTarget["getCamera"] extends () => infer T ? T : never,
    ): void {
        const diagonal = this._getOrCreateDebugDiagonal(axis);

        const start = camera.worldToScreen(section.origin);
        const end = camera.worldToScreen(this._getSectionDiagonalPoint(section));

        diagonal.points([
            start.x, start.y,
            end.x, end.y,
        ]);

        diagonal.visible(true);
    }

    private _updateDebugOrigin(
        axis: CornerRadiusAxis,
        section: CornerRadiusSection,
        camera: IRendererHandleCornerRadiusTarget["getCamera"] extends () => infer T ? T : never,
    ): void {
        const origin = this._getOrCreateDebugOrigin(axis);
        const point = camera.worldToScreen(section.origin);

        origin.position({
            x: point.x,
            y: point.y,
        });

        origin.visible(true);
    }

    /****************************************************************/
    /*                            View                              */
    /****************************************************************/

    private _getOrCreateHandle(axis: CornerRadiusAxis): Konva.Circle {
        const existing = this._handles.get(axis);

        if (existing) {
            return existing;
        }

        const circle = new Konva.Circle({
            name: `corner-radius-handle-${axis}`,
            listening: false,
            radius: HANDLE_RADIUS,
            fill: HANDLE_FILL,
            stroke: HANDLE_STROKE,
            strokeWidth: HANDLE_STROKE_WIDTH,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._handles.set(axis, circle);
        this._handlesGroup.add(circle);

        return circle;
    }

    private _getOrCreateDebugSection(axis: CornerRadiusAxis): Konva.Line {
        const existing = this._debugSections.get(axis);

        if (existing) {
            return existing;
        }

        const polygon = new Konva.Line({
            name: `corner-radius-debug-section-${axis}`,
            listening: false,
            stroke: DEBUG_SECTION_STROKE,
            strokeWidth: DEBUG_SECTION_STROKE_WIDTH,
            opacity: DEBUG_SECTION_OPACITY,
            perfectDrawEnabled: false,
            closed: true,
            visible: true,
        });

        this._debugSections.set(axis, polygon);
        this._debugGroup.add(polygon);

        return polygon;
    }

    private _getOrCreateDebugDiagonal(axis: CornerRadiusAxis): Konva.Line {
        const existing = this._debugDiagonals.get(axis);

        if (existing) {
            return existing;
        }

        const line = new Konva.Line({
            name: `corner-radius-debug-diagonal-${axis}`,
            listening: false,
            stroke: DEBUG_DIAGONAL_STROKE,
            strokeWidth: DEBUG_DIAGONAL_STROKE_WIDTH,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._debugDiagonals.set(axis, line);
        this._debugGroup.add(line);

        return line;
    }

    private _getOrCreateDebugOrigin(axis: CornerRadiusAxis): Konva.Circle {
        const existing = this._debugOrigins.get(axis);

        if (existing) {
            return existing;
        }

        const circle = new Konva.Circle({
            name: `corner-radius-debug-origin-${axis}`,
            listening: false,
            radius: DEBUG_ORIGIN_RADIUS,
            fill: DEBUG_ORIGIN_FILL,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._debugOrigins.set(axis, circle);
        this._debugGroup.add(circle);

        return circle;
    }

    /****************************************************************/
    /*                          Destroy                             */
    /****************************************************************/

    private _destroyHandle(axis: CornerRadiusAxis): void {
        const handle = this._handles.get(axis);

        if (!handle) {
            return;
        }

        handle.destroy();
        this._handles.delete(axis);
    }

    private _destroyHandles(): void {
        for (const axis of Array.from(this._handles.keys())) {
            this._destroyHandle(axis);
        }
    }

    private _destroyDebugAxis(axis: CornerRadiusAxis): void {
        const section = this._debugSections.get(axis);
        if (section) {
            section.destroy();
            this._debugSections.delete(axis);
        }

        const diagonal = this._debugDiagonals.get(axis);
        if (diagonal) {
            diagonal.destroy();
            this._debugDiagonals.delete(axis);
        }

        const origin = this._debugOrigins.get(axis);
        if (origin) {
            origin.destroy();
            this._debugOrigins.delete(axis);
        }
    }

    private _destroyDebug(): void {
        for (const axis of AXES) {
            this._destroyDebugAxis(axis);
        }
    }

    private _destroyView(): void {
        this._destroyHandles();
        this._destroyDebug();
    }

    /****************************************************************/
    /*                          Helpers                             */
    /****************************************************************/

    /**
     * 4th corner of section rectangle/parallelogram:
     * origin + (xAxisPoint - origin) + (yAxisPoint - origin)
     */
    private _getSectionDiagonalPoint(section: CornerRadiusSection): Point {
        return {
            x: section.xAxisPoint.x + section.yAxisPoint.x - section.origin.x,
            y: section.xAxisPoint.y + section.yAxisPoint.y - section.origin.y,
        };
    }
}