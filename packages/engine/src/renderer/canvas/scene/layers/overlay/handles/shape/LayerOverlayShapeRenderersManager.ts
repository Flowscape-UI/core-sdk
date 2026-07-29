import Konva from "konva";
import type { ICamera } from "../../../../../../../core/camera";
import type {
    IHandleCornerRadius,
    IHandleFocus,
    IHandleHover,
    ILayerOverlay,
} from "../../../../../../../scene/layers/overlay";
import { RendererHandleTarget } from "../base";
import { RendererHandleCornerRadiusCanvas } from "./corner-radius";
import { RendererHandleFocusCanvas } from "./focus";
import { RendererHandleHoverCanvas } from "./hover";

const CORNER_RADIUS_IDS = [
    "corner-radius-tl",
    "corner-radius-tr",
    "corner-radius-br",
    "corner-radius-bl",
] as const;

export class LayerOverlayShapeRenderersManager {
    private readonly _root: Konva.Group;
    private _overlay: ILayerOverlay | null;
    private _camera: ICamera | null;

    private readonly _hoverRenderer: RendererHandleHoverCanvas;
    private readonly _focusRenderer: RendererHandleFocusCanvas;
    private readonly _cornerRadiusRenderers: RendererHandleCornerRadiusCanvas[];

    constructor() {
        this._root = new Konva.Group({
            listening: false,
            visible: true,
        });

        this._overlay = null;
        this._camera = null;

        this._hoverRenderer = new RendererHandleHoverCanvas();
        this._focusRenderer = new RendererHandleFocusCanvas();
        this._cornerRadiusRenderers = [];

        this._root.add(this._hoverRenderer.getRoot());
        this._root.add(this._focusRenderer.getRoot());
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    public attach(overlay: ILayerOverlay): void {
        this._overlay = overlay;
        this._camera = overlay.layerWorld.camera;

        const hoverHandle = overlay.shapeHandleManager.getById("hover") as IHandleHover | null;
        if (hoverHandle) {
            this._hoverRenderer.attach(
                new RendererHandleTarget(hoverHandle, this._camera)
            );
        } else {
            this._hoverRenderer.detach();
        }

        const focusHandle = overlay.shapeHandleManager.getById("focus") as IHandleFocus | null;
        if (focusHandle) {
            this._focusRenderer.attach(
                new RendererHandleTarget(focusHandle, this._camera)
            );
        } else {
            this._focusRenderer.detach();
        }

        this._rebuildCornerRadiusRenderers();
    }

    public detach(): void {
        this._hoverRenderer.detach();
        this._focusRenderer.detach();

        for (const renderer of this._cornerRadiusRenderers) {
            renderer.detach();
        }

        this._overlay = null;
        this._camera = null;
    }

    public update(): void {
        this._hoverRenderer.update();
        this._focusRenderer.update();

        for (const renderer of this._cornerRadiusRenderers) {
            renderer.update();
        }
    }

    public destroy(): void {
        this.detach();

        this._hoverRenderer.destroy();
        this._focusRenderer.destroy();
        this._destroyCornerRadiusRenderers();
        this._root.destroy();
    }

    private _rebuildCornerRadiusRenderers(): void {
        this._destroyCornerRadiusRenderers();

        if (!this._overlay || !this._camera) {
            return;
        }

        for (const id of CORNER_RADIUS_IDS) {
            const handle = this._overlay.shapeHandleManager.getById(id);

            if (!handle) {
                continue;
            }

            const renderer = new RendererHandleCornerRadiusCanvas();
            renderer.attach(
                new RendererHandleTarget(
                    handle as IHandleCornerRadius,
                    this._camera,
                )
            );

            this._cornerRadiusRenderers.push(renderer);
            this._root.add(renderer.getRoot());
        }
    }

    private _destroyCornerRadiusRenderers(): void {
        for (const renderer of this._cornerRadiusRenderers) {
            renderer.destroy();
        }

        this._cornerRadiusRenderers.length = 0;
    }
}
