import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { MathF32 } from "../../../../../../../core/math";
import type { IHandleTransformPosition } from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

export class ModuleOverlayTransformMove implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-move";
    private static readonly DRAG_START_THRESHOLD_PX = 3;

    private _context: OverlayInputContext | null = null;

    private _isMoving = false;
    private _hasMoved = false;
    private _moveStartScreenPoint: Point | null = null;
    private _moveStartWorldPoint: Point | null = null;
    private _moveStartNodePosition: Point | null = null;
    private _pendingClickSelectNode: IShapeBase | null = null;

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

        this._updateMoveState();

        if (this._hasMoved) {
            this._updateMoveFromInput();
        }

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

        const transformPositionHandle = this._getHandle();

        if (
            !transformPositionHandle ||
            !transformPositionHandle.isEnabled() ||
            !transformPositionHandle.hasNode()
        ) {
            return false;
        }

        const worldPoint = world.camera.screenToWorld(screenPoint);
        return transformPositionHandle.hitTest(worldPoint);
    }

    public tryBegin(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay, world } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const transformPositionHandle = this._getHandle();

        if (
            !transformPositionHandle ||
            !transformPositionHandle.isEnabled() ||
            !transformPositionHandle.hasNode()
        ) {
            return false;
        }

        const worldPoint = world.camera.screenToWorld(screenPoint);

        if (!transformPositionHandle.hitTest(worldPoint)) {
            return false;
        }

        const node = transformPositionHandle.getNode();
        if (!node) {
            return false;
        }

        this._isMoving = true;
        this._hasMoved = false;
        this._moveStartScreenPoint = screenPoint;
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

    public consumeClickSelectNode(): IShapeBase | null {
        const node = this._pendingClickSelectNode;
        this._pendingClickSelectNode = null;
        return node;
    }

    private _updateMoveState(): void {
        if (!this._moveStartScreenPoint) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const dx = screenPoint.x - this._moveStartScreenPoint.x;
        const dy = screenPoint.y - this._moveStartScreenPoint.y;

        if (Math.hypot(dx, dy) >= ModuleOverlayTransformMove.DRAG_START_THRESHOLD_PX) {
            this._hasMoved = true;
        }
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
        const currentWorldPoint = world.camera.screenToWorld(screenPoint);

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
            if (!this._hasMoved && this._context) {
                const hoveredNode = this._context.overlay.getHoveredNode();
                const activeNode = this._getHandle()?.getNode() ?? null;

                if (hoveredNode && activeNode && hoveredNode.id !== activeNode.id) {
                    this._pendingClickSelectNode = hoveredNode;
                }
            }

            this._resetMoveSession();
        }
    }

    private _resetMoveSession(): void {
        this._isMoving = false;
        this._hasMoved = false;
        this._moveStartScreenPoint = null;
        this._moveStartWorldPoint = null;
        this._moveStartNodePosition = null;
        Input.resetCursor();
    }

    private _getHandle(): IHandleTransformPosition | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.transformHandleManager.getById("transform-position");

        if (!this._isTransformPositionHandle(handle)) {
            return null;
        }

        return handle;
    }

    private _isTransformPositionHandle(value: unknown): value is IHandleTransformPosition {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<IHandleTransformPosition>;

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
