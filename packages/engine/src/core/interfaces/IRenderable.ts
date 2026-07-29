/**
 * Represents an object that can be rendered to the screen.
 *
 * Представляет объект, который можно отрендерить на экран.
 * @example
 * renderer.render();
 */
export interface IRenderable {
    /**
     * Renders the object to the screen.
     *
     * Рендерит объект на экран.
     * @example
     * renderer.render();
     */
    render(): void;
}