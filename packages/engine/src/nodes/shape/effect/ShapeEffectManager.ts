import type { IShapeEffect, IShapeEffectByType } from "./types";

export class ShapeEffectManager {
	private readonly _effects: IShapeEffect[] = [];

	public get(index: number): IShapeEffect | undefined {
		return this._effects[index];
	}

	public getAll(): readonly IShapeEffect[] {
		return [...this._effects];
	}

	public getByType<TType extends keyof IShapeEffectByType>(
		type: TType,
	): readonly IShapeEffectByType[TType][] {
		return this._effects.filter(
			(effect) => effect.type === type,
		) as IShapeEffectByType[TType][];
	}

	public has(type: keyof IShapeEffectByType): boolean {
		return this._effects.some((effect) => effect.type === type);
	}

	public add(effect: IShapeEffect): boolean {
		if (this._effects.includes(effect)) {
			return false;
		}

		this._effects.push(effect);
		return true;
	}

	public remove(effect: IShapeEffect): boolean {
		const index = this._effects.indexOf(effect);

		if (index === -1) {
			return false;
		}

		this._effects.splice(index, 1);
		return true;
	}

	public removeAt(index: number): IShapeEffect | undefined {
		if (
			!Number.isInteger(index) ||
			index < 0 ||
			index >= this._effects.length
		) {
			return undefined;
		}

		const [effect] = this._effects.splice(index, 1);
		return effect;
	}

	public removeByType(type: keyof IShapeEffectByType): number {
		let removedCount = 0;

		for (let index = this._effects.length - 1; index >= 0; index--) {
			if (this._effects[index]?.type !== type) {
				continue;
			}

			this._effects.splice(index, 1);
			removedCount++;
		}

		return removedCount;
	}

	public move(fromIndex: number, toIndex: number): boolean {
		if (
			!Number.isInteger(fromIndex) ||
			!Number.isInteger(toIndex) ||
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= this._effects.length ||
			toIndex >= this._effects.length ||
			fromIndex === toIndex
		) {
			return false;
		}

		const [effect] = this._effects.splice(fromIndex, 1);

		if (!effect) {
			return false;
		}

		this._effects.splice(toIndex, 0, effect);
		return true;
	}

	public clear(): void {
		this._effects.length = 0;
	}

	public setAll(effects: readonly IShapeEffect[]): void {
		this.clear();

		for (const effect of effects) {
			this.add(effect);
		}
	}
}
