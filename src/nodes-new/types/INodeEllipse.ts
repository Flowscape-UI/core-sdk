import type { INode } from './INode';

export interface INodeEllipse extends INode {
    getRadiusX(): number;
    setRadiusX(radiusX: number): void;

    getRadiusY(): number;
    setRadiusY(radiusY: number): void;

    setRadius(radiusX: number, radiusY: number): void;

    getInnerRatio(): number;
    setInnerRatio(ratio: number): void;

    getStartAngle(): number;
    setStartAngle(angle: number): void;

    getEndAngle(): number;
    setEndAngle(angle: number): void;

    setAngles(startAngle: number, endAngle: number): void;

    getSweepAngle(): number;

    isFullEllipse(): boolean;
    isRing(): boolean;

    getFill(): string;
    setFill(fill: string): void;

    getStroke(): string;
    setStroke(stroke: string): void;

    getStrokeWidth(): number;
    setStrokeWidth(width: number): void;
}