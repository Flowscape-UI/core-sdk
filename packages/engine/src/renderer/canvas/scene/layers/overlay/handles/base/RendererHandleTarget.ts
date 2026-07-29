import type { ICamera } from "../../../../../../../core";
import type { IHandleBase } from "../../../../../../../scene";

export class RendererHandleTarget<T extends IHandleBase> {
    private readonly _handle: T;
    private readonly _camera: ICamera;

    constructor(handle: T, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    public getHandle(): T {
        return this._handle;
    }

    public getCamera(): ICamera {
        return this._camera;
    }
}