import Konva from "konva";
import { RendererCanvasBase } from "../base";
import { LineCap, type NodeLine } from "../../../../nodes";

const STROKE_NAME = "line-stroke";
const STROKE_SELECTOR = `.${STROKE_NAME}`;

export class RendererCanvasLine extends RendererCanvasBase<NodeLine> {
    public create(node: NodeLine): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const stroke = new Konva.Shape({
            name: STROKE_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
    const startX = shape.getAttr("startX") ?? 0;
    const startY = shape.getAttr("startY") ?? 0;
    const endX = shape.getAttr("endX") ?? 0;
    const endY = shape.getAttr("endY") ?? 0;
    const thickness = Math.max(0, shape.getAttr("thickness") ?? 0);

    const lineCapStart = shape.getAttr("lineCapStart") ?? LineCap.Butt;
    const lineCapEnd = shape.getAttr("lineCapEnd") ?? LineCap.Butt;

    if (thickness <= 0) {
        return;
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length <= 0.000001) {
        this._drawDegenerateLine(ctx, startX, startY, thickness, lineCapStart, lineCapEnd, shape);
        return;
    }

    const nx = dx / length;
    const ny = dy / length;

    const px = -ny;
    const py = nx;

    const half = thickness / 2;

    const startExtend = lineCapStart === LineCap.Square ? half : 0;
    const endExtend = lineCapEnd === LineCap.Square ? half : 0;

    const ax = startX - nx * startExtend;
    const ay = startY - ny * startExtend;

    const bx = endX + nx * endExtend;
    const by = endY + ny * endExtend;

    const p1x = ax + px * half;
    const p1y = ay + py * half;

    const p2x = bx + px * half;
    const p2y = by + py * half;

    const p3x = bx - px * half;
    const p3y = by - py * half;

    const p4x = ax - px * half;
    const p4y = ay - py * half;

    ctx.fillStyle = shape.fill() || "#000";

    // 1. Body
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(p4x, p4y);
    ctx.closePath();
    ctx.fill();

    // 2. Start round cap
    if (lineCapStart === LineCap.Round) {
        ctx.beginPath();
        ctx.arc(startX, startY, half, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. End round cap
    if (lineCapEnd === LineCap.Round) {
        ctx.beginPath();
        ctx.arc(endX, endY, half, 0, Math.PI * 2);
        ctx.fill();
    }
}
        });

        group.add(stroke);

        return group;
    }

    protected onUpdate(node: NodeLine, view: Konva.Group): void {
        const stroke = this._findOneOrThrow<Konva.Shape>(view, STROKE_SELECTOR);

        const start = node.getStart();
        const end = node.getEnd();

        stroke.setAttrs({
            startX: start.x,
            startY: start.y,
            endX: end.x,
            endY: end.y,
            thickness: node.getStrokeThickness(),
            lineCapStart: node.getLineCapStart(),
            lineCapEnd: node.getLineCapEnd(),
        });

        stroke.fill(node.getStrokeFill());
    }

    private _drawDegenerateLine(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        thickness: number,
        lineCapStart: LineCap,
        lineCapEnd: LineCap,
        shape: Konva.Shape
    ): void {
        const radius = thickness / 2;

        if (lineCapStart === LineCap.Round || lineCapEnd === LineCap.Round) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = shape.fill() || "#000";
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.rect(x - radius, y - radius, thickness, thickness);
        ctx.fillStyle = shape.fill() || "#000";
        ctx.fill();
    }
}