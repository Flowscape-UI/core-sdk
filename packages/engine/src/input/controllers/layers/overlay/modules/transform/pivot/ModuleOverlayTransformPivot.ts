import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { matrixInvert } from "../../../../../../../nodes/utils/matrix-invert";
import type { IHandleTransformPivot } from "../../../../../../../scene/layers";
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

    public getHoverCursor(screenPoint: Point): string | null {
        if (!this._context) {
            return null;
        }

        if (this._isPivoting) {
            return "pointer";
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return null;
        }

        return this._hitTestPivot(screenPoint) ? "pointer" : null;
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
        Input.setCursor("pointer");
        return true;
    }

    public hasNode(): boolean {
        const handle = this._getHandle();
        return handle?.hasNode() ?? false;
    }

    public getNodeId(): ID | null {
        const handle = this._getHandle();
        return handle?.getNode()?.id ?? null;
    }

    public setNode(node: IShapeBase): void {
        const handle = this._getHandle();

        if (!handle) {
            return;
        }

        handle.setNode(node);
        handle.setEnabled(true);
    }

    public clearNode(): void {
        const handle = this._getHandle();

        if (!handle) {
            return;
        }

        handle.clearNode();
        handle.setEnabled(false);
    }

    private _updatePivotFromInput(): void {
        if (!this._context || !this._isPivoting) {
            return;
        }

        const { world } = this._context;
        const pivotHandle = this._getHandle();

        if(!pivotHandle) {
            return;
        }
        const node = pivotHandle.getNode();

        if (!node) {
            return;
        }

        const width = node.getWidth();
        const height = node.getHeight();

        if (width === 0 || height === 0) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const worldPoint = world.camera.screenToWorld(screenPoint);
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
            node.setPosition(worldPoint.x, worldPoint.y);
            pivotHandle.setPosition(node.getPivot());

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
        Input.resetCursor();
    }

    private _getHandle(): IHandleTransformPivot | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.transformHandleManager.getById("transform-pivot");

        if (!this._isPivotHandle(handle)) {
            return null;
        }

        return handle;
    }

    private _hitTestPivot(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { world } = this._context;
        const pivotHandle = this._getHandle();

        if (!pivotHandle || !pivotHandle.isEnabled() || !pivotHandle.hasNode()) {
            return false;
        }

        const worldPoint = world.camera.screenToWorld(screenPoint);

        return pivotHandle.hitTest(worldPoint);
    }

    private _isPivotHandle(value: unknown): value is IHandleTransformPivot {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<IHandleTransformPivot>;

        return (
            typeof handle.hitTest === "function" &&
            typeof handle.getNode === "function" &&
            typeof handle.hasNode === "function" &&
            typeof handle.setNode === "function" &&
            typeof handle.clearNode === "function" &&
            typeof handle.setEnabled === "function"
        );
    }

    private _getStagePointerFromInput(): Point {
        const stage = this._context!.stage;

        return Input.pointerToSurfacePoint(stage.container(), {
            width: stage.width(),
            height: stage.height(),
        });
    }
}
