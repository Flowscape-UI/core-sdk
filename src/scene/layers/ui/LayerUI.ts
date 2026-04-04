import { LayerBase, LayerType } from "../base";
import type { LayerWorld } from "../world";
import { ManagerLayerUI } from "./ManagerLayerUI";
import { ModuleRulerUI } from "./modules/ruler/ModuleRulerLayerUI";
import type { ILayerUI, IManagerLayerUI } from "./types";


export class LayerUI extends LayerBase implements ILayerUI {
    private readonly _manager: IManagerLayerUI;
    private _enabled: boolean;

    constructor(world: LayerWorld, width: number, height: number) {
        super(width, height, LayerType.UI);
        this._manager = new ManagerLayerUI();
        this._enabled = true;

        this._manager.register(new ModuleRulerUI(world));
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
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