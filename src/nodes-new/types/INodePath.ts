import type { INode } from './INode';

export interface INodePath extends INode {
    getPath(): string;
    setPath(path: string): void;
}