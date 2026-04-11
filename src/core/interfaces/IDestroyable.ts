/**
 * Represents an object that can be explicitly destroyed to free up resources.
 *
 * Представляет объект, который можно явно уничтожить для освобождения ресурсов.
 * @example
 * controller.destroy();
 */
export interface IDestroyable {
    /**
     * Destroys the object and releases all associated resources.
     *
     * Уничтожает объект и освобождает все связанные ресурсы.
     * @example
     * controller.destroy();
     */
    destroy(): void;
}