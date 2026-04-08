import type Konva from "konva";

import type { LayerWorld } from "../../../../scene/layers";
import {
    InputControllerBase,
    type IInputModule,
    type WorldInputOptions
} from "../../base";
import {
    ModuleWorldZoom,
    ModuleWorldPan,
} from "./modules";

export type WorldInputContext = {
    stage: Konva.Stage;
    world: LayerWorld;
    options: Required<WorldInputOptions>;
    emitChange: () => void;
};

export type IWorldInputModule = IInputModule<WorldInputContext>;


export class LayerWorldInputController extends InputControllerBase<WorldInputContext, IWorldInputModule> {
    public readonly id = 0;

    constructor() {
        super();
        this.addModule(new ModuleWorldZoom());
        this.addModule(new ModuleWorldPan());
    }
}