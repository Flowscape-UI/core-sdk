import type { Point } from "../../../../../../core/camera";
import type { IShapeBase } from "../../../../../../nodes";
import { MathF32 } from "../../../../../../core/math";
import type { IHandleCornerRadius } from "../../../../../../scene/layers";
import { Input } from "../../../../../Input";
import { MouseButton } from "../../../../../types";
import type { OverlayInputContext } from "../../LayerOverlayInputController";
import type { IInputModule } from "../../../../base";

type CornerHandleEntry = {
	index: number;
	handle: IHandleCornerRadius;
};

export class ModuleOverlayCornerRadius implements IInputModule<OverlayInputContext> {
	public readonly id = "overlay-corner-radius";

	private _context: OverlayInputContext | null = null;

	private _isDragging = false;
	private _singleMode = false;

	private _activeNode: IShapeBase | null = null;
	private _activeHandleCount = 0;

	private _activeCornerIndex: number | null = null;
	private _candidateCornerIndices: number[] = [];
	private _dragStartScreenPoint: Point | null = null;

	public attach(context: OverlayInputContext): void {
		this._context = context;

		Input.configure({
			preventAltDefault: true,
		});
	}

	public detach(): void {
		this._resetSession();
		this._clearActiveNode();
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
		const hitIndex = this._hitTest(screenPoint);

		if (hitIndex !== null) {
			Input.setCursor("pointer");
		}

		if (!Input.getMouseButtonDown(MouseButton.Left)) {
			return;
		}

		if (hitIndex !== null) {
			if (this._tryBegin()) {
				return;
			}
		}

		const hoveredNode = this._context.overlay.getHoveredNode();

		if (hoveredNode && this._isCornerRadiusSupported(hoveredNode)) {
			if (this._setActiveNode(hoveredNode)) {
				this._context.emitChange();
			}

			return;
		}

		if (this._clearActiveNode()) {
			this._context.emitChange();
		}
	}

	private _tryBegin(): boolean {
		const node = this._activeNode;

		if (!node || !this._context) {
			return false;
		}

		const screenPoint = this._getStagePointerFromInput();
		const hitIndices = this._getHitCornerIndices(screenPoint);

		if (hitIndices.length === 0) {
			return false;
		}

		if (!this._context.tryBeginInteraction(this.id)) {
			return false;
		}

		this._isDragging = true;
		this._dragStartScreenPoint = screenPoint;
		this._candidateCornerIndices = hitIndices;

		this._activeCornerIndex =
			hitIndices.length === 1 ? (hitIndices[0] ?? null) : null;

		Input.setCursor("pointer");

		return true;
	}

	private _updateDrag(): void {
		if (this._activeCornerIndex === null) {
			const screenPoint = this._getStagePointerFromInput();

			const resolvedIndex = this._resolveCornerFromDirection(screenPoint);

			if (resolvedIndex === null) {
				return;
			}

			this._activeCornerIndex = resolvedIndex;
		}

		if (
			!this._context ||
			!this._isDragging ||
			this._activeCornerIndex === null
		) {
			return;
		}

		this._singleMode = Input.altPressed ?? false;

		const handle = this._getHandleByIndex(this._activeCornerIndex);

		if (!handle) {
			return;
		}

		const node = handle.getNode();

		if (!node) {
			return;
		}

		const screenPoint = this._getStagePointerFromInput();

		const worldPoint =
			this._context.world.camera.screenToWorld(screenPoint);

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

		const clampedDistance = Math.max(
			0,
			Math.min(projectedDistance, diagonalLength),
		);

		const progress = clampedDistance / diagonalLength;

		const maxRadius = Math.max(
			0,
			Math.min(section.width, section.height) + section.inset,
		);

		const nextValue = MathF32.toF32(progress * maxRadius);

		if (this._singleMode) {
			const current = this._resolveCornerRadii(
				node.getCornerRadius(),
				this._activeHandleCount,
			);

			current[this._activeCornerIndex] = nextValue;

			node.setCornerRadius(current);
		} else {
			node.setCornerRadius([nextValue]);
		}

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

	private _getHitCornerIndices(screenPoint: Point): number[] {
		const result: number[] = [];

		for (const entry of this._getCornerHandles()) {
			const handle = entry.handle;

			if (
				!handle.isEnabled() ||
				!handle.isVisible() ||
				!handle.hasNode()
			) {
				continue;
			}

			if (this._isPointOnHandle(handle, screenPoint)) {
				result.push(entry.index);
			}
		}

		return result;
	}

	private _resolveCornerFromDirection(screenPoint: Point): number | null {
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

		let bestIndex: number | null = null;
		let bestScore = -Infinity;

		for (const index of this._candidateCornerIndices) {
			const handle = this._getHandleByIndex(index);

			const section = handle?.getSection();
			const handlePoint = handle?.getHandleWorldPoint();

			if (!section || !handlePoint) {
				continue;
			}

			const handleScreenPoint =
				this._context.world.camera.worldToScreen(handlePoint);

			const originScreenPoint = this._context.world.camera.worldToScreen(
				section.origin,
			);

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
				bestIndex = index;
			}
		}

		return bestIndex;
	}

