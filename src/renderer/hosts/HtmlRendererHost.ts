import type { IScene } from "../../scene/types";
import { BaseRendererHost } from "./BaseRendererHost";

export class HtmlRendererHost extends BaseRendererHost {
    constructor(container: HTMLDivElement, id: number = -1) {
        super(id, "html");
        
    }

    public attach(scene: IScene): void {
        // this._onAttachBindings(scene, (binding) => {
            // const renderer = binding.renderer;
            // this._stage.add(renderer.getRenderNode());
        // });
    }


    // Overrdings
    protected override _onUpdate(scene: IScene): void {
        // const width = scene.getWidth();
        // const height = scene.getHeight();
        // this._stage.width(width);
        // this._stage.height(height);
    }

    protected override _onRender(_: IScene): void {}
    protected override _onDetach(_: IScene): void {}
    protected override _onDestroy(_: IScene): void {
        // this._stage.destroy();
    }
}