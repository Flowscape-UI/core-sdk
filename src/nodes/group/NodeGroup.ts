import type { ID } from "../../core/types";
import { NodeBase, NodeType } from "../base";
import type { INodeGroup } from "./types";

export class NodeGroup extends NodeBase implements INodeGroup {
    constructor(id: ID, name?: string) {
        super(id, NodeType.Group, name ?? "Group");
    }
}