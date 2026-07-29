/**
 * Represents an object that can be shown or hidden.
 *
 * Представляет объект, который можно показать или скрыть.
 * @example
 * if (!layer.isVisible()) layer.show();
 */
export interface IVisible {
    /**
     * Returns `true` if the object is currently visible.
     *
     * Возвращает `true` если объект в данный момент видим.
     * @example
     * if (layer.isVisible()) layer.hide();
     */
    isVisible(): boolean;

    /**
     * Makes the object visible.
     *
     * Делает объект видимым.
     * @example
     * layer.show();
     */
    show(): void;

    /**
     * Makes the object hidden.
     *
     * Делает объект скрытым.
     * @example
     * layer.hide();
     */
    hide(): void;

    /**
     * Sets the visibility of the object explicitly.
     *
     * Устанавливает видимость объекта явно.
     * @example
     * layer.setVisible(false);
     */
    setVisible(value: boolean): void;
}