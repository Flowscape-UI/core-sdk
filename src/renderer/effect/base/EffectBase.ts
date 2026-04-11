import type { IEffectBase } from "./types";

export class EffectBase implements IEffectBase {
    private _isVisible: boolean;

    constructor() {
        this._isVisible = true;
    }

    public isVisible(): boolean {
        return this._isVisible;
    }
    
    public setVisible(value: boolean): void {
        if(this._isVisible === value) {
            return;
        }
        this._isVisible = value;
    }
}