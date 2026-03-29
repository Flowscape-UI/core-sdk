import Konva from "konva";
import { NodePolygon } from "../../../../nodes";
import { RendererCanvasBase } from "../base";

const FILL_NAME = "polygon-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

export class RendererCanvasPolygon extends RendererCanvasBase<NodePolygon> {
    public create(node: NodePolygon): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const fill = new Konva.Shape({
            name: FILL_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
                const width = shape.getAttr("polygonWidth") ?? 0;
                const height = shape.getAttr("polygonHeight") ?? 0;
                const sides = Math.max(3, shape.getAttr("sideCount") ?? 3);

                if (width <= 0 || height <= 0) {
                    return;
                }

                const cx = width / 2;
                const cy = height / 2;
                const r = Math.min(width, height) / 2;

                const startAngle = -Math.PI / 2;
                const step = (Math.PI * 2) / sides;

                ctx.beginPath();

                for (let i = 0; i < sides; i++) {
                    const angle = startAngle + i * step;

                    const x = cx + Math.cos(angle) * r;
                    const y = cy + Math.sin(angle) * r;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.closePath();
                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            },
        });

        group.add(fill);

        return group;
    }

    protected onUpdate(node: NodePolygon, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Shape>(view, FILL_SELECTOR);


        fill.setAttrs({
            polygonWidth: Math.max(0, node.getWidth()),
            polygonHeight: Math.max(0, node.getHeight()),
            sideCount: Math.max(3, node.getSideCount()),
        });

        fill.fill(node.getFill());
    }
}