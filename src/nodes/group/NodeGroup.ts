import {
    type Vector2,
    type ID,
    MathF32,
} from "../../core";
import {
    type Rect,
    NodeBase,
    NodeType,
} from "../base";
import { ShapeBase } from "../shape";
import {
    type INodeGroup,
    GroupChildrenResizeMode,
} from "./types";

const GROUP_EPSILON = 1e-6;

type GroupChildResizeSnapshot = {
    id: ID;
    position: Vector2;
    scaleX: number;
    scaleY: number;
    rotation: number;
};

export type GroupResizeSnapshot = {
    bounds: Rect;
    children: Map<ID, GroupChildResizeSnapshot>;
};

export class NodeGroup extends ShapeBase implements INodeGroup {
    private _activeResizeSnapshot: GroupResizeSnapshot | null = null;
    private _collapsedBoundsOverride: Rect | null = null;

    constructor(id: ID, name?: string) {
        super(id, NodeType.Group, name ?? "Group");
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

        const children = this.getChildren();

        if (children.length === 0) {
            return false;
        }

        for (let i = children.length - 1; i >= 0; i -= 1) {
            const child = children[i]!;

            if (!child.isVisible()) {
                continue;
            }

            if (child.hitTest(worldPoint)) {
                return true;
            }
        }

        return false;
    }

    public override setWidth(value: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const bounds = this._getChildrenLocalOBB();

        if (!bounds) {
            super.setWidth(MathF32.max(0, value));
            return;
        }

        this._resizeToBounds({
            x: bounds.x,
            y: bounds.y,
            width: MathF32.max(0, value),
            height: bounds.height,
        });
    }

    public override setHeight(value: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const bounds = this._getChildrenLocalOBB();

        if (!bounds) {
            super.setHeight(MathF32.max(0, value));
            return;
        }

        this._resizeToBounds({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: MathF32.max(0, value),
        });
    }

    public override setSize(width: number, height: number): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        const bounds = this._getChildrenLocalOBB();

        if (!bounds) {
            super.setSize(MathF32.max(0, width), MathF32.max(0, height));
            return;
        }

