import type { ICamera } from "../../../../../../../core/camera";
import type { IHandleHover } from "../../../../../../../scene/layers";
import type { IRendererHandleHoverTarget } from "./types";

export class RendererHandleHoverTarget implements IRendererHandleHoverTarget {
    private readonly _handle: IHandleHover;
    private readonly _camera: ICamera;

    constructor(handle: IHandleHover, camera: ICamera) {
        this._handle = handle;
        this._camera = camera;
    }

    /**
     * Returns hover handle.
     *
     * Возвращает hover-хендлер.
     */
    public getHandle(): IHandleHover {
        return this._handle;
    }

    /**
     * Returns camera.
     *
     * Возвращает камеру.
     */
    public getCamera(): ICamera {
        return this._camera;
    }
}