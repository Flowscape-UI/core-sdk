import type { Point } from "../../../../../../core/camera";
import type { IShapeBase } from "../../../../../../nodes";
import { MathF32 } from "../../../../../../core/math";
import { HandleCornerRadius } from "../../../../../../scene/layers";
import { Input } from "../../../../../Input";
import { MouseButton } from "../../../../../types";
import type { OverlayInputContext } from "../../LayerOverlayInputController";
import type { IInputModule } from "../../../../base";

type CornerRadiusAxis = "tl" | "tr" | "br" | "bl";

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

        if (!Input.getMouseButtonDown(MouseButton.Left)) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();

        const hitAxis = this._hitTest(screenPoint);
        if (hitAxis) {
            if (this._tryBegin()) {
                return;
            }
        }

        const hoveredNode = this._context.overlay.getHoveredNode();
        const handle = this._getHandle();

        if (!handle) {
            return;
        }

        if (hoveredNode && this._isCornerRadiusSupported(hoveredNode)) {
            if (handle.getNodeId() !== hoveredNode.id) {
                handle.setNode(hoveredNode);
                this._context.emitChange();
            }
            return;
        }

        if (handle.hasNode()) {
            handle.clearNode();
            this._context.emitChange();
        }
    }

    private _tryBegin(): boolean {
        const handle = this._getHandle();
        const node = handle?.getNode();

        if (!handle || !node || !this._context) {
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

        const handle = this._getHandle();
        const node = handle?.getNode();

        if (!handle || !node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const worldPoint = this._context.world.getCamera().screenToWorld(screenPoint);

        const section = handle.getSection(this._activeAxis);
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
        const handle = this._getHandle();

        if (!handle || !handle.isEnabled() || !handle.hasNode()) {
            return null;
        }

        const camera = this._context!.world.getCamera();
        const hitRadius = 8;

        for (const axis of ["tl", "tr", "br", "bl"] as const) {
            const worldPoint = handle.getHandleWorldPoint(axis);
            if (!worldPoint) {
                continue;
            }

            const sp = camera.worldToScreen(worldPoint);
            const dx = screenPoint.x - sp.x;
            const dy = screenPoint.y - sp.y;

            if (Math.hypot(dx, dy) <= hitRadius) {
                return axis;
            }
        }

        return null;
    }

    private _isCornerRadiusSupported(node: IShapeBase): boolean {
        return (
            typeof node.getCornerRadius === "function" &&
            typeof node.setCornerRadius === "function"
        );
    }

    private _getHandle(): HandleCornerRadius | null {
        if (!this._context) {
            return null;
        }

        return this._context.overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }

    private _getHitAxes(screenPoint: Point): CornerRadiusAxis[] {
        const handle = this._getHandle();

        if (!handle || !handle.isEnabled() || !handle.hasNode()) {
            return [];
        }

        const camera = this._context!.world.getCamera();
        const hitRadius = 8;
        const result: CornerRadiusAxis[] = [];

        for (const axis of ["tl", "tr", "br", "bl"] as const) {
            const worldPoint = handle.getHandleWorldPoint(axis);
            if (!worldPoint) {
                continue;
            }

            const sp = camera.worldToScreen(worldPoint);
            const dx = screenPoint.x - sp.x;
            const dy = screenPoint.y - sp.y;

            if (Math.hypot(dx, dy) <= hitRadius) {
                result.push(axis);
            }
        }

        return result;
    }

    private _resolveAxisFromDirection(screenPoint: Point): CornerRadiusAxis | null {
        const handle = this._getHandle();

        if (!handle || !handle.hasNode() || !this._dragStartScreenPoint) {
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
            const section = handle.getSection(axis);
            const handlePoint = handle.getHandleWorldPoint(axis);

            if (!section || !handlePoint) {
                continue;
            }

            const handleScreenPoint = this._context!.world.getCamera().worldToScreen(handlePoint);
            const originScreenPoint = this._context!.world.getCamera().worldToScreen(section.origin);

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
}