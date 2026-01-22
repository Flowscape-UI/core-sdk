import { clamp } from "../../utils/clamp";
import type { Matrix, Vector2 } from "./types";
import type { ITransform } from "./types/ITransform";
import { composeMatrix } from "./utils";

export class Transform implements ITransform {
    private _position: Vector2;
    private _scale: Vector2;
    private _rotation: number;
    private _pivot: Vector2;

    // Internal use only
    private _isDirty: boolean = true;
    private _localMatrix?: Matrix;

    constructor() {
        this._position = { x: 0, y: 0 };
        this._rotation = 0;
        this._scale = { x: 1, y: 1 };
        this._pivot = { x: 0.5, y: 0.5 };
    }

    public getPosition(): Vector2 {
        return this._position;
    }

    public setPosition(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;
        this._markDirty();
    }

    public translate(dx: number, dy: number): void {
        this._position.x += dx;
        this._position.y += dy;
        this._markDirty();
    }


    public getScale(): Vector2 {
        return this._scale;
    }

    public setScale(sx: number, sy: number): void {
        this._scale.x = sx;
        this._scale.y = sy;
        this._markDirty();
    }


    public getRotation(): number {
        return this._rotation;
    }

    public setRotation(angle: number): void {
        this._rotation = angle;
        this._markDirty();
    }


    public getPivot(): Vector2 {
        return this._pivot;
    }

    public setPivot(px: number, py: number): void {
        this._pivot.x = clamp(px, 0, 1);
        this._pivot.y = clamp(py, 0, 1);
        this._markDirty();
    }


    public getLocalMatrix(width: number, height: number): Matrix {
        if (!this._isDirty && this._localMatrix) {
            return this._localMatrix;
        }

        const px = width * this._pivot.x;
        const py = height * this._pivot.y;

        this._localMatrix = composeMatrix(
            this._position,
            this._scale,
            this._rotation,
            px,
            py
        );

        this._isDirty = false;
        return this._localMatrix;
    }



    // Internal use only
    private _markDirty(): void {
        this._isDirty = true;
    }
}