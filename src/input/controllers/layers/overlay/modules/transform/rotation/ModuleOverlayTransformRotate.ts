import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import {
    HandleTransformRotate,
    type IHandleTransformRotate,
    type TransformRotateAxis,
} from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

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

        const rotateHandle = this._getHandle();
        if (!rotateHandle || !rotateHandle.isEnabled() || !rotateHandle.hasNode()) {
            return false;
        }

        const rotateAxis = this._hitTestRotateAxis(screenPoint);
        if (!rotateAxis) {
            return false;
        }

        const node = rotateHandle.getNode();
        if (!node) {
            return false;
        }

        const pivotWorldPoint = rotateHandle.getPivotWorldPoint();
        if (!pivotWorldPoint) {
            return false;
        }

        this._isRotating = true;
        this._rotateStartWorldPoint = world.getCamera().screenToWorld(screenPoint);
        this._rotateStartNodeRotation = node.getRotation();
        this._rotatePivotWorldPoint = pivotWorldPoint;


Input.setCursor("crosshair");

        return true;
    }

    public hasNode(): boolean {
        const handle = this._getHandle();
        return handle?.hasNode() ?? false;
    }

    public getNodeId(): ID | null {
        const handle = this._getHandle();
        return handle?.getNodeId() ?? null;
    }

    public setNode(node: IShapeBase): void {
        const handle = this._getHandle();
        handle?.setNode(node);
    }

    public clearNode(): void {
        const handle = this._getHandle();
        handle?.clearNode();
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

        if (
            !this._isRotating ||
            !this._rotateStartWorldPoint ||
            !this._rotatePivotWorldPoint
        ) {
            return;
        }

        const { world } = this._context;
        const rotateHandle = this._getHandle();
        const node = rotateHandle?.getNode();

        if (!node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const currentWorldPoint = world.getCamera().screenToWorld(screenPoint);

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



    private _getHandle(): IHandleTransformRotate | null {
        if (!this._context) {
            return null;
        }

        return this._context.overlay
            .getHandlerManager()
            .get(HandleTransformRotate.TYPE) as IHandleTransformRotate | null;
    }

    private _hitTestRotateAxis(screenPoint: Point): TransformRotateAxis | null {
        const { world } = this._context!;
        const rotateHandle = this._getHandle();

        if (!rotateHandle || !rotateHandle.isEnabled() || !rotateHandle.hasNode()) {
            return null;
        }

        const camera = world.getCamera();
        const handleRadius = 16;

        for (const axis of ["ne", "nw", "se", "sw"] as const) {
            const worldPoint = rotateHandle.getHandleWorldPoint(axis);

            if (!worldPoint) {
                continue;
            }

            const sp = camera.worldToScreen(worldPoint);
            const dx = screenPoint.x - sp.x;
            const dy = screenPoint.y - sp.y;

            if (Math.hypot(dx, dy) <= handleRadius) {
                return axis;
            }
        }

        return null;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }

    private _subtractPoints(a: Point, b: Point): Point {
        return { x: a.x - b.x, y: a.y - b.y };
    }
}