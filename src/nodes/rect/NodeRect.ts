import { NodeType, type ID } from "../base";
import { ShapeBase } from "../shape";
import { type INodeRect } from "./types";

export class NodeRect extends ShapeBase implements INodeRect {
    constructor(id: ID, name?: string, type?: NodeType) {
        super(id, type ?? NodeType.Rect, name ?? "Rect");
    }
}