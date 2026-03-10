import { BaseNode } from './BaseNode';
import type { INodeEllipse } from './types/INodeEllipse';
import type { NodeEllipseOptions } from './types/NodeEllipseOptions';

export class NodeEllipse extends BaseNode implements INodeEllipse {
    private _radiusX: number;
    private _radiusY: number;

    private _innerRatio: number;

    private _startAngle: number;
    private _endAngle: number;

    private _clockwise: boolean;

    private _fill: string;
    private _stroke: string;
    private _strokeWidth: number;

    constructor(params: NodeEllipseOptions) {
        const radiusX = Math.max(0, params.radiusX);
        const radiusY = Math.max(0, params.radiusY ?? radiusX);

        super({
            id: params.id,
            width: radiusX * 2,
            height: radiusY * 2,
            x: params.x ?? 0,
            y: params.y ?? 0,
        });

        this._radiusX = radiusX;
        this._radiusY = radiusY;

        this._innerRatio = Math.max(0, Math.min(params.innerRatio ?? 0, 0.999));

        this._startAngle = params.startAngle ?? 0;
        this._endAngle = params.endAngle ?? 360;

        this._clockwise = params.clockwise ?? true;

        this._fill = params.fill ?? '#ffffff';
        this._stroke = params.stroke ?? 'transparent';
        this._strokeWidth = Math.max(0, params.strokeWidth ?? 0);
    }

    /* ------------------ radius ------------------ */

    public getRadiusX(): number {
        return this._radiusX;
    }

    public getRadiusY(): number {
        return this._radiusY;
    }

    public setRadiusX(radius: number): void {
        this._radiusX = Math.max(0, radius);
        this.setSize(this._radiusX * 2, this._radiusY * 2);
    }

    public setRadiusY(radius: number): void {
        this._radiusY = Math.max(0, radius);
        this.setSize(this._radiusX * 2, this._radiusY * 2);
    }

    public setRadius(radiusX: number, radiusY: number): void {
        this._radiusX = Math.max(0, radiusX);
        this._radiusY = Math.max(0, radiusY);
        this.setSize(this._radiusX * 2, this._radiusY * 2);
    }

    /* ------------------ inner ------------------ */

    public getInnerRatio(): number {
        return this._innerRatio;
    }

    public setInnerRatio(ratio: number): void {
        this._innerRatio = Math.max(0, Math.min(ratio, 0.999));
    }

    /* ------------------ angles ------------------ */

    public getStartAngle(): number {
        return this._startAngle;
    }

    public setStartAngle(angle: number): void {
        this._startAngle = angle;
    }

    public getEndAngle(): number {
        return this._endAngle;
    }

    public setEndAngle(angle: number): void {
        this._endAngle = angle;
    }

    public setAngles(startAngle: number, endAngle: number): void {
        this._startAngle = startAngle;
        this._endAngle = endAngle;
    }

    public getSweepAngle(): number {
        return this._endAngle - this._startAngle;
    }

    /* ------------------ helpers ------------------ */

    public isFullEllipse(): boolean {
        return Math.abs(this.getSweepAngle()) >= 360;
    }

    public isRing(): boolean {
        return this._innerRatio > 0;
    }

    /* ------------------ style ------------------ */

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

    /* ------------------ bounds ------------------ */

    public getLocalBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: 0,
            y: 0,
            width: this.getWidth(),
            height: this.getHeight(),
        };
    }
}