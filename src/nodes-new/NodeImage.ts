import { NodeRect } from './NodeRect';
import type { INodeImage, NodeImageOptions } from './types';

export class NodeImage extends NodeRect implements INodeImage {
    private _src: string;

    constructor(params: NodeImageOptions) {
        super(params);
        this._src = params.src;
    }

    public getSrc(): string {
        return this._src;
    }

    public setSrc(src: string): void {
        this._src = src;
    }
}