// overlay/handles/HandleManager.ts
import Konva from "konva";
import type { IOverlayHandle, OverlayContext } from "../types";

export class HandleManager {
    private readonly _root = new Konva.Group({ listening: true, perfectDrawEnabled: false });

    private _ctx: OverlayContext | null = null;
    private readonly _handles = new Map<string, IOverlayHandle>();

    public getRoot(): Konva.Group {
        return this._root;
    }

    public setContext(ctx: OverlayContext) {
        this._ctx = ctx;
        for (const h of this._handles.values()) h.setContext(ctx);
    }

    // ✅ как ты хочешь
    public add(handles: IOverlayHandle | IOverlayHandle[]) {
        const list = Array.isArray(handles) ? handles : [handles];

        for (const h of list) {
            // replace if exists
            const existing = this._handles.get(h.id);
            if (existing) this.remove(h.id);

            this._handles.set(h.id, h);

            if (this._ctx) h.setContext(this._ctx);

            this._root.add(h.node);
        }
    }

    // ✅ как ты хочешь
    public remove(id: string) {
        const h = this._handles.get(id);
        if (!h) return;

        // detach from scene
        h.node.remove();
        h.destroy?.();

        this._handles.delete(id);
    }

    public clear() {
        for (const id of Array.from(this._handles.keys())) this.remove(id);
    }

    // ✅ как ты хочешь
    public getHandle<T extends IOverlayHandle = IOverlayHandle>(id: string): T {
        const h = this._handles.get(id);
        if (!h) throw new Error(`Handle '${id}' not found`);
        return h as T;
    }

    public has(id: string) {
        return this._handles.has(id);
    }

    /** Called by OverlayLayer on every redraw */
    public draw() {
        for (const h of this._handles.values()) h.draw();
    }

    public destroy() {
        this.clear();
        this._root.destroy();
    }
}