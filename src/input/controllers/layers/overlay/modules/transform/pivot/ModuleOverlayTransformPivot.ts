import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { matrixInvert } from "../../../../../../../nodes/utils/matrix-invert";
import {
    HandleTransformPivot,
    type IHandleTransformPivot,
} from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

export class ModuleOverlayTransformPivot implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-pivot";

    private _context: OverlayInputContext | null = null;
    private _isPivoting = false;

    public attach(context: OverlayInputContext): void {
        this._context = context;
    }

    public detach(): void {
        this._resetPivotSession();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        if (!this._isPivoting) {
            return;
        }

        this._updatePivotFromInput();
        this._tryEndPivot();
    }

    public isActive(): boolean {
        return this._isPivoting;
    }

    public hitTest(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        return this._hitTestPivot(screenPoint);
    }

    public tryBegin(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const pivotHandle = this._getHandle();
        if (!pivotHandle || !pivotHandle.isEnabled() || !pivotHandle.hasNode()) {
            return false;
        }

        if (!this._hitTestPivot(screenPoint)) {
            return false;
        }

        this._isPivoting = true;
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

    private _updatePivotFromInput(): void {
        if (!this._context || !this._isPivoting) {
            return;
        }

        const { world } = this._context;
        const pivotHandle = this._getHandle();
        const node = pivotHandle?.getNode();

        if (!node) {
            return;
        }

        const width = node.getWidth();
        const height = node.getHeight();

        if (width === 0 || height === 0) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const worldPoint = world.getCamera().screenToWorld(screenPoint);
        const worldMatrix = node.getWorldMatrix();

        try {
            const invMatrix = matrixInvert(worldMatrix);

            const localPoint = {
                x: invMatrix.a * worldPoint.x + invMatrix.c * worldPoint.y + invMatrix.tx,
                y: invMatrix.b * worldPoint.x + invMatrix.d * worldPoint.y + invMatrix.ty,
            };

            const pivotX = localPoint.x / width;
            const pivotY = localPoint.y / height;

            node.setPivot(pivotX, pivotY);

            const newPivotWorld = pivotHandle?.getPivotWorldPoint();
            if (!newPivotWorld) {
                return;
            }

            const dx = worldPoint.x - newPivotWorld.x;
            const dy = worldPoint.y - newPivotWorld.y;

            node.setPosition(
                node.getX() + dx,
                node.getY() + dy,
            );

            this._context.emitChange();
        } catch {
            return;
        }
    }

    private _tryEndPivot(): void {
        if (!this._isPivoting) {
            return;
        }

        if (Input.getMouseButtonUp(MouseButton.Left) || !Input.getMouseButton(MouseButton.Left)) {
            this._resetPivotSession();
        }
    }

    private _resetPivotSession(): void {
        this._isPivoting = false;
    }

    private _getHandle(): IHandleTransformPivot | null {
        if (!this._context) {
            return null;
        }

        return this._context.overlay
            .getHandlerManager()
            .get(HandleTransformPivot.TYPE) as IHandleTransformPivot | null;
    }

    private _hitTestPivot(screenPoint: Point): boolean {
        const { world } = this._context!;
        const pivotHandle = this._getHandle();

        if (!pivotHandle || !pivotHandle.isEnabled() || !pivotHandle.hasNode()) {
            return false;
        }

        const worldPoint = pivotHandle.getPivotWorldPoint();
        if (!worldPoint) {
            return false;
        }

        const camera = world.getCamera();
        const sp = camera.worldToScreen(worldPoint);

        const hitRadius = 10;
        const dx = screenPoint.x - sp.x;
        const dy = screenPoint.y - sp.y;

        return Math.hypot(dx, dy) <= hitRadius;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }
}