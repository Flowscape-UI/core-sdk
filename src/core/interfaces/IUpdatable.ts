/**
 * Represents an object that can be updated on each frame or tick.
 *
 * Представляет объект, который можно обновлять на каждом кадре или тике.
 * @example
 * updatable.update();
 */
export interface IUpdatable {
    /**
     * Updates the object state for the current frame or tick.
     *
     * Обновляет состояние объекта для текущего кадра или тика.
     * @example
     * updatable.update();
     */
    update(): void;
}