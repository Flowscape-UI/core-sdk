import Konva from "konva";
import { NodeEllipse } from "../../../../nodes";
import { RendererCanvasBase } from "../base";

const FILL_NAME = "ellipse-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

export class RendererCanvasEllipse extends RendererCanvasBase<NodeEllipse> {
    public create(node: NodeEllipse): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const fill = new Konva.Shape({
            name: FILL_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
                const width = shape.getAttr("ellipseWidth") ?? 0;
                const height = shape.getAttr("ellipseHeight") ?? 0;
                const innerRatio = shape.getAttr("innerRatio") ?? 0;
                const startAngleDeg = shape.getAttr("startAngle") ?? 0;
                const endAngleDeg = shape.getAttr("endAngle") ?? 360;

                if (width <= 0 || height <= 0) {
                    return;
                }

                const rx = width / 2;
                const ry = height / 2;
                const cx = rx;
                const cy = ry;

                const start = this._degToRad(startAngleDeg);
                const end = this._degToRad(endAngleDeg);
                const sweep = end - start;

                const isFullEllipse = this._isFullEllipseSweep(sweep);

                ctx.beginPath();

                if (isFullEllipse) {
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

                    if (innerRatio > 0) {
                        ctx.ellipse(
                            cx,
                            cy,
                            rx * innerRatio,
                            ry * innerRatio,
                            0,
                            0,
                            Math.PI * 2
                        );
                        ctx.fillStyle = shape.fill() || "#000";
                        ctx.fill("evenodd");
                    } else {
                        ctx.fillStyle = shape.fill() || "#000";
                        ctx.fill();
                    }

                    return;
                }

                this._appendEllipseArcPath(ctx, cx, cy, rx, ry, start, end, false);

                if (innerRatio > 0) {
                    this._appendEllipseArcPath(
                        ctx,
                        cx,
                        cy,
                        rx * innerRatio,
                        ry * innerRatio,
                        end,
                        start,
                        true
                    );
                } else {
                    ctx.lineTo(cx, cy);
                }

                ctx.closePath();
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });

        group.add(fill);

        return group;
    }

    protected onUpdate(node: NodeEllipse, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Shape>(view, FILL_SELECTOR);

        fill.setAttrs({
            ellipseWidth: Math.max(0, node.getWidth()),
            ellipseHeight: Math.max(0, node.getHeight()),
            innerRatio: Math.max(0, Math.min(node.getInnerRatio(), 0.999)),
            startAngle: node.getStartAngle(),
            endAngle: node.getEndAngle(),
        });

        fill.fill(node.getFill());
    }

    private _appendEllipseArcPath(
        ctx: Konva.Context,
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        start: number,
        end: number,
        connectFromCurrentPoint: boolean
    ): void {
        const sweep = end - start;
        const steps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 32)));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = start + sweep * t;

            const x = cx + Math.cos(angle) * rx;
            const y = cy + Math.sin(angle) * ry;

            if (i === 0) {
                if (connectFromCurrentPoint) {
                    ctx.lineTo(x, y);
                } else {
                    ctx.moveTo(x, y);
                }
            } else {
                ctx.lineTo(x, y);
            }
        }
    }

    private _isFullEllipseSweep(sweep: number): boolean {
        return Math.abs(Math.abs(sweep) - Math.PI * 2) < 0.0001;
    }

    private _degToRad(value: number): number {
        return (value * Math.PI) / 180;
    }
}