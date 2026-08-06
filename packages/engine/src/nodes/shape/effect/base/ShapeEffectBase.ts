import type { IShapeEffectBase, ShapeEffectType } from "./types";

/**
 * Provides the common state and behavior for all effects applied to a shape.
 *
 * Предоставляет общее состояние и поведение для всех эффектов,
 * применяемых к фигуре.
 *
 * @typeParam TType - The concrete type of the effect.
 * Конкретный тип эффекта.
 */
export abstract class ShapeEffectBase<
	TType extends ShapeEffectType,
> implements IShapeEffectBase<TType> {
	/**
	 * Identifies the concrete type of the effect.
	 *
	 * Определяет конкретный тип эффекта.
	 */
	public abstract readonly type: TType;

	private _isVisible = true;

	/**
	 * Returns whether the effect is visible and should participate in rendering.
	 *
	 * Возвращает, видим ли эффект и должен ли он участвовать в отрисовке.
	 */
	public isVisible(): boolean {
		return this._isVisible;
	}

	/**
	 * Sets whether the effect should be visible and participate in rendering.
	 *
	 * Устанавливает, должен ли эффект быть видимым и участвовать в отрисовке.
	 *
	 * @param value - Whether the effect should be visible.
	 * Показывает, должен ли эффект быть видимым.
	 */
	public setVisible(value: boolean): void {
		if (this._isVisible === value) {
			return;
		}

		this._isVisible = value;
	}
}
