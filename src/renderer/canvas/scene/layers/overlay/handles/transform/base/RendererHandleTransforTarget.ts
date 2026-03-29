import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransform } from "../../../../../../../../core/scene/layers/overlay/handles/transform/base";
import type { IRendererHandleTransformTarget } from "./types";

export class RendererHandleTransformTarget
    implements IRendererHandleTransformTarget {

    private readonly _handle: IHandleTransform;
    private readonly _camera: ICamera;

    constructor(handle: IHandleTransform, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): IHandleTransform {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}