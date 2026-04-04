import type { ILayerBase } from "../base";

export type PercentValue = `${string}%`;
export type PixelValue = number;

export type ImagePosition = PixelValue | PercentValue;
export type ImageSize = PixelValue | PercentValue;
export type ImageOffset = PixelValue | PercentValue;


/**
 * The background layer is responsible for rendering the scene background,
 * including solid color, gradient, or background image.
 *
 * Фоновый слой отвечает за отрисовку фона сцены,
 * включая сплошной цвет, градиент или фоновое изображение.
 *
 * The background layer does not participate in world transformations
 * and always stays aligned with the viewport.
 *
 * Фоновый слой не участвует в мировых трансформациях
 * и всегда выровнен относительно окна просмотра.
 */
export interface ILayerBackground extends ILayerBase {
    /**
     * Returns background fill style (color or gradient).
     *
     * Возвращает заливку фона (цвет или градиент).
     */
    getFill(): string;

    /**
     * Sets background fill style (color or gradient).
     *
     * Устанавливает заливку фона (цвет или градиент).
     */
    setFill(value: string): void;

    /**
     * Returns background image URL.
     *
     * Возвращает URL фонового изображения.
     */
    getImage(): string;

    /**
     * Sets background image URL.
     *
     * Устанавливает URL фонового изображения.
     */
    setImage(value: string): void;

    /**
     * Returns background image width in pixels.
     *
     * Возвращает ширину фонового изображения в пикселях.
     */
    getImageWidth(): PixelValue;

    /**
     * Returns background image height in pixels.
     *
     * Возвращает высоту фонового изображения в пикселях.
     */
    getImageHeight(): PixelValue;

    /**
     * Returns background image size in pixels.
     *
     * Возвращает размер фонового изображения в пикселях.
     */
    getImageSize(): { width: PixelValue, height: PixelValue };

    /**
     * Sets background image width.
     * Value can be pixels or percentage.
     *
     * Устанавливает ширину фонового изображения.
     * Значение может быть в пикселях или процентах.
     */
    setImageWidth(value: ImageSize): void;

    /**
     * Sets background image height.
     * Value can be pixels or percentage.
     *
     * Устанавливает высоту фонового изображения.
     * Значение может быть в пикселях или процентах.
     */
    setImageHeight(value: ImageSize): void;

    /**
     * Sets background image size.
     * Values can be pixels or percentage.
     *
     * Устанавливает размер фонового изображения.
     * Значения могут быть в пикселях или процентах.
     */
    setImageSize(width: ImageSize, height: ImageSize): void;

    /**
     * Returns background image X position in pixels.
     *
     * Возвращает позицию изображения по X в пикселях.
     */
    getImageX(): PixelValue;

    /**
     * Returns background image Y position in pixels.
     *
     * Возвращает позицию изображения по Y в пикселях.
     */
    getImageY(): PixelValue;

    /**
     * Returns background image position in pixels.
     *
     * Возвращает позицию изображения в пикселях.
     */
    getImagePosition(): { x: PixelValue, y: PixelValue };

    /**
     * Sets background image X position.
     * Value can be pixels or percentage.
     *
     * Устанавливает позицию изображения по X.
     * Значение может быть в пикселях или процентах.
     */
    setImageX(value: ImagePosition): void;

    /**
     * Sets background image Y position.
     * Value can be pixels or percentage.
     *
     * Устанавливает позицию изображения по Y.
     * Значение может быть в пикселях или процентах.
     */
    setImageY(value: ImagePosition): void;

    /**
     * Sets background image position.
     * Values can be pixels or percentage.
     *
     * Устанавливает позицию изображения.
     * Значения могут быть в пикселях или процентах.
     */
    setImagePosition(x: ImagePosition, y: ImagePosition): void;

    /**
     * Returns background image opacity.
     * Value is in range from 0 to 1.
     *
     * Возвращает прозрачность фонового изображения.
     * Значение находится в диапазоне от 0 до 1.
     */
    getImageOpacity(): number;

    /**
     * Sets background image opacity.
     * Value will be clamped to range from 0 to 1.
     *
     * Устанавливает прозрачность фонового изображения.
     * Значение будет ограничено диапазоном от 0 до 1.
     */
    setImageOpacity(value: number): void;

    /**
     * Returns background image offset X in pixels.
     * Offset acts as image pivot relative to its position.
     *
     * Возвращает смещение изображения по X в пикселях.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    getImageOffsetX(): PixelValue;

    /**
     * Returns background image offset Y in pixels.
     * Offset acts as image pivot relative to its position.
     *
     * Возвращает смещение изображения по Y в пикселях.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    getImageOffsetY(): PixelValue;

    /**
     * Returns background image offset in pixels.
     * Offset acts as image pivot relative to its position.
     *
     * Возвращает смещение изображения в пикселях.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    getImageOffset(): { x: PixelValue, y: PixelValue };

    /**
     * Sets background image offset X.
     * Value can be pixels or percentage.
     * Offset acts as image pivot relative to its position.
     *
     * Устанавливает смещение изображения по X.
     * Значение может быть в пикселях или процентах.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    setImageOffsetX(value: ImageOffset): void;

    /**
     * Sets background image offset Y.
     * Value can be pixels or percentage.
     * Offset acts as image pivot relative to its position.
     *
     * Устанавливает смещение изображения по Y.
     * Значение может быть в пикселях или процентах.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    setImageOffsetY(value: ImageOffset): void;

    /**
     * Sets background image offset.
     * Values can be pixels or percentage.
     * Offset acts as image pivot relative to its position.
     *
     * Устанавливает смещение изображения.
     * Значения могут быть в пикселях или процентах.
     * Смещение работает как pivot изображения относительно его позиции.
     */
    setImageOffset(x: ImageOffset, y: ImageOffset): void;
}