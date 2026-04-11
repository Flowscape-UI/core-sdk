import Konva from "konva";
import type { IRendererHandleHover, IRendererHandleHoverTarget } from "./types";
import { NodeType, type IShapeBase } from "../../../../../../../nodes";
import type { ICamera } from "../../../../../../../core/camera";
import type { IHandleHover } from "../../../../../../../scene/layers";


export class RendererHandleHoverCanvas implements IRendererHandleHover {
    private static readonly STROKE = "#4DA3FF";
    private static readonly STROKE_WIDTH = 3;

    private readonly _root: Konva.Group;

    private _handle: IHandleHover | null = null;
    private _camera: ICamera | null = null;

    private _view: Konva.Shape | null = null;
    private _nodeId: string | null = null;
    private _nodeType: NodeType | null = null;

    constructor() {
        this._root = new Konva.Group({
            listening: false,
        });
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    /*****************************************************************/
    /*                         IBindableRenderer                     */
    /*****************************************************************/

    public attach(target: IRendererHandleHoverTarget): void {
        this._handle = target.getHandle();
        this._camera = target.getCamera();
    }

    public detach(): void {
        this._handle = null;
        this._camera = null;
        this._destroyView();
    }

    public update(): void {
        if (
            !this._handle ||
            !this._camera ||
            !this._handle.isEnabled() ||
            !this._handle.hasNode()
        ) {
            this._destroyView();
            return;
        }

        const node = this._handle.getNode();
        if (!node) {
            this._destroyView();
            return;
        }

        const typeChanged = this._nodeType !== node.type;
        const idChanged = this._nodeId !== node.id;

        if (!this._view || typeChanged || idChanged) {
            this._recreateView(node);
        }

        if (!this._view) {
            return;
        }

        this._updateView(node, this._view);
    }

    public render(): void {
        // Overlay layer will be drawn by layer renderer
    }

    public destroy(): void {
        this.detach();
        this._root.destroy();
    }

    /*****************************************************************/
    /*                            Private                            */
    /*****************************************************************/

    private _recreateView(node: IShapeBase): void {
        this._destroyView();

        const view = this._createView(node);
        if (!view) {
            return;
        }

        this._view = view;
        this._nodeId = node.id.toString();
        this._nodeType = node.type;

        this._root.add(view);
    }

    private _destroyView(): void {
        if (this._view) {
            this._view.destroy();
        }

        this._view = null;
        this._nodeId = null;
        this._nodeType = null;
    }

    private _createView(node: IShapeBase): Konva.Shape | null {
        switch (node.type) {
            case NodeType.Rect:
            case NodeType.Image:
            case NodeType.Video:
            case NodeType.Text:
                return new Konva.Rect({
                    fillEnabled: false,
                    stroke: RendererHandleHoverCanvas.STROKE,
                    strokeWidth: RendererHandleHoverCanvas.STROKE_WIDTH,
                    listening: false,
                });

            case NodeType.Ellipse:
                // @ts-ignore
                return new Konva.Ellipse({
                    fillEnabled: false,
                    stroke: RendererHandleHoverCanvas.STROKE,
                    strokeWidth: RendererHandleHoverCanvas.STROKE_WIDTH,
                    listening: false,
                });

            case NodeType.Line:
            case NodeType.Polygon:
            case NodeType.Star:
            case NodeType.Path:
                return new Konva.Line({
                    closed: true,
                    fillEnabled: false,
                    stroke: RendererHandleHoverCanvas.STROKE,
                    strokeWidth: RendererHandleHoverCanvas.STROKE_WIDTH,
                    listening: false,
                });

            default:
                return null;
        }
    }

    private _updateView(node: IShapeBase, view: Konva.Shape): void {
        switch (node.type) {
            case NodeType.Rect:
            case NodeType.Image:
            case NodeType.Video:
            case NodeType.Text:
                this._updateRectLike(node, view as Konva.Rect);
                return;

            case NodeType.Ellipse:
                this._updateEllipse(node, view as Konva.Ellipse);
                return;

            case NodeType.Line:
            case NodeType.Polygon:
            case NodeType.Star:
            case NodeType.Path:
                this._updatePolyLike(node, view as Konva.Line);
                return;
        }
    }

    private _updateRectLike(node: IShapeBase, view: Konva.Rect): void {
        const corners = this._toScreenPoints(node.getWorldViewCorners());

        const width = Math.hypot(
            corners[1]!.x - corners[0]!.x,
            corners[1]!.y - corners[0]!.y
        );

        const height = Math.hypot(
            corners[2]!.x - corners[1]!.x,
            corners[2]!.y - corners[1]!.y
        );

        const centerX = (corners[0]!.x + corners[2]!.x) / 2;
        const centerY = (corners[0]!.y + corners[2]!.y) / 2;

        const rotation = Math.atan2(
            corners[1]!.y - corners[0]!.y,
            corners[1]!.x - corners[0]!.x
        ) * 180 / Math.PI;

        view.setAttrs({
            x: centerX,
            y: centerY,
            width,
            height,
            offsetX: width / 2,
            offsetY: height / 2,
            rotation,
            visible: true,
        });
    }

    private _updateEllipse(node: IShapeBase, view: Konva.Ellipse): void {
        const corners = this._toScreenPoints(node.getWorldViewCorners());

        const width = Math.hypot(
            corners[1]!.x - corners[0]!.x,
            corners[1]!.y - corners[0]!.y
        );

        const height = Math.hypot(
            corners[2]!.x - corners[1]!.x,
            corners[2]!.y - corners[1]!.y
        );

        const centerX = (corners[0]!.x + corners[2]!.x) / 2;
        const centerY = (corners[0]!.y + corners[2]!.y) / 2;

        const rotation = Math.atan2(
            corners[1]!.y - corners[0]!.y,
            corners[1]!.x - corners[0]!.x
        ) * 180 / Math.PI;

        view.setAttrs({
            x: centerX,
            y: centerY,
            radiusX: width / 2,
            radiusY: height / 2,
            rotation,
            visible: true,
        });
    }

    private _updatePolyLike(node: IShapeBase, view: Konva.Line): void {
        const corners = this._toScreenPoints(node.getWorldViewCorners());

        view.points([
            corners[0]!.x, corners[0]!.y,
            corners[1]!.x, corners[1]!.y,
            corners[2]!.x, corners[2]!.y,
            corners[3]!.x, corners[3]!.y,
        ]);

        view.visible(true);
    }

    private _toScreenPoint(point: { x: number; y: number }): { x: number; y: number } {
        if (!this._camera) {
            return point;
        }

        return this._camera.worldToScreen(point);
    }

    private _toScreenPoints(
        points: readonly { x: number; y: number }[]
    ): { x: number; y: number }[] {
        return points.map((point) => this._toScreenPoint(point));
    }
}