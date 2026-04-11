import type { INode } from "../../nodes";

/**
 * Base renderer interface.
 *
 * Базовый интерфейс рендерера.
 */
export interface IRenderer {
    /**
     * Updates internal rendering data before drawing.
     *
     * Обновляет внутренние данные рендера перед отрисовкой.
     * @example
     * renderer.update();
     */
    update(): void;

    /**
     * Draws content to the rendering backend.
     *
     * Выполняет отрисовку в графический backend.
     * @example
     * renderer.render();
     */
    render(): void;

    /**
     * Destroys renderer resources.
     *
     * Освобождает ресурсы рендерера.
     * @example
     * renderer.destroy();
     */
    destroy(): void;
}

/**
 * Renderer that can be attached to a specific target.
 *
 * Рендерер, который может быть привязан к целевому объекту.
 */
export interface IBindableRenderer<TTarget> extends IRenderer {
    /**
     * Attaches renderer to a target.
     *
     * Привязывает рендерер к целевому объекту.
     * @example
     * renderer.attach(scene);
     */
    attach(target: TTarget): void;

    /**
     * Detaches renderer from the current target.
     *
     * Отвязывает рендерер от текущего объекта.
     * @example
     * renderer.detach();
     */
    detach(): void;
}


/**
 * Base node renderer interface.
 *
 * Базовый интерфейс рендерера ноды.
 */
export interface IRendererNode<
    TNode extends INode = INode,
    TView = unknown
> {
    /**
     * Creates a backend view for the node.
     *
     * Создаёт backend-представление для ноды.
     */
    create(node: TNode): TView;

    /**
     * Updates the backend view using node state.
     *
     * Обновляет backend-представление на основе состояния ноды.
     */
    update(node: TNode, view: TView): void;

    /**
     * Optional cleanup hook before the view is destroyed.
     *
     * Необязательный хук очистки перед уничтожением представления.
     */
    destroy?(node: TNode, view: TView): void;
}