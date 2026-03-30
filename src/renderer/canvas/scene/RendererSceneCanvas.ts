import Konva from "konva";
import type { IScene } from "../../../core/scene/IScene";
import type { IRendererScene } from "./IRendererScene";
import { RendererLayerBackgroundCanvas } from "./layers";
import { RendererLayerWorldCanvas } from "./layers/world";
import { LayerWorldInputController } from "../../../core/scene/layers/LayerWorldInputController";
import { RendererLayerOverlayCanvas, RendererLayerOverlayTarget } from "./layers/overlay";
import { LayerOverlayInputController } from "../../../core/scene/layers/LayerOverlayInputController";
import { RendererLayerUI } from "../../ui";

export class RendererSceneCanvas implements IRendererScene {
    private readonly _stage: Konva.Stage;
    private _scene: IScene | null = null;

    // Layers
    private readonly _backgroundRenderer: RendererLayerBackgroundCanvas;
    private readonly _worldRenderer: RendererLayerWorldCanvas;
    private readonly _overlayRenderer: RendererLayerOverlayCanvas;
    private readonly _uiRenderer: RendererLayerUI;

    private _worldInputController: LayerWorldInputController | null = null;
    private _overlayInputController: LayerOverlayInputController | null = null;

    constructor(container: HTMLDivElement) {
        this._stage = new Konva.Stage({
            container,
            width: 1,
            height: 1,
            draggable: false,
        });

        this._backgroundRenderer = new RendererLayerBackgroundCanvas();
        this._worldRenderer = new RendererLayerWorldCanvas();
        this._overlayRenderer = new RendererLayerOverlayCanvas();
        this._uiRenderer = new RendererLayerUI(container);

        this._stage.add(this._backgroundRenderer.getLayer());
        this._stage.add(this._worldRenderer.getLayer());
        this._stage.add(this._overlayRenderer.getLayer());
    }

    public attach(scene: IScene): void {
        this._scene = scene;
        this._backgroundRenderer.attach(scene.layerBackground);
        this._worldRenderer.attach(scene.layerWorld);

        const overlayTarget = new RendererLayerOverlayTarget(
            scene.layerOverlay,
            scene.layerWorld.getCamera()
        );
        this._overlayRenderer.attach(overlayTarget);

        this._worldInputController?.destroy();
        this._worldInputController = new LayerWorldInputController(
            this._stage,
            scene.layerWorld,
            {
                panMode: "right",
                zoomEnabled: true,
                zoomFactor: 1.08,
                preventWheelDefault: true,
            },
            () => {
                this._overlayInputController?.updateHoverFromPointer();
                scene.invalidate();
            }
        );

        this._overlayInputController?.destroy();
        this._overlayInputController = new LayerOverlayInputController(
            this._stage,
            scene.layerWorld,
            scene.layerOverlay,
            () => {
                scene.invalidate();
            }
        );

        this._uiRenderer.attach(scene.layerUI);

        this.update();
    }

    public detach(): void {
        this._worldInputController?.destroy();
        this._worldInputController = null;

        this._overlayInputController?.destroy();
        this._overlayInputController = null;

        this._backgroundRenderer.detach();
        this._worldRenderer.detach();
        this._overlayRenderer.detach();
        this._uiRenderer.detach();
        this._scene = null;
    }

    public render(): void {
        if (!this._scene) {
            return;
        }

        this._backgroundRenderer.render();
        this._worldRenderer.render();
        this._overlayRenderer.render();
        this._uiRenderer.render();
    }

    public update(): void {
        if (!this._scene) {
            return;
        }

        const width = this._scene.getWidth();
        const height = this._scene.getHeight();

        this._stage.size({ width, height });

        this._backgroundRenderer.update();
        this._worldRenderer.update();
        this._overlayRenderer.update();
        this._uiRenderer.update();
    }

    public destroy(): void {
        this.detach();
        this._backgroundRenderer.destroy();
        this._worldRenderer.destroy();
        this._overlayRenderer.destroy();
        this._uiRenderer.destroy();
        this._stage.destroy();
    }
}