import type { NodeOptions } from './NodeOptions';

export type NodeRectOptions = NodeOptions & {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
};