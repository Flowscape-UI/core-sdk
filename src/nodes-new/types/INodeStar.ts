import type { INode } from './INode';

export interface INodeStar extends INode {
    getRadius(): number;
    setRadius(radius: number): void;

    getSegmentCount(): number;
    setSegmentCount(count: number): void;

    getRatio(): number;
    setRatio(ratio: number): void;

    getFill(): string;
    setFill(fill: string): void;

    getStroke(): string;
    setStroke(stroke: string): void;

    getStrokeWidth(): number;
    setStrokeWidth(width: number): void;
}