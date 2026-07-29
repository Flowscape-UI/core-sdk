/**
 * Represents an object that can be enabled or disabled.
 *
 * Enabled state usually controls whether the object participates
 * in update, render, input, or other runtime processing.
 *
 * This interface is commonly used for layers, systems, tools,
 * modules, controllers, and other runtime objects.
 *
 * Представляет объект, который можно включать и отключать.
 *
 * Состояние enabled обычно определяет, участвует ли объект
 * в update, render, input или другой runtime-обработке.
 *
 * Используется для слоёв, систем, инструментов, модулей,
 * контроллеров и других runtime-объектов.
 */
export interface IEnableable {
    /**
     * Returns whether the object is enabled.
     *
     * Возвращает, включён ли объект.
     */
    isEnabled(): boolean;

    /**
     * Enables the object.
     *
     * Включает объект.
     */
    enable(): void;

    /**
     * Disables the object.
     *
     * Отключает объект.
     */
    disable(): void;

    /**
     * Enables or disables the object.
     *
     * Включает или отключает объект.
     */
    setEnabled(value: boolean): void;
}