import { Camera, type Point } from "../../../core/camera";
import { MathF32 } from "../../../core/math";
import type { ID } from "../../../core/types";
import type { IShapeBase, Rect } from "../../../nodes";
import { LayerBase, LayerType } from "../base";
import type { FixedArray, ILayerWorld } from "./types";

export class LayerWorld extends LayerBase implements ILayerWorld {
    private static readonly GEOMETRY_EPSILON = 1e-6;
    public readonly camera: Camera;
    private readonly _nodes: IShapeBase[];

    constructor() {
        super(LayerType.World, 1);
        this._nodes = [];
        this.camera = new Camera();
    }

    /****************************************************************/
    /*                            NODES                             */
    /****************************************************************/

    public findNodeById(id: ID): IShapeBase {
        const node = this._nodes.find((item) => item.id === id);
        if (!node) {
            throw new Error(`Node with id "${String(id)}" was not found.`);
        }
        return node;
    }

    public findNodeByName(name: string): IShapeBase[] {
        return this._nodes.filter((item) => item.getName() === name);
    }

    public getNodes(): IShapeBase[] {
        return [...this._nodes];
    }

    public setNodes(nodes: IShapeBase[]): void {
        this.deleteNodes();
        this._nodes.push(...nodes);
    }

    public addNode(node: IShapeBase): boolean {
        const exists = this._nodes.some((item) => item.id === node.id);

        if (exists) {
            return false;
        }

        this._nodes.push(node);
        return true;
    }

    public deleteNode(id: ID): boolean {
        const index = this._nodes.findIndex((item) => item.id === id);

        if (index === -1) {
            return false;
        }

        this._nodes.splice(index, 1);
        return true;
    }

    public deleteNodes(): void {
        this._nodes.length = 0;
    }

    public hasNode(id: ID): boolean {
        return this._nodes.some((item) => item.id === id);
    }

    public moveNodesToTop(ids: ID[]): boolean {
        return this._moveNodesTo(ids, this._nodes.length);
    }

    public moveNodesToBottom(ids: ID[]): boolean {
        return this._moveNodesTo(ids, 0);
    }

    public moveNodesTo(ids: ID[], index: number): boolean {
        return this._moveNodesTo(ids, index);
    }


    /****************************************************************/
    /*                           VIEWPORT                           */
    /****************************************************************/

    public getViewportWorldCorners(): FixedArray<Point, 4> {
        const { width, height } = this.getSize();

        const tl = this.camera.screenToWorld({ x: 0, y: 0 });
        const tr = this.camera.screenToWorld({ x: width, y: 0 });
        const br = this.camera.screenToWorld({ x: width, y: height });
        const bl = this.camera.screenToWorld({ x: 0, y: height });

        return [tl, tr, br, bl];
    }

    public getViewportWorldAABB(): Rect {
        const [tl, tr, br, bl] = this.getViewportWorldCorners();

        const xs = [tl.x, tr.x, br.x, bl.x];
        const ys = [tl.y, tr.y, br.y, bl.y];

        const minX = MathF32.toF32(Math.min(...xs));
        const maxX = MathF32.toF32(Math.max(...xs));
        const minY = MathF32.toF32(Math.min(...ys));
        const maxY = MathF32.toF32(Math.max(...ys));

        return {
            x: minX,
            y: minY,
            width: MathF32.sub(maxX, minX),
            height: MathF32.sub(maxY, minY),
        };
    }

    /****************************************************************/
    /*                            HIT TEST                          */
    /****************************************************************/