	private _resolveCornerRadii(
		values: readonly number[],
		count: number,
	): number[] {
		const fallback = values[0] ?? 0;

		return Array.from(
			{ length: count },
			(_, index) => values[index] ?? fallback,
		);
	}

	private _getHandleByIndex(index: number): IHandleCornerRadius | null {
		if (!this._context) {
			return null;
		}

		const handle = this._context.overlay.shapeHandleManager.getById(
			`corner-radius-${index}`,
		);

		if (!this._isCornerRadiusHandle(handle)) {
			return null;
		}

		return handle;
	}

	private _resetSession(): void {
		this._activeCornerIndex = null;
		this._candidateCornerIndices = [];
		this._dragStartScreenPoint = null;

		this._isDragging = false;
		this._singleMode = false;

		if (this._context) {
			this._context.endInteraction(this.id);
			Input.resetCursor();
		}
	}

	private _setActiveNode(node: IShapeBase): boolean {
		if (!this._context) {
			return false;
		}

		const anchors = node.getCornerRadiusAnchors();

		const nextCount = anchors.length;

		const sameNode = this._activeNode === node;

		const sameCount = this._activeHandleCount === nextCount;

		if (sameNode && sameCount) {
			return false;
		}

		this._clearHandleNodes();

		this._context.overlay.shapeHandleManager.ensureCornerRadiusHandleCount(
			nextCount,
		);

		this._activeNode = node;
		this._activeHandleCount = nextCount;

		for (let index = 0; index < nextCount; index += 1) {
			const handle = this._getHandleByIndex(index);

			if (!handle) {
				continue;
			}

			handle.setNode(node);
		}

		return true;
	}

	private _clearHandleNodes(): void {
		for (let index = 0; index < this._activeHandleCount; index += 1) {
			const handle = this._getHandleByIndex(index);

			if (!handle || !handle.hasNode()) {
				continue;
			}

			handle.clearNode();
		}
	}

	private _hitTest(screenPoint: Point): number | null {
		const entries = this._getCornerHandles();

		let topIndex: number | null = null;
		let topZIndex = -Infinity;
		let topOrder = -1;

		for (let i = 0; i < entries.length; i += 1) {
			const entry = entries[i]!;
			const handle = entry.handle;

			if (
				!handle.isEnabled() ||
				!handle.isVisible() ||
				!handle.hasNode()
			) {
				continue;
			}

			if (!this._isPointOnHandle(handle, screenPoint)) {
				continue;
			}

			const zIndex = handle.getZIndex();

			const isAbove =
				zIndex > topZIndex || (zIndex === topZIndex && i > topOrder);

			if (!isAbove) {
				continue;
			}

			topIndex = entry.index;
			topZIndex = zIndex;
			topOrder = i;
		}

		return topIndex;
	}

	private _isCornerRadiusSupported(node: IShapeBase): boolean {
		return (
			typeof node.getCornerRadius === "function" &&
			typeof node.setCornerRadius === "function" &&
			typeof node.getCornerRadiusAnchors === "function" &&
			node.getCornerRadiusAnchors().length > 0
		);
	}

	private _getStagePointerFromInput(): Point {
		const stage = this._context!.stage;

		return Input.pointerToSurfacePoint(stage.container(), {
			width: stage.width(),
			height: stage.height(),
		});
	}

	private _getCornerHandles(): CornerHandleEntry[] {
		const entries: CornerHandleEntry[] = [];

		for (let index = 0; index < this._activeHandleCount; index += 1) {
			const handle = this._getHandleByIndex(index);

			if (!handle) {
				continue;
			}

			entries.push({
				index,
				handle,
			});
		}

		return entries;
	}

	private _clearActiveNode(): boolean {
		if (!this._activeNode && this._activeHandleCount === 0) {
			return false;
		}

		this._clearHandleNodes();

		this._activeNode = null;
		this._activeHandleCount = 0;

		return true;
	}

	private _isCornerRadiusHandle(
		value: unknown,
	): value is IHandleCornerRadius {
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

	private _isPointOnHandle(
		handle: IHandleCornerRadius,
		screenPoint: Point,
	): boolean {
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
		const hitWidth =
			handle.getHitWidth() > 0 ? handle.getHitWidth() : handle.getWidth();
		const hitHeight =
			handle.getHitHeight() > 0
				? handle.getHitHeight()
				: handle.getHeight();

		return Math.max(8, Math.max(hitWidth, hitHeight)) * 0.5;
	}
}
