import Konva from "konva";

import type { INode } from "../../../../nodes";
import type { INodeCanvasRenderer } from "./types";


const DEBUG_LAYER_NAME = "debug-layer";
const DEBUG_BOUNDS_NAME = "debug-bounds";
const DEBUG_PIVOT_NAME = "debug-pivot";
const DEBUG_PIVOT_ORBIT_NAME = "debug-orbit";

export abstract class RendererCanvasBase<
    TNode extends INode = INode,
    TView extends Konva.Group = Konva.Group
> implements INodeCanvasRenderer<TNode, TView> {
    public abstract create(node: TNode): TView;
    protected static readonly DEBUG_TRANSFORM = true;

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

    protected _updateIdentity(node: TNode, view: Konva.Group): void {
        view.id(String(node.id));
    }

    protected _updateVisibility(node: TNode, view: Konva.Group): void {
        view.visible(node.isVisible());
    }

    protected _updateOpacity(node: TNode, view: Konva.Group): void {
        view.opacity(node.getOpacity());
    }

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

        if (!RendererCanvasBase.DEBUG_TRANSFORM) {
            debugLayer.visible(false);
            return;
        }

        debugLayer.visible(true);

        const boundsShape = this._findOneOrThrow<Konva.Rect>(debugLayer, `.${DEBUG_BOUNDS_NAME}`);
        const pivotShape = this._findOneOrThrow<Konva.Circle>(debugLayer, `.${DEBUG_PIVOT_NAME}`);
        const orbit = this._findOneOrThrow<Konva.Circle>(
            debugLayer,
            `.${DEBUG_PIVOT_ORBIT_NAME}`
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

        debugLayer.moveToTop();
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
        );

        view.add(debugLayer);
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