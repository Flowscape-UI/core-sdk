import type { Point } from "../../../../../../core/camera";
import type { IShapeBase } from "../../../../../../nodes";
import { MathF32 } from "../../../../../../core/math";
import type { IHandleCornerRadius } from "../../../../../../scene/layers";
import { Input } from "../../../../../Input";
import { MouseButton } from "../../../../../types";
import type { OverlayInputContext } from "../../LayerOverlayInputController";
import type { IInputModule } from "../../../../base";

type CornerRadiusAxis = "tl" | "tr" | "br" | "bl";

type AxisHandleEntry = {
    axis: CornerRadiusAxis;
    handle: IHandleCornerRadius;
};

const CORNER_RADIUS_AXES: readonly CornerRadiusAxis[] = ["tl", "tr", "br", "bl"];

export class ModuleOverlayCornerRadius implements IInputModule<OverlayInputContext> {
    public readonly id = "overlay-corner-radius";

    private _context: OverlayInputContext | null = null;

    private _isDragging = false;
    private _singleMode = false;

    private _activeAxis: CornerRadiusAxis | null = null;
    private _candidateAxes: CornerRadiusAxis[] = [];
    private _dragStartScreenPoint: Point | null = null;

    public attach(context: OverlayInputContext): void {
        this._context = context;

        Input.configure({
            preventAltDefault: true,
        })
    }

