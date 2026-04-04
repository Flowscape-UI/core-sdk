import Konva from "konva";
import { MathF32 } from "../core/math";
import type { Point } from "../core/camera";
import { matrixInvert } from "../nodes/utils/matrix-invert";
import {
    HandleCornerRadius,
    HandleTransform,
    HandleTransformPivot,
    HandleTransformPosition,
    HandleTransformResize,
    HandleTransformRotate,
    type CornerRadiusAxis,
    type IHandleTransformResize,
    type LayerOverlay,
    type LayerWorld,
    type TransformResizeAxis,
    type TransformRotateAxis
} from "../scene/layers";


export class LayerOverlayInputController {

    /********************************************************************/
    /*                            Properties                            */
    /********************************************************************/

    private readonly _stage: Konva.Stage;
    private readonly _world: LayerWorld;
    private readonly _overlay: LayerOverlay;
    private readonly _onChange?: (() => void) | undefined;

    private _enabled: boolean;


    /********************************************************************/
    /*                          Resize Session                          */
    /********************************************************************/

    private _isResizing: boolean = false;
    private _activeResizeAxis: TransformResizeAxis | null = null;
    private _resizeStartWorldPoint: Point | null = null;
    private _resizeStartWidth: number = 0;
    private _resizeStartHeight: number = 0;
    private _resizeStartCorners: [Point, Point, Point, Point] | null = null;

    /********************************************************************/
    /*                           Move Session                           */
    /********************************************************************/

    private _isMoving: boolean = false;
    private _moveStartWorldPoint: Point | null = null;
    private _moveStartNodePosition: Point | null = null;

    /********************************************************************/
    /*                         Rotate Session                           */
    /********************************************************************/

    private _isRotating: boolean = false;
    private _rotateStartWorldPoint: Point | null = null;
    private _rotateStartNodeRotation: number = 0;
    private _rotatePivotWorldPoint: Point | null = null;

    /********************************************************************/
    /*                          Pivot Session                           */
    /********************************************************************/

    private _isPivoting: boolean = false;

    /********************************************************************/
    /*                    Corner Radius Session                         */
    /********************************************************************/

    private _isCornerRadiusDragging: boolean = false;
    private _activeCornerRadiusAxis: CornerRadiusAxis | null = null;
    private _cornerRadiusSingleMode: boolean = false;
    private _pendingCornerRadiusAxis: CornerRadiusAxis | null = null;
    private _cornerRadiusStartAmbiguous: boolean = false;
    private _cornerRadiusDragStartScreenPoint: Point | null = null;


    /********************************************************************/
    /*                           Constructor                            */
    /********************************************************************/

    constructor(
        stage: Konva.Stage,
        world: LayerWorld,
        overlay: LayerOverlay,
        onChange?: () => void
    ) {
        this._stage = stage;
        this._world = world;
        this._overlay = overlay;
        this._onChange = onChange;
        this._enabled = true;
        this._bind();
    }

    public destroy(): void {
        this._unbind();
        this._unbindTransformDocumentListeners();
        this._overlay.clearHoveredNode();
    }


    /********************************************************************/
    /*                            Public API                            */
    /********************************************************************/

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) return;

        this._enabled = value;

        if (!value) {
            const hadHover = this._overlay.getHoveredNode() !== null;
            this._overlay.clearHoveredNode();
            if (hadHover) this._emitChange();
        }
    }

    public updateHoverFromPointer(): void {
        if (!this._enabled || !this._overlay.isEnabled()) return;

        const screenPoint = this._getStagePointer();

        if (!screenPoint) {
            const hadHover = this._overlay.getHoveredNode() !== null;
            if (!hadHover) return;
            this._overlay.clearHoveredNode();
            this._emitChange();
            return;
        }

        const worldPoint = this._world.getCamera().screenToWorld(screenPoint);
        const hoveredNode = this._world.findTopNodeAt(worldPoint);
        const currentHoveredNode = this._overlay.getHoveredNode();

        if (currentHoveredNode?.id === hoveredNode?.id) return;

        if (hoveredNode) {
            this._overlay.setHoveredNode(hoveredNode);
        } else {
            this._overlay.clearHoveredNode();
        }

        this._emitChange();
    }


    /********************************************************************/
    /*                             Bindings                             */
    /********************************************************************/

    private _bind(): void {
        this._stage.on("mousemove", this._onMouseMove);
        this._stage.on("mouseleave", this._onMouseLeave);
        this._stage.on("mousedown", this._onMouseDown);
        this._stage.on("mouseup", this._onMouseUp);
    }

    private _unbind(): void {
        this._stage.off("mousemove", this._onMouseMove);
        this._stage.off("mouseleave", this._onMouseLeave);
        this._stage.off("mousedown", this._onMouseDown);
        this._stage.off("mouseup", this._onMouseUp);
    }

    private _bindTransformDocumentListeners(): void {
        document.addEventListener("pointermove", this._onDocumentPointerMove);
        document.addEventListener("pointerup", this._onDocumentPointerUp);
    }

    private _unbindTransformDocumentListeners(): void {
        document.removeEventListener("pointermove", this._onDocumentPointerMove);
        document.removeEventListener("pointerup", this._onDocumentPointerUp);
    }


    /********************************************************************/
    /*                          Event Handlers                          */
    /********************************************************************/

    private _onMouseMove = (): void => {
        if (
            this._isResizing ||
            this._isMoving ||
            this._isRotating ||
            this._isPivoting ||
            this._isCornerRadiusDragging
        ) {
            return;
        }

        this.updateHoverFromPointer();
        this._updateCursorFromPointer();
    };

    private _onMouseLeave = (): void => {
        if (!this._enabled || !this._overlay.isEnabled()) return;

        this._stage.container().style.cursor = "default";

        const hadHover = this._overlay.getHoveredNode() !== null;
        if (!hadHover) return;

        this._overlay.clearHoveredNode();
        this._emitChange();
    };

    private _onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>): void => {
        if (!this._enabled || !this._overlay.isEnabled()) return;

        const screenPoint = this._getStagePointer();
        if (!screenPoint) return;

        const worldPoint = this._world.getCamera().screenToWorld(screenPoint);
        const hoveredNode = this._overlay.getHoveredNode();

        const transformHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransform.TYPE) as HandleTransform | null;

        const transformResizeHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformResize.TYPE) as HandleTransformResize | null;

        const transformPositionHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPosition.TYPE) as HandleTransformPosition | null;

        const transformRotateHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformRotate.TYPE) as HandleTransformRotate | null;

        const transformPivotHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPivot.TYPE) as HandleTransformPivot | null;

        const cornerRadiusHandle = this._overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;

        if (!transformHandle) return;


        if (this._hitTestPivot(screenPoint)) {
            this._beginPivot(screenPoint);
            return;
        }

        const cornerRadiusAxis = this._hitTestCornerRadiusAxis(screenPoint);

        if (cornerRadiusAxis) {
            this._beginCornerRadiusDrag(cornerRadiusAxis, screenPoint, e.evt);
            return;
        }

        const resizeAxis = this._hitTestResizeAxis(screenPoint);

        if (resizeAxis) {
            this._beginResize(resizeAxis, screenPoint);
            return;
        }

        if (
            transformHandle.hasNode() &&
            transformPositionHandle &&
            transformPositionHandle.isEnabled() &&
            transformPositionHandle.containsPoint(worldPoint)
        ) {
            this._beginMove(screenPoint);
            return;
        }

        const rotateAxis = this._hitTestRotateAxis(screenPoint);

        if (rotateAxis) {
            this._beginRotate(rotateAxis, screenPoint);
            return;
        }

        if (hoveredNode) {
            if (transformHandle.getNodeId() === hoveredNode.id) {
                return;
            }

            transformHandle.setNode(hoveredNode);
            transformResizeHandle?.setNode(hoveredNode);
            transformPositionHandle?.setNode(hoveredNode);
            transformRotateHandle?.setNode(hoveredNode);
            transformPivotHandle?.setNode(hoveredNode);
            cornerRadiusHandle?.setNode(hoveredNode);

            this._emitChange();
            return;
        }

        if (!transformHandle.hasNode()) return;
        if (transformHandle.containsPoint(worldPoint)) return;

        transformHandle.clearNode();
        transformResizeHandle?.clearNode();
        transformPositionHandle?.clearNode();
        transformRotateHandle?.clearNode();
        transformPivotHandle?.clearNode();
        cornerRadiusHandle?.clearNode();

        this._emitChange();
    };

    private _onMouseUp = (): void => {
        if (!this._isResizing) return;
        this._endResize();
    };

    private _onDocumentPointerMove = (e: PointerEvent): void => {
        const screenPoint = this._pointerEventToStagePoint(e);

        if (this._isResizing) {
            this._updateResizeFromPointer(screenPoint);
            return;
        }

        if (this._isMoving) {
            this._updateMoveFromPointer(screenPoint);
            return;
        }

        if (this._isRotating) {
            this._updateRotateFromPointer(screenPoint);
            return;
        }

        if (this._isPivoting) {
            this._updatePivotFromPointer(screenPoint);
            return;
        }

        if (this._isCornerRadiusDragging) {
            this._cornerRadiusSingleMode = e.ctrlKey;
            this._updateCornerRadiusFromPointer(screenPoint, e);
            return;
        }
    };

    private _onDocumentPointerUp = (): void => {
        if (this._isResizing) {
            this._endResize();
            return;
        }

        if (this._isMoving) {
            this._endMove();
            return;
        }

        if (this._isRotating) {
            this._endRotate();
            return;
        }

        if (this._isPivoting) {
            this._endPivot();
            return;
        }

        if (this._isCornerRadiusDragging) {
            this._endCornerRadiusDrag();
            return;
        }
    };


    /********************************************************************/
    /*                              Resize                              */
    /********************************************************************/

    private _beginResize(axis: TransformResizeAxis, screenPoint: Point): void {
        const transformHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransform.TYPE) as HandleTransform | null;

        const node = transformHandle?.getNode();
        if (!node || !transformHandle) return;

        const corners = node.getWorldCorners();
        if (corners.length < 4) return;

        this._isResizing = true;
        this._activeResizeAxis = axis;
        this._resizeStartWorldPoint = this._world.getCamera().screenToWorld(screenPoint);
        this._resizeStartWidth = node.getWidth();
        this._resizeStartHeight = node.getHeight();
        this._resizeStartCorners = [corners[0], corners[1], corners[2], corners[3]];

        this._stage.container().style.cursor = this._getResizeCursor(axis);
        this._bindTransformDocumentListeners();
    }

    private _updateResizeFromPointer(screenPoint: Point): void {
        if (!this._isResizing || !this._activeResizeAxis) return;
        if (!this._resizeStartWorldPoint || !this._resizeStartCorners) return;

        const transformHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransform.TYPE) as HandleTransform | null;

        const node = transformHandle?.getNode();
        if (!node) return;

        const currentWorldPoint = this._world.getCamera().screenToWorld(screenPoint);
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
            case "e": rawWidth = startWidth + deltaX; anchor = tl; break;
            case "w": rawWidth = startWidth - deltaX; anchor = tr; anchorIsRightX = true; break;
            case "s": rawHeight = startHeight + deltaY; anchor = tl; break;
            case "n": rawHeight = startHeight - deltaY; anchor = bl; anchorIsBottomY = true; break;
            case "se": rawWidth = startWidth + deltaX; rawHeight = startHeight + deltaY; anchor = tl; break;
            case "sw": rawWidth = startWidth - deltaX; rawHeight = startHeight + deltaY; anchor = tr; anchorIsRightX = true; break;
            case "ne": rawWidth = startWidth + deltaX; rawHeight = startHeight - deltaY; anchor = bl; anchorIsBottomY = true; break;
            case "nw": rawWidth = startWidth - deltaX; rawHeight = startHeight - deltaY; anchor = br; anchorIsRightX = true; anchorIsBottomY = true; break;
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

        this._emitChange();
    }

    private _updatePivotFromPointer(screenPoint: Point): void {
        if (!this._isPivoting) {
            return;
        }

        const pivotHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPivot.TYPE) as HandleTransformPivot | null;

        const node = pivotHandle?.getNode();
        if (!node) {
            return;
        }

        const width = node.getWidth();
        const height = node.getHeight();

        if (width === 0 || height === 0) {
            return;
        }

        const worldPoint = this._world.getCamera().screenToWorld(screenPoint);
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

            this._emitChange();
        } catch {
            return;
        }
    }

    private _endResize(): void {
        this._unbindTransformDocumentListeners();

        this._isResizing = false;
        this._activeResizeAxis = null;
        this._resizeStartWorldPoint = null;
        this._resizeStartWidth = 0;
        this._resizeStartHeight = 0;
        this._resizeStartCorners = null;

        this._updateCursorFromPointer();
    }

    private _endPivot(): void {
        this._unbindTransformDocumentListeners();

        this._isPivoting = false;

        this._updateCursorFromPointer();
    }

    private _beginMove(screenPoint: Point): void {
        const transformHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransform.TYPE) as HandleTransform | null;

        const node = transformHandle?.getNode();
        if (!node) {
            return;
        }

        this._isMoving = true;
        this._moveStartWorldPoint = this._world.getCamera().screenToWorld(screenPoint);
        this._moveStartNodePosition = node.getPosition();

        this._bindTransformDocumentListeners();
    }



    private _updateRotateFromPointer(screenPoint: Point): void {
        if (
            !this._isRotating ||
            !this._rotateStartWorldPoint ||
            !this._rotatePivotWorldPoint
        ) {
            return;
        }

        const rotateHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformRotate.TYPE) as HandleTransformRotate | null;

        const node = rotateHandle?.getNode();
        if (!node) {
            return;
        }

        const currentWorldPoint = this._world.getCamera().screenToWorld(screenPoint);

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

        this._emitChange();
    }

    private _beginRotate(axis: TransformRotateAxis, screenPoint: Point): void {
        const rotateHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformRotate.TYPE) as HandleTransformRotate | null;

        const node = rotateHandle?.getNode();
        if (!rotateHandle || !node) {
            return;
        }

        const pivotWorldPoint = rotateHandle.getPivotWorldPoint();
        if (!pivotWorldPoint) {
            return;
        }

        this._isRotating = true;
        this._rotateStartWorldPoint = this._world.getCamera().screenToWorld(screenPoint);
        this._rotateStartNodeRotation = node.getRotation();
        this._rotatePivotWorldPoint = pivotWorldPoint;

        this._bindTransformDocumentListeners();
    }

    private _endRotate(): void {
        this._unbindTransformDocumentListeners();

        this._isRotating = false;
        this._rotateStartWorldPoint = null;
        this._rotateStartNodeRotation = 0;
        this._rotatePivotWorldPoint = null;

        this._updateCursorFromPointer();
    }

    private _beginCornerRadiusDrag(axis: CornerRadiusAxis, screenPoint: Point, e?: PointerEvent): void {
        const cornerRadiusHandle = this._overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;

        const node = cornerRadiusHandle?.getNode();

        if (!cornerRadiusHandle || !node) {
            return;
        }

        const hitAxes = this._getCornerRadiusHitAxes(screenPoint);
        const isAmbiguous = hitAxes.length > 1;

        this._isCornerRadiusDragging = true;
        this._pendingCornerRadiusAxis = axis;
        this._cornerRadiusDragStartScreenPoint = screenPoint;
        this._cornerRadiusSingleMode = !!e?.ctrlKey;
        this._cornerRadiusStartAmbiguous = isAmbiguous;

        if (isAmbiguous) {
            this._activeCornerRadiusAxis = null;
        } else {
            this._activeCornerRadiusAxis = axis;
        }

        this._stage.container().style.cursor = "pointer";
        this._bindTransformDocumentListeners();
    }

    private _updateMoveFromPointer(screenPoint: Point): void {
        if (!this._isMoving || !this._moveStartWorldPoint || !this._moveStartNodePosition) {
            return;
        }

        const transformHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransform.TYPE) as HandleTransform | null;

        const node = transformHandle?.getNode();
        if (!node) {
            return;
        }

        const currentWorldPoint = this._world.getCamera().screenToWorld(screenPoint);

        const dx = currentWorldPoint.x - this._moveStartWorldPoint.x;
        const dy = currentWorldPoint.y - this._moveStartWorldPoint.y;

        node.setPosition(
            MathF32.toF32(Math.round(this._moveStartNodePosition.x + dx)),
            MathF32.toF32(Math.round(this._moveStartNodePosition.y + dy)),
        );

        this._emitChange();
    }

    private _endMove(): void {
        this._unbindTransformDocumentListeners();

        this._isMoving = false;
        this._moveStartWorldPoint = null;
        this._moveStartNodePosition = null;

        this._updateCursorFromPointer();
    }


    /********************************************************************/
    /*                           Hit Testing                            */
    /********************************************************************/

    private _hitTestResizeAxis(screenPoint: Point): TransformResizeAxis | null {
        const resizeHandle = this._overlay
            .getHandlerManager()
            .get("transform-resize") as IHandleTransformResize | null;

        if (!resizeHandle || !resizeHandle.isEnabled() || !resizeHandle.hasNode()) return null;

        const camera = this._world.getCamera();
        const cornerHalfSize = 4;
        const edgeHitWidth = 6;

        for (const axis of ["nw", "ne", "se", "sw"] as const) {
            const worldPoint = resizeHandle.getHandleWorldPoint(axis);
            if (!worldPoint) continue;

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
            if (!edge) continue;

            const p0 = camera.worldToScreen(edge[0]);
            const p1 = camera.worldToScreen(edge[1]);

            if (this._isPointNearSegment(screenPoint, p0, p1, edgeHitWidth)) {
                return axis;
            }
        }

        return null;
    }

    private _hitTestRotateAxis(screenPoint: Point): TransformRotateAxis | null {
        const rotateHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformRotate.TYPE) as HandleTransformRotate | null;

        if (!rotateHandle || !rotateHandle.isEnabled() || !rotateHandle.hasNode()) {
            return null;
        }

        const camera = this._world.getCamera();
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

    private _hitTestPivot(screenPoint: Point): boolean {
        const pivotHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPivot.TYPE) as HandleTransformPivot | null;

        if (!pivotHandle || !pivotHandle.isEnabled() || !pivotHandle.hasNode()) {
            return false;
        }

        const worldPoint = pivotHandle.getPivotWorldPoint();
        if (!worldPoint) {
            return false;
        }

        const camera = this._world.getCamera();
        const sp = camera.worldToScreen(worldPoint);

        const hitRadius = 10;
        const dx = screenPoint.x - sp.x;
        const dy = screenPoint.y - sp.y;

        return Math.hypot(dx, dy) <= hitRadius;
    }

    private _hitTestCornerRadiusAxis(screenPoint: Point): CornerRadiusAxis | null {
        const axes = this._getCornerRadiusHitAxes(screenPoint);
        return axes[0] ?? null;
    }

    private _beginPivot(screenPoint: Point): void {
        const pivotHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPivot.TYPE) as HandleTransformPivot | null;

        const node = pivotHandle?.getNode();
        if (!node) {
            return;
        }

        this._isPivoting = true;
        this._bindTransformDocumentListeners();
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

        const t = Math.max(0, Math.min(1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)
        ));

        return Math.hypot(
            point.x - (start.x + dx * t),
            point.y - (start.y + dy * t),
        );
    }


    /********************************************************************/
    /*                              Cursor                              */
    /********************************************************************/

    private _updateCursorFromPointer(): void {
        const container = this._stage.container();

        if (!this._enabled || !this._overlay.isEnabled()) {
            container.style.cursor = "default";
            return;
        }

        const screenPoint = this._getStagePointer();
        if (!screenPoint) {
            container.style.cursor = "default";
            return;
        }

        const cornerRadiusAxis = this._hitTestCornerRadiusAxis(screenPoint);
        if (cornerRadiusAxis) {
            container.style.cursor = "pointer";
            return;
        }

        const resizeAxis = this._hitTestResizeAxis(screenPoint);
        if (resizeAxis) {
            container.style.cursor = this._getResizeCursor(resizeAxis);
            return;
        }

        if (this._hitTestPivot(screenPoint)) {
            container.style.cursor = "crosshair";
            return;
        }

        const worldPoint = this._world.getCamera().screenToWorld(screenPoint);
        const transformPositionHandle = this._overlay
            .getHandlerManager()
            .get(HandleTransformPosition.TYPE) as HandleTransformPosition | null;

        if (
            transformPositionHandle &&
            transformPositionHandle.isEnabled() &&
            transformPositionHandle.hasNode() &&
            transformPositionHandle.containsPoint(worldPoint)
        ) {
            container.style.cursor = "default";
            return;
        }

        const rotateAxis = this._hitTestRotateAxis(screenPoint);
        if (rotateAxis) {
            container.style.cursor = "crosshair";
            return;
        }

        container.style.cursor = "default";
    }

    private _getResizeCursor(axis: TransformResizeAxis): string {
        switch (axis) {
            case "ne": case "sw": return "nesw-resize";
            case "nw": case "se": return "nwse-resize";
            case "n": case "s": return "ns-resize";
            case "e": case "w": return "ew-resize";
            default: return "default";
        }
    }

    private _updateCornerRadiusFromPointer(screenPoint: Point, e?: PointerEvent): void {
        if (!this._isCornerRadiusDragging) {
            return;
        }

        if (!this._activeCornerRadiusAxis) {
            const resolvedAxis = this._resolveCornerRadiusAxisFromDirection(screenPoint);

            if (!resolvedAxis) {
                return;
            }

            this._activeCornerRadiusAxis = resolvedAxis;
        }
        if (!this._activeCornerRadiusAxis) {
            return;
        }

        const cornerRadiusHandle = this._overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;

        const node = cornerRadiusHandle?.getNode();

        if (!cornerRadiusHandle || !node) {
            return;
        }

        const section = cornerRadiusHandle.getSection(this._activeCornerRadiusAxis);

        if (!section) {
            return;
        }

        const worldPoint = this._world.getCamera().screenToWorld(screenPoint);

        const diagonalEnd = this._getCornerRadiusSectionDiagonalPoint(section);
        const diagonalVector = this._subtractPoints(diagonalEnd, section.origin);
        const diagonalLength = Math.hypot(diagonalVector.x, diagonalVector.y);

        if (diagonalLength <= 0.000001) {
            return;
        }

        const diagonalDir = {
            x: diagonalVector.x / diagonalLength,
            y: diagonalVector.y / diagonalLength,
        };

        const originToPointer = this._subtractPoints(worldPoint, section.origin);
        const projectedDistance = this._dot(originToPointer, diagonalDir);
        const clampedDistance = Math.max(0, Math.min(projectedDistance, diagonalLength));

        const progress = clampedDistance / diagonalLength;
        const maxRadius = Math.max(0, Math.min(section.width, section.height) + section.inset);

        const nextValue = MathF32.toF32(progress * maxRadius);

        const current = node.getCornerRadius();
        const applyOnlyOne = this._cornerRadiusSingleMode;

        if (applyOnlyOne) {
            switch (this._activeCornerRadiusAxis) {
                case "tl":
                    current.tl = nextValue;
                    break;
                case "tr":
                    current.tr = nextValue;
                    break;
                case "br":
                    current.br = nextValue;
                    break;
                case "bl":
                    current.bl = nextValue;
                    break;
            }
        } else {
            current.tl = nextValue;
            current.tr = nextValue;
            current.br = nextValue;
            current.bl = nextValue;
        }

        node.setCornerRadius(current);
        this._emitChange();
    }

    private _getCornerRadiusSectionDiagonalPoint(section: {
        origin: Point;
        xAxisPoint: Point;
        yAxisPoint: Point;
    }): Point {
        return {
            x: section.xAxisPoint.x + section.yAxisPoint.x - section.origin.x,
            y: section.xAxisPoint.y + section.yAxisPoint.y - section.origin.y,
        };
    }

    private _endCornerRadiusDrag(): void {
        this._unbindTransformDocumentListeners();

        this._isCornerRadiusDragging = false;
        this._cornerRadiusSingleMode = false;
        this._activeCornerRadiusAxis = null;

        this._pendingCornerRadiusAxis = null;
        this._cornerRadiusDragStartScreenPoint = null;
        this._cornerRadiusStartAmbiguous = false;

        this._updateCursorFromPointer();
    }


    /********************************************************************/
    /*                            Math Utils                            */
    /********************************************************************/

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


    /********************************************************************/
    /*                             Helpers                              */
    /********************************************************************/

    private _emitChange(): void {
        this._onChange?.();
    }

    private _getStagePointer(): Point | null {
        const point = this._stage.getPointerPosition();
        return point ? { x: point.x, y: point.y } : null;
    }

    private _pointerEventToStagePoint(e: PointerEvent): Point {
        const rect = this._stage.container().getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    private _resolveCornerRadiusAxisFromDirection(screenPoint: Point): CornerRadiusAxis | null {
        const cornerRadiusHandle = this._overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;

        if (!cornerRadiusHandle || !cornerRadiusHandle.hasNode()) {
            return null;
        }

        if (!this._cornerRadiusDragStartScreenPoint) {
            return null;
        }

        const move = this._subtractPoints(screenPoint, this._cornerRadiusDragStartScreenPoint);
        const moveLength = Math.hypot(move.x, move.y);

        if (moveLength < 5) {
            return null;
        }

        let bestAxis: CornerRadiusAxis | null = null;
        let bestScore = -Infinity;

        for (const axis of ["tl", "tr", "br", "bl"] as const) {
            const section = cornerRadiusHandle.getSection(axis);

            if (!section) {
                continue;
            }

            const handlePoint = cornerRadiusHandle.getHandleWorldPoint(axis);
            if (!handlePoint) {
                continue;
            }

            const handleScreenPoint = this._world.getCamera().worldToScreen(handlePoint);
            const originScreenPoint = this._world.getCamera().worldToScreen(section.origin);

            const dir = this._subtractPoints(originScreenPoint, handleScreenPoint);
            const dirLength = Math.hypot(dir.x, dir.y);

            if (dirLength <= 0.000001) {
                continue;
            }

            const normalizedDir = {
                x: dir.x / dirLength,
                y: dir.y / dirLength,
            };

            const normalizedMove = {
                x: move.x / moveLength,
                y: move.y / moveLength,
            };

            const score = this._dot(normalizedMove, normalizedDir);

            if (score > bestScore) {
                bestScore = score;
                bestAxis = axis;
            }
        }

        return bestAxis;
    }


    private _getCornerRadiusHitAxes(screenPoint: Point): CornerRadiusAxis[] {
        const cornerRadiusHandle = this._overlay
            .getHandlerManager()
            .get(HandleCornerRadius.TYPE) as HandleCornerRadius | null;

        if (!cornerRadiusHandle || !cornerRadiusHandle.isEnabled() || !cornerRadiusHandle.hasNode()) {
            return [];
        }

        const camera = this._world.getCamera();
        const hitRadius = 8;
        const result: CornerRadiusAxis[] = [];

        for (const axis of ["tl", "tr", "br", "bl"] as const) {
            const worldPoint = cornerRadiusHandle.getHandleWorldPoint(axis);

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
}