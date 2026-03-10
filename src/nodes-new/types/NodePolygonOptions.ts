import type { NodeOptions } from './NodeOptions';

export type NodePolygonOptions = NodeOptions & {
    sideCount?: number;
    cornerRadius?: number;

    fill?: string;
    stroke?: string;
    strokeWidth?: number;
};