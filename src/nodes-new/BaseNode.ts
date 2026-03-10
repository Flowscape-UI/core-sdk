import { Transform } from '../core/transform/Transform';
import type { Matrix, Vector2 } from '../core/transform/types';
import type { ITransform } from '../core/transform/types/ITransform';
import type { NodeOptions } from './types';
import type { INode } from './types/INode';
import { multiplyMatrix } from './utils';

export class BaseNode implements INode, ITransform {
    public readonly id: string;
    public isVisible: boolean;
    public isLocked: boolean;


    private _parent: INode | null;
    private _children: INode[];

    protected _width: number;
    protected _height: number;

    protected _transform: Transform;


    constructor(params: NodeOptions) {
        this.id = params.id;
        this._children = [];
        this._parent = null;

        this._width = params.width;
        this._height = params.height;

        this.isVisible = true;
        this.isLocked = false;

        this._transform = new Transform();
    }

    public getParent(): INode | null {
        return this._parent;
    }

    public setParent(parent: INode): void {
        if (this._parent !== null) {
            this._parent.removeChild(this);
        }
        this._parent = parent;
    }


    public removeParent(): void {
        if (!this._parent) return;
        this._parent.removeChild(this);
    }


    // Children controller
    public getChildren(): readonly INode[] {
        return [...this._children];
    }

    public addChild(child: INode): void {
        if (child === this) {
            throw new Error('Node cannot be added to itself');
        }

        if (child.getParent() === this) {
            return;
        }

        const oldParent = child.getParent();
        if (oldParent) {
            oldParent.removeChild(child);
        }

        child.setParent(this);
        this._children.push(child);
    }

    public removeChild(child: INode): void {
        const index = this._children.indexOf(child);
        if (index === -1) return;

        this._children.splice(index, 1);
        child.removeParent();
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
    public getWorldMatrix(): Matrix {
        const localMatrix = this.getLocalMatrix();

        if (!this._parent) {
            return localMatrix;
        }

        const parentMatrix = this._parent.getWorldMatrix();
        return multiplyMatrix(parentMatrix, localMatrix);
    }

    public static isAncestor(target: INode, node: INode | null): boolean {
        let current = node;
        while (current) {
            if (current === target) return true;
            current = current.getParent();
        }
        return false;
    }


    // Helpers
    private _hasAncestor(node: INode): boolean {
        let current: INode | null = this._parent;

        while (current) {
            if (current === node) {
                return true;
            }
            current = current.getParent();
        }

        return false;
    }
}
