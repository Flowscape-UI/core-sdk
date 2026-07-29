import type { Point } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IShapeBase } from "../../../../../../../nodes";
import { MathF32 } from "../../../../../../../core/math";
import {
    type IHandleTransformResizeEdge,
    type IHandleTransformResizeVertex,
} from "../../../../../../../scene/layers";
import { Input } from "../../../../../../Input";
import { MouseButton } from "../../../../../../types";
import type { OverlayInputContext } from "../../../LayerOverlayInputController";
import type { IOverlayTransformSubModule } from "../types";

type ResizeEdgeAxis = "n" | "e" | "s" | "w";
type ResizeVertexAxis = "nw" | "ne" | "se" | "sw";
type ResizeAxis = ResizeEdgeAxis | ResizeVertexAxis;
type ResizeHandle = IHandleTransformResizeEdge | IHandleTransformResizeVertex;

type AxisHandleEntry = {
    axis: ResizeAxis;
    handle: ResizeHandle;
};

const EDGE_AXES: readonly ResizeEdgeAxis[] = ["n", "e", "s", "w"];
const VERTEX_AXES: readonly ResizeVertexAxis[] = ["nw", "ne", "se", "sw"];

export class ModuleOverlayTransformResize implements IOverlayTransformSubModule {
    public readonly id = "overlay-transform-resize";

    private _context: OverlayInputContext | null = null;

    private _isResizing = false;
    private _activeResizeAxis: ResizeAxis | null = null;
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

        const node = this._getActiveNode();
        if (!node) {
            return false;
        }

        const resizeAxis = this._hitTestResizeAxis(screenPoint);
        if (!resizeAxis) {
            return false;
        }

        const corners = node.getWorldCorners();

        this._isResizing = true;
        this._activeResizeAxis = resizeAxis;
        this._resizeStartWorldPoint = world.camera.screenToWorld(screenPoint);
        this._resizeStartWidth = node.getWidth();
        this._resizeStartHeight = node.getHeight();
        this._resizeStartCorners = [corners[0], corners[1], corners[2], corners[3]];
        Input.setCursor(this._getResizeCursor(resizeAxis));

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

    public getHoverAxis(screenPoint: Point): ResizeAxis | null {
        if (!this._context) {
            return null;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return null;
        }

        return this._hitTestResizeAxis(screenPoint);
    }

