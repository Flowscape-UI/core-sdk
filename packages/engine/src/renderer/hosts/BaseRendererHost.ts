import type { IScene, LayerBinding } from "../../scene/types";
import type { HostType, IRendererHost } from "./types";
import type { ID } from "../../core/types";
import { FLOAT32_MAX, MathF32 } from "../../core/math";

export abstract class BaseRendererHost implements IRendererHost {
    public readonly type: HostType | null;
    public readonly id: ID;
    private _scene: IScene | null;

    constructor(id: number = -1, type: HostType = null) {
        this.id = MathF32.clamp(id, -1, FLOAT32_MAX);
        this.type = type;
        this._scene = null;
    }

    public abstract getSurface(): HTMLElement;
    // public abstract getRendererNode(): unknown;

    public abstract attach(scene: IScene): void;

    public detach(): void {
        if (!this._scene) {
            return;
        }

        this._onDetach(this._scene);
        this._scene = null;
    }

    public render(): void {
        if (!this._scene) {
            return;
        }

        this._onRender(this._scene);
    }

    public update(): void {
        if (!this._scene) {
            return;
        }

        this._onUpdate(this._scene);
    }

    public destroy(): void {
        if (this._scene) {
            this.detach();
        }

        this._onDestroy();
    }

    protected _onAttachBindings(scene: IScene, callback: (binding: LayerBinding) => void): void {
        if (this._scene) {
            this.detach();
        }

        scene.getLayerRendererBindings().forEach((binding) => {
            const renderer = binding.renderer;

            const typeMatch =
                this.type === null ||
                renderer.type === this.type;

            const idMatch =
                this.id === -1 ||
                renderer.id === this.id;

            if (typeMatch && idMatch) {
                callback(binding);
            }
        });

        this._scene = scene;
        this.update();
    }

    protected abstract _onRender(scene: IScene): void;
    protected abstract _onDetach(scene: IScene): void;
    protected abstract _onUpdate(scene: IScene): void;
    protected abstract _onDestroy(): void;
}
