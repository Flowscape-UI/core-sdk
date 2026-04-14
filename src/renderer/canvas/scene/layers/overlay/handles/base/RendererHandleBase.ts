import Konva from "konva";
import {
    type IShapeBase,
    type ShapePathCommand,
} from "../../../../../../../nodes";
import type { ICamera, Point } from "../../../../../../../core/camera";
import type { Matrix } from "../../../../../../../core/transform/types";
import type { IHandleBase } from "../../../../../../../scene";
import type { RendererHandleTarget } from "./RendererHandleTarget";
import type { IRendererHandleBase } from "./types";

type RectPathShape = {
    worldMatrix: Matrix;
    commands: readonly ShapePathCommand[];
};

export abstract class RendererHandleBase<T extends IHandleBase> implements IRendererHandleBase<T> {
    protected readonly _root: Konva.Group;
    protected readonly _contentGroup: Konva.Group;
    protected readonly _debugGroup: Konva.Group;

    private _target: RendererHandleTarget<T> | null;

    constructor() {
        this._root = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._contentGroup = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._debugGroup = new Konva.Group({
            listening: false,
            visible: false,
        });

        this._target = null;

        this._root.add(this._contentGroup);
        this._root.add(this._debugGroup);
    }

    public attach(target: RendererHandleTarget<T>): void {
        if (this._target) {
            this.detach();
        }

        this._target = target;
        this._onAttach(target);
    }

    public detach(): void {
        const target = this._target;

        if (!target) {
            return;
        }

        this._target = null;
        this._onDetach(target);
        this._clearView();
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    public render(): void {
        // Overlay layer will be drawn by layer renderer
    }

    public update(): void {
        const target = this._target;
        const handle = target?.getHandle();

        if (!handle || !handle.isEnabled() || !handle.hasNode()) {
            this._clearView();
            return;
        }

        this._debugGroup.visible(handle.isEnabledDebug());
        this._onUpdate(target!);
    }

    public destroy(): void {
        this.detach();
        this._onDestroy();
        this._root.destroy();
    }

    protected _getTarget(): RendererHandleTarget<T> | null {
        return this._target;
    }

    protected _getHandle(): T | null {
        return this._target?.getHandle() ?? null;
    }

    protected _getCamera(): ICamera | null {
        return this._target?.getCamera() ?? null;
    }

    protected _getNode(handle: T): IShapeBase | null {
        return handle.getNode();
    }

    protected _getHandleWorldPoint(handle: T, node: IShapeBase): Point {
        const localViewObb = node.getLocalViewOBB();
        const localX = localViewObb.x + localViewObb.width * handle.getX();
        const localY = localViewObb.y + localViewObb.height * handle.getY();
        const matrix = node.getWorldMatrix();

        return {
            x: matrix.a * localX + matrix.c * localY + matrix.tx,
            y: matrix.b * localX + matrix.d * localY + matrix.ty,
        };
    }

    protected _getNodeWorldOutlinePoints(node: IShapeBase): Point[] {
        const shape = this._tryGetPathShape(node);

        if (shape) {
            return this._pathToWorldPoints(shape);
        }

        return [...node.getWorldViewCorners()];
    }

    protected _toScreenPoint(point: Point): Point {
        const camera = this._getCamera();

        if (!camera) {
            return point;
        }

        return camera.worldToScreen(point);
    }

    protected _toScreenPoints(points: readonly Point[]): Point[] {
        return points.map((point) => this._toScreenPoint(point));
    }

    protected _flattenPoints(points: readonly Point[]): number[] {
        const out: number[] = [];

        for (const point of points) {
            out.push(point.x, point.y);
        }

        return out;
    }

    protected _clearGroup(group: Konva.Group): void {
        group.destroyChildren();
    }

    protected _onAttach(_target: RendererHandleTarget<T>): void {
        // Optional in subclasses
    }

    protected _onDetach(_target: RendererHandleTarget<T>): void {
        // Optional in subclasses
    }

    protected _onDestroy(): void {
        // Optional in subclasses
    }

    protected _onClearView(): void {
        // Optional in subclasses
    }

    protected abstract _onUpdate(target: RendererHandleTarget<T>): void;

    
    protected _applyMatrix(point: Point, matrix: Matrix): Point {
        return {
            x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
            y: matrix.b * point.x + matrix.d * point.y + matrix.ty,
        };
    }

    private _clearView(): void {
        this._onClearView();
        this._clearGroup(this._contentGroup);
        this._clearGroup(this._debugGroup);
    }

    private _tryGetPathShape(node: IShapeBase): RectPathShape | null {
        if (!("toPathCommands" in node) || typeof (node as { toPathCommands?: unknown }).toPathCommands !== "function") {
            return null;
        }

        const commands = (node as { toPathCommands(): unknown }).toPathCommands();
        if (!Array.isArray(commands)) {
            return null;
        }

        return {
            worldMatrix: node.getWorldMatrix(),
            commands: commands as readonly ShapePathCommand[],
        };
    }

    private _pathToWorldPoints(shape: RectPathShape): Point[] {
        const points: Point[] = [];

        for (const command of shape.commands) {
            if (command.type === "moveTo" || command.type === "lineTo") {
                points.push(this._applyMatrix(command.point, shape.worldMatrix));
                continue;
            }

            if (command.type === "arcTo") {
                points.push(...this._arcToWorldPoints(command, shape.worldMatrix));
            }
        }

        return this._collapseDuplicatePoints(points);
    }

    private _arcToWorldPoints(command: Extract<ShapePathCommand, { type: "arcTo" }>, matrix: Matrix): Point[] {
        const start = this._degToRad(command.startAngle);
        const end = this._degToRad(command.endAngle);

        let delta = end - start;

        if (command.clockwise && delta < 0) {
            delta += Math.PI * 2;
        }

        if (!command.clockwise && delta > 0) {
            delta -= Math.PI * 2;
        }

        const segments = Math.max(4, Math.ceil(Math.abs(delta) / (Math.PI / 18)));
        const points: Point[] = [];

        for (let i = 1; i <= segments; i += 1) {
            const t = i / segments;
            const angle = start + delta * t;

            const localPoint = {
                x: command.center.x + command.radiusX * Math.cos(angle),
                y: command.center.y + command.radiusY * Math.sin(angle),
            };

            points.push(this._applyMatrix(localPoint, matrix));
        }

        return points;
    }

    private _collapseDuplicatePoints(points: Point[]): Point[] {
        if (points.length === 0) {
            return points;
        }

        const collapsed: Point[] = [points[0]!];

        for (let i = 1; i < points.length; i += 1) {
            const prev = collapsed[collapsed.length - 1]!;
            const next = points[i]!;

            const sameX = Math.abs(prev.x - next.x) < 1e-6;
            const sameY = Math.abs(prev.y - next.y) < 1e-6;

            if (sameX && sameY) {
                continue;
            }

            collapsed.push(next);
        }

        return collapsed;
    }

    private _degToRad(value: number): number {
        return (value * Math.PI) / 180;
    }
}