    public findTopNodeAt(worldPoint: Point): IShapeBase | null {
        // TODO: (Optimisation) uncomment when will be optimisational problems
        // if (!this._shouldProcessPointerMove(worldPoint)) {
        //     return null;
        // }
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const node = this._nodes[i];
            if (node === undefined) {
                continue;
            }
            if (!node.isVisibleInHierarchy()) {
                continue;
            }
            if (node.hitTest(worldPoint)) {
                return node;
            }
        }
        return null;
    }

    public findAllNodesAt(worldPoint: Point): IShapeBase[] {
        const result: IShapeBase[] = [];

        for (let i = this._nodes.length - 1; i >= 0; i -= 1) {
            const node = this._nodes[i];

            if (node === undefined) {
                continue;
            }

            if (!node.isVisibleInHierarchy()) {
                continue;
            }

            if (node.hitTest(worldPoint)) {
                result.push(node);
            }
        }

        return result;
    }

    public findNodesInRect(worldRect: Rect): IShapeBase[] {
        const normalizedRect = this._normalizeRect(worldRect);

        if (normalizedRect.width <= 0 || normalizedRect.height <= 0) {
            return [];
        }

        const rectQuad = this._rectToQuad(normalizedRect);
        const result: IShapeBase[] = [];

        for (let i = this._nodes.length - 1; i >= 0; i -= 1) {
            const node = this._nodes[i];

            if (node === undefined) {
                continue;
            }

            if (!node.isVisibleInHierarchy()) {
                continue;
            }

            const nodeQuad = node.getWorldCorners();

            if (this._quadsIntersect(nodeQuad, rectQuad)) {
                result.push(node);
            }
        }

        return result;
    }

    public findNodesFullyInRect(worldRect: Rect): IShapeBase[] {
        const normalizedRect = this._normalizeRect(worldRect);

        if (normalizedRect.width <= 0 || normalizedRect.height <= 0) {
            return [];
        }

        const rectQuad = this._rectToQuad(normalizedRect);
        const result: IShapeBase[] = [];

        for (let i = this._nodes.length - 1; i >= 0; i -= 1) {
            const node = this._nodes[i];

            if (node === undefined) {
                continue;
            }

            if (!node.isVisibleInHierarchy()) {
                continue;
            }

            const nodeQuad = node.getWorldCorners();

            if (this._isQuadInsideQuad(nodeQuad, rectQuad)) {
                result.push(node);
            }
        }

        return result;
    }

    public findAllNodesAtScreen(screenPoint: Point): IShapeBase[] {
        return this.findAllNodesAt(this.camera.screenToWorld(screenPoint));
    }

    public findNodesInScreenRect(screenRect: Rect): IShapeBase[] {
        const normalizedRect = this._normalizeRect(screenRect);

        if (normalizedRect.width <= 0 || normalizedRect.height <= 0) {
            return [];
        }

        const worldQuad = this._screenRectToWorldQuad(normalizedRect);
        const result: IShapeBase[] = [];

        for (let i = this._nodes.length - 1; i >= 0; i -= 1) {
            const node = this._nodes[i];

            if (node === undefined) {
                continue;
            }

            if (!node.isVisibleInHierarchy()) {
                continue;
            }

            const nodeQuad = node.getWorldCorners();

            if (this._quadsIntersect(nodeQuad, worldQuad)) {
                result.push(node);
            }
        }

        return result;
    }

    public findNodesFullyInScreenRect(screenRect: Rect): IShapeBase[] {
        const normalizedRect = this._normalizeRect(screenRect);

        if (normalizedRect.width <= 0 || normalizedRect.height <= 0) {
            return [];
        }

        const worldQuad = this._screenRectToWorldQuad(normalizedRect);
        const result: IShapeBase[] = [];

        for (let i = this._nodes.length - 1; i >= 0; i -= 1) {
            const node = this._nodes[i];

            if (node === undefined) {
                continue;
            }

            if (!node.isVisibleInHierarchy()) {
                continue;
            }

            const nodeQuad = node.getWorldCorners();

            if (this._isQuadInsideQuad(nodeQuad, worldQuad)) {
                result.push(node);
            }
        }

        return result;
    }

    private _normalizeRect(rect: Rect): Rect {
        const x2 = rect.x + rect.width;
        const y2 = rect.y + rect.height;

        const minX = Math.min(rect.x, x2);
        const minY = Math.min(rect.y, y2);
        const maxX = Math.max(rect.x, x2);
        const maxY = Math.max(rect.y, y2);

        return {
            x: MathF32.toF32(minX),
            y: MathF32.toF32(minY),
            width: MathF32.toF32(maxX - minX),
            height: MathF32.toF32(maxY - minY),
        };
    }

    private _rectToQuad(rect: Rect): [Point, Point, Point, Point] {
        return [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height },
        ];
    }

    private _screenRectToWorldQuad(screenRect: Rect): [Point, Point, Point, Point] {
        const [tl, tr, br, bl] = this._rectToQuad(screenRect);

        return [
            this.camera.screenToWorld(tl),
            this.camera.screenToWorld(tr),
            this.camera.screenToWorld(br),
            this.camera.screenToWorld(bl),
        ];
    }

    private _isQuadInsideQuad(
        quad: readonly [Point, Point, Point, Point],
        container: readonly [Point, Point, Point, Point],
    ): boolean {
        for (const point of quad) {
            if (!this._isPointInConvexQuad(point, container)) {
                return false;
            }
        }

        return true;
    }

    private _quadsIntersect(
        a: readonly [Point, Point, Point, Point],
        b: readonly [Point, Point, Point, Point],
    ): boolean {
        for (const point of a) {
            if (this._isPointInConvexQuad(point, b)) {
                return true;
            }
        }

        for (const point of b) {
            if (this._isPointInConvexQuad(point, a)) {
                return true;
            }
        }

        for (let i = 0; i < a.length; i += 1) {
            const a0 = a[i]!;
            const a1 = a[(i + 1) % a.length]!;

            for (let j = 0; j < b.length; j += 1) {
                const b0 = b[j]!;
                const b1 = b[(j + 1) % b.length]!;

                if (this._segmentsIntersect(a0, a1, b0, b1)) {
                    return true;
                }
            }
        }

        return false;
    }

    private _isPointInConvexQuad(
        point: Point,
        quad: readonly [Point, Point, Point, Point],
    ): boolean {
        let hasPositive = false;
        let hasNegative = false;

        for (let i = 0; i < quad.length; i += 1) {
            const a = quad[i]!;
            const b = quad[(i + 1) % quad.length]!;
            const cross = this._cross(a, b, point);

            if (cross > LayerWorld.GEOMETRY_EPSILON) {
                hasPositive = true;
            } else if (cross < -LayerWorld.GEOMETRY_EPSILON) {
                hasNegative = true;
            }

            if (hasPositive && hasNegative) {
                return false;
            }
        }

        return true;
    }

    private _segmentsIntersect(a0: Point, a1: Point, b0: Point, b1: Point): boolean {
        const c1 = this._cross(a0, a1, b0);
        const c2 = this._cross(a0, a1, b1);
        const c3 = this._cross(b0, b1, a0);
        const c4 = this._cross(b0, b1, a1);

        const epsilon = LayerWorld.GEOMETRY_EPSILON;

        const intersectsStrictly =
            ((c1 > epsilon && c2 < -epsilon) || (c1 < -epsilon && c2 > epsilon)) &&
            ((c3 > epsilon && c4 < -epsilon) || (c3 < -epsilon && c4 > epsilon));

        if (intersectsStrictly) {
            return true;
        }

        if (Math.abs(c1) <= epsilon && this._isPointOnSegment(b0, a0, a1)) {
            return true;
        }

        if (Math.abs(c2) <= epsilon && this._isPointOnSegment(b1, a0, a1)) {
            return true;
        }

        if (Math.abs(c3) <= epsilon && this._isPointOnSegment(a0, b0, b1)) {
            return true;
        }

        if (Math.abs(c4) <= epsilon && this._isPointOnSegment(a1, b0, b1)) {
            return true;
        }

        return false;
    }

    private _isPointOnSegment(point: Point, segmentStart: Point, segmentEnd: Point): boolean {
        const epsilon = LayerWorld.GEOMETRY_EPSILON;

        if (Math.abs(this._cross(segmentStart, segmentEnd, point)) > epsilon) {
            return false;
        }

        const minX = Math.min(segmentStart.x, segmentEnd.x) - epsilon;
        const maxX = Math.max(segmentStart.x, segmentEnd.x) + epsilon;
        const minY = Math.min(segmentStart.y, segmentEnd.y) - epsilon;
        const maxY = Math.max(segmentStart.y, segmentEnd.y) + epsilon;

        return (
            point.x >= minX &&
            point.x <= maxX &&
            point.y >= minY &&
            point.y <= maxY
        );
    }

    private _cross(a: Point, b: Point, c: Point): number {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }

    private _moveNodesTo(ids: readonly ID[], targetIndex: number): boolean {
        if (ids.length === 0 || this._nodes.length <= 1) {
            return false;
        }

        const idSet = new Set<ID>(ids);
        if (idSet.size === 0) {
            return false;
        }

        const selected: IShapeBase[] = [];
        const remaining: IShapeBase[] = [];

        for (const node of this._nodes) {
            if (idSet.has(node.id)) {
                selected.push(node);
            } else {
                remaining.push(node);
            }
        }

        if (selected.length === 0) {
            return false;
        }

        const normalizedIndex = Number.isFinite(targetIndex)
            ? Math.trunc(targetIndex)
            : (targetIndex > 0 ? remaining.length : 0);

        const clampedIndex = Math.max(0, Math.min(remaining.length, normalizedIndex));

        const nextNodes = [
            ...remaining.slice(0, clampedIndex),
            ...selected,
            ...remaining.slice(clampedIndex),
        ];

        if (!this._hasOrderChanged(nextNodes)) {
            return false;
        }

        this._nodes.length = 0;
        this._nodes.push(...nextNodes);
        return true;
    }

    private _hasOrderChanged(nextNodes: readonly IShapeBase[]): boolean {
        if (nextNodes.length !== this._nodes.length) {
            return true;
        }

        for (let i = 0; i < nextNodes.length; i += 1) {
            if (nextNodes[i] !== this._nodes[i]) {
                return true;
            }
        }

        return false;
    }



    /****************************************************************/
    /*                           Overrides                          */
    /****************************************************************/

    public override destroy(): void {
        this.deleteNodes();
        this.camera.reset();
        super.destroy();
    }

    public override setWidth(value: number): void {
        super.setWidth(value);
        this.camera.setViewportSize(this.getWidth(), this.getHeight());
    }

    public override setHeight(value: number): void {
        super.setHeight(value);
        this.camera.setViewportSize(this.getWidth(), this.getHeight());
    }

    public override setSize(width: number, height: number): void {
        super.setSize(width, height);
        this.camera.setViewportSize(this.getWidth(), this.getHeight());
    }
}
