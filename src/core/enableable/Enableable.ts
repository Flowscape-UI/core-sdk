import { EventEmitter } from "../events";
import type { IEnableable } from "./types";

type Events = {
    change: boolean,
}

export abstract class Enableable implements IEnableable {
    protected _enabled = true;
    private readonly _events = new EventEmitter<Events>();

    /***************************************************************************/
    /*                           Event Subscriptions                           */
    /***************************************************************************/
    public onChange(callback: (state: boolean) => void): () => void {
        return this._events.on("change", callback);
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    public enable(): void {
        this.setEnabled(true);
    }

    public disable(): void {
        this.setEnabled(false);
    }

    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
        this._onEnabledChanged(value);
    }

    protected _onEnabledChanged(value: boolean): void {
        this._events.emit("change", value);
    }
}