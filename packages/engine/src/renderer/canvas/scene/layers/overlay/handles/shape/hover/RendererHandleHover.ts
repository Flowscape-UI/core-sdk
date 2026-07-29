import Konva from "konva";
import type { NodeText, ShapePathCommand } from "../../../../../../../../nodes";
import { HandleDebugDrawType } from "../../../../../../../../scene/layers";
import type { IHandleHover } from "../../../../../../../../scene/layers";
import { RendererHandleBase } from "../../base";
import type { RendererHandleTarget } from "../../base/RendererHandleTarget";

export class RendererHandleHoverCanvas extends RendererHandleBase<IHandleHover> {
    private _view: Konva.Line | null = null;
    private _multiLineViews: Konva.Line[];
    private _textDebugViews: Konva.Shape[];
    private _shapeDebugView: Konva.Shape | null;
    private _nodeId: string | null = null;

    constructor() {
        super();
        this._multiLineViews = [];
        this._textDebugViews = [];
        this._shapeDebugView = null;
    }

    protected override _onUpdate(target: RendererHandleTarget<IHandleHover>): void {
        const handle = target.getHandle();
        const node = handle.getNode();

        if (!node) {
            if (this._view) {
                this._view.visible(false);
            }
            this._clearTextDebugViews();
            this._clearShapeDebugView();
            return;
        }

        if (node.type === "text-node") {
            this._updateTextShape(handle, node.toPathCommands());
            this._updateTextDebug(handle, node as NodeText);
            this._clearShapeDebugView();
            this._nodeId = String(node.id);
            return;
        }

        this._clearMultiLineViews();
        this._clearTextDebugViews();

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

        this._updateShapeDebug(handle, screenPoints);
    }

