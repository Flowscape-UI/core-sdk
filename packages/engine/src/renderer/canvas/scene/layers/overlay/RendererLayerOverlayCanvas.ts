import Konva from "konva";
import type { ILayerOverlay } from "../../../../../scene/layers/overlay";

import type { HostType } from "../../../../hosts";

import {
    LayerOverlayFreeRenderersManager,
    LayerOverlayShapeRenderersManager,
    LayerOverlayTransformRenderersManager,
} from "./handles";
import type {
    IRendererLayerOverlay,
} from "./types";


export class RendererLayerOverlayCanvas implements IRendererLayerOverlay {
    public readonly id: number;
    public readonly type: HostType;

    private readonly _layer: Konva.Layer;
    private readonly _root: Konva.Group;
    private _overlay: ILayerOverlay | null = null;

    private readonly _freeRenderersManager: LayerOverlayFreeRenderersManager;
    private readonly _shapeRenderersManager: LayerOverlayShapeRenderersManager;
    private readonly _transformRenderersManager: LayerOverlayTransformRenderersManager;


    constructor() {
        this.id = 2;
        this.type = "canvas";
        this._layer = new Konva.Layer({
            listening: false,
        });
        this._root = new Konva.Group({
            listening: false,
        });

        this._freeRenderersManager = new LayerOverlayFreeRenderersManager();
        this._shapeRenderersManager = new LayerOverlayShapeRenderersManager();
        this._transformRenderersManager = new LayerOverlayTransformRenderersManager();
        this._root.add(this._freeRenderersManager.getRoot());
        this._root.add(this._shapeRenderersManager.getRoot());
        this._root.add(this._transformRenderersManager.getRoot());
        this._layer.add(this._root);
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public getRenderNode(): Konva.Layer {
        return this._layer;
    }

    public attach(target: ILayerOverlay): void {
        this._overlay = target;

        this._freeRenderersManager.attach(target);
        this._shapeRenderersManager.attach(target);
        this._transformRenderersManager.attach(target);
    }

    public detach(): void {
        this._freeRenderersManager.detach();
        this._shapeRenderersManager.detach();
        this._transformRenderersManager.detach();
        this._overlay = null;
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
        this._freeRenderersManager.update();
        this._shapeRenderersManager.update();
        this._transformRenderersManager.update();
    }

    public destroy(): void {
        this.detach();

        this._freeRenderersManager.destroy();
        this._shapeRenderersManager.destroy();
        this._transformRenderersManager.destroy();

        this._root.destroyChildren();
        this._layer.destroy();
    }
}
