import Konva from "konva";
import type { IHandleTransformRotate } from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";

export class RendererHandleTransformRotateCanvas extends RendererHandleBase<IHandleTransformRotate> {
    private _hitView: Konva.Circle | null = null;
    private _view: Konva.Circle | null = null;

    protected override _onUpdate(target: RendererHandleTarget<IHandleTransformRotate>): void {
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
        const viewRadius = Math.max(handle.getWidth(), handle.getHeight()) * 0.5;
        const hitRadius = Math.max(this._resolveHitWidth(handle), this._resolveHitHeight(handle)) * 0.5;

        this._hitView.setAttrs({
            x: screenPoint.x,
            y: screenPoint.y,
            radius: hitRadius,
            fill: handle.getHitFill(),
            opacity: handle.getHitOpacity(),
            visible: handle.isVisible() && hitRadius > 0 && handle.getHitOpacity() > 0,
        });

        this._view.setAttrs({
            x: screenPoint.x,
            y: screenPoint.y,
            radius: viewRadius,
            fill: handle.getFill(),
            stroke: handle.getStrokeFill(),
            strokeWidth: handle.getStrokeWidth(),
            opacity: handle.getOpacity(),
            visible: handle.isVisible() && viewRadius > 0,
        });
    }

    protected override _onClearView(): void {
        this._hitView = null;
        this._view = null;
    }

    private _resolveHitWidth(handle: IHandleTransformRotate): number {
        const hitWidth = handle.getHitWidth();
        if (hitWidth > 0) {
            return hitWidth;
        }
        return handle.getWidth();
    }

    private _resolveHitHeight(handle: IHandleTransformRotate): number {
        const hitHeight = handle.getHitHeight();
        if (hitHeight > 0) {
            return hitHeight;
        }
        return handle.getHeight();
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

        const hitView = new Konva.Circle({
            name: "transform-rotate-hit",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        const view = new Konva.Circle({
            name: "transform-rotate-handle",
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
