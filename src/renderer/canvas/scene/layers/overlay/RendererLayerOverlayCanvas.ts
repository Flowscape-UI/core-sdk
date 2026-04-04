import Konva from "konva";
import type { ICamera } from "../../../../../core/camera";

import {
    LayerOverlay,
    HandleTransform,
    HandleTransformPivot,
    HandleTransformResize,
    HandleTransformRotate,
    type IHandleHover,
    type IHandleTransform,
    type IHandleTransformPivot,
    type IHandleTransformResize,
    type IHandleTransformRotate,
    type IHandleCornerRadius,
    HandleCornerRadius
} from "../../../../../scene/layers/overlay";

import type {
    IRendererLayerOverlay,
    IRendererLayerOverlayTarget
} from "./types";
import {
    RendererHandleHoverCanvas,
    RendererHandleHoverTarget,

    RendererHandleTransformCanvas,
    RendererHandleTransformTarget,
    
    RendererHandleTransformPivotCanvas,
    RendererHandleTransformPivotTarget,
    
    RendererHandleTransformResizeCanvas,
    RendererHandleTransformResizeTarget,
    
    RendererHandleTransformRotateCanvas,
    RendererHandleTransformRotateTarget,

    RendererHandleCornerRadiusCanvas,
    RendererHandleCornerRadiusTarget,
} from "./handles";


export class RendererLayerOverlayCanvas implements IRendererLayerOverlay {
    private readonly _layer: Konva.Layer;
    private readonly _root: Konva.Group;
    private _overlay: LayerOverlay | null = null;
    private _camera: ICamera | null = null;

    private readonly _hoverRenderer: RendererHandleHoverCanvas;
    private readonly _handleTransformRenderer: RendererHandleTransformCanvas;
    private readonly _handleTransformResizeRenderer: RendererHandleTransformResizeCanvas;
    private readonly _handleTransformRotateRenderer: RendererHandleTransformRotateCanvas;
    private readonly _handleTransformPivotRenderer: RendererHandleTransformPivotCanvas;
    private readonly _handleCornerRadiusRenderer: RendererHandleCornerRadiusCanvas;


    constructor() {
        this._layer = new Konva.Layer({
            listening: false,
        });
        this._root = new Konva.Group({
            listening: false,
        });

        this._hoverRenderer = new RendererHandleHoverCanvas();
        this._handleTransformRenderer = new RendererHandleTransformCanvas();
        this._handleTransformResizeRenderer = new RendererHandleTransformResizeCanvas();
        this._handleTransformRotateRenderer = new RendererHandleTransformRotateCanvas();
        this._handleTransformPivotRenderer = new RendererHandleTransformPivotCanvas();
        this._handleCornerRadiusRenderer = new RendererHandleCornerRadiusCanvas();
        this._root.add(this._hoverRenderer.getRoot());
        this._root.add(this._handleTransformRotateRenderer.getRoot());
        this._root.add(this._handleTransformRenderer.getRoot());
        this._root.add(this._handleTransformResizeRenderer.getRoot());
        this._root.add(this._handleTransformPivotRenderer.getRoot());
        this._root.add(this._handleCornerRadiusRenderer.getRoot());
        this._layer.add(this._root);
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public attach(target: IRendererLayerOverlayTarget): void {
        this._overlay = target.getOverlay() as LayerOverlay;
        this._camera = target.getCamera();

        const hoverHandle = this._overlay.getHandlerManager().get("hover");
        if (!hoverHandle) {
            throw new Error("Hover handle is not registered.");
        }

        const hoverTarget = new RendererHandleHoverTarget(
            hoverHandle as IHandleHover,
            this._camera
        );

        this._hoverRenderer.attach(hoverTarget);

        // Transform
        const transformHandle = this._overlay.getHandlerManager().get(HandleTransform.TYPE);

        this._handleTransformRenderer.attach(
            new RendererHandleTransformTarget(
                transformHandle as IHandleTransform,
                this._camera
            )
        );

        // resize
        const resizeHandle = this._overlay.getHandlerManager().get(HandleTransformResize.TYPE);

        this._handleTransformResizeRenderer.attach(
            new RendererHandleTransformResizeTarget(
                resizeHandle as IHandleTransformResize,
                this._camera
            )
        );

        // rotate
        const rotateHandle = this._overlay.getHandlerManager().get(HandleTransformRotate.TYPE);

        this._handleTransformRotateRenderer.attach(
            new RendererHandleTransformRotateTarget(
                rotateHandle as IHandleTransformRotate,
                this._camera
            )
        );

        // pivot
        const pivotHandle = this._overlay.getHandlerManager().get(HandleTransformPivot.TYPE);

        this._handleTransformPivotRenderer.attach(
            new RendererHandleTransformPivotTarget(
                pivotHandle as IHandleTransformPivot,
                this._camera
            )
        );

        // corner radius
        const cornerRadiusHandle = this._overlay.getHandlerManager().get(HandleCornerRadius.TYPE);

        this._handleCornerRadiusRenderer.attach(
            new RendererHandleCornerRadiusTarget(
                cornerRadiusHandle as IHandleCornerRadius,
                this._camera
            )
        );
    }

    public detach(): void {
        this._hoverRenderer.detach();
        this._handleTransformRenderer.detach();
        this._handleTransformResizeRenderer.detach();
        this._handleTransformRotateRenderer.detach();
        this._handleTransformPivotRenderer.detach();
        this._handleCornerRadiusRenderer.detach();
        this._overlay = null;
        this._camera = null;
    }

    public render(): void {
        this._layer.draw();
    }

    public update(): void {
        if (!this._overlay || !this._overlay.isEnabled()) {
            return;
        }

        const width = this._overlay.getWidth();
        const height = this._overlay.getHeight();

        this._layer.size({ width, height });
        this._hoverRenderer.update();
        this._handleTransformRenderer.update();
        this._handleTransformResizeRenderer.update();
        this._handleTransformRotateRenderer.update();
        this._handleTransformPivotRenderer.update();
        this._handleCornerRadiusRenderer.update();
    }

    public destroy(): void {
        this.detach();

        this._hoverRenderer.destroy();
        this._handleTransformRenderer.destroy();
        this._handleTransformResizeRenderer.destroy();
        this._handleTransformRotateRenderer.destroy();
        this._handleTransformPivotRenderer.destroy();
        this._handleCornerRadiusRenderer.destroy();

        this._root.destroyChildren();
        this._layer.destroy();
    }
}