    public detach(): void {
        this._resetSession();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public isBlockingHover(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        if (!this._context.overlay.isEnabled()) {
            return false;
        }

        return this._hitTest(screenPoint) !== null;
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        const owner = this._context.getInteractionOwner();

        if (owner !== null && owner !== this.id) {
            return;
        }

        if (this._isDragging) {
            this._updateDrag();
            this._tryEndDrag();
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const hitAxis = this._hitTest(screenPoint);

        if (hitAxis) {
            Input.setCursor("pointer");
        }

        if (!Input.getMouseButtonDown(MouseButton.Left)) {
            return;
        }

        if (hitAxis) {
            if (this._tryBegin()) {
                return;
            }
        }

        const hoveredNode = this._context.overlay.getHoveredNode();

        if (hoveredNode && this._isCornerRadiusSupported(hoveredNode)) {
            if (this._setNodeForAllHandles(hoveredNode)) {
                this._context.emitChange();
            }
            return;
        }

        if (this._clearAllHandles()) {
            this._context.emitChange();
        }
    }

    private _tryBegin(): boolean {
        const node = this._getActiveNode();

        if (!node || !this._context) {
            return false;
        }

        const screenPoint = this._getStagePointerFromInput();
        const hitAxes = this._getHitAxes(screenPoint);

        if (hitAxes.length === 0) {
            return false;
        }

        if (!this._context.tryBeginInteraction(this.id)) {
            return false;
        }

        this._isDragging = true;
        this._dragStartScreenPoint = screenPoint;
        this._candidateAxes = hitAxes;

        if (hitAxes.length === 1) {
            this._activeAxis = hitAxes[0] ?? null;
        } else {
            this._activeAxis = null;
        }

        Input.setCursor("pointer");
        return true;
    }

    private _updateDrag(): void {
        if (!this._activeAxis) {
            const screenPoint = this._getStagePointerFromInput();
            const resolvedAxis = this._resolveAxisFromDirection(screenPoint);

            if (!resolvedAxis) {
                return;
            }

            this._activeAxis = resolvedAxis;
        }
        if (!this._context || !this._isDragging || !this._activeAxis) {
            return;
        }

        this._singleMode = Input.altPressed ?? false;

        const handle = this._activeAxis ? this._getHandleByAxis(this._activeAxis) : null;
        const node = handle?.getNode();

        if (!handle || !node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const worldPoint = this._context.world.camera.screenToWorld(screenPoint);

        const section = handle.getSection();
        if (!section) {
            return;
        }

        const diagonalEnd = {
            x: section.xAxisPoint.x + section.yAxisPoint.x - section.origin.x,
            y: section.xAxisPoint.y + section.yAxisPoint.y - section.origin.y,
        };

        const diagonalVector = {
            x: diagonalEnd.x - section.origin.x,
            y: diagonalEnd.y - section.origin.y,
        };

        const diagonalLength = Math.hypot(diagonalVector.x, diagonalVector.y);
        if (diagonalLength <= 0.000001) {
            return;
        }

        const diagonalDir = {
            x: diagonalVector.x / diagonalLength,
            y: diagonalVector.y / diagonalLength,
        };

        const originToPointer = {
            x: worldPoint.x - section.origin.x,
            y: worldPoint.y - section.origin.y,
        };

        const projectedDistance =
            originToPointer.x * diagonalDir.x +
            originToPointer.y * diagonalDir.y;

        const clampedDistance = Math.max(0, Math.min(projectedDistance, diagonalLength));
        const progress = clampedDistance / diagonalLength;
        const maxRadius = Math.max(0, Math.min(section.width, section.height) + section.inset);

        const nextValue = MathF32.toF32(progress * maxRadius);

        const current = node.getCornerRadius();

        if (this._singleMode) {
            current[this._activeAxis] = nextValue;
        } else {
            current.tl = nextValue;
            current.tr = nextValue;
            current.br = nextValue;
            current.bl = nextValue;
        }

        node.setCornerRadius(current);
        this._context.emitChange();
    }

    private _tryEndDrag(): void {
        if (
            Input.getMouseButtonUp(MouseButton.Left) ||
            !Input.getMouseButton(MouseButton.Left)
        ) {
            this._resetSession();
        }
    }

    private _resetSession(): void {
        this._activeAxis = null;
        this._candidateAxes = [];
        this._dragStartScreenPoint = null;

        this._isDragging = false;
        this._activeAxis = null;
        this._singleMode = false;

        if (this._context) {
            this._context.endInteraction(this.id);
            Input.resetCursor();
        }
    }

    private _hitTest(screenPoint: Point): CornerRadiusAxis | null {
        const entries = this._getAxisHandles();

        let topAxis: CornerRadiusAxis | null = null;
        let topZIndex = -Infinity;
        let topOrder = -1;

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i]!;
            const handle = entry.handle;

            if (!handle.isEnabled() || !handle.isVisible() || !handle.hasNode()) {
                continue;
            }

            if (!this._isPointOnHandle(handle, screenPoint)) {
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

    private _isCornerRadiusSupported(node: IShapeBase): boolean {
        return (
            typeof node.getCornerRadius === "function" &&
            typeof node.setCornerRadius === "function"
        );
    }

    private _getStagePointerFromInput(): Point {
        const stage = this._context!.stage;

        return Input.pointerToSurfacePoint(stage.container(), {
            width: stage.width(),
            height: stage.height(),
        });
    }

    private _getHitAxes(screenPoint: Point): CornerRadiusAxis[] {
        const result: CornerRadiusAxis[] = [];

        for (const entry of this._getAxisHandles()) {
            const handle = entry.handle;

            if (!handle.isEnabled() || !handle.isVisible() || !handle.hasNode()) {
                continue;
            }

            if (this._isPointOnHandle(handle, screenPoint)) {
                result.push(entry.axis);
            }
        }

        return result;
    }

    private _resolveAxisFromDirection(screenPoint: Point): CornerRadiusAxis | null {
        if (!this._context || !this._dragStartScreenPoint) {
            return null;
        }

        const move = {
            x: screenPoint.x - this._dragStartScreenPoint.x,
            y: screenPoint.y - this._dragStartScreenPoint.y,
        };

        const moveLength = Math.hypot(move.x, move.y);
        if (moveLength < 5) {
            return null;
        }

        const normalizedMove = {
            x: move.x / moveLength,
            y: move.y / moveLength,
        };

        let bestAxis: CornerRadiusAxis | null = null;
        let bestScore = -Infinity;

        for (const axis of this._candidateAxes) {
            const handle = this._getHandleByAxis(axis);
            const section = handle?.getSection();
            const handlePoint = handle?.getHandleWorldPoint();

            if (!section || !handlePoint) {
                continue;
            }

            const handleScreenPoint = this._context.world.camera.worldToScreen(handlePoint);
            const originScreenPoint = this._context.world.camera.worldToScreen(section.origin);

            const dir = {
                x: originScreenPoint.x - handleScreenPoint.x,
                y: originScreenPoint.y - handleScreenPoint.y,
            };

            const dirLength = Math.hypot(dir.x, dir.y);
            if (dirLength <= 0.000001) {
                continue;
            }

            const normalizedDir = {
                x: dir.x / dirLength,
                y: dir.y / dirLength,
            };

            const score =
                normalizedMove.x * normalizedDir.x +
                normalizedMove.y * normalizedDir.y;

            if (score > bestScore) {
                bestScore = score;
                bestAxis = axis;
            }
        }

        return bestAxis;
    }

    private _getAxisHandles(): AxisHandleEntry[] {
        const entries: AxisHandleEntry[] = [];

        for (const axis of CORNER_RADIUS_AXES) {
            const handle = this._getHandleByAxis(axis);

            if (!handle) {
                continue;
            }

            entries.push({ axis, handle });
        }

        return entries;
    }

    private _getHandleByAxis(axis: CornerRadiusAxis): IHandleCornerRadius | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.shapeHandleManager.getById(`corner-radius-${axis}`);

        if (!this._isCornerRadiusHandle(handle)) {
            return null;
        }

        return handle;
    }

    private _isCornerRadiusHandle(value: unknown): value is IHandleCornerRadius {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<IHandleCornerRadius>;

        return (
            typeof handle.getNode === "function" &&
            typeof handle.setNode === "function" &&
            typeof handle.hasNode === "function" &&
            typeof handle.clearNode === "function" &&
            typeof handle.getHandleWorldPoint === "function" &&
            typeof handle.getSection === "function"
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

    private _setNodeForAllHandles(node: IShapeBase): boolean {
        let changed = false;

        for (const { handle } of this._getAxisHandles()) {
            changed = handle.setNode(node) || changed;
        }

        return changed;
    }

    private _clearAllHandles(): boolean {
        let changed = false;

        for (const { handle } of this._getAxisHandles()) {
            if (!handle.hasNode()) {
                continue;
            }

            handle.clearNode();
            changed = true;
        }

        return changed;
    }

    private _isPointOnHandle(handle: IHandleCornerRadius, screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const worldPoint = handle.getHandleWorldPoint();

        if (!worldPoint) {
            return false;
        }

        const camera = this._context.world.camera;
        const screenHandlePoint = camera.worldToScreen(worldPoint);
        const hitRadius = this._getHitRadius(handle);

        if (hitRadius <= 0) {
            return false;
        }

        const dx = screenPoint.x - screenHandlePoint.x;
        const dy = screenPoint.y - screenHandlePoint.y;

        return Math.hypot(dx, dy) <= hitRadius;
    }

    private _getHitRadius(handle: IHandleCornerRadius): number {
        const hitWidth = handle.getHitWidth() > 0 ? handle.getHitWidth() : handle.getWidth();
        const hitHeight = handle.getHitHeight() > 0 ? handle.getHitHeight() : handle.getHeight();

        return Math.max(8, Math.max(hitWidth, hitHeight)) * 0.5;
    }
}
