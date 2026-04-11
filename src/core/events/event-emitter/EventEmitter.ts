import type { EventMap } from "./types";

export class EventEmitter<Events extends EventMap> {
    private _listeners: {
        [K in keyof Events]?: Set<(payload: Events[K]) => void>;
    } = {};

    on<K extends keyof Events>(
        event: K,
        listener: (payload: Events[K]) => void
    ): () => void {
        if (!this._listeners[event]) {
            this._listeners[event] = new Set();
        }

        this._listeners[event]!.add(listener);

        return () => {
            this._listeners[event]!.delete(listener);
        };
    }

    emit<K extends keyof Events>(
        event: K,
        payload: Events[K]
    ) {
        this._listeners[event]?.forEach(l => l(payload));
    }

    clear() {
        Object.values(this._listeners).forEach(set => set?.clear());
    }
}