    protected override _onClearView(): void {
        this._clearMultiLineViews();
        this._clearTextDebugViews();
        this._clearShapeDebugView();
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
        handle: IHandleHover,
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

    private _updateTextDebug(handle: IHandleHover, node: NodeText): void {
        const boxes = node.getLineHitBoxes();

        if (boxes.length === 0) {
            this._clearTextDebugViews();
            return;
        }

        this._syncTextDebugViews(boxes.length);

        const matrix = node.getWorldMatrix();
        const strokeDash = handle.getDebugStrokeType() === HandleDebugDrawType.Dashed ? [6, 4] : [];

        for (let i = 0; i < boxes.length; i += 1) {
            const box = boxes[i]!;
            const view = this._textDebugViews[i]!;

            const p1 = this._toScreenPoint(this._applyMatrix({ x: box.x, y: box.y }, matrix));
            const p2 = this._toScreenPoint(this._applyMatrix({ x: box.x + box.width, y: box.y }, matrix));
            const p3 = this._toScreenPoint(this._applyMatrix({ x: box.x + box.width, y: box.y + box.height }, matrix));
            const p4 = this._toScreenPoint(this._applyMatrix({ x: box.x, y: box.y + box.height }, matrix));

            view.setAttrs({
                points: [
                    p1.x, p1.y,
                    p2.x, p2.y,
                    p3.x, p3.y,
                    p4.x, p4.y,
                ],
                closed: true,
                x: handle.getOffsetX(),
                y: handle.getOffsetY(),
                fill: handle.getDebugFill(),
                stroke: handle.getDebugStrokeFill(),
                strokeWidth: handle.getDebugStrokeWidth(),
                debugFillType: handle.getDebugFillType(),
                hatchColor: handle.getDebugStrokeFill(),
                hatchWidth: handle.getDebugStrokeWidth(),
                opacity: handle.getDebugOpacity(),
                dash: strokeDash,
                visible: handle.isEnabledDebug() && handle.isVisible(),
            });
        }
    }

    private _syncTextDebugViews(requiredCount: number): void {
        while (this._textDebugViews.length > requiredCount) {
            const view = this._textDebugViews.pop();
            view?.destroy();
        }

        while (this._textDebugViews.length < requiredCount) {
            const view = this._createHatchDebugShape();

            this._debugGroup.add(view);
            this._textDebugViews.push(view);
        }
    }

    private _clearTextDebugViews(): void {
        if (this._textDebugViews.length === 0) {
            return;
        }

        for (const view of this._textDebugViews) {
            view.destroy();
        }

        this._textDebugViews = [];
    }

    private _updateShapeDebug(handle: IHandleHover, screenPoints: readonly { x: number; y: number }[]): void {
        if (screenPoints.length < 3) {
            this._clearShapeDebugView();
            return;
        }

        if (!this._shapeDebugView) {
            this._shapeDebugView = this._createHatchDebugShape();
            this._debugGroup.add(this._shapeDebugView);
        }

        const strokeDash = handle.getDebugStrokeType() === HandleDebugDrawType.Dashed ? [6, 4] : [];

        this._shapeDebugView.setAttrs({
            points: this._flattenPoints(screenPoints),
            closed: true,
            x: handle.getOffsetX(),
            y: handle.getOffsetY(),
            fill: handle.getDebugFill(),
            stroke: handle.getDebugStrokeFill(),
            strokeWidth: handle.getDebugStrokeWidth(),
            debugFillType: handle.getDebugFillType(),
            hatchColor: handle.getDebugStrokeFill(),
            hatchWidth: handle.getDebugStrokeWidth(),
            opacity: handle.getDebugOpacity(),
            dash: strokeDash,
            visible: handle.isEnabledDebug() && handle.isVisible(),
        });
    }

    private _clearShapeDebugView(): void {
        if (!this._shapeDebugView) {
            return;
        }

        this._shapeDebugView.destroy();
        this._shapeDebugView = null;
    }

    private _createHatchDebugShape(): Konva.Shape {
        return new Konva.Shape({
            listening: false,
            visible: true,
            sceneFunc: (ctx, shape) => {
                const points = (shape.getAttr("points") ?? []) as number[];

                if (points.length < 6) {
                    return;
                }

                const fillType = (shape.getAttr("debugFillType") ?? HandleDebugDrawType.Solid) as HandleDebugDrawType;

                if (fillType === HandleDebugDrawType.Solid) {
                    this._tracePolygonPath(ctx, points);
                    ctx.fillStrokeShape(shape);
                    return;
                }

                // Dashed fill mode:
                // 1) draw very light base fill
                // 2) draw stroke
                // 3) draw clipped diagonal hatch
                this._tracePolygonPath(ctx, points);

                ctx.save();
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = shape.fill() || "transparent";
                ctx.fill();
                ctx.restore();

                const dash = (shape.getAttr("dash") ?? []) as number[];

                ctx.save();
                ctx.strokeStyle = shape.stroke() || "#4DA3FF";
                ctx.lineWidth = Math.max(1, shape.strokeWidth() ?? 1);
                ctx.setLineDash(dash);
                this._tracePolygonPath(ctx, points);
                ctx.stroke();
                ctx.restore();

                const bounds = this._getPointsBounds(points);
                const hatchColor = (shape.getAttr("hatchColor") as string | undefined) ?? shape.stroke() ?? "#4DA3FF";
                const hatchWidth = Math.max(1, (shape.getAttr("hatchWidth") as number | undefined) ?? 1);
                const hatchSpacing = Math.max(6, hatchWidth * 4);
                const diagonal = bounds.maxY - bounds.minY;

                ctx.save();
                this._tracePolygonPath(ctx, points);
                ctx.clip();

                ctx.strokeStyle = hatchColor;
                ctx.lineWidth = hatchWidth;

                for (let x = bounds.minX - diagonal; x <= bounds.maxX + diagonal; x += hatchSpacing) {
                    ctx.beginPath();
                    ctx.moveTo(x, bounds.maxY);
                    ctx.lineTo(x + diagonal, bounds.minY);
                    ctx.stroke();
                }

                ctx.restore();
            },
        });
    }

    private _tracePolygonPath(ctx: Konva.Context, points: readonly number[]): void {
        ctx.beginPath();
        ctx.moveTo(points[0]!, points[1]!);

        for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i]!, points[i + 1]!);
        }

        ctx.closePath();
    }

    private _getPointsBounds(points: readonly number[]): { minX: number; minY: number; maxX: number; maxY: number } {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < points.length; i += 2) {
            const x = points[i]!;
            const y = points[i + 1]!;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
        };
    }
}
