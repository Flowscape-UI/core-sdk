import type { Vector2 } from "../../core/transform/types";
import { matrixInvert } from "../utils/matrix-invert";
import { NodeType } from "../base";
import { ShapeBase, type ShapePathCommand } from "../shape";
import type { INodeEllipse } from "./types";
import type { ID } from "../../core/types";

export class NodeEllipse extends ShapeBase implements INodeEllipse {
    private static readonly EPSILON = 1e-6;
    private _innerRatio: number;
    private _startAngle: number;
    private _endAngle: number;

    constructor(id: ID, name?: string) {
        super(id, NodeType.Ellipse, name ?? "Ellipse");

        this._innerRatio = 0;
        this._startAngle = 0;
        this._endAngle = Math.PI * 2;
    }



    /*********************************************************/
    /*                         Ratio                         */
    /*********************************************************/
    public getInnerRatio(): number {
        return this._innerRatio;
    }

    public setInnerRatio(value: number): void {
        const next = Math.max(0, Math.min(value, 0.999));

        if (next === this._innerRatio) {
            return;
        }

        this._innerRatio = next;
    }



    /*********************************************************/
    /*                         Angle                         */
    /*********************************************************/
    public getStartAngle(): number {
        return this._radToDeg(this._startAngle);
    }

    public setStartAngle(value: number): void {
        const newValue = this._degToRad(value);
        if (this._startAngle === newValue) {
            return;
        }
        this._startAngle = newValue;
    }

    public getEndAngle(): number {
        return this._radToDeg(this._endAngle);
    }

    public setEndAngle(value: number): void {
        const newValue = this._degToRad(value);
        if (this._endAngle === newValue) {
            return;
        }
        this._endAngle = newValue;
    }

    public getSweepAngle(): number {
        return this._radToDeg(this._endAngle - this._startAngle);
    }

    public override toPathCommands(): readonly ShapePathCommand[] {
        const view = this.getLocalViewOBB();
        const rx = view.width / 2;
        const ry = view.height / 2;

        if (rx <= 0 || ry <= 0) {
            return [];
        }

        const cx = view.x + rx;
        const cy = view.y + ry;

        const start = this._normalizeAngle(this._startAngle);
        const end = this._normalizeAngle(this._endAngle);
        const sweep = this._normalizeAngle(this._endAngle - this._startAngle);

        const isFullEllipse =
            Math.abs(sweep) < NodeEllipse.EPSILON ||
            Math.abs(sweep - Math.PI * 2) < NodeEllipse.EPSILON;

        const commands: ShapePathCommand[] = [];

        if (isFullEllipse) {
            commands.push({
                type: "moveTo",
                point: { x: cx + rx, y: cy },
            });
            commands.push({
                type: "arcTo",
                center: { x: cx, y: cy },
                radiusX: rx,
                radiusY: ry,
                startAngle: 0,
                endAngle: 360,
                clockwise: true,
            });
            commands.push({ type: "closePath" });

            if (this._innerRatio > 0) {
                const innerRx = rx * this._innerRatio;
                const innerRy = ry * this._innerRatio;

                commands.push({
                    type: "moveTo",
                    point: { x: cx + innerRx, y: cy },
                });
                commands.push({
                    type: "arcTo",
                    center: { x: cx, y: cy },
                    radiusX: innerRx,
                    radiusY: innerRy,
                    startAngle: 360,
                    endAngle: 0,
                    clockwise: false,
                });
                commands.push({ type: "closePath" });
            }

            return commands;
        }

        const startPoint = {
            x: cx + Math.cos(start) * rx,
            y: cy + Math.sin(start) * ry,
        };

        commands.push({
            type: "moveTo",
            point: startPoint,
        });
        commands.push({
            type: "arcTo",
            center: { x: cx, y: cy },
            radiusX: rx,
            radiusY: ry,
            startAngle: this._radToDeg(start),
            endAngle: this._radToDeg(end),
            clockwise: true,
        });

        if (this._innerRatio > 0) {
            const innerRx = rx * this._innerRatio;
            const innerRy = ry * this._innerRatio;

            const innerEndPoint = {
                x: cx + Math.cos(end) * innerRx,
                y: cy + Math.sin(end) * innerRy,
            };

            commands.push({
                type: "lineTo",
                point: innerEndPoint,
            });
            commands.push({
                type: "arcTo",
                center: { x: cx, y: cy },
                radiusX: innerRx,
                radiusY: innerRy,
                startAngle: this._radToDeg(end),
                endAngle: this._radToDeg(start),
                clockwise: false,
            });
        } else {
            commands.push({
                type: "lineTo",
                point: { x: cx, y: cy },
            });
        }

        commands.push({ type: "closePath" });
        return commands;
    }

    public override hitTest(worldPoint: Vector2): boolean {
        const bounds = this.getWorldViewAABB();

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
            const view = this.getLocalViewOBB();

            const halfWidth = view.width / 2;
            const halfHeight = view.height / 2;

            if (halfWidth === 0 || halfHeight === 0) {
                return false;
            }

            const centerX = view.x + halfWidth;
            const centerY = view.y + halfHeight;

            const normalizedX = (localPoint.x - centerX) / halfWidth;
            const normalizedY = (localPoint.y - centerY) / halfHeight;

            const distanceSq = normalizedX * normalizedX + normalizedY * normalizedY;

            // 1. Outside outer ellipse
            if (distanceSq > 1) {
                return false;
            }

            // 2. Inside inner ellipse hole
            if (this._innerRatio > 0) {
                const innerRatioSq = this._innerRatio * this._innerRatio;

                if (distanceSq < innerRatioSq) {
                    return false;
                }
            }

            // 3. Full ellipse shortcut
            const sweep = this._normalizeAngle(this._endAngle - this._startAngle);
            const isFullEllipse =
                Math.abs(sweep) < NodeEllipse.EPSILON ||
                Math.abs(sweep - Math.PI * 2) < NodeEllipse.EPSILON;

            if (isFullEllipse) {
                return true;
            }

            // 4. Angle check
            // Angle for ellipse sector check must be computed in normalized
            // ellipse space, otherwise arc boundaries drift on stretched shapes.
            const angle = this._normalizeAngle(Math.atan2(normalizedY, normalizedX));

            const start = this._normalizeAngle(this._startAngle);
            const end = this._normalizeAngle(this._endAngle);

            return this._isAngleBetween(angle, start, end);
        } catch {
            return false;
        }
    }



    /*********************************************************/
    /*                        Helpers                        */
    /*********************************************************/
    private _degToRad(angle: number): number {
        return (angle * Math.PI) / 180;
    }

    private _radToDeg(angle: number): number {
        return (angle * 180) / Math.PI;
    }

    private _normalizeAngle(angle: number): number {
        const tau = Math.PI * 2;
        return ((angle % tau) + tau) % tau;
    }

    private _isAngleBetween(angle: number, start: number, end: number): boolean {
        if (start <= end) {
            return angle >= start && angle <= end;
        }

        // Wrapped range, e.g. 300° -> 60°
        return angle >= start || angle <= end;
    }
}
