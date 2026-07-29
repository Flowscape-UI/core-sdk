/**
 * Represents an object that can be attached to and detached from a target.
 *
 * Представляет объект, который можно прикрепить к цели и открепить от неё.
 * @example
 * controller.attach(canvas);
 * controller.detach();
 */
export interface IAttachable<T> {
    /**
     * Attaches the object to the given target.
     *
     * Прикрепляет объект к указанной цели.
     * @example
     * controller.attach(canvas);
     */
    attach(target: T): void;

    /**
     * Detaches the object from the current target.
     *
     * Открепляет объект от текущей цели.
     * @example
     * controller.detach();
     */
    detach(): void;
}