import { Direction, type ID } from "../../../../../core/types";
import type { IHandleBase } from "../base";
import type { ILayerOverlayHandle } from "../types";
import { LayerOverlayHandleManager } from "../LayerOverlayHandlesManager";
import { HandleCornerRadius } from "./corner-radius";
import { HandleFocus } from "./focus";
import { HandleHover } from "./hover";

export class LayerOverlayShapeHandlesManager {
    private readonly _handles = new Map<ID, IHandleBase>();

    constructor() {
        this._registerDefaults();
    }

    public getById(id: ID): ILayerOverlayHandle | null {
        return this._handles.get(id) ?? null;
    }

    public getAll(): ILayerOverlayHandle[] {
        return [...this._handles.values()];
    }

    public registerTo(target: LayerOverlayHandleManager): void {
        for (const [id, handle] of this._handles) {
            target.add(id, handle);
        }
    }

    private _add(id: ID, handle: IHandleBase): void {
        if (this._handles.has(id)) {
            throw new Error(`Overlay shape handler with id "${id}" is already added.`);
        }

        this._handles.set(id, handle);
    }

    private _registerDefaults(): void {
        this._add("hover", new HandleHover());
        this._add("focus", new HandleFocus());

        this._add("corner-radius-tl", new HandleCornerRadius(Direction.NW));
        this._add("corner-radius-tr", new HandleCornerRadius(Direction.NE));
        this._add("corner-radius-br", new HandleCornerRadius(Direction.SE));
        this._add("corner-radius-bl", new HandleCornerRadius(Direction.SW));
    }
}
