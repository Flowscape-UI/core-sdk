import type { NodeOptions } from './NodeOptions';

export type NodeEllipseOptions = NodeOptions & {
    radiusX: number;
    radiusY?: number;

    innerRatio?: number;

    startAngle?: number;
    endAngle?: number;

    clockwise?: boolean;

    fill?: string;
    stroke?: string;
    strokeWidth?: number;
};