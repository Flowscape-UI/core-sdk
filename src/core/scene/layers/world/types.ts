import type { ID, IShapeBase, Rect } from "../../../../nodes";
import type { ICamera, Point } from "../../../camera";
import type { ILayerBase } from "../base";

export type BuildTuple<
    T,
    N extends number,
    R extends unknown[] = []
> = R["length"] extends N
    ? R
    : BuildTuple<T, N, [...R, T]>;

export type FixedArray<T, N extends number> = BuildTuple<T, N>;

export type WorldOptions = {
    x: number;
    y: number;
    minScale: number;
    maxScale: number;
};

/**
 * The world layer stores and manages scene nodes.
 * It represents the main editable content of the scene.
 *
 * Мировой слой хранит и управляет нодами сцены.
 * Он представляет основное редактируемое содержимое сцены.
 */
export interface ILayerWorld extends ILayerBase {
    /**
     * Finds a node by its unique identifier.
     * Returns the matching node.
     *
     * Ищет ноду по её уникальному идентификатору.
     * Возвращает найденную ноду.
     */
    findNodeById(id: ID): IShapeBase;

    /**
     * Finds all nodes with the specified name.
     * Returns an array of matching nodes.
     *
     * Ищет все ноды с указанным именем.
     * Возвращает массив найденных нод.
     */
    findNodeByName(name: string): IShapeBase[];

    /**
     * Returns all nodes stored in the world layer.
     *
     * Возвращает все ноды, хранящиеся в мировом слое.
     */
    getNodes(): IShapeBase[];

    /**
     * Replaces the current node collection.
     *
     * Заменяет текущую коллекцию нод.
     */
    setNodes(nodes: IShapeBase[]): void;

    /**
     * Adds a node to the world layer.
     * Returns true if the node was added successfully.
     *
     * Добавляет ноду в мировой слой.
     * Возвращает true, если нода была успешно добавлена.
     */
    addNode(node: IShapeBase): boolean;

    /**
     * Deletes a node by its identifier.
     * Returns true if the node was found and removed.
     *
     * Удаляет ноду по её идентификатору.
     * Возвращает true, если нода была найдена и удалена.
     */
    deleteNode(id: ID): boolean;

    /**
     * Deletes all nodes from the world layer.
     *
     * Удаляет все ноды из мирового слоя.
     */
    deleteNodes(): void;

    /****************************************************************/
    /*                           VIEWPORT                           */
    /****************************************************************/

    /**
     * Returns the four corners of the current viewport in world coordinates.
     *
     * The corners are returned in the following order:
     * top-left, top-right, bottom-right, bottom-left.
     *
     * This method is used for grid rendering, visibility checks,
     * guides, minimap and other systems that need to know which
     * part of the world is currently visible on screen.
     *
     * @returns Fixed array of 4 points in world coordinates.
     *
     *
     * Возвращает четыре угла текущего viewport в мировых координатах.
     *
     * Углы возвращаются в следующем порядке:
     * левый верхний, правый верхний, правый нижний, левый нижний.
     *
     * Этот метод используется для отрисовки сетки, проверки видимости,
     * направляющих, миникарты и других систем, которым нужно знать,
     * какая часть мира сейчас видна на экране.
     *
     * @returns Фиксированный массив из 4 точек в мировых координатах.
     */
    getViewportWorldCorners(): FixedArray<Point, 4>

    /**
     * Returns the axis-aligned bounding box of the current viewport in world space.
     *
     * Unlike getViewportWorldCorners(), this method returns a simple rectangle:
     * { x, y, width, height }.
     *
     * This method is commonly used for visibility checks, culling,
     * and rendering optimization.
     *
     * @returns Viewport rectangle in world coordinates.
     *
     *
     * Возвращает ограничивающий прямоугольник viewport в мировых координатах.
     *
     * В отличие от getViewportWorldCorners(), этот метод возвращает простой прямоугольник:
     * { x, y, width, height }.
     *
     * Этот метод обычно используется для проверки видимости, culling
     * и оптимизации отрисовки.
     *
     * @returns Прямоугольник viewport в мировых координатах.
     */
    getViewportWorldAABB(): Rect;

    /****************************************************************/
    /*                            HIT TEST                          */
    /****************************************************************/

    /**
     * Returns the top-most node under the given world position.
     *
     * The method iterates through nodes from top to bottom (reverse order)
     * and returns the first node that passes the hit test.
     *
     * Returns null if no node is found at the given position.
     *
     * This method is used for hover, selection, dragging and
     * general interaction logic inside the editor.
     *
     * @param worldPoint Point in world coordinates.
     * @returns Top-most node or null.
     *
     *
     * Возвращает верхнюю ноду под указанной мировой координатой.
     *
     * Метод проходит по нодам сверху вниз (в обратном порядке)
     * и возвращает первую ноду, прошедшую hit test.
     *
     * Возвращает null, если по указанной координате нода не найдена.
     *
     * Этот метод используется для hover, выделения, перетаскивания
     * и общей логики взаимодействия в редакторе.
     *
     * @param worldPoint Точка в мировых координатах.
     * @returns Верхняя нода или null.
     */
    findTopNodeAt(worldPoint: Point): IShapeBase | null;

    /****************************************************************/
    /*                             Camera                           */
    /****************************************************************/
    
    /**
     * Returns the camera instance associated with this world.
     *
     * The camera is responsible for coordinate transformations
     * between world space and screen space, as well as pan,
     * zoom and rotation operations.
     *
     * Note: The camera affects how the world is viewed,
     * but does not modify actual world coordinates of nodes.
     *
     * @returns Camera instance.
     *
     *
     * Возвращает камеру, связанную с данным мировым слоем.
     *
     * Камера отвечает за преобразование координат между мировым
     * и экранным пространством, а также за перемещение,
     * масштабирование и вращение.
     *
     * Важно: камера влияет только на отображение мира,
     * но не изменяет реальные мировые координаты нод.
     *
     * @returns Экземпляр камеры.
     */
    getCamera(): ICamera;
}