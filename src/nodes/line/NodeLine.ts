import type { Vector2 } from '../../core/transform';
import type { ID } from '../../core/types';
import { NodeType } from '../base';
import { ShapeBase } from '../shape';
import { matrixInvert } from '../utils/matrix-invert';
import { LineCap, LineEnding, type INodeLine } from './types';

export class NodeLine extends ShapeBase implements INodeLine {
    private _start: Vector2;
    private _end: Vector2;

    private _thickness: number;

    private _lineCapStart: LineCap;
    private _lineCapEnd: LineCap;

    private _startEnding: LineEnding;
    private _endEnding: LineEnding;

    constructor(id: ID, name?: string) {
        super(id, NodeType.Line, name ?? 'Line');

        this._thickness = 1;
        this._start = { x: 0, y: 0 };
        this._end = { x: 100, y: 0 };
        this._updateBounds();

        this._lineCapStart = LineCap.Butt;
        this._lineCapEnd = LineCap.Butt;

        this._startEnding = LineEnding.None;
        this._endEnding = LineEnding.None;
    }



    /*********************************************************/
    /*                        Geometry                       */
    /*********************************************************/
    public getStart(): Vector2 {
        return { ...this._start };
    }

    public setStart(value: Vector2): void {
        if (value.x === this._start.x && value.y === this._start.y) {
            return;
        }
        this._start = value;
        this._updateBounds();
    }

    public getEnd(): Vector2 {
        return { ...this._end };
    }

    public setEnd(value: Vector2): void {
        if (value.x === this._end.x && value.y === this._end.y) {
            return;
        }
        this._end = value;
        this._updateBounds();
    }



    /*********************************************************/
    /*                         Stroke                        */
    /*********************************************************/
    public getStrokeThickness(): number {
        return this._thickness;
    }

    public setStrokeThickness(value: number): void {
        const newValue = Math.max(0, value);
        if (newValue === this._thickness) {
            return;
        }
        this._thickness = newValue;
    }



    /*********************************************************/
    /*                     Stroke Endings                    */
    /*********************************************************/
    public getLineCapStart(): LineCap {
        return this._lineCapStart;
    }

    public setLineCapStart(value: LineCap): void {
        if (this._lineCapStart === value) {
            return;
        }
        this._lineCapStart = value;
    }

    public getLineCapEnd(): LineCap {
        return this._lineCapEnd;
    }

    public setLineCapEnd(value: LineCap): void {
        if (this._lineCapEnd === value) {
            return;
        }
        this._lineCapEnd = value;
    }

    public getStartEnding(): LineEnding {
        return this._startEnding;
    }

    public setStartEnding(value: LineEnding): void {
        if (this._startEnding === value) {
            return;
        }
        this._startEnding = value;
    }

    public getEndEnding(): LineEnding {
        return this._endEnding;
    }

    public setEndEnding(value: LineEnding): void {
        if (this._endEnding === value) {
            return;
        }
        this._endEnding = value;
    }



    /*********************************************************/
    /*                        Overrides                      */
    /*********************************************************/
    public override setWidth(value: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const nextWidth = Math.max(0, value);
        const oldWidth = this.getWidth();

        if (nextWidth === oldWidth) {
            return;
        }

        const start = { ...this._start };
        const end = { ...this._end };

        if (oldWidth > 0) {
            start.x = (start.x / oldWidth) * nextWidth;
            end.x = (end.x / oldWidth) * nextWidth;
        }

        this._start = start;
        this._end = end;

        super.setWidth(nextWidth);
    }

    public override setHeight(value: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const nextHeight = Math.max(0, value);
        const oldHeight = this.getHeight();

        if (nextHeight === oldHeight) {
            return;
        }

        const start = { ...this._start };
        const end = { ...this._end };

        if (oldHeight > 0) {
            start.y = (start.y / oldHeight) * nextHeight;
            end.y = (end.y / oldHeight) * nextHeight;
        }

        this._start = start;
        this._end = end;

        super.setHeight(nextHeight);
    }

