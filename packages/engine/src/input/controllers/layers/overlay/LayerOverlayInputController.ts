import type Konva from "konva";

import type { Point } from "../../../../core/camera";
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
    private readonly _moduleHover: ModuleOverlayHover;
    private readonly _moduleCornerRadius: ModuleOverlayCornerRadius;
    private readonly _moduleTransform: ModuleOverlayTransform;

    constructor() {
        super();
        this._moduleTransform = new ModuleOverlayTransform();
        this._moduleCornerRadius = new ModuleOverlayCornerRadius();
        this._moduleHover = new ModuleOverlayHover((screenPoint) =>
            this._isHoverBlockedByHandle(screenPoint),
        );

        this.addModule(this._moduleHover);
        this.addModule(this._moduleCornerRadius);
        this.addModule(this._moduleTransform);
    }

    private _isHoverBlockedByHandle(screenPoint: Point): boolean {
        if (this._moduleTransform.isBlockingHover(screenPoint)) {
            return true;
        }

        if (this._moduleCornerRadius.isBlockingHover(screenPoint)) {
            return true;
        }

        return false;
    }
}
