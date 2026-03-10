import { NodeRect } from './NodeRect';
import type { INodeFrame, NodeFrameOptions } from './types';

export class NodeFrame extends NodeRect implements INodeFrame {
    private _clipContent: boolean;

    constructor(params: NodeFrameOptions) {
        super(params);

        this._clipContent = params.clipContent ?? false;
    }

    public getClipContent(): boolean {
        return this._clipContent;
    }

    public setClipContent(value: boolean): void {
        this._clipContent = value;
    }
}