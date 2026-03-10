import type { NodeOptions } from './NodeOptions';

export type NodeStarOptions = NodeOptions & {
    radius?: number;

    segmentCount?: number;
    ratio?: number;

    fill?: string;
    stroke?: string;
    strokeWidth?: number;
};