import type { Transform } from '../core/transform/Transform';
import type { Matrix, Vector2 } from '../core/transform/types';
import type { ITransform } from '../core/transform/types/ITransform';
import type { NodeOptions } from './types';

export class Node implements ITransform {
    public readonly id: string;
    public parentId: string | null;

    protected _width: number;
    protected _height: number;

    protected _transform: Transform;

    constructor(params: NodeOptions) {
        this.id = params.id;
        this.parentId = params.parentId ?? null;
        this._transform = params.transform;
        this._width = params.width;
        this._height = params.height;
    }

    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height;
    }

    public setSize(width: number, height: number): void {
        this._width = Math.max(0, width);
        this._height = Math.max(0, height);
    }

    // Transform delegation
    public getPosition(): Vector2 {
        return this._transform.getPosition();
    }
    public setPosition(x: number, y: number): void {
        this._transform.setPosition(x, y);
    }
    public translate(dx: number, dy: number): void {
        this._transform.translate(dx, dy);
    }
    public getScale(): Vector2 {
        return this._transform.getScale();
    }
    public setScale(sx: number, sy: number): void {
        this._transform.setScale(sx, sy);
    }
    public getRotation(): number {
        return this._transform.getRotation();
    }
    public setRotation(angle: number): void {
        this._transform.setRotation(angle);
    }
    public getPivot(): Vector2 {
        return this._transform.getPivot();
    }
    public setPivot(px: number, py: number): void {
        this._transform.setPivot(px, py);
    }
    public getLocalMatrix(): Matrix {
        return this._transform.getLocalMatrix(this._width, this._height);
    }
}
