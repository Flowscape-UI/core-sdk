import { BaseNode } from './BaseNode';
import type { INodeGroup, NodeGroupOptions } from './types';

export class NodeGroup extends BaseNode implements INodeGroup {
    constructor(params: NodeGroupOptions) {
        super({
            id: params.id,
            width: params.width ?? 0,
            height: params.height ?? 0,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });
    }

    public getLocalBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: 0,
            y: 0,
            width: this.getWidth(),
            height: this.getHeight(),
        };
    }
}