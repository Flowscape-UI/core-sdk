import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { MathF32 } from "../../../../../../../core/math";
import { HandleTransformPosition, type IHandleTransformPosition } from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

export class ModuleOverlayTransformMove implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-move";

    private _context: OverlayInputContext | null = null;

    private _isMoving = false;
    private _moveStartWorldPoint: Point | null = null;
    private _moveStartNodePosition: Point | null = null;

    public attach(context: OverlayInputContext): void {
        this._context = context;
    }

    public detach(): void {
        this._resetMoveSession();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        if (!this._isMoving) {
            return;
        }

        this._updateMoveFromInput();
        this._tryEndMove();
    }

    public isActive(): boolean {
        return this._isMoving;
    }

    public hitTest(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay, world } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const transformPositionHandle = overlay
            .getHandlerManager()
            .get(HandleTransformPosition.TYPE) as IHandleTransformPosition | null;

        if (
            !transformPositionHandle ||
            !transformPositionHandle.isEnabled() ||
            !transformPositionHandle.hasNode()
        ) {
            return false;
        }

        const worldPoint = world.getCamera().screenToWorld(screenPoint);
        return transformPositionHandle.containsPoint(worldPoint);
    }

    public tryBegin(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay, world } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const transformPositionHandle = overlay
            .getHandlerManager()
            .get(HandleTransformPosition.TYPE) as IHandleTransformPosition | null;

        if (
            !transformPositionHandle ||
            !transformPositionHandle.isEnabled() ||
            !transformPositionHandle.hasNode()
        ) {
            return false;
        }

        const worldPoint = world.getCamera().screenToWorld(screenPoint);

        if (!transformPositionHandle.containsPoint(worldPoint)) {
            return false;
        }

        const node = transformPositionHandle.getNode();
        if (!node) {
            return false;
        }

        this._isMoving = true;
        this._moveStartWorldPoint = worldPoint;
        this._moveStartNodePosition = node.getPosition();
        Input.setCursor('grab');

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

    private _updateMoveFromInput(): void {
        if (!this._context) {
            return;
        }

        if (!this._isMoving || !this._moveStartWorldPoint || !this._moveStartNodePosition) {
            return;
        }

        const { world } = this._context;
        const handle = this._getHandle();
        const node = handle?.getNode();

        if (!node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const currentWorldPoint = world.getCamera().screenToWorld(screenPoint);

        const dx = currentWorldPoint.x - this._moveStartWorldPoint.x;
        const dy = currentWorldPoint.y - this._moveStartWorldPoint.y;

        node.setPosition(
            MathF32.toF32(Math.round(this._moveStartNodePosition.x + dx)),
            MathF32.toF32(Math.round(this._moveStartNodePosition.y + dy)),
        );

        this._context.emitChange();
    }

    private _tryEndMove(): void {
        if (!this._isMoving) {
            return;
        }

        if (Input.getMouseButtonUp(MouseButton.Left) || !Input.getMouseButton(MouseButton.Left)) {
            this._resetMoveSession();
        }
    }

    private _resetMoveSession(): void {
        this._isMoving = false;
        this._moveStartWorldPoint = null;
        this._moveStartNodePosition = null;
        Input.resetCursor();
    }

    private _getHandle(): IHandleTransformPosition | null {
        if (!this._context) {
            return null;
        }

        return this._context.overlay
            .getHandlerManager()
            .get(HandleTransformPosition.TYPE) as IHandleTransformPosition | null;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }
}