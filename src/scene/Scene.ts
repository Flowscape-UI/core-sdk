import type { IScene } from "./types";
import { LayerBackground } from "./layers/background/LayerBackground";
import { LayerOverlay } from "./layers/overlay/LayerOverlay";
import { LayerUI } from "./layers/ui/LayerUI";
import { LayerWorld } from "./layers/world/LayerWorld";
import type { IRendererScene } from "../renderer";

export class Scene implements IScene {
    public readonly layerBackground: LayerBackground;
    public readonly layerWorld: LayerWorld;
    public readonly layerOverlay: LayerOverlay;
    public readonly layerUI: LayerUI;

    private _renderer: IRendererScene | null = null;
    private _isFrameScheduled: boolean = false;

    private _width: number;
    private _height: number;

    constructor(width: number, height: number) {
        this.layerBackground = new LayerBackground(width, height);
        this.layerWorld = new LayerWorld(width, height);
        this.layerOverlay = new LayerOverlay(width, height);
        this.layerUI = new LayerUI(this.layerWorld, width, height);

        this._width = width;
        this._height = height;
    }

    public getRenderer(): IRendererScene | null {
        return this._renderer;
    }

    public setRenderer(value: IRendererScene): void {
        this._renderer?.detach();
        this._renderer = value;
        this._renderer.attach(this);
        this.invalidate();
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
        this.layerBackground.setSize(width, height);
        this.layerWorld.setSize(width, height);
        this.layerOverlay.setSize(width, height);
        this.layerUI.setSize(width, height);
        this.invalidate();
    }

    public update(): void {
        this._renderer?.update();
    }

    public render(): void {
        this._renderer?.render();
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