        this._resizeToBounds({
            x: bounds.x,
            y: bounds.y,
            width: MathF32.max(0, width),
            height: MathF32.max(0, height),
        });
    }

    public resizeChildrenBySize(width: number, height: number): void {
        this.setSize(width, height);
    }

    public resizeChildrenByScale(width: number, height: number): void {
        this.setSize(width, height);
    }

    public beginResizeSession(): void {
        if (this.isLockedInHierarchy()) {
            return;
        }

        this._activeResizeSnapshot = this._createResizeSnapshot();
    }

    public createResizeSnapshot(): GroupResizeSnapshot | null {
        return this._createResizeSnapshot();
    }

    public endResizeSession(): void {
        this._activeResizeSnapshot = null;
        this._collapsedBoundsOverride = null;
    }

    public hasActiveResizeSession(): boolean {
        return this._activeResizeSnapshot !== null;
    }

    public override getWidth(): number {
        return this.getLocalOBB().width;
    }

    public override getHeight(): number {
        return this.getLocalOBB().height;
    }

    public override getLocalOBB(): Rect {
        if (this._collapsedBoundsOverride) {
            return this._collapsedBoundsOverride;
        }

        const childrenBounds = this._getChildrenLocalOBB();

        if (!childrenBounds) {
            return super.getLocalOBB();
        }

        return childrenBounds;
    }

    private _resizeToBounds(targetBounds: Rect): void {
        const snapshot = this._activeResizeSnapshot ?? this._createResizeSnapshot();

        if (!snapshot) {
            return;
        }

        this._applyResizeFromSnapshot(snapshot, targetBounds, GroupChildrenResizeMode.Scale);
    }

    public applyResizeFromSnapshot(
        snapshot: GroupResizeSnapshot,
        targetBounds: Rect,
    ): void {
        this._applyResizeFromSnapshot(snapshot, targetBounds, GroupChildrenResizeMode.Scale);
    }

    private _createResizeSnapshot(): GroupResizeSnapshot | null {
        const bounds = this._getChildrenLocalOBB();

        if (!bounds) {
            return null;
        }

        const children = new Map<ID, GroupChildResizeSnapshot>();

        for (const child of this.getChildren()) {
            children.set(child.id, {
                id: child.id,
                position: child.getPosition(),
                scaleX: child.getScaleX(),
                scaleY: child.getScaleY(),
                rotation: child.getRotation(),
            });
        }

        return {
            bounds,
            children,
        };
    }

    private _applyResizeFromSnapshot(
        snapshot: GroupResizeSnapshot,
        targetBounds: Rect,
        mode: GroupChildrenResizeMode,
    ): void {
        const children = this.getChildren();

        if (children.length === 0) {
            return;
        }

        const sourceBounds = snapshot.bounds;

        const sourceWidth = sourceBounds.width;
        const sourceHeight = sourceBounds.height;

        const nextWidth = MathF32.max(0, targetBounds.width);
        const nextHeight = MathF32.max(0, targetBounds.height);

        const collapseX = nextWidth <= GROUP_EPSILON;
        const collapseY = nextHeight <= GROUP_EPSILON;

        const scaleX = sourceWidth <= GROUP_EPSILON
            ? 0
            : MathF32.toF32(nextWidth / sourceWidth);

        const scaleY = sourceHeight <= GROUP_EPSILON
            ? 0
            : MathF32.toF32(nextHeight / sourceHeight);

        const sourceX = sourceBounds.x;
        const sourceY = sourceBounds.y;

        const targetX = targetBounds.x;
        const targetY = targetBounds.y;

        this._collapsedBoundsOverride =
            collapseX || collapseY
                ? {
                    x: targetX,
                    y: targetY,
                    width: nextWidth,
                    height: nextHeight,
                }
                : null;

        for (const child of children) {
            const childSnapshot = snapshot.children.get(child.id);

            if (!childSnapshot) {
                continue;
            }

            const rotated = this._isNodeRotatedInGroupAxes(childSnapshot.rotation);
            const sourcePosition = childSnapshot.position;

            let nextPositionX = MathF32.add(
                targetX,
                MathF32.mul(
                    MathF32.sub(sourcePosition.x, sourceX),
                    scaleX,
                ),
            );

            let nextPositionY = MathF32.add(
                targetY,
                MathF32.mul(
                    MathF32.sub(sourcePosition.y, sourceY),
                    scaleY,
                ),
            );

            let nextScaleX = MathF32.mul(childSnapshot.scaleX, scaleX);
            let nextScaleY = MathF32.mul(childSnapshot.scaleY, scaleY);

            if (collapseX) {
                nextPositionX = targetX;
                nextScaleX = 0;

                // Для rotated child одной нулевой оси недостаточно:
                // его вторая ось всё ещё даёт проекцию на X.
                if (rotated && !collapseY) {
                    nextPositionY = targetY;
                    nextScaleY = 0;
                }
            }

            if (collapseY) {
                nextPositionY = targetY;
                nextScaleY = 0;

                // Аналогично для коллапса по Y.
                if (rotated && !collapseX) {
                    nextPositionX = targetX;
                    nextScaleX = 0;
                }
            }

            child.setPosition(nextPositionX, nextPositionY);

            if (mode === GroupChildrenResizeMode.Size) {
                const nextWidthValue = MathF32.max(
                    0,
                    MathF32.mul(child.getWidth(), scaleX),
                );
                const nextHeightValue = MathF32.max(
                    0,
                    MathF32.mul(child.getHeight(), scaleY),
                );

                child.setSize(nextWidthValue, nextHeightValue);
                continue;
            }

            child.setScale(nextScaleX, nextScaleY);
        }

        if (!collapseX && !collapseY) {
            this._collapsedBoundsOverride = null;
        }
    }

    private _isNodeRotatedInGroupAxes(rotationDeg: number): boolean {
        const rotationRad = MathF32.degToRad(rotationDeg);
        return !MathF32.nearlyEqual(MathF32.sin(rotationRad), 0);
    }

    private _getChildrenLocalOBB(): Rect | null {
        const children = this.getChildren();

        if (children.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const child of children) {
            const childBounds = child.getHierarchyLocalOBB();
            const childMatrix = (child as NodeBase).getLocalMatrix();

            const corners: [Vector2, Vector2, Vector2, Vector2] = [
                { x: childBounds.x, y: childBounds.y },
                { x: childBounds.x + childBounds.width, y: childBounds.y },
                { x: childBounds.x + childBounds.width, y: childBounds.y + childBounds.height },
                { x: childBounds.x, y: childBounds.y + childBounds.height },
            ];

            for (const corner of corners) {
                const point = this._applyMatrixToPoint(childMatrix, corner);

                if (point.x < minX) minX = point.x;
                if (point.y < minY) minY = point.y;
                if (point.x > maxX) maxX = point.x;
                if (point.y > maxY) maxY = point.y;
            }
        }

        if (
            !Number.isFinite(minX) ||
            !Number.isFinite(minY) ||
            !Number.isFinite(maxX) ||
            !Number.isFinite(maxY)
        ) {
            return null;
        }

        return {
            x: MathF32.toF32(minX),
            y: MathF32.toF32(minY),
            width: MathF32.sub(maxX, minX),
            height: MathF32.sub(maxY, minY),
        };
    }
}