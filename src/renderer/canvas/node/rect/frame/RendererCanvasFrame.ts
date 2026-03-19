import Konva from "konva";
import { RendererCanvasBase } from "../../base";
import type { NodeFrame } from "../../../../../nodes";


const FILL_NAME = "frame-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

export class RendererCanvasFrame extends RendererCanvasBase<NodeFrame> {
    public create(node: NodeFrame): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const fill = new Konva.Rect({
            name: FILL_NAME,
            listening: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        });

        group.add(fill);

        return group;
    }

    protected onUpdate(node: NodeFrame, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Rect>(view, FILL_SELECTOR);

        const width = Math.max(0, node.getWidth());
        const height = Math.max(0, node.getHeight());

        fill.width(width);
        fill.height(height);

        // если у тебя есть fill в ShapeBase
        if ("getFill" in node) {
            fill.fill((node as any).getFill());
        }

        // 🔥 заготовка под clip (пока не активируем)
        if (node.getClipsContent()) {
            // позже здесь будет clip logic
            // view.clip({ x: 0, y: 0, width, height });
        } else {
            // view.clip(null);
        }
    }
}