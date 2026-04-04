export enum LayerType {
    Background = 0,
    World = 1,
    Overlay = 2,
    UI = 3,
}

/**
 * Base interface for all scene layers.
 *
 * Базовый интерфейс для всех слоёв сцены.
 *
 * A layer represents an isolated rendering and interaction level
 * inside the scene (background, world, overlay, UI).
 *
 * Слой представляет собой отдельный уровень рендера и взаимодействия
 * внутри сцены (фон, мир, оверлей, UI).
 *
 * Each layer has its own size, lifecycle and rendering logic,
 * and is managed by the Scene.
 *
 * Каждый слой имеет собственный размер, жизненный цикл и логику рендера,
 * и управляется сценой.
 */
export interface ILayerBase {
    /**
     * Returns the current width of the layer.
     *
     * Возвращает текущую ширину слоя.
     */
    getWidth(): number;

    /**
     * Returns the current height of the layer.
     *
     * Возвращает текущую высоту слоя.
     */
    getHeight(): number;

    /**
     * Returns the current size of the layer.
     *
     * Возвращает текущий размер слоя.
     */
    getSize(): { width: number, height: number };

    /**
     * Sets the width of the layer.
     *
     * Устанавливает ширину слоя.
     */
    setWidth(value: number): void;

    /**
     * Sets the height of the layer.
     *
     * Устанавливает высоту слоя.
     */
    setHeight(value: number): void;

    /**
     * Sets the size of the layer.
     *
     * Устанавливает размер слоя.
     */
    setSize(width: number, height: number): void;

    /**
     * Returns the type of the layer.
     * Used by the scene to determine render order and behavior.
     *
     * Возвращает тип слоя.
     * Используется сценой для определения порядка рендера и поведения.
     */
    getType(): LayerType;

    /**
     * Destroys the layer and releases all resources.
     *
     * Уничтожает слой и освобождает все ресурсы.
     */
    destroy(): void;
}