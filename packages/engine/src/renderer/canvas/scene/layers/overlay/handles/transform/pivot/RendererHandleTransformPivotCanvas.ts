import Konva from "konva";
import type { IHandleTransformPivot } from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";

export class RendererHandleTransformPivotCanvas extends RendererHandleBase<IHandleTransformPivot> {
    private _view: Konva.Circle | null = null;
    private _nodeId: string | null = null;

    protected override _onUpdate(target: RendererHandleTarget<IHandleTransformPivot>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            if (this._view) {
                this._view.visible(false);
            }
            return;
        }

        const nodeId = String(node.id);
        const idChanged = this._nodeId !== nodeId;

        if (!this._view || idChanged) {
            this._recreateView(nodeId);
        }

        if (!this._view) {
            return;
        }

        const worldPoint = this._getHandleWorldPoint(handle, node);
        const screenPoint = this._toScreenPoint(worldPoint);
        const radius = Math.max(handle.getWidth(), handle.getHeight()) * 0.5;

        this._view.setAttrs({
            x: screenPoint.x,
            y: screenPoint.y,
            radius,
            fill: handle.getFill(),
            stroke: handle.getStrokeFill(),
            strokeWidth: handle.getStrokeWidth(),
            opacity: handle.getOpacity(),
            visible: handle.isVisible() && radius > 0,
        });
    }

    protected override _onClearView(): void {
        this._view = null;
        this._nodeId = null;
    }

    private _recreateView(nodeId: string): void {
        this._clearGroup(this._contentGroup);

        const view = new Konva.Circle({
            name: "transform-pivot-handle",
            listening: false,
            perfectDrawEnabled: false,
            visible: true,
        });

        this._contentGroup.add(view);
        this._view = view;
        this._nodeId = nodeId;
    }
}
