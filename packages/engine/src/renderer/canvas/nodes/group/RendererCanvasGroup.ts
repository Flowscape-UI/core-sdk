import Konva from "konva";
import type { INodeGroup } from "../../../../nodes";
import { RendererCanvasBase } from "../base";

export class RendererCanvasGroup extends RendererCanvasBase<INodeGroup> {
    public create(node: INodeGroup): Konva.Group {
        return new Konva.Group({
            id: String(node.id),
        });
    }

    protected onUpdate(_node: INodeGroup, _view: Konva.Group): void {}
}
