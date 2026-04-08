import { LayerBase, LayerType } from "../base";
import type { LayerWorld } from "../world";
import { ManagerLayerUI } from "./ManagerLayerUI";
import { ModuleRulerUI } from "./modules/ruler/ModuleRulerLayerUI";
import type { ILayerUI, IManagerLayerUI } from "./types";


export class LayerUI extends LayerBase implements ILayerUI {
    private readonly _manager: IManagerLayerUI;

    constructor(world: LayerWorld, width: number, height: number) {
        super(width, height, LayerType.UI, 3);
        this._manager = new ManagerLayerUI();
        this._enabled = true;

        this._manager.register(new ModuleRulerUI(world));
    }

    public getManager(): IManagerLayerUI {
        return this._manager;
    }

    public clear(): void {
        this._manager.clear();
    }

    public override destroy(): void {
        this.clear();
        this._manager.destroy();
        super.destroy();
    }
}