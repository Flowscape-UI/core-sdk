import type { INode } from './INode';

export interface INodePolygon extends INode {
    getSideCount(): number;
    setSideCount(count: number): void;

    getCornerRadius(): number;
    setCornerRadius(radius: number): void;

    getFill(): string;
    setFill(fill: string): void;

    getStroke(): string;
    setStroke(stroke: string): void;

    getStrokeWidth(): number;
    setStrokeWidth(width: number): void;
}