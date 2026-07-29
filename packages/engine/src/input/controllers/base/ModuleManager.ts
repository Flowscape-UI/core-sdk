import type { IWithId } from "../../../core/interfaces";
import type { ID } from "../../../core/types";

export class ModuleManager<T extends IWithId> {
    private readonly _items = new Map<string, T>();

    public add(item: T): void {
        this._items.set(String(item.id), item);
    }

    public remove(id: ID): boolean {
        return this._items.delete(String(id));
    }

    public getById(id: ID): T | null {
        return this._items.get(String(id)) ?? null;
    }

    public getAll(): readonly T[] {
        return Array.from(this._items.values());
    }

    public clear(): void {
        this._items.clear();
    }
}