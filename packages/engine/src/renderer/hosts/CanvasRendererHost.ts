import Konva from "konva";
import type { IScene } from "../../scene/types";
import { BaseRendererHost } from "./BaseRendererHost";
// import { LayerOverlayInputController } from "../../input";

export class CanvasRendererHost extends BaseRendererHost {
    private readonly _stage: Konva.Stage;

    constructor(container: HTMLDivElement, id: number = -1) {
        super(id, "canvas");
        this._stage = new Konva.Stage({
            container,
            width: 1,
            height: 1,
            draggable: false,
        });
    }

    public override getSurface(): HTMLElement {
        return this._stage.container();
    }

    public getRenderNode(): Konva.Stage {
        return this._stage;
    }

    public attach(scene: IScene): void {
        this._onAttachBindings(scene, (binding) => {
            const renderer = binding.renderer;
            this._stage.add(renderer.getRenderNode());
        });
    }


    // Overrdings
    protected override _onUpdate(scene: IScene): void {
        const width = scene.getWidth();
        const height = scene.getHeight();
        this._stage.width(width);
        this._stage.height(height);
    }

    protected override _onRender(_: IScene): void {}
    protected override _onDetach(_: IScene): void {
        this._stage.removeChildren();
    }
    protected override _onDestroy(): void {
        this._stage.destroy();
    }
}
