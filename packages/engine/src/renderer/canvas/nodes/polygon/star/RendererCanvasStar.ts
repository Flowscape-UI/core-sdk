import Konva from "konva";
import { RendererCanvasBase } from "../../base";
import type { NodeStar } from "../../../../../nodes";

const FILL_NAME = "star-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

export class RendererCanvasStar extends RendererCanvasBase<NodeStar> {
    public create(node: NodeStar): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });


        const fill = new Konva.Shape({
            name: FILL_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
                const vertices = shape.getAttr("vertices");

                if (!vertices || vertices.length === 0) {
                    return;
                }

                ctx.beginPath();

                for (let i = 0; i < vertices.length; i++) {
                    const p = vertices[i];

                    if (i === 0) {
                        ctx.moveTo(p.x, p.y);
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }

                ctx.closePath();

                ctx.fillStyle = shape.fill() || "#000";
                ctx.fill();
            }
        });

        group.add(fill);

        return group;
    }

    protected onUpdate(node: NodeStar, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Shape>(view, FILL_SELECTOR);

        fill.setAttrs({
            vertices: node.getVertices(),
        });

        fill.fill(node.getFill());

        // 🔥 ВАЖНО
        fill.getLayer()?.batchDraw();
    }
}