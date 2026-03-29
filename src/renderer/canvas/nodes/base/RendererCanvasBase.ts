import Konva from "konva";

import type { IShapeBase } from "../../../../nodes";
import type { IRendererNodeCanvas } from "./types";


const DEBUG_LAYER_NAME = "debug-layer";
const DEBUG_BOUNDS_NAME = "debug-bounds";
const DEBUG_PIVOT_NAME = "debug-pivot";
const DEBUG_PIVOT_ORBIT_NAME = "debug-orbit";

const DEBUG_AABB_NAME = "debug-aabb";
const DEBUG_WORLD_LAYER_NAME = "debug-world-layer";
const DEBUG_VIEW_BOUNDS_NAME = "debug-view-bounds";

export abstract class RendererCanvasBase<
    TNode extends IShapeBase = IShapeBase,
    TView extends Konva.Group = Konva.Group
> implements IRendererNodeCanvas<TNode, TView> {
    public abstract create(node: TNode): TView;
    protected static readonly DEBUG_TRANSFORM = false;

    public update(node: TNode, view: TView): void {
        this._updateIdentity(node, view);
        this._updateVisibility(node, view);
        this._updateOpacity(node, view);
        this._updateTransform(node, view);
        this._updateDebug(node, view);
        this.onUpdate(node, view);
    }

    public destroy?(node: TNode, view: TView): void;

    protected abstract onUpdate(node: TNode, view: TView): void;

    /*****************************************************************/
    /*                            Common                             */
    /*****************************************************************/

    protected _updateIdentity(node: TNode, view: Konva.Group): void {
        view.id(String(node.id));
    }

    protected _updateVisibility(node: TNode, view: Konva.Group): void {
        view.visible(node.isVisible());
    }

    protected _updateOpacity(node: TNode, view: Konva.Group): void {
        view.opacity(node.getOpacity());
    }



    /*****************************************************************/
    /*                           Transform                           */
    /*****************************************************************/
    protected _updateTransform(node: TNode, view: Konva.Group): void {
        const position = node.getPosition();
        const scale = node.getScale();
        const pivot = node.getPivot();
        const bounds = node.getLocalOBB();

        view.x(position.x);
        view.y(position.y);

        view.rotation(node.getRotation());

        view.scaleX(scale.x);
        view.scaleY(scale.y);

        view.offsetX(bounds.x + bounds.width * pivot.x);
        view.offsetY(bounds.y + bounds.height * pivot.y);
    }

    protected _findOneOrThrow<T extends Konva.Node>(
        view: Konva.Container,
        selector: string
    ): T {
        const child = view.findOne<T>(selector);

        if (!child) {
            throw new Error(`Konva node "${selector}" was not found.`);
        }

        return child;
    }



    // Debug
    protected _updateDebug(node: TNode, view: Konva.Group): void {
        const debugLayer = this._ensureDebugLayer(view);
        const worldDebugLayer = this._ensureWorldDebugLayer(node, view);

        if (!RendererCanvasBase.DEBUG_TRANSFORM) {
            debugLayer.visible(false);
            worldDebugLayer.visible(false);
            return;
        }

        debugLayer.visible(true);
        worldDebugLayer.visible(true);

        const boundsShape = this._findOneOrThrow<Konva.Rect>(debugLayer, `.${DEBUG_BOUNDS_NAME}`);
        const pivotShape = this._findOneOrThrow<Konva.Circle>(debugLayer, `.${DEBUG_PIVOT_NAME}`);
        const orbit = this._findOneOrThrow<Konva.Circle>(
            debugLayer,
            `.${DEBUG_PIVOT_ORBIT_NAME}`
        );

        const aabbShape = this._findOneOrThrow<Konva.Rect>(
            worldDebugLayer,
            `.${DEBUG_AABB_NAME}`
        );

        const bounds = node.getLocalOBB();
        const pivot = node.getPivot();

        const pivotX = bounds.x + bounds.width * pivot.x;
        const pivotY = bounds.y + bounds.height * pivot.y;

        boundsShape.setAttrs({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        });

        pivotShape.position({
            x: pivotX,
            y: pivotY,
        });

        const radius = this._getPivotOrbitRadius(bounds, pivotX, pivotY);

        orbit.position({
            x: pivotX,
            y: pivotY,
        });

        orbit.radius(radius);

        const aabb = node.getWorldAABB();

        aabbShape.setAttrs({
            x: aabb.x,
            y: aabb.y,
            width: aabb.width,
            height: aabb.height,
        });

        const viewBoundsShape = this._findOneOrThrow<Konva.Rect>(
            debugLayer,
            `.${DEBUG_VIEW_BOUNDS_NAME}`
        );

        const viewBounds = node.getLocalViewOBB();

        viewBoundsShape.setAttrs({
            x: viewBounds.x,
            y: viewBounds.y,
            width: viewBounds.width,
            height: viewBounds.height,
        });

        debugLayer.moveToTop();
        worldDebugLayer.moveToTop();
    }

    protected _ensureDebugLayer(view: Konva.Group): Konva.Group {
        let debugLayer = view.findOne<Konva.Group>(`.${DEBUG_LAYER_NAME}`);

        if (debugLayer) {
            return debugLayer;
        }

        debugLayer = new Konva.Group({
            name: DEBUG_LAYER_NAME,
            listening: false,
            visible: false,
        });

        debugLayer.add(
            new Konva.Rect({
                name: DEBUG_BOUNDS_NAME,
                listening: false,
                stroke: "#00A3FF",
                strokeWidth: 1,
                dash: [4, 4],
            }),
            new Konva.Circle({
                name: DEBUG_PIVOT_NAME,
                listening: false,
                radius: 4,
                fill: "#34C759",
            }),
            new Konva.Circle({
                name: DEBUG_PIVOT_ORBIT_NAME,
                listening: false,
                stroke: "#FFD60A",
                strokeWidth: 1,
                dash: [4, 4],
            }),
            new Konva.Rect({
                name: DEBUG_VIEW_BOUNDS_NAME,
                listening: false,
                stroke: "#30D158",
                strokeWidth: 1,
                dash: [4, 4],
            }),
        );

        view.add(debugLayer);
        return debugLayer;
    }

    protected _ensureWorldDebugLayer(node: TNode, view: Konva.Group): Konva.Group {
        const parent = view.getParent();

        if (!parent) {
            throw new Error("View has no parent. Cannot create world debug layer.");
        }

        const debugLayerName = `${DEBUG_WORLD_LAYER_NAME}-${node.id}`;

        let debugLayer = parent.findOne<Konva.Group>(`.${debugLayerName}`);

        if (debugLayer) {
            return debugLayer;
        }

        debugLayer = new Konva.Group({
            name: debugLayerName,
            listening: false,
            visible: false,
        });

        debugLayer.add(
            new Konva.Rect({
                name: DEBUG_AABB_NAME,
                listening: false,
                stroke: "#FF3B30",
                strokeWidth: 1,
                dash: [6, 4],
            }),
        );

        parent.add(debugLayer);
        return debugLayer;
    }

    private _getPivotOrbitRadius(bounds: { x: number; y: number; width: number; height: number }, pivotX: number, pivotY: number): number {
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height },
        ];

        let radius = 0;

        for (const corner of corners) {
            const dx = corner.x - pivotX;
            const dy = corner.y - pivotY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > radius) {
                radius = distance;
            }
        }

        return radius;
    }
}