import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransformRotate } from "../../../../../../../../core/scene/layers/overlay/handles/transform/rotate";
import type { IRendererHandleTransformRotateTarget } from "./types";

export class RendererHandleTransformRotateTarget implements IRendererHandleTransformRotateTarget {

    private readonly _handle: IHandleTransformRotate;
    private readonly _camera: ICamera;

    constructor(handle: IHandleTransformRotate, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): IHandleTransformRotate {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}