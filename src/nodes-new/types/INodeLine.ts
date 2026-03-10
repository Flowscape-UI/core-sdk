import type { INode } from './INode';
import type { Vector2 } from '../../core/transform/types';
import type { LineCapType, LineEndingType, StrokeAlign } from './NodeLineOptions';

export interface INodeLine extends INode {
    getStartPoint(): Vector2;
    setStartPoint(x: number, y: number): void;

    getEndPoint(): Vector2;
    setEndPoint(x: number, y: number): void;

    getThickness(): number;
    setThickness(thickness: number): void;

    getStrokeAlign(): StrokeAlign;
    setStrokeAlign(align: StrokeAlign): void;

    getLineCapStart(): LineCapType;
    setLineCapStart(cap: LineCapType): void;

    getLineCapEnd(): LineCapType;
    setLineCapEnd(cap: LineCapType): void;

    getStartEnding(): LineEndingType;
    setStartEnding(ending: LineEndingType): void;

    getEndEnding(): LineEndingType;
    setEndEnding(ending: LineEndingType): void;

    getStroke(): string;
    setStroke(stroke: string): void;
}