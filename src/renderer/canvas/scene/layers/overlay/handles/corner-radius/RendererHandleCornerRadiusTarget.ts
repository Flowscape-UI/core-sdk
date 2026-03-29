import type { ICamera } from "../../../../../../../core/camera";
import type { IHandleCornerRadius } from "../../../../../../../core/scene/layers/overlay";
import type { IRendererHandleCornerRadiusTarget } from "./types";

export class RendererHandleCornerRadiusTarget implements IRendererHandleCornerRadiusTarget {
    private readonly _handle: IHandleCornerRadius;
    private readonly _camera: ICamera;

    constructor(handle: IHandleCornerRadius, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): IHandleCornerRadius {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}