import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import type { IHandleTransformRotate } from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

type RotateAxis = "nw" | "ne" | "se" | "sw";

type AxisHandleEntry = {
    axis: RotateAxis;
    handle: IHandleTransformRotate;
};

const ROTATE_AXES: readonly RotateAxis[] = ["nw", "ne", "se", "sw"];

export class ModuleOverlayTransformRotate implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-rotate";

    private _context: OverlayInputContext | null = null;

    private _isRotating = false;
    private _rotateStartWorldPoint: Point | null = null;
    private _rotateStartNodeRotation = 0;
    private _rotatePivotWorldPoint: Point | null = null;

    public attach(context: OverlayInputContext): void {
        this._context = context;
    }

    public detach(): void {
        this._resetRotateSession();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        if (!this._isRotating) {
            return;
        }

        this._updateRotateFromInput();
        this._tryEndRotate();
    }

    public isActive(): boolean {
        return this._isRotating;
    }

    public hitTest(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        return this._hitTestRotateAxis(screenPoint) !== null;
    }

    public tryBegin(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay, world } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const rotateAxis = this._hitTestRotateAxis(screenPoint);
        if (!rotateAxis) {
            return false;
        }

        const node = this._getActiveNode();
        if (!node) {
            return false;
        }

        const pivotWorldPoint = this._getNodePivotWorldPoint(node);

        this._isRotating = true;
        this._rotateStartWorldPoint = world.camera.screenToWorld(screenPoint);
        this._rotateStartNodeRotation = node.getRotation();
        this._rotatePivotWorldPoint = pivotWorldPoint;

        Input.setCursor("crosshair");

        return true;
    }

    public hasNode(): boolean {
        return this._getActiveNode() !== null;
    }

    public getNodeId(): ID | null {
        return this._getActiveNode()?.id ?? null;
    }

    public setNode(node: IShapeBase): void {
        for (const { handle } of this._getAxisHandles()) {
            handle.setNode(node);
            handle.setEnabled(true);
        }
    }

    public clearNode(): void {
        for (const { handle } of this._getAxisHandles()) {
            handle.clearNode();
            handle.setEnabled(false);
        }
    }

    public getHoverCursor(screenPoint: Point): string | null {
        if (!this._context) {
            return null;
        }

        if (this._isRotating) {
            return "crosshair";
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return null;
        }

        const axis = this._hitTestRotateAxis(screenPoint);
        if (!axis) {
            return null;
        }

        return "crosshair";
    }

    private _updateRotateFromInput(): void {
        if (!this._context) {
            return;
        }

        if (!this._isRotating || !this._rotateStartWorldPoint || !this._rotatePivotWorldPoint) {
            return;
        }

        const { world } = this._context;
        const node = this._getActiveNode();

        if (!node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const currentWorldPoint = world.camera.screenToWorld(screenPoint);

        const startVector = this._subtractPoints(
            this._rotateStartWorldPoint,
            this._rotatePivotWorldPoint,
        );

        const currentVector = this._subtractPoints(
            currentWorldPoint,
            this._rotatePivotWorldPoint,
        );

        const startAngle = Math.atan2(startVector.y, startVector.x);
        const currentAngle = Math.atan2(currentVector.y, currentVector.x);

        const deltaAngleRad = currentAngle - startAngle;
        const deltaAngleDeg = deltaAngleRad * 180 / Math.PI;

        node.setRotation(this._rotateStartNodeRotation + deltaAngleDeg);

        this._context.emitChange();
    }

    private _tryEndRotate(): void {
        if (!this._isRotating) {
            return;
        }

        if (Input.getMouseButtonUp(MouseButton.Left) || !Input.getMouseButton(MouseButton.Left)) {
            this._resetRotateSession();
        }
    }

    private _resetRotateSession(): void {
        this._isRotating = false;
        this._rotateStartWorldPoint = null;
        this._rotateStartNodeRotation = 0;
        this._rotatePivotWorldPoint = null;

        Input.resetCursor();
    }

    private _getAxisHandles(): AxisHandleEntry[] {
        const entries: AxisHandleEntry[] = [];

        for (const axis of ROTATE_AXES) {
            const handle = this._getHandleById(`transform-rotate-${axis}`);

            if (!handle) {
                continue;
            }

            entries.push({ axis, handle });
        }

        return entries;
    }

    private _getHandleById(id: string): IHandleTransformRotate | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.transformHandleManager.getById(id);

        if (!this._isRotateHandle(handle)) {
            return null;
        }

        return handle;
    }

    private _isRotateHandle(value: unknown): value is IHandleTransformRotate {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<IHandleTransformRotate>;

        return (
            typeof handle.hitTest === "function" &&
            typeof handle.getNode === "function" &&
            typeof handle.hasNode === "function" &&
            typeof handle.setNode === "function" &&
            typeof handle.clearNode === "function" &&
            typeof handle.setEnabled === "function"
        );
    }

    private _getActiveNode(): IShapeBase | null {
        for (const { handle } of this._getAxisHandles()) {
            const node = handle.getNode();

            if (node) {
                return node;
            }
        }

        return null;
    }

    private _hitTestRotateAxis(screenPoint: Point): RotateAxis | null {
        if (!this._context) {
            return null;
        }

        const camera = this._context.world.camera;
        const entries = this._getAxisHandles();
        let topAxis: RotateAxis | null = null;
        let topZIndex = -Infinity;
        let topOrder = -1;

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i]!;
            const handle = entry.handle;

            if (!handle.isEnabled() || !handle.isVisible() || !handle.hasNode()) {
                continue;
            }

            const node = handle.getNode();
            if (!node) {
                continue;
            }

            const worldPoint = this._getHandleWorldPoint(handle, node);
            const screenHandlePoint = camera.worldToScreen(worldPoint);
            const hitRadius = this._getHandleHitRadius(handle);

            if (hitRadius <= 0) {
                continue;
            }

            const dx = screenPoint.x - screenHandlePoint.x;
            const dy = screenPoint.y - screenHandlePoint.y;

            if (Math.hypot(dx, dy) > hitRadius) {
                continue;
            }

            const zIndex = handle.getZIndex();
            const isAbove =
                zIndex > topZIndex ||
                (zIndex === topZIndex && i > topOrder);

            if (!isAbove) {
                continue;
            }

            topAxis = entry.axis;
            topZIndex = zIndex;
            topOrder = i;
        }

        return topAxis;
    }

    private _getHandleWorldPoint(handle: IHandleTransformRotate, node: IShapeBase): Point {
        const localViewObb = node.getLocalViewOBB();
        const localX = localViewObb.x + localViewObb.width * handle.getX();
        const localY = localViewObb.y + localViewObb.height * handle.getY();
        const matrix = node.getWorldMatrix();

        return {
            x: matrix.a * localX + matrix.c * localY + matrix.tx,
            y: matrix.b * localX + matrix.d * localY + matrix.ty,
        };
    }

    private _getNodePivotWorldPoint(node: IShapeBase): Point {
        const localObb = node.getLocalOBB();
        const pivot = node.getPivot();
        const localX = localObb.x + localObb.width * pivot.x;
        const localY = localObb.y + localObb.height * pivot.y;
        const matrix = node.getWorldMatrix();

        return {
            x: matrix.a * localX + matrix.c * localY + matrix.tx,
            y: matrix.b * localX + matrix.d * localY + matrix.ty,
        };
    }

    private _getHandleHitRadius(handle: IHandleTransformRotate): number {
        const hitWidth = handle.getHitWidth() > 0 ? handle.getHitWidth() : handle.getWidth();
        const hitHeight = handle.getHitHeight() > 0 ? handle.getHitHeight() : handle.getHeight();

        return Math.max(hitWidth, hitHeight) * 0.5;
    }

    private _getStagePointerFromInput(): Point {
        const stage = this._context!.stage;

        return Input.pointerToSurfacePoint(stage.container(), {
            width: stage.width(),
            height: stage.height(),
        });
    }

    private _subtractPoints(a: Point, b: Point): Point {
        return { x: a.x - b.x, y: a.y - b.y };
    }
}