    public getCursor(axis: ResizeAxis): string {
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
        const node = this._getActiveNode();

        if (!node) {
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const currentWorldPoint = world.camera.screenToWorld(screenPoint);
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

        const rawTL = this._addPoints(
            anchor,
            this._addPoints(
                this._scalePoint(xAxis, offsetX),
                this._scalePoint(yAxis, offsetY),
            ),
        );

        const roundedWidth = MathF32.round(nextWidth);
        const roundedHeight = MathF32.round(nextHeight);
        const roundedTL = {
            x: MathF32.round(rawTL.x),
            y: MathF32.round(rawTL.y),
        };

        const pivotX = node.getPivotX(); // 0..1
        const pivotY = node.getPivotY(); // 0..1

        const nextPosition = this._addPoints(
            roundedTL,
            this._addPoints(
                this._scalePoint(xAxis, roundedWidth * pivotX),
                this._scalePoint(yAxis, roundedHeight * pivotY),
            ),
        );

        node.setPosition(nextPosition.x, nextPosition.y);
        node.setSize(roundedWidth, roundedHeight);

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

    private _getActiveNode(): IShapeBase | null {
        for (const { handle } of this._getAxisHandles()) {
            const node = handle.getNode();
            if (node) {
                return node;
            }
        }

        return null;
    }

    private _getAxisHandles(): AxisHandleEntry[] {
        const entries: AxisHandleEntry[] = [];

        for (const axis of EDGE_AXES) {
            const handle = this._getHandleById(`transform-resize-${axis}`);
            if (handle) {
                entries.push({ axis, handle });
            }
        }

        for (const axis of VERTEX_AXES) {
            const handle = this._getHandleById(`transform-resize-${axis}`);
            if (handle) {
                entries.push({ axis, handle });
            }
        }

        return entries;
    }

    private _getHandleById(id: string): ResizeHandle | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.transformHandleManager.getById(id);

        if (!this._isResizeHandle(handle)) {
            return null;
        }

        return handle;
    }

    private _isResizeHandle(value: unknown): value is ResizeHandle {
        if (!value || typeof value !== "object") {
            return false;
        }

        const handle = value as Partial<ResizeHandle>;

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

    private _hitTestResizeAxis(screenPoint: Point): ResizeAxis | null {
        if (!this._context) {
            return null;
        }

        const entries = this._getAxisHandles();
        let topAxis: ResizeAxis | null = null;
        let topZIndex = -Infinity;
        let topOrder = -1;

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i]!;
            const handle = entry.handle;

            if (!handle.isEnabled() || !handle.isVisible() || !handle.hasNode()) {
                continue;
            }

            if (!this._hitTestHandleScreen(entry, screenPoint)) {
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

    private _hitTestHandleScreen(entry: AxisHandleEntry, screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const handle = entry.handle;
        const node = handle.getNode();

        if (!node) {
            return false;
        }

        const camera = this._context.world.camera;
        const axis = entry.axis;

        if (this._isEdgeAxis(axis)) {
            const worldPoints = this._getEdgeWorldPoints(node, axis);
            const p0 = camera.worldToScreen(worldPoints[0]);
            const p1 = camera.worldToScreen(worldPoints[1]);
            const strokeWidth = this._getEdgeHitStrokeWidth(handle, axis);

            if (strokeWidth <= 0) {
                return false;
            }

            return this._distanceToSegment(screenPoint, p0, p1) <= strokeWidth * 0.5;
        }

        const worldPoint = this._getHandleWorldPoint(handle, node);
        const center = camera.worldToScreen(worldPoint);
        const width = this._resolveHitWidth(handle);
        const height = this._resolveHitHeight(handle);

        if (width <= 0 || height <= 0) {
            return false;
        }

        return this._pointInRotatedRect(
            screenPoint,
            center,
            width,
            height,
            handle.getOffsetX(),
            handle.getOffsetY(),
            node.getWorldRotation(),
        );
    }

    private _isEdgeAxis(axis: ResizeAxis): axis is ResizeEdgeAxis {
        return axis === "n" || axis === "e" || axis === "s" || axis === "w";
    }

    private _getHandleWorldPoint(handle: ResizeHandle, node: IShapeBase): Point {
        const localViewObb = node.getLocalViewOBB();
        const localX = localViewObb.x + localViewObb.width * handle.getX();
        const localY = localViewObb.y + localViewObb.height * handle.getY();
        const matrix = node.getWorldMatrix();

        return {
            x: matrix.a * localX + matrix.c * localY + matrix.tx,
            y: matrix.b * localX + matrix.d * localY + matrix.ty,
        };
    }

    private _getEdgeWorldPoints(node: IShapeBase, axis: ResizeEdgeAxis): [Point, Point] {
        const corners = node.getWorldViewCorners();

        switch (axis) {
            case "n":
                return [corners[0], corners[1]];
            case "e":
                return [corners[1], corners[2]];
            case "s":
                return [corners[2], corners[3]];
            case "w":
                return [corners[3], corners[0]];
        }
    }

    private _resolveHitWidth(handle: ResizeHandle): number {
        const hitWidth = handle.getHitWidth();
        return hitWidth > 0 ? hitWidth : handle.getWidth();
    }

    private _resolveHitHeight(handle: ResizeHandle): number {
        const hitHeight = handle.getHitHeight();
        return hitHeight > 0 ? hitHeight : handle.getHeight();
    }

    private _getEdgeHitStrokeWidth(handle: ResizeHandle, axis: ResizeEdgeAxis): number {
        if (axis === "n" || axis === "s") {
            return this._resolveHitHeight(handle);
        }

        return this._resolveHitWidth(handle);
    }

    private _pointInRotatedRect(
        point: Point,
        center: Point,
        width: number,
        height: number,
        offsetX: number,
        offsetY: number,
        rotationDeg: number,
    ): boolean {
        const angle = -rotationDeg * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const dx = point.x - center.x;
        const dy = point.y - center.y;

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const left = -offsetX;
        const top = -offsetY;
        const right = left + width;
        const bottom = top + height;

        return (
            localX >= left &&
            localX <= right &&
            localY >= top &&
            localY <= bottom
        );
    }

    private _distanceToSegment(point: Point, a: Point, b: Point): number {
        const abX = b.x - a.x;
        const abY = b.y - a.y;
        const abLenSq = abX * abX + abY * abY;

        if (abLenSq <= 1e-8) {
            return Math.hypot(point.x - a.x, point.y - a.y);
        }

        const apX = point.x - a.x;
        const apY = point.y - a.y;
        const t = Math.max(0, Math.min(1, (apX * abX + apY * abY) / abLenSq));
        const closestX = a.x + abX * t;
        const closestY = a.y + abY * t;

        return Math.hypot(point.x - closestX, point.y - closestY);
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

    private _getResizeCursor(axis: ResizeAxis): string {
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
