import type { ICamera } from "../../../../../../../../core/camera";
import type { IHandleTransformResize } from "../../../../../../../../scene/layers";

import type { IRendererHandleTransformResizeTarget } from "./types";

export class RendererHandleTransformResizeTarget implements IRendererHandleTransformResizeTarget {
    private readonly _handle: IHandleTransformResize;
    private readonly _camera: ICamera;

    constructor(handle: IHandleTransformResize, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): IHandleTransformResize {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}