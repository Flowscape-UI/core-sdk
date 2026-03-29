import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransformPivot } from "../../../../../../../../core/scene/layers/overlay";
import type { IRendererHandleTransformPivotTarget } from "./types";


export class RendererHandleTransformPivotTarget implements IRendererHandleTransformPivotTarget {
    private readonly _handle: IHandleTransformPivot;
    private readonly _camera: ICamera;

    constructor(handle: IHandleTransformPivot, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): IHandleTransformPivot {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}