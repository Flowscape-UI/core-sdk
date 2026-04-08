import type { Vector2 } from "../../core/transform/types";
import type { ID } from "../../core/types";
import { NodeType } from "../base";
import { ShapeBase } from "../shape";
import { matrixInvert } from "../utils/matrix-invert";
import type { INodePolygon } from "./types";

export class NodePolygon extends ShapeBase implements INodePolygon {
    private static readonly MIN_SIDE_COUNT: number = 3;
    private static readonly MAX_SIDE_COUNT: number = 60;

    private _sideCount: number;

    constructor(id: ID, name?: string, type?: NodeType) {
        super(id, type ?? NodeType.Polygon, name ?? "Polygon");
        this._sideCount = NodePolygon.MIN_SIDE_COUNT;
    }

    /*********************************************************/
    /*                         Sides                         */
    /*********************************************************/

    public getSideCount(): number {
        return this._sideCount;
    }

    public setSideCount(value: number): void {
        const next = this._clampSideCount(value);

        if (next === this._sideCount) {
            return;
        }

        this._sideCount = next;
    }

    public getVertices(): Vector2[] {
        return this._getVertices();
    }


    /*********************************************************/
    /*                       Overrides                       */
    /*********************************************************/
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

            const vertices = this._getVertices();

            let inside = false;

            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
                const xi = vertices[i].x;
                const yi = vertices[i].y;

                const xj = vertices[j].x;
                const yj = vertices[j].y;

                const intersect =
                    yi > localPoint.y !== yj > localPoint.y &&
                    localPoint.x <
                    ((xj - xi) * (localPoint.y - yi)) / (yj - yi) + xi;

                if (intersect) {
                    inside = !inside;
                }
            }

            return inside;
        } catch {
            return false;
        }
    }

    /*********************************************************/
    /*                        Helpers                        */
    /*********************************************************/

    protected _clampSideCount(count: number): number {
        return Math.max(
            NodePolygon.MIN_SIDE_COUNT,
            Math.min(NodePolygon.MAX_SIDE_COUNT, Math.round(count))
        );
    }

    protected _getVertices(): Vector2[] {
        console.log('herer');
        
        const sides = this._sideCount;

        const rx = this.getWidth() / 2;
        const ry = this.getHeight() / 2;

        const cx = rx;
        const cy = ry;

        const step = (Math.PI * 2) / sides;

        const vertices = new Array<Vector2>(sides);

        for (let i = 0; i < sides; i++) {
            const angle = i * step - Math.PI / 2;

            vertices[i] = {
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry,
            };
        }

        return vertices;
    }
}