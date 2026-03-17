import Konva from "konva";

import type { INode } from "../../../nodes";
import type { INodeCanvasRenderer } from "./types";

export abstract class RendererCanvasBase<
    TNode extends INode = INode,
    TView extends Konva.Group = Konva.Group
> implements INodeCanvasRenderer<TNode, TView> {
    public abstract create(node: TNode): TView;

    public update(node: TNode, view: TView): void {
        this._updateIdentity(node, view);
        this._updateVisibility(node, view);
        this._updateOpacity(node, view);
        this._updateTransform(node, view);
        this.onUpdate(node, view);
    }

    public destroy?(node: TNode, view: TView): void;

    protected abstract onUpdate(node: TNode, view: TView): void;

    protected _updateIdentity(node: TNode, view: Konva.Group): void {
        view.id(String(node.id));
    }

    protected _updateVisibility(node: TNode, view: Konva.Group): void {
        view.visible(node.isVisible());
    }

    protected _updateOpacity(node: TNode, view: Konva.Group): void {
        view.opacity(node.getOpacity());
    }

    protected _updateTransform(node: TNode, view: Konva.Group): void {
        const position = node.getPosition();
        const scale = node.getScale();
        const pivot = node.getPivot();
        const bounds = node.getLocalOBB();

        view.x(position.x);
        view.y(position.y);

        view.rotation((node.getRotation() * 180) / Math.PI);

        view.scaleX(scale.x);
        view.scaleY(scale.y);

        view.offsetX(bounds.x + bounds.width * pivot.x);
        view.offsetY(bounds.y + bounds.height * pivot.y);
    }

    protected _findOneOrThrow<T extends Konva.Node>(
        view: Konva.Container,
        selector: string
    ): T {
        const child = view.findOne<T>(selector);

        if (!child) {
            throw new Error(`Konva node "${selector}" was not found.`);
        }

        return child;
    }
}