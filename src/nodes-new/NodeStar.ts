import { BaseNode } from './BaseNode';
import type { INodeStar } from './types/INodeStar';
import type { NodeStarOptions } from './types/NodeStarOptions';

export class NodeStar extends BaseNode implements INodeStar {
    private _radius: number;
    private _segmentCount: number;
    private _ratio: number;

    private _fill: string;
    private _stroke: string;
    private _strokeWidth: number;

    constructor(params: NodeStarOptions) {
        super({
            id: params.id,
            width: params.width,
            height: params.height,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });

        const radius = Math.max(0, params.radius ?? 0);
        this._radius = radius;

        this._segmentCount = this.clampSegments(params.segmentCount ?? 5);
        this._ratio = this.clampRatio(params.ratio ?? 0.5);

        this._fill = params.fill ?? '#ffffff';
        this._stroke = params.stroke ?? 'transparent';
        this._strokeWidth = Math.max(0, params.strokeWidth ?? 0);
    }

    private clampSegments(count: number): number {
        return Math.max(3, Math.min(60, Math.round(count)));
    }

    private clampRatio(ratio: number): number {
        const clamped = Math.max(0.001, Math.min(1, ratio));
        return Math.round(clamped * 1000) / 1000;
    }

    public getSegmentCount(): number {
        return this._segmentCount;
    }

    public getRadius(): number {
        return this._radius;
    }

    public setRadius(radius: number): void {
        this._radius = Math.max(0, radius);
    }

    public setSegmentCount(count: number): void {
        this._segmentCount = this.clampSegments(count);
    }

    public getRatio(): number {
        return this._ratio;
    }

    public setRatio(ratio: number): void {
        this._ratio = this.clampRatio(ratio);
    }

    public getFill(): string {
        return this._fill;
    }

    public setFill(fill: string): void {
        this._fill = fill;
    }

    public getStroke(): string {
        return this._stroke;
    }

    public setStroke(stroke: string): void {
        this._stroke = stroke;
    }

    public getStrokeWidth(): number {
        return this._strokeWidth;
    }

    public setStrokeWidth(width: number): void {
        this._strokeWidth = Math.max(0, width);
    }

    public getLocalBounds() {
        return {
            x: 0,
            y: 0,
            width: this.getWidth(),
            height: this.getHeight(),
        };
    }
}