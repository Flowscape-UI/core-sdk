import Konva from "konva";
import type { Point } from "../../../../../../../../core/camera";
import type { IShapeBase } from "../../../../../../../../nodes";
import type {
    IHandleTransformResizeEdge,
    IHandleTransformResizeVertex,
} from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";
import { Direction } from "../../../../../../../../core";

function resolveHitWidth(
    handle: IHandleTransformResizeEdge | IHandleTransformResizeVertex,
): number {
    const hitWidth = handle.getHitWidth();

    if (hitWidth > 0) {
        return hitWidth;
    }

    return handle.getWidth();
}

function resolveHitHeight(
    handle: IHandleTransformResizeEdge | IHandleTransformResizeVertex,
): number {
    const hitHeight = handle.getHitHeight();

    if (hitHeight > 0) {
        return hitHeight;
    }

    return handle.getHeight();
}

function isNear(a: number, b: number, epsilon: number = 1e-6): boolean {
    return Math.abs(a - b) <= epsilon;
}

function resolveEdgeDirection(handle: IHandleTransformResizeEdge): Direction | null {
    const x = handle.getX();
    const y = handle.getY();

    if (isNear(y, 0)) {
        return Direction.N;
    }

    if (isNear(x, 1)) {
        return Direction.E;
    }

    if (isNear(y, 1)) {
        return Direction.S;
    }

    if (isNear(x, 0)) {
        return Direction.W;
    }

    return null;
}

function getEdgeWorldPoints(node: IShapeBase, direction: Direction): [Point, Point] {
    const corners = node.getWorldViewCorners();
    switch (direction) {
        case Direction.E:
            return [corners[1], corners[2]];
        case Direction.S:
            return [corners[2], corners[3]];
        case Direction.W:
            return [corners[3], corners[0]];
        default:
            return [corners[0], corners[1]];
    }
}

export class RendererHandleTransformResizeEdgeCanvas extends RendererHandleBase<IHandleTransformResizeEdge> {

    private _hitView: Konva.Line | null = null;
    private _view: Konva.Line | null = null;

    protected override _onUpdate(target: RendererHandleTarget<IHandleTransformResizeEdge>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            this._hideViews();
            return;
        }

        const direction = resolveEdgeDirection(handle);

        if (!direction) {
            this._hideViews();
            return;
        }

        if (!this._hitView || !this._view) {
            this._recreateView();
        }

        if (!this._hitView || !this._view) {
            return;
        }

        const worldPoints = getEdgeWorldPoints(node, direction);
        const screenPoints = this._toScreenPoints(worldPoints);

        if (screenPoints.length < 2) {
            this._hideViews();
            return;
        }

        const hitStrokeWidth =
            direction === "n" || direction === "s"
                ? resolveHitHeight(handle)
                : resolveHitWidth(handle);

        this._hitView.setAttrs({
            points: this._flattenPoints(screenPoints),
            stroke: handle.getHitFill(),
            strokeWidth: hitStrokeWidth,
            opacity: handle.getHitOpacity(),
            visible: handle.isVisible() && hitStrokeWidth > 0 && handle.getHitOpacity() > 0,
        });

        this._view.setAttrs({
            points: this._flattenPoints(screenPoints),
            stroke: handle.getStrokeFill(),
            strokeWidth: handle.getStrokeWidth(),
            opacity: handle.getOpacity(),
            visible: handle.isVisible(),
        });
    }

    protected override _onClearView(): void {
        this._hitView = null;
        this._view = null;
    }

    private _hideViews(): void {
        if (this._hitView) {
            this._hitView.visible(false);
        }

        if (this._view) {
            this._view.visible(false);
        }
    }

    private _recreateView(): void {
        this._clearGroup(this._contentGroup);

        const hitView = new Konva.Line({
            listening: false,
            perfectDrawEnabled: false,
            lineJoin: "round",
            lineCap: "round",
            visible: true,
        });

        const view = new Konva.Line({
            listening: false,
            perfectDrawEnabled: false,
            lineJoin: "round",
            lineCap: "round",
            visible: true,
        });

        this._contentGroup.add(hitView);
        this._contentGroup.add(view);

        this._hitView = hitView;
        this._view = view;
    }
}

export class RendererHandleTransformResizeVertexCanvas extends RendererHandleBase<IHandleTransformResizeVertex> {
    private _hitView: Konva.Rect | null = null;
    private _view: Konva.Rect | null = null;

    protected override _onUpdate(target: RendererHandleTarget<IHandleTransformResizeVertex>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            this._hideViews();
            return;
        }

        if (!this._hitView || !this._view) {
            this._recreateView();
        }

        if (!this._hitView || !this._view) {
            return;
        }

        const worldPoint = this._getHandleWorldPoint(handle, node);
        const screenPoint = this._toScreenPoint(worldPoint);

        const hitWidth = resolveHitWidth(handle);
        const hitHeight = resolveHitHeight(handle);

        this._hitView.setAttrs({
            x: screenPoint.x,
            y: screenPoint.y,
            width: hitWidth,
            height: hitHeight,
            offsetX: handle.getOffsetX(),
            offsetY: handle.getOffsetY(),
            rotation: node.getWorldRotation(),
            fill: handle.getHitFill(),
            opacity: handle.getHitOpacity(),
            visible: handle.isVisible() && hitWidth > 0 && hitHeight > 0 && handle.getHitOpacity() > 0,
        });

        this._view.setAttrs({
            x: screenPoint.x,
            y: screenPoint.y,
            width: handle.getWidth(),
            height: handle.getHeight(),
            offsetX: handle.getOffsetX(),
            offsetY: handle.getOffsetY(),
            rotation: node.getWorldRotation(),
            fill: handle.getFill(),
            stroke: handle.getStrokeFill(),
            strokeWidth: handle.getStrokeWidth(),
            opacity: handle.getOpacity(),
            visible: handle.isVisible(),
        });
    }

    protected override _onClearView(): void {
        this._hitView = null;
        this._view = null;
    }

    private _hideViews(): void {
        if (this._hitView) {
            this._hitView.visible(false);
        }

        if (this._view) {
            this._view.visible(false);
        }
    }

    private _recreateView(): void {
        this._clearGroup(this._contentGroup);

        const hitView = new Konva.Rect({
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        const view = new Konva.Rect({
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._contentGroup.add(hitView);
        this._contentGroup.add(view);

        this._hitView = hitView;
        this._view = view;
    }
}
