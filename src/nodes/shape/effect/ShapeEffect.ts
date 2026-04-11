import { EffectType, type ShapeEffectType } from "./types";

export class ShapeEffect {
    private readonly _effects = new Map<EffectType, ShapeEffectType>();

    /**
     * Returns the effect by type if it exists.
     *
     * Возвращает эффект по типу, если он существует.
     */
    public get<T extends ShapeEffectType>(type: EffectType): T | undefined {
        return this._effects.get(type) as T | undefined;
    }

    /**
     * Returns all effects as a read-only array.
     *
     * Возвращает все эффекты в виде массива только для чтения.
     */
    public getAll(): readonly ShapeEffectType[] {
        return Array.from(this._effects.values());
    }

    /**
     * Returns true if the effect exists.
     *
     * Возвращает true, если эффект существует.
     */
    public has(type: EffectType): boolean {
        return this._effects.has(type);
    }

    /**
     * Adds a new effect or replaces the existing effect of the same type.
     *
     * Добавляет новый эффект или заменяет существующий эффект того же типа.
     */
    public add(effect: ShapeEffectType): void {
        this._effects.set(effect.type, effect);
    }

    /**
     * Removes the effect by type.
     *
     * Удаляет эффект по типу.
     */
    public remove(type: EffectType): boolean {
        return this._effects.delete(type);
    }

    /**
     * Removes all effects.
     *
     * Удаляет все эффекты.
     */
    public clear(): void {
        if (this._effects.size === 0) {
            return;
        }

        this._effects.clear();
    }

    /**
     * Replaces all effects.
     *
     * Полностью заменяет все эффекты.
     */
    public setAll(effects: readonly ShapeEffectType[]): void {
        this._effects.clear();

        for (const effect of effects) {
            this._effects.set(effect.type, effect);
        }
    }
}