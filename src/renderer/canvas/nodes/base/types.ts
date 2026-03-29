import Konva from "konva";
import type { INode } from "../../../../nodes";
import type { IRendererNode } from "../../../common";

export interface IRendererNodeCanvas<
    TNode extends INode = INode,
    TView extends Konva.Group = Konva.Group
> extends IRendererNode<TNode, TView> {}