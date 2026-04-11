import type Konva from "konva";

import type { LayerOverlay, LayerWorld } from "../../../../scene/layers";
import {
    InputControllerBase,
    type IInputModule,
} from "../../base";
import {
    ModuleOverlayCornerRadius,
    ModuleOverlayHover,
    ModuleOverlayTransform,
} from "./modules";

export type OverlayInputContext = {
    stage: Konva.Stage;
    world: LayerWorld;
    overlay: LayerOverlay;
    emitChange: () => void;

    getInteractionOwner: () => string | null;
    tryBeginInteraction: (ownerId: string) => boolean;
    endInteraction: (ownerId: string) => void;
};

export type IOverlayInputModule = IInputModule<OverlayInputContext>;

export class LayerOverlayInputController extends InputControllerBase<OverlayInputContext, IOverlayInputModule> {
    public readonly id = 1;

    constructor() {
        super();
        this.addModule(new ModuleOverlayHover());
        this.addModule(new ModuleOverlayCornerRadius());
        this.addModule(new ModuleOverlayTransform());
    }
}