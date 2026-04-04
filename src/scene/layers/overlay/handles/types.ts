export interface ILayerOverlayHandle {
    /**
     * Returns handler type.
     *
     * Возвращает тип хендлера.
     */
    getType(): string;

    /**
     * Returns whether handler is enabled.
     *
     * Возвращает, включён ли хендлер.
     */
    isEnabled(): boolean;

    /**
     * Enables or disables handler.
     *
     * Включает или выключает хендлер.
     */
    setEnabled(value: boolean): void;

    /**
     * Clears handler runtime state.
     *
     * Очищает runtime-состояние хендлера.
     */
    clear(): void;

    /**
     * Destroys handler.
     *
     * Уничтожает хендлер.
     */
    destroy(): void;
}

export interface ILayerOverlayHandleManager {
    /**
     * Returns all registered handlers.
     *
     * Возвращает все зарегистрированные хендлеры.
     */
    getHandlers(): ILayerOverlayHandle[];

    /**
     * Registers a handler.
     *
     * Регистрирует хендлер.
     */
    register(handler: ILayerOverlayHandle): void;

    /**
     * Returns handler by type.
     *
     * Возвращает хендлер по типу.
     */
    get(type: string): ILayerOverlayHandle | null;

    /**
     * Returns true if handler exists.
     *
     * Возвращает true, если хендлер существует.
     */
    has(type: string): boolean;

    /**
     * Removes handler by type.
     *
     * Удаляет хендлер по типу.
     */
    remove(type: string): boolean;

    /**
     * Clears all handlers runtime state.
     *
     * Очищает runtime-состояние всех хендлеров.
     */
    clear(): void;

    /**
     * Destroys all handlers.
     *
     * Уничтожает все хендлеры.
     */
    destroy(): void;
}