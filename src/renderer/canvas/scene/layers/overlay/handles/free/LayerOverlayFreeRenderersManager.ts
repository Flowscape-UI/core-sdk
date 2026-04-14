import Konva from "konva";
import type { ICamera } from "../../../../../../../core/camera";
import type { ID } from "../../../../../../../core/types";
import type { IHandleBase, ILayerOverlay } from "../../../../../../../scene/layers/overlay";
import { RendererHandleTarget } from "../base";
import type { IRendererHandleBase } from "../base/types";

export class LayerOverlayFreeRenderersManager {
    private readonly _root: Konva.Group;
    private readonly _renderers: Map<ID, IRendererHandleBase<IHandleBase>>;
    private _overlay: ILayerOverlay | null;
    private _camera: ICamera | null;

    constructor() {
        this._root = new Konva.Group({
            listening: false,
            visible: true,
        });
        this._renderers = new Map();
        this._overlay = null;
        this._camera = null;
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    public add(id: ID, renderer: IRendererHandleBase<IHandleBase>): void {
        if (this._renderers.has(id)) {
            throw new Error(`Overlay free renderer with id "${id}" is already added.`);
        }

        this._renderers.set(id, renderer);
        this._root.add(renderer.getRoot());
        this._attachRenderer(id, renderer);
    }

    public getById(id: ID): IRendererHandleBase<IHandleBase> | null {
        return this._renderers.get(id) ?? null;
    }

    public getAll(): IRendererHandleBase<IHandleBase>[] {
        return [...this._renderers.values()];
    }

    public remove(id: ID): boolean {
        const renderer = this._renderers.get(id);

        if (!renderer) {
            return false;
        }

        renderer.destroy();
        return this._renderers.delete(id);
    }

    public attach(overlay: ILayerOverlay): void {
        this._overlay = overlay;
        this._camera = overlay.layerWorld.camera;

        for (const [id, renderer] of this._renderers) {
            this._attachRenderer(id, renderer);
        }
    }

    public detach(): void {
        for (const renderer of this._renderers.values()) {
            renderer.detach();
        }

        this._overlay = null;
        this._camera = null;
    }

    public update(): void {
        for (const renderer of this._renderers.values()) {
            renderer.update();
        }
    }

    public destroy(): void {
        this.detach();

        for (const renderer of this._renderers.values()) {
            renderer.destroy();
        }

        this._renderers.clear();
        this._root.destroy();
    }

    private _attachRenderer(id: ID, renderer: IRendererHandleBase<IHandleBase>): void {
        if (!this._overlay || !this._camera) {
            return;
        }

        const handle = this._overlay.freeHandleManager.getById(id) as IHandleBase | null;

        if (!handle) {
            renderer.detach();
            return;
        }

        renderer.attach(
            new RendererHandleTarget(handle, this._camera)
        );
    }
}
