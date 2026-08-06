import Konva from "konva";
import type { INode, Rect } from "../../../../nodes";
import type { IRendererNode } from "../../../common";

export interface IRendererNodeCanvas<
	TNode extends INode = INode,
	TView extends Konva.Group = Konva.Group,
> extends IRendererNode<TNode, TView> {
	/**
	 * Returns backend-aware world bounds used for viewport culling.
	 *
	 * Renderers may expand the node bounds for visual effects without changing
	 * transform bounds, selection geometry or hit testing in the node model.
	 */
	getWorldBounds?(node: TNode): Rect;
}
