import type { INode } from './INode';

export interface INodeFrame extends INode {
    getClipContent(): boolean;
    setClipContent(value: boolean): void;
}