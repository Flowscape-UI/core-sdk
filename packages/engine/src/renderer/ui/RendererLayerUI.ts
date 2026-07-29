import type { ID } from "../../core/types";
import type { ILayerUI, IModuleBaseLayerUI } from "../../scene/layers";
import type { HostType } from "../hosts";
import type { IRendererLayerUI } from "./types";

export class RendererLayerUI implements IRendererLayerUI {
    public readonly type: HostType;
    public readonly id: ID;
    private readonly _container: HTMLElement;

    private _layer: ILayerUI | null = null;
    private _root: HTMLDivElement | null = null;

    constructor(container: HTMLElement) {
        this.id = 3;
        this.type = "html";
        this._container = container;
    }

    public getRenderNode(): HTMLDivElement | null {
        return this._root;
    }

    public attach(layer: ILayerUI): void {
        if (this._layer === layer) {
            return;
        }

        this.detach();

        this._layer = layer;

        const root = document.createElement("div");
        root.className = "flowscape-layer-ui";
        root.style.position = "absolute";
        root.style.inset = "0";
        root.style.pointerEvents = "none";
        root.style.overflow = "hidden";

        this._root = root;
        this._container.appendChild(root);

        root.addEventListener("wheel", (e) => {
            e.preventDefault();
        }, { passive: false });

        for (const module of this._layer.getManager().getAll()) {
            module.attach(root);
        }
    }

    public detach(): void {
        if(!this._layer) {
            return;
        }
        for (const module of this._layer.getManager().getAll()) {
            module.detach();
        }
        if (this._root) {
            this._root.remove();
        }
        this._root = null;
        this._layer = null;

    }

    public update(): void {
        if (!this._layer || !this._root) {
            return;
        }

        const { width, height } = this._layer.getSize();

        this._root.style.width = `${width}px`;
        this._root.style.height = `${height}px`;
        this._root.style.display = this._layer.isEnabled() ? "block" : "none";

        for (const module of this._getModules()) {
            if (!module.isEnabled()) {
                continue;
            }

            module.update();
        }
    }

    public render(): void {
        // DOM layer does not require explicit render
    }

    public destroy(): void {
        this.detach();
    }

    public getRoot(): HTMLDivElement | null {
        return this._root;
    }

    private _getModules(): IModuleBaseLayerUI[] {
        if (!this._layer) {
            return [];
        }

        return this._layer.getManager().getAll();
    }
}