import { BaseNode } from './BaseNode';
import type { INodePolygon } from './types/INodePolygon';
import type { NodePolygonOptions } from './types/NodePolygonOptions';

export class NodePolygon extends BaseNode implements INodePolygon {

    private _sideCount: number;
    private _cornerRadius: number;

    private _fill: string;
    private _stroke: string;
    private _strokeWidth: number;

    constructor(params: NodePolygonOptions) {
        super({
            id: params.id,
            width: params.width ?? 100,
            height: params.height ?? 100,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });

        this._sideCount = this.clampSideCount(params.sideCount ?? 3);
        this._cornerRadius = Math.max(0, params.cornerRadius ?? 0);

        this._fill = params.fill ?? '#ffffff';
        this._stroke = params.stroke ?? 'transparent';
        this._strokeWidth = Math.max(0, params.strokeWidth ?? 0);
    }

    private clampSideCount(count: number): number {
        return Math.max(3, Math.min(60, Math.round(count)));
    }

    public getSideCount(): number {
        return this._sideCount;
    }

    public setSideCount(count: number): void {
        this._sideCount = this.clampSideCount(count);
    }

    public getCornerRadius(): number {
        return this._cornerRadius;
    }

    public setCornerRadius(radius: number): void {
        this._cornerRadius = Math.max(0, radius);
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