    public override setSize(width: number, height: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const nextWidth = Math.max(0, width);
        const nextHeight = Math.max(0, height);

        const oldWidth = this.getWidth();
        const oldHeight = this.getHeight();

        if (nextWidth === oldWidth && nextHeight === oldHeight) {
            return;
        }

        const start = { ...this._start };
        const end = { ...this._end };

        if (oldWidth > 0) {
            start.x = (start.x / oldWidth) * nextWidth;
            end.x = (end.x / oldWidth) * nextWidth;
        }

        if (oldHeight > 0) {
            start.y = (start.y / oldHeight) * nextHeight;
            end.y = (end.y / oldHeight) * nextHeight;
        }

        this._start = start;
        this._end = end;

        super.setSize(nextWidth, nextHeight);
    }


    public override hitTest(worldPoint: Vector2): boolean {
        const bounds = this.getWorldAABB();

        if (
            worldPoint.x < bounds.x ||
            worldPoint.x > bounds.x + bounds.width ||
            worldPoint.y < bounds.y ||
            worldPoint.y > bounds.y + bounds.height
        ) {
            return false;
        }

        try {
            const invMatrix = matrixInvert(this.getWorldMatrix());
            const localPoint = this._applyMatrixToPoint(invMatrix, worldPoint);

            const ax = this._start.x;
            const ay = this._start.y;
            const bx = this._end.x;
            const by = this._end.y;

            const halfThickness = this._thickness / 2;

            const abx = bx - ax;
            const aby = by - ay;

            const abLengthSq = abx * abx + aby * aby;

            // Degenerate case: line collapsed into a point
            if (abLengthSq === 0) {
                const dx = localPoint.x - ax;
                const dy = localPoint.y - ay;

                return dx * dx + dy * dy <= halfThickness * halfThickness;
            }

            const abLength = Math.sqrt(abLengthSq);

            const startExtend =
                this._lineCapStart === LineCap.Square ? halfThickness : 0;
            const endExtend =
                this._lineCapEnd === LineCap.Square ? halfThickness : 0;

            const minT = -startExtend / abLength;
            const maxT = 1 + endExtend / abLength;

            let t =
                ((localPoint.x - ax) * abx + (localPoint.y - ay) * aby) / abLengthSq;

            if (t < minT) {
                t = minT;
            } else if (t > maxT) {
                t = maxT;
            }

            const closestX = ax + abx * t;
            const closestY = ay + aby * t;

            const dx = localPoint.x - closestX;
            const dy = localPoint.y - closestY;

            if (dx * dx + dy * dy <= halfThickness * halfThickness) {
                return true;
            }

            if (this._lineCapStart === LineCap.Round) {
                const sdx = localPoint.x - ax;
                const sdy = localPoint.y - ay;

                if (sdx * sdx + sdy * sdy <= halfThickness * halfThickness) {
                    return true;
                }
            }

            if (this._lineCapEnd === LineCap.Round) {
                const edx = localPoint.x - bx;
                const edy = localPoint.y - by;

                if (edx * edx + edy * edy <= halfThickness * halfThickness) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }



    /*********************************************************/
    /*                         Helpers                       */
    /*********************************************************/
    private _updateBounds(): void {
        const minX = Math.min(this._start.x, this._end.x);
        const minY = Math.min(this._start.y, this._end.y);

        const maxX = Math.max(this._start.x, this._end.x);
        const maxY = Math.max(this._start.y, this._end.y);

        const nextWidth = maxX - minX;
        const nextHeight = maxY - minY;

        const needsNormalization = minX !== 0 || minY !== 0;
        const sizeChanged =
            nextWidth !== this.getWidth() ||
            nextHeight !== this.getHeight();

        if (!needsNormalization && !sizeChanged) {
            return;
        }

        // Save current node position before normalization
        const position = this.getPosition();

        // Convert local offset into parent-space delta using current local matrix basis
        const localMatrix = this.getLocalMatrix();

        const deltaX = localMatrix.a * minX + localMatrix.c * minY;
        const deltaY = localMatrix.b * minX + localMatrix.d * minY;

        // Normalize line points into local box
        this._start = {
            x: this._start.x - minX,
            y: this._start.y - minY,
        };

        this._end = {
            x: this._end.x - minX,
            y: this._end.y - minY,
        };

        // Update derived box size without applying line resize logic
        super.setSize(nextWidth, nextHeight);

        // Move node so the line stays visually in the same place
        this.setPosition(position.x + deltaX, position.y + deltaY);
    }
}
