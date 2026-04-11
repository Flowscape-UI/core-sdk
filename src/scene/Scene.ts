import { Input } from "../input";

import type { IScene } from "./types";
import {
    LayerBackground,
    LayerWorld,
    LayerOverlay,
    LayerUI
} from "./layers";
import { LayerManager } from "./LayerManager";
import { ManagerRenderHost } from "./ManagerRenderHost";
import { InputManager } from "./InputManager";

export class Scene implements IScene {
    public readonly layerBackground: LayerBackground;
    public readonly layerWorld: LayerWorld;
    public readonly layerOverlay: LayerOverlay;
    public readonly layerUI: LayerUI;

    public readonly layerManager: LayerManager;
    public readonly hostManager: ManagerRenderHost;
    public readonly inputManager: InputManager;

    private _isFrameScheduled: boolean = false;

    private _width: number;
    private _height: number;

    constructor(width: number, height: number) {
        this.layerBackground = new LayerBackground(width, height);
        this.layerWorld = new LayerWorld(width, height);
        this.layerOverlay = new LayerOverlay(width, height);
        this.layerUI = new LayerUI(this.layerWorld, width, height);

        this.layerManager = new LayerManager();
        this.hostManager = new ManagerRenderHost(this);
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
        this.layerManager.getAll().forEach((binding) => {
            binding.layer.setSize(width, height);
            binding.renderer.update();
        });

        this.invalidate();
    }

    public update(): void {
        this.inputManager.update();
        this.layerManager.getAll().forEach((binding) => {
            binding.renderer.update();
        });
        this.hostManager?.update();
    }

    public render(): void {
        this.layerManager.getAll().forEach((binding) => {
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
}