import { NodeBase, NodeType, type ID } from "../base";

export class NodeGroup extends NodeBase {
    constructor(id: ID, name?: string) {
        super(id, NodeType.Group, name ?? "Group");
    }
}