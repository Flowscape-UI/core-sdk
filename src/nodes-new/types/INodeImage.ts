import type { INode } from './INode';

export interface INodeImage extends INode {
    getSrc(): string;
    setSrc(src: string): void;
}