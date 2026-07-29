// view/konva/KonvaGridView.ts
import Konva from "konva";
import type { CameraState } from "../core/camera";
import type { Rect } from "../nodes";
import type { GridRenderer, WorldGridOptions } from "./GridRenderer";


type GetDrawInput = () => { camera: CameraState; viewportAabbWorld: Rect };

export class KonvaGridView {
    private readonly _root: Konva.Group;
    private readonly _shape: Konva.Shape;

    private readonly _renderer: GridRenderer;
    private readonly _getDrawInput: GetDrawInput;

    constructor(params: {
        renderer: GridRenderer;
        getDrawInput: GetDrawInput;
    }) {
        this._renderer = params.renderer;
        this._getDrawInput = params.getDrawInput;

        this._root = new Konva.Group({ listening: false, perfectDrawEnabled: false });

        this._shape = new Konva.Shape({
            listening: false,
            perfectDrawEnabled: false,
            sceneFunc: (ctx, shape) => {
                const input = this._getDrawInput();

                // core не должен зависеть от CameraState целиком - даём только то, что надо
                this._renderer.draw(ctx, {
                    camera: { scale: input.camera.scale },
                    viewportAabbWorld: input.viewportAabbWorld,
                });

                ctx.fillStrokeShape(shape);
            },
        });

        this._root.add(this._shape);
    }

    public getRoot(): Konva.Group {
        return this._root;
    }

    public destroy() {
        this._root.destroy();
    }

    // прокси для удобства наружу
    public setOptions(opts: Partial<WorldGridOptions>) {
        this._renderer.setOptions(opts);
    }

    public getOptions(): Readonly<WorldGridOptions> {
        return this._renderer.getOptions();
    }

    public getGridStepWorld(): { minor: number; major: number } {
        return this._renderer.getGridStepWorld();
    }
}