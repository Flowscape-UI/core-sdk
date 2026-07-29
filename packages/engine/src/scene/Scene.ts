import { Input } from "../input";
import type { ID } from "../core/types";
import type { IRendererLayerBase } from "../renderer/canvas/scene/layers/types";
import type { IRendererHost } from "../renderer/hosts";

import type { IScene, LayerBinding } from "./types";
import type { ILayerBase } from "./layers/base";
import { LayerManager } from "./LayerManager";
import { ManagerRenderHost } from "./ManagerRenderHost";
import { InputManager } from "./InputManager";

export class Scene implements IScene {
    private readonly _layersRenderer: LayerManager;
    public readonly hostManager: ManagerRenderHost;
    public readonly inputManager: InputManager;

    private readonly _layers = new Map<string, ILayerBase>();
    private _isFrameScheduled: boolean = false;

    private _width: number;
    private _height: number;

    constructor(width: number, height: number) {
        this._layersRenderer = new LayerManager();
        this.hostManager = new ManagerRenderHost();
        this.inputManager = new InputManager();

        this._width = width;
        this._height = height;

        Input._initialize();
        Input.onInput(() => {
            this.invalidate();
        });
    }

    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height;
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        this._layers.forEach((layer) => {
            layer.setSize(width, height);
        });

        this._layersRenderer.getAll().forEach((binding) => {
            const layer = this._layers.get(String(binding.layer.id));
            if (!layer || !layer.isEnabled()) {
                return;
            }
            binding.renderer.update();
        });

        this.invalidate();
    }

    public update(): void {
        this.inputManager.update();

        this._layersRenderer.getAll().forEach((binding) => {
            const layer = this._layers.get(String(binding.layer.id));
            if (!layer || !layer.isEnabled()) {
                return;
            }
            binding.renderer.update();
        });

        this.hostManager?.update();
    }

    public render(): void {
        this._layersRenderer.getAll().forEach((binding) => {
            const layer = this._layers.get(String(binding.layer.id));
            if (!layer || !layer.isEnabled()) {
                return;
            }
            binding.renderer.render();
        });

        this.hostManager?.render();
        Input._endFrame();
    }

    public invalidate(): void {
        if (this._isFrameScheduled) {
            return;
        }
        this._isFrameScheduled = true;

        requestAnimationFrame(() => {
            this._isFrameScheduled = false;
            this.update();
            this.render();
        });
    }



    /************************************************************/
    /*                     Layer Management                     */
    /************************************************************/

    public addLayer(layer: ILayerBase): boolean {
        const id = String(layer.id);
        if (this._layers.has(id)) {
            return false;
        }

        layer.setSize(this._width, this._height);
        this._layers.set(id, layer);
        return true;
    }

    public addHost(host: IRendererHost): void {
        const id = Number(host.id);
        if (this.hostManager.getById(id)) {
            throw new Error(`Render host "${id}" already exists.`);
        }

        this.hostManager.add(host);

        try {
            Input._registerSurface(host.getSurface());
            host.attach(this);
        } catch (error) {
            this.hostManager.remove(id);
            throw error;
        }

        this.invalidate();
    }

    public removeHost(id: number): boolean {
        const host = this.hostManager.getById(id);
        if (!host) {
            return false;
        }

        Input._unregisterSurface(host.getSurface());
        host.detach();
        host.destroy();

        this.hostManager.remove(id);
        this.invalidate();
        return true;
    }

    public removeLayer(id: ID): boolean {
        const idString = String(id);
        const layer = this._layers.get(idString);
        if (!layer) {
            return false;
        }

        this.inputManager.getAll().forEach((binding) => {
            if (binding.layer.id !== layer.id) {
                return;
            }

            this.inputManager.remove(binding.controller.id);
        });

        this.unbindLayerRenderer(layer.id);
        layer.destroy();

        this._layers.delete(idString);
        this.invalidate();
        return true;
    }

    public hasLayer(id: ID): boolean {
        return this._layers.has(String(id));
    }

    public getLayerById<TLayer extends ILayerBase = ILayerBase>(id: ID): TLayer | null {
        return (this._layers.get(String(id)) as TLayer | undefined) ?? null;
    }

    public getLayers(): readonly ILayerBase[] {
        return Array.from(this._layers.values());
    }



    /************************************************************/
    /*                       Layer Binds                        */
    /************************************************************/
    public bindLayerRenderer<TLayer extends ILayerBase>(
        layer: TLayer,
        renderer: IRendererLayerBase<TLayer>,
    ): void {
        const id = String(layer.id);
        const registeredLayer = this._layers.get(id);

        if (!registeredLayer) {
            throw new Error(`Layer "${id}" is not registered in Scene.`);
        }
        if (registeredLayer !== layer) {
            throw new Error(
                `Layer "${id}" is registered with a different instance. ` +
                `Use the same layer object that was passed to addLayer().`
            );
        }

        const existing = this._layersRenderer.getById(layer.id);
        if (existing) {
            existing.renderer.detach();
            existing.renderer.destroy();
            this._layersRenderer.remove(layer.id);
        }

        renderer.attach(layer);
        this._layersRenderer.add(registeredLayer, renderer);
        this._reattachHosts();
        this.invalidate();
    }

    public unbindLayerRenderer(id: ID): boolean {
        const binding = this._layersRenderer.getById(id);
        if (!binding) {
            return false;
        }

        binding.renderer.detach();
        binding.renderer.destroy();
        this._layersRenderer.remove(id);
        this._reattachHosts();
        this.invalidate();
        return true;
    }

    public getLayerRendererBindings(): readonly LayerBinding[] {
        return this._layersRenderer.getAll();
    }

    private _reattachHosts(): void {
        for (const host of this.hostManager.getAll()) {
            host.detach();
            host.attach(this);
        }
    }
}
