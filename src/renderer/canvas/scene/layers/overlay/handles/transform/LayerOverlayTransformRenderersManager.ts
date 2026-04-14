import Konva from "konva";
import type { ICamera } from "../../../../../../../core/camera";
import type {
    IHandleTransformPivot,
    IHandleTransformResizeEdge,
    IHandleTransformResizeVertex,
    IHandleTransformRotate,
    ILayerOverlay,
} from "../../../../../../../scene/layers/overlay";
import { RendererHandleTarget } from "../base";
import { RendererHandleTransformPivotCanvas } from "./pivot";
import {
    RendererHandleTransformResizeEdgeCanvas,
    RendererHandleTransformResizeVertexCanvas,
} from "./resize";
import { RendererHandleTransformRotateCanvas } from "./rotate";

const RESIZE_EDGE_IDS = [
    "transform-resize-n",
    "transform-resize-e",
    "transform-resize-s",
    "transform-resize-w",
] as const;

const RESIZE_VERTEX_IDS = [
    "transform-resize-ne",
    "transform-resize-nw",
    "transform-resize-se",
    "transform-resize-sw",
] as const;

const ROTATE_IDS = [
    "transform-rotate-nw",
    "transform-rotate-ne",
    "transform-rotate-se",
    "transform-rotate-sw",
] as const;

export class LayerOverlayTransformRenderersManager {
    private readonly _root: Konva.Group;
    private _overlay: ILayerOverlay | null;
    private _camera: ICamera | null;

    private readonly _pivotRenderer: RendererHandleTransformPivotCanvas;
    private readonly _resizeEdgeRenderers: RendererHandleTransformResizeEdgeCanvas[];
    private readonly _resizeVertexRenderers: RendererHandleTransformResizeVertexCanvas[];
    private readonly _rotateRenderers: RendererHandleTransformRotateCanvas[];

    constructor() {
        this._root = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._overlay = null;
        this._camera = null;

        this._pivotRenderer = new RendererHandleTransformPivotCanvas();
        this._resizeEdgeRenderers = [];
        this._resizeVertexRenderers = [];
        this._rotateRenderers = [];

        this._root.add(this._pivotRenderer.getRoot());
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    public attach(overlay: ILayerOverlay): void {
        this._overlay = overlay;
        this._camera = overlay.layerWorld.camera;

        const pivotHandle = overlay.transformHandleManager.getById("transform-pivot") as IHandleTransformPivot | null;

        if (pivotHandle) {
            this._pivotRenderer.attach(
                new RendererHandleTarget(pivotHandle, this._camera)
            );
            this._pivotRenderer.getRoot().setAttr("overlayId", "transform-pivot");
            this._pivotRenderer.getRoot().setAttr("overlayZ", pivotHandle.getZIndex());
        } else {
            this._pivotRenderer.detach();
            this._pivotRenderer.getRoot().setAttr("overlayId", "transform-pivot");
            this._pivotRenderer.getRoot().setAttr("overlayZ", -1);
        }

        this._rebuildResizeRenderers();
        this._rebuildRotateRenderers();
        this._syncRenderOrder();
    }

    public detach(): void {
        this._pivotRenderer.detach();

        for (const renderer of this._resizeEdgeRenderers) {
            renderer.detach();
        }

        for (const renderer of this._resizeVertexRenderers) {
            renderer.detach();
        }

        for (const renderer of this._rotateRenderers) {
            renderer.detach();
        }

        this._overlay = null;
        this._camera = null;
    }

    public update(): void {
        this._pivotRenderer.update();

        for (const renderer of this._resizeEdgeRenderers) {
            renderer.update();
        }

        for (const renderer of this._resizeVertexRenderers) {
            renderer.update();
        }

        for (const renderer of this._rotateRenderers) {
            renderer.update();
        }

        this._syncOverlayZFromHandles();
        this._syncRenderOrder();
    }

    public destroy(): void {
        this.detach();

        this._pivotRenderer.destroy();
        this._destroyResizeRenderers();
        this._destroyRotateRenderers();
        this._root.destroy();
    }

    private _rebuildResizeRenderers(): void {
        this._destroyResizeRenderers();

        if (!this._overlay || !this._camera) {
            return;
        }

        for (const id of RESIZE_EDGE_IDS) {
            const handle = this._overlay.transformHandleManager.getById(id);

            if (!handle) {
                continue;
            }

            const renderer = new RendererHandleTransformResizeEdgeCanvas();
            renderer.attach(
                new RendererHandleTarget(
                    handle as IHandleTransformResizeEdge,
                    this._camera,
                )
            );

            this._resizeEdgeRenderers.push(renderer);
            this._root.add(renderer.getRoot());
            renderer.getRoot().setAttr("overlayId", id);
            renderer.getRoot().setAttr("overlayZ", (handle as IHandleTransformResizeEdge).getZIndex());
        }

        for (const id of RESIZE_VERTEX_IDS) {
            const handle = this._overlay.transformHandleManager.getById(id);

            if (!handle) {
                continue;
            }

            const renderer = new RendererHandleTransformResizeVertexCanvas();
            renderer.attach(
                new RendererHandleTarget(
                    handle as IHandleTransformResizeVertex,
                    this._camera,
                )
            );

            this._resizeVertexRenderers.push(renderer);
            this._root.add(renderer.getRoot());
            renderer.getRoot().setAttr("overlayId", id);
            renderer.getRoot().setAttr("overlayZ", (handle as IHandleTransformResizeVertex).getZIndex());
        }
    }

    private _destroyResizeRenderers(): void {
        for (const renderer of this._resizeEdgeRenderers) {
            renderer.destroy();
        }
        this._resizeEdgeRenderers.length = 0;

        for (const renderer of this._resizeVertexRenderers) {
            renderer.destroy();
        }
        this._resizeVertexRenderers.length = 0;
    }

    private _rebuildRotateRenderers(): void {
        this._destroyRotateRenderers();

        if (!this._overlay || !this._camera) {
            return;
        }

        for (const id of ROTATE_IDS) {
            const handle = this._overlay.transformHandleManager.getById(id);

            if (!handle) {
                continue;
            }

            const renderer = new RendererHandleTransformRotateCanvas();
            renderer.attach(
                new RendererHandleTarget(
                    handle as IHandleTransformRotate,
                    this._camera,
                )
            );

            this._rotateRenderers.push(renderer);
            this._root.add(renderer.getRoot());
            renderer.getRoot().setAttr("overlayId", id);
            renderer.getRoot().setAttr("overlayZ", (handle as IHandleTransformRotate).getZIndex());
        }
    }

    private _destroyRotateRenderers(): void {
        for (const renderer of this._rotateRenderers) {
            renderer.destroy();
        }
        this._rotateRenderers.length = 0;
    }

    private _syncRenderOrder(): void {
        const sorted = Array.from(this._root.getChildren()).sort((a, b) => {
                // @ts-ignore 
                const aZ = Number(a.getAttr("overlayZ") ?? -1);
                // @ts-ignore
                const bZ = Number(b.getAttr("overlayZ") ?? -1);
                return aZ - bZ;
            });

        for (let i = 0; i < sorted.length; i += 1) {
            sorted[i]!.zIndex(i);
        }
    }

    private _syncOverlayZFromHandles(): void {
        if (!this._overlay) {
            return;
        }

        for (const node of Array.from(this._root.getChildren())) {
            // @ts-ignore
            const id = node.getAttr("overlayId");

            if (typeof id !== "string") {
                continue;
            }

            const handle = this._overlay.transformHandleManager.getById(id);
            // @ts-ignore
            node.setAttr("overlayZ", handle ? 0 : -1);
        }
    }
}
