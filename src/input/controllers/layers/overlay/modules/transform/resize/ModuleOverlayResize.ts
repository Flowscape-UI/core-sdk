import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { HandleTransformResize, type IHandleTransformResize, type TransformResizeAxis } from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

export class ModuleOverlayTransformResize implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-resize";

    private _context: OverlayInputContext | null = null;

    private _isResizing = false;
    private _activeResizeAxis: TransformResizeAxis | null = null;
    private _resizeStartWorldPoint: Point | null = null;
    private _resizeStartWidth = 0;
    private _resizeStartHeight = 0;
    private _resizeStartCorners: [Point, Point, Point, Point] | null = null;

    public attach(context: OverlayInputContext): void {
        this._context = context;
    }

    public detach(): void {
        this._resetResizeSession();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        if (this._isResizing) {
            this._updateResizeFromInput();
            this._tryEndResize();
            return;
        }

        this._updateHoverCursor();
    }

    public isActive(): boolean {
        return this._isResizing;
    }

    public hitTest(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        return this._hitTestResizeAxis(screenPoint) !== null;
    }

    public tryBegin(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay, world } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const resizeHandle = this._getHandle();
        if (!resizeHandle || !resizeHandle.isEnabled() || !resizeHandle.hasNode()) {
            return false;
        }

        const resizeAxis = this._hitTestResizeAxis(screenPoint);
        if (!resizeAxis) {
            return false;
        }

        const node = resizeHandle.getNode();
        if (!node) {
            return false;
        }

        const corners = node.getWorldCorners();
        if (corners.length < 4) {
            return false;
        }

        this._isResizing = true;
        this._activeResizeAxis = resizeAxis;
        this._resizeStartWorldPoint = world.getCamera().screenToWorld(screenPoint);
        this._resizeStartWidth = node.getWidth();
        this._resizeStartHeight = node.getHeight();
        this._resizeStartCorners = [corners[0], corners[1], corners[2], corners[3]];
        Input.setCursor(this._getResizeCursor(resizeAxis));

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

    public getHoverAxis(screenPoint: Point): TransformResizeAxis | null {
        if (!this._context) {
            return null;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return null;
        }

        return this._hitTestResizeAxis(screenPoint);
    }

    public getCursor(axis: TransformResizeAxis): string {
        return this._getResizeCursor(axis);
    }

    public getHoverCursor(screenPoint: Point): string | null {
    if (!this._context) {
        return null;
    }

    if (this._isResizing) {
        return this._activeResizeAxis
            ? this._getResizeCursor(this._activeResizeAxis)
            : null;
    }

    const axis = this._hitTestResizeAxis(screenPoint);
    if (!axis) {
        return null;
    }

    return this._getResizeCursor(axis);
}

    private _resetResizeSession(): void {
        this._isResizing = false;
        this._activeResizeAxis = null;
        this._resizeStartWorldPoint = null;
        this._resizeStartWidth = 0;
        this._resizeStartHeight = 0;
        this._resizeStartCorners = null;

        Input.resetCursor();
    }

    private _updateResizeFromInput(): void {
        if (!this._context) {
            return;
        }

        if (!this._isResizing || !this._activeResizeAxis) {
            return;
        }

        if (!this._resizeStartWorldPoint || !this._resizeStartCorners) {
            return;
        }

        const { world } = this._context;
        const resizeHandle = this._getHandle();
        const node = resizeHandle?.getNode();

        if (!node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const currentWorldPoint = world.getCamera().screenToWorld(screenPoint);
        const worldDelta = this._subtractPoints(currentWorldPoint, this._resizeStartWorldPoint);

        const [tl, tr, br, bl] = this._resizeStartCorners;

        const xAxis = this._normalize(this._subtractPoints(tr, tl));
        const yAxis = this._normalize(this._subtractPoints(bl, tl));

        const deltaX = this._dot(worldDelta, xAxis);
        const deltaY = this._dot(worldDelta, yAxis);

        const startWidth = this._resizeStartWidth;
        const startHeight = this._resizeStartHeight;

        let rawWidth = startWidth;
        let rawHeight = startHeight;

        let anchor: Point = tl;
        let anchorIsRightX = false;
        let anchorIsBottomY = false;

        switch (this._activeResizeAxis) {
            case "e":
                rawWidth = startWidth + deltaX;
                anchor = tl;
                break;
            case "w":
                rawWidth = startWidth - deltaX;
                anchor = tr;
                anchorIsRightX = true;
                break;
            case "s":
                rawHeight = startHeight + deltaY;
                anchor = tl;
                break;
            case "n":
                rawHeight = startHeight - deltaY;
                anchor = bl;
                anchorIsBottomY = true;
                break;
            case "se":
                rawWidth = startWidth + deltaX;
                rawHeight = startHeight + deltaY;
                anchor = tl;
                break;
            case "sw":
                rawWidth = startWidth - deltaX;
                rawHeight = startHeight + deltaY;
                anchor = tr;
                anchorIsRightX = true;
                break;
            case "ne":
                rawWidth = startWidth + deltaX;
                rawHeight = startHeight - deltaY;
                anchor = bl;
                anchorIsBottomY = true;
                break;
            case "nw":
                rawWidth = startWidth - deltaX;
                rawHeight = startHeight - deltaY;
                anchor = br;
                anchorIsRightX = true;
                anchorIsBottomY = true;
                break;
        }

        const nextWidth = Math.abs(rawWidth);
        const nextHeight = Math.abs(rawHeight);

        const offsetX = anchorIsRightX ? -Math.max(rawWidth, 0) : Math.min(rawWidth, 0);
        const offsetY = anchorIsBottomY ? -Math.max(rawHeight, 0) : Math.min(rawHeight, 0);

        const nextTL = this._addPoints(
            anchor,
            this._addPoints(
                this._scalePoint(xAxis, offsetX),
                this._scalePoint(yAxis, offsetY),
            ),
        );

        const nextCenter = this._addPoints(
            nextTL,
            this._addPoints(
                this._scalePoint(xAxis, nextWidth / 2),
                this._scalePoint(yAxis, nextHeight / 2),
            ),
        );

        node.setPosition(nextCenter.x, nextCenter.y);
        node.setSize(nextWidth, nextHeight);

        this._context.emitChange();
    }

    private _tryEndResize(): void {
        if (!this._isResizing) {
            return;
        }

        if (Input.getMouseButtonUp(MouseButton.Left) || !Input.getMouseButton(MouseButton.Left)) {
            this._resetResizeSession();
        }
    }

    private _getHandle(): IHandleTransformResize | null {
        if (!this._context) {
            return null;
        }

        return this._context.overlay
            .getHandlerManager()
            .get(HandleTransformResize.TYPE) as IHandleTransformResize | null;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }

    private _hitTestResizeAxis(screenPoint: Point): TransformResizeAxis | null {
        const { world } = this._context!;
        const resizeHandle = this._getHandle();

        if (!resizeHandle || !resizeHandle.isEnabled() || !resizeHandle.hasNode()) {
            return null;
        }

        const camera = world.getCamera();
        const cornerHalfSize = 4;
        const edgeHitWidth = 6;

        for (const axis of ["nw", "ne", "se", "sw"] as const) {
            const worldPoint = resizeHandle.getHandleWorldPoint(axis);
            if (!worldPoint) {
                continue;
            }

            const sp = camera.worldToScreen(worldPoint);

            if (
                screenPoint.x >= sp.x - cornerHalfSize &&
                screenPoint.x <= sp.x + cornerHalfSize &&
                screenPoint.y >= sp.y - cornerHalfSize &&
                screenPoint.y <= sp.y + cornerHalfSize
            ) {
                return axis;
            }
        }

        for (const axis of ["n", "e", "s", "w"] as const) {
            const edge = resizeHandle.getEdgeWorldPoints(axis);
            if (!edge) {
                continue;
            }

            const p0 = camera.worldToScreen(edge[0]);
            const p1 = camera.worldToScreen(edge[1]);

            if (this._isPointNearSegment(screenPoint, p0, p1, edgeHitWidth)) {
                return axis;
            }
        }

        return null;
    }

    private _isPointNearSegment(point: Point, start: Point, end: Point, threshold: number): boolean {
        return this._distanceToSegment(point, start, end) <= threshold;
    }

    private _distanceToSegment(point: Point, start: Point, end: Point): number {
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        if (dx === 0 && dy === 0) {
            return Math.hypot(point.x - start.x, point.y - start.y);
        }

        const t = Math.max(
            0,
            Math.min(
                1,
                ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)
            )
        );

        return Math.hypot(
            point.x - (start.x + dx * t),
            point.y - (start.y + dy * t),
        );
    }

    private _subtractPoints(a: Point, b: Point): Point {
        return { x: a.x - b.x, y: a.y - b.y };
    }

    private _addPoints(a: Point, b: Point): Point {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    private _scalePoint(v: Point, s: number): Point {
        return { x: v.x * s, y: v.y * s };
    }

    private _dot(a: Point, b: Point): number {
        return a.x * b.x + a.y * b.y;
    }

    private _normalize(v: Point): Point {
        const len = Math.hypot(v.x, v.y);
        return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
    }

    private _updateHoverCursor(): void {
        if (!this._context) {
            return;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const axis = this._hitTestResizeAxis(screenPoint);

        if (!axis) {
            return;
        }

        Input.setCursor(this._getResizeCursor(axis));
    }

    private _getResizeCursor(axis: TransformResizeAxis): string {
        switch (axis) {
            case "ne":
            case "sw":
                return "nesw-resize";

            case "nw":
            case "se":
                return "nwse-resize";

            case "n":
            case "s":
                return "ns-resize";

            case "e":
            case "w":
                return "ew-resize";

            default:
                return "default";
        }
    }
}