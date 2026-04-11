import type { ILayerOverlayHandle, ILayerOverlayHandleManager } from "./types";

export class LayerOverlayHandleManager implements ILayerOverlayHandleManager {
    private readonly _handlers = new Map<string, ILayerOverlayHandle>();

    public getHandlers(): ILayerOverlayHandle[] {
        return [...this._handlers.values()];
    }

    public register(handler: ILayerOverlayHandle): void {
        const type = handler.getType();

        if (this._handlers.has(type)) {
            throw new Error(`Overlay handler "${type}" is already registered.`);
        }

        this._handlers.set(type, handler);
    }

    public get(type: string): ILayerOverlayHandle | null {
        return this._handlers.get(type) ?? null;
    }

    public has(type: string): boolean {
        return this._handlers.has(type);
    }

    public remove(type: string): boolean {
        const handler = this._handlers.get(type);

        if (!handler) {
            return false;
        }

        handler.destroy();
        return this._handlers.delete(type);
    }

    public clear(): void {
        for (const handler of this._handlers.values()) {
            handler.clear();
        }
    }

    public destroy(): void {
        for (const handler of this._handlers.values()) {
            handler.destroy();
        }

        this._handlers.clear();
    }
}