import { BaseNode } from './BaseNode';
import type { Vector2 } from '../core/transform/types';
import type { INodeLine } from './types/INodeLine';
import type { LineCapType, LineEndingType, NodeLineOptions, StrokeAlign } from './types/NodeLineOptions';

export class NodeLine extends BaseNode implements INodeLine {
    private _startPoint: Vector2;
    private _endPoint: Vector2;

    private _thickness: number;
    private _strokeAlign: StrokeAlign;
    private _lineCapStart: LineCapType;
    private _lineCapEnd: LineCapType;

    private _startEnding: LineEndingType;
    private _endEnding: LineEndingType;

    private _stroke: string;

    constructor(params: NodeLineOptions) {
        const startPoint = params.startPoint ?? { x: 0, y: 0 };
        const endPoint = params.endPoint ?? { x: 120, y: 0 };
        const thickness = Math.max(1, params.thickness ?? 1);

        const bounds = NodeLine.computeBounds(startPoint, endPoint, thickness);

        super({
            id: params.id,
            width: bounds.width,
            height: bounds.height,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });

        this._startPoint = startPoint;
        this._endPoint = endPoint;

        this._thickness = thickness;
        this._strokeAlign = params.strokeAlign ?? 'center';
        this._lineCapStart = params.lineCapStart ?? 'none';
        this._lineCapEnd = params.lineCapEnd ?? 'none';

        this._startEnding = params.startEnding ?? 'none';
        this._endEnding = params.endEnding ?? 'none';

        this._stroke = params.stroke ?? '#000000';
    }

    private static computeBounds(start: Vector2, end: Vector2, thickness: number) {
        const pad = thickness / 2;

        const minX = Math.min(start.x, end.x) - pad;
        const minY = Math.min(start.y, end.y) - pad;
        const maxX = Math.max(start.x, end.x) + pad;
        const maxY = Math.max(start.y, end.y) + pad;

        return {
            x: minX,
            y: minY,
            width: Math.max(0, maxX - minX),
            height: Math.max(0, maxY - minY),
        };
    }

    private syncSize(): void {
        const bounds = NodeLine.computeBounds(this._startPoint, this._endPoint, this._thickness);
        this.setSize(bounds.width, bounds.height);
    }

    public getStartPoint(): Vector2 {
        return { ...this._startPoint };
    }

    public setStartPoint(x: number, y: number): void {
        this._startPoint = { x, y };
        this.syncSize();
    }

    public getEndPoint(): Vector2 {
        return { ...this._endPoint };
    }

    public setEndPoint(x: number, y: number): void {
        this._endPoint = { x, y };
        this.syncSize();
    }

    public getStartEnding(): LineEndingType {
        return this._startEnding;
    }

    public setStartEnding(ending: LineEndingType): void {
        this._startEnding = ending;
    }

    public getEndEnding(): LineEndingType {
        return this._endEnding;
    }

    public setEndEnding(ending: LineEndingType): void {
        this._endEnding = ending;
    }

    public getThickness(): number {
        return this._thickness;
    }

    public setThickness(thickness: number): void {
        this._thickness = Math.max(1, thickness);
        this.syncSize();
    }

    public getStrokeAlign(): StrokeAlign {
        return this._strokeAlign;
    }

    public setStrokeAlign(align: StrokeAlign): void {
        this._strokeAlign = align;
    }

    public getLineCapStart(): LineCapType {
        return this._lineCapStart;
    }

    public setLineCapStart(cap: LineCapType): void {
        this._lineCapStart = cap;
    }

    public getLineCapEnd(): LineCapType {
        return this._lineCapEnd;
    }

    public setLineCapEnd(cap: LineCapType): void {
        this._lineCapEnd = cap;
    }

    public getStroke(): string {
        return this._stroke;
    }

    public setStroke(stroke: string): void {
        this._stroke = stroke;
    }

    public getLocalBounds(): { x: number; y: number; width: number; height: number } {
        return NodeLine.computeBounds(this._startPoint, this._endPoint, this._thickness);
    }
}