export * from "./LayerOverlayFreeRenderersManager";

import type { IHandleBase } from "../../../../../../../scene";
import { RendererHandleBase, RendererHandleTarget } from "../base";


export class RendererHandleFreeCanvas extends RendererHandleBase<IHandleBase> {
    protected override _onUpdate(_: RendererHandleTarget<IHandleBase>): void {
        throw new Error("Method not implemented.");
    }
}
