import Konva from "konva";
import type { Point } from "../../../../../../../../core/camera";
import type { IHandleCornerRadius } from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";

const DEBUG_ORIGIN_RADIUS = 2.5;

export class RendererHandleCornerRadiusCanvas extends RendererHandleBase<IHandleCornerRadius> {

    private _hitView: Konva.Circle | null = null;
    private _view: Konva.Circle | null = null;

    private _debugSectionView: Konva.Line | null = null;
    private _debugDiagonalView: Konva.Line | null = null;
    private _debugOriginView: Konva.Circle | null = null;

    protected override _onUpdate(target: RendererHandleTarget<IHandleCornerRadius>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            this._hideViews();
            this._hideDebugViews();
            return;
        }

        const worldPoint = handle.getHandleWorldPoint();

        if (!worldPoint) {
            this._hideViews();
            this._hideDebugViews();
            return;
        }

        if (!this._hitView || !this._view) {
            this._recreateHandleViews();
        }

        if (!this._hitView || !this._view) {
            return;
        }

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

        this._updateDebugViews(handle);
    }

    protected override _onClearView(): void {
        this._hitView = null;
        this._view = null;
        this._debugSectionView = null;
        this._debugDiagonalView = null;
        this._debugOriginView = null;
    }

    private _updateDebugViews(handle: IHandleCornerRadius): void {
        if (!handle.isEnabledDebug()) {
            this._hideDebugViews();
            return;
        }

        const section = handle.getSection();

        if (!section) {
            this._hideDebugViews();
            return;
        }

        if (!this._debugSectionView || !this._debugDiagonalView || !this._debugOriginView) {
            this._recreateDebugViews();
        }

        if (!this._debugSectionView || !this._debugDiagonalView || !this._debugOriginView) {
            return;
        }

        const p0 = this._toScreenPoint(section.origin);
        const p1 = this._toScreenPoint(section.xAxisPoint);
        const p2 = this._toScreenPoint(this._getSectionDiagonalPoint(section));
        const p3 = this._toScreenPoint(section.yAxisPoint);

        const strokeDash = handle.getDebugStrokeType() === "dashed" ? [4, 4] : [];

        this._debugSectionView.setAttrs({
            points: [
                p0.x, p0.y,
                p1.x, p1.y,
                p2.x, p2.y,
                p3.x, p3.y,
            ],
            closed: true,
            fill: handle.getDebugFill(),
            stroke: handle.getDebugStrokeFill(),
            strokeWidth: handle.getDebugStrokeWidth(),
            opacity: handle.getDebugOpacity(),
            dash: strokeDash,
            visible: true,
        });

        this._debugDiagonalView.setAttrs({
            points: [
                p0.x, p0.y,
                p2.x, p2.y,
            ],
            stroke: handle.getDebugStrokeFill(),
            strokeWidth: handle.getDebugStrokeWidth(),
            opacity: handle.getDebugOpacity(),
            dash: strokeDash,
            visible: true,
        });

        this._debugOriginView.setAttrs({
            x: p0.x,
            y: p0.y,
            radius: DEBUG_ORIGIN_RADIUS,
            fill: handle.getDebugStrokeFill(),
            opacity: handle.getDebugOpacity(),
            visible: true,
        });
    }

    private _resolveHitWidth(handle: IHandleCornerRadius): number {
        const hitWidth = handle.getHitWidth();

        if (hitWidth > 0) {
            return hitWidth;
        }

        return handle.getWidth();
    }

    private _resolveHitHeight(handle: IHandleCornerRadius): number {
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

    private _hideDebugViews(): void {
        if (this._debugSectionView) {
            this._debugSectionView.visible(false);
        }

        if (this._debugDiagonalView) {
            this._debugDiagonalView.visible(false);
        }

        if (this._debugOriginView) {
            this._debugOriginView.visible(false);
        }
    }

    private _recreateHandleViews(): void {
        this._clearGroup(this._contentGroup);

        const hitView = new Konva.Circle({
            name: "corner-radius-hit",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        const view = new Konva.Circle({
            name: "corner-radius-handle",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._contentGroup.add(hitView);
        this._contentGroup.add(view);

        this._hitView = hitView;
        this._view = view;
    }

    private _recreateDebugViews(): void {
        this._clearGroup(this._debugGroup);

        const sectionView = new Konva.Line({
            name: "corner-radius-debug-section",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
            closed: true,
        });

        const diagonalView = new Konva.Line({
            name: "corner-radius-debug-diagonal",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        const originView = new Konva.Circle({
            name: "corner-radius-debug-origin",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._debugGroup.add(sectionView);
        this._debugGroup.add(diagonalView);
        this._debugGroup.add(originView);

        this._debugSectionView = sectionView;
        this._debugDiagonalView = diagonalView;
        this._debugOriginView = originView;
    }

    private _getSectionDiagonalPoint(section: {
        origin: Point;
        xAxisPoint: Point;
        yAxisPoint: Point;
    }): Point {
        return {
            x: section.xAxisPoint.x + section.yAxisPoint.x - section.origin.x,
            y: section.xAxisPoint.y + section.yAxisPoint.y - section.origin.y,
        };
    }
}
