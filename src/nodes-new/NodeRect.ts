import { BaseNode } from './BaseNode';
import type { NodeRectOptions } from './types';

export class NodeRect extends BaseNode {
    private _fill: string;
    private _stroke: string;
    private _strokeWidth: number;
    private _cornerRadius: number;

    constructor(params: NodeRectOptions) {
        super({
            id: params.id,
            width: params.width ?? 100,
            height: params.height ?? 100,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });

        this._fill = params.fill ?? '#ffffff';
        this._stroke = params.stroke ?? 'transparent';
        this._strokeWidth = Math.max(0, params.strokeWidth ?? 0);
        this._cornerRadius = Math.max(0, params.cornerRadius ?? 0);
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

    public getCornerRadius(): number {
        return this._cornerRadius;
    }

    public setCornerRadius(radius: number): void {
        this._cornerRadius = Math.max(0, radius);
    }

    public getLocalBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: 0,
            y: 0,
            width: this.getWidth(),
            height: this.getHeight(),
        };
    }
}