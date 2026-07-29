import Konva from "konva";
import type { ShapePathCommand } from "../../../../../../../../nodes";
import type { IHandleFocus } from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";

export class RendererHandleFocusCanvas extends RendererHandleBase<IHandleFocus> {
    private _view: Konva.Line | null = null;
    private _multiLineViews: Konva.Line[];
    private _nodeId: string | null = null;

    constructor() {
        super();
        this._multiLineViews = [];
    }

    protected override _onUpdate(target: RendererHandleTarget<IHandleFocus>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            if (this._view) {
                this._view.visible(false);
            }
            return;
        }

        if (node.type === "text-node") {
            this._updateTextShape(handle, node.toPathCommands());
            this._nodeId = String(node.id);
            return;
        }

        this._clearMultiLineViews();

        const nodeId = String(node.id);
        const idChanged = this._nodeId !== nodeId;

        if (!this._view || idChanged) {
            this._recreateView(nodeId);
        }

        if (!this._view) {
            return;
        }

        const worldPoints = this._getNodeWorldOutlinePoints(node);

        if (worldPoints.length < 2) {
            this._view.visible(false);
            return;
        }

        const screenPoints = this._toScreenPoints(worldPoints);

        this._view.setAttrs({
            points: this._flattenPoints(screenPoints),
            closed: true,
            x: handle.getOffsetX(),
            y: handle.getOffsetY(),
            stroke: handle.getStrokeFill(),
            strokeWidth: handle.getStrokeWidth(),
            opacity: handle.getOpacity(),
            visible: handle.isVisible(),
        });
    }

    protected override _onClearView(): void {
        this._clearMultiLineViews();
        this._view = null;
        this._nodeId = null;
    }

    private _recreateView(nodeId: string): void {
        this._clearGroup(this._contentGroup);

        const view = new Konva.Line({
            closed: true,
            fillEnabled: false,
            lineJoin: "round",
            lineCap: "round",
            listening: false,
            visible: true,
        });

        this._contentGroup.add(view);
        this._view = view;
        this._nodeId = nodeId;
    }

    private _updateTextShape(
        handle: IHandleFocus,
        commands: readonly ShapePathCommand[]
    ): void {
        const segments = this._extractScreenLineSegments(commands);

        if (this._view) {
            this._view.visible(false);
        }

        if (segments.length === 0) {
            this._clearMultiLineViews();
            return;
        }

        this._syncMultiLineViews(segments.length);

        for (let i = 0; i < segments.length; i += 1) {
            const view = this._multiLineViews[i]!;
            const segment = segments[i]!;

            view.setAttrs({
                points: [
                    segment.start.x,
                    segment.start.y,
                    segment.end.x,
                    segment.end.y,
                ],
                x: handle.getOffsetX(),
                y: handle.getOffsetY(),
                stroke: handle.getStrokeFill(),
                strokeWidth: handle.getStrokeWidth(),
                opacity: handle.getOpacity(),
                visible: handle.isVisible(),
            });
        }
    }

    private _extractScreenLineSegments(
        commands: readonly ShapePathCommand[]
    ): { start: { x: number; y: number }; end: { x: number; y: number } }[] {
        const target = this._getTarget();
        const handle = target?.getHandle();
        const node = handle?.getNode();

        if (!node || commands.length === 0) {
            return [];
        }

        const matrix = node.getWorldMatrix();
        const segments: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];

        let cursor: { x: number; y: number } | null = null;

        for (const command of commands) {
            if (command.type === "moveTo") {
                cursor = this._toScreenPoint(this._applyMatrix(command.point, matrix));
                continue;
            }

            if (command.type === "lineTo") {
                const next = this._toScreenPoint(this._applyMatrix(command.point, matrix));

                if (cursor) {
                    segments.push({
                        start: cursor,
                        end: next,
                    });
                }

                cursor = next;
                continue;
            }

            if (command.type === "closePath") {
                cursor = null;
            }
        }

        return segments;
    }

    private _syncMultiLineViews(requiredCount: number): void {
        while (this._multiLineViews.length > requiredCount) {
            const view = this._multiLineViews.pop();
            view?.destroy();
        }

        while (this._multiLineViews.length < requiredCount) {
            const view = new Konva.Line({
                closed: false,
                fillEnabled: false,
                lineJoin: "round",
                lineCap: "round",
                listening: false,
                visible: true,
            });

            this._contentGroup.add(view);
            this._multiLineViews.push(view);
        }
    }

    private _clearMultiLineViews(): void {
        if (this._multiLineViews.length === 0) {
            return;
        }

        for (const view of this._multiLineViews) {
            view.destroy();
        }

        this._multiLineViews = [];
    }
}
