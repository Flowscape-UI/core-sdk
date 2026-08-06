export enum ShapeEffectType {
	InnerShadow = "inner-shadow",
	DropShadow = "drop-shadow",
	LayerBlur = "layer-blur",
	BackgroundBlur = "background-blur",
	// Noise = "noise",
	// Texture = "texture",
	// Glass = "glass",
}

/**
 * Defines the common contract for all effects applied to a shape.
 *
 * Определяет общий контракт для всех эффектов, применяемых к фигуре.
 */
export interface IShapeEffectBase<
	TType extends ShapeEffectType = ShapeEffectType,
> {
	/**
	 * Identifies the concrete type of the effect.
	 *
	 * Определяет конкретный тип эффекта.
	 */
	readonly type: TType;

	/**
	 * Returns whether the effect is visible and should participate in rendering.
	 *
	 * Возвращает, видим ли эффект и должен ли он участвовать в отрисовке.
	 */
	isVisible(): boolean;

	/**
	 * Sets whether the effect should be visible and participate in rendering.
	 *
	 * Устанавливает, должен ли эффект быть видимым и участвовать в отрисовке.
	 *
	 * @param value - Whether the effect should be visible.
	 * Показывает, должен ли эффект быть видимым.
	 */
	setVisible(value: boolean): void;
}
