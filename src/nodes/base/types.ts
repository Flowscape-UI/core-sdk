import type { ITransform, Matrix, Vector2 } from "../../core/transform/types";

export type ID = string | number;
export enum NodeType {
    Base = "base-node",
    Group = "group-node",
    Rect = "rect-node",
    Ellipse = "ellipse-node",
    Star = "star-node",
    Polygon = "polygon-node",
    Line = "line-node",
    Text = "text-node",
    Frame = "frame-node",
    Image = "image-node",
    Video = "video-node",
    Path = "path-node",
}

export type Size = {
    width: number,
    height: number,
}

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type OrientedRect = {
    center: Vector2;
    width: number;
    height: number;
    rotation: number;
}

export interface NodeJSON {
    id: ID;
    type: NodeType;
    name: string;

    x: number;
    y: number;

    width: number;
    height: number;

    rotation: number;

    scaleX: number;
    scaleY: number;

    visible: boolean;
    locked: boolean;

    parentId: ID | null;
    children: ID[];
}


/**
 * Base interface for all scene graph objects.
 *
 * Базовый интерфейс для всех объектов графа сцены.
 */
export interface INode extends ITransform {
    /**
     * Unique identifier of the node.
     *
     * Уникальный идентификатор ноды.
     */
    readonly id: ID;

    /**
     * Functional type of the node.
     *
     * Функциональный тип ноды.
     */
    readonly type: NodeType;

    /**
     * Returns global opacity. Background opacity does not affects it
     *
     * Возвращает глобальную прозрачность. Эта прозрачность не зависит от прозрачности заднего фона
     */
    getOpacity(): number;

    /**
     * Marks this node as dirty and triggers full invalidation of cached data.
     *
     * The method invalidates the world transform cache of this node and all
     * its descendants, forcing their world matrices to be recomputed when requested.
     * It also invalidates hierarchy bounds caches upward through the parent chain.
     *
     * This is typically called when the node's transform or size changes.
     *
     * Помечает узел как "грязный" и запускает полную инвалидацию кэшированных данных.
     *
     * Метод инвалидирует кэш мировой матрицы этого узла и всех его потомков,
     * что заставляет пересчитать их мировые трансформации при следующем запросе.
     * Также он инвалидирует кэш границ иерархии вверх по цепочке родителей.
     *
     * Обычно вызывается, когда изменяется трансформация или размер узла.
     */
    setOpacity(value: number): void;

    /**
     * Marks this node as dirty and triggers full invalidation of cached data.
     *
     * The method invalidates the world transform cache of this node and all
     * its descendants, forcing their world matrices to be recomputed when requested.
     * It also invalidates hierarchy bounds caches upward through the parent chain.
     *
     * This is typically called when the node's transform or size changes.
     *
     * Помечает узел как "грязный" и запускает полную инвалидацию кэшированных данных.
     *
     * Метод инвалидирует кэш мировой матрицы этого узла и всех его потомков,
     * что заставляет пересчитать их мировые трансформации при следующем запросе.
     * Также он инвалидирует кэш границ иерархии вверх по цепочке родителей.
     *
     * Обычно вызывается, когда изменяется трансформация или размер узла.
     */
    setDirty(): void;

    /**
     * Invalidates hierarchy bounds cache for this node and its ancestors.
     *
     * This method marks cached hierarchy bounds as outdated without affecting
     * transform caches. It should be used when geometry or visibility changes,
     * but the node's transform remains the same.
     *
     * Инвалидирует кэш границ иерархии для этого узла и его родителей.
     *
     * Метод помечает кэш границ иерархии как устаревший, не затрагивая кэш
     * трансформаций. Используется в случаях, когда изменилась геометрия
     * или видимость, но сама трансформация узла осталась прежней.
     */
    setHierarchyBoundsDirty(): void;

    /**
     * Recursively traverses the hierarchy starting from this node.
     *
     * Рекурсивно обходит иерархию, начиная с этой ноды.
     * @param callback - Function to execute for each node. Return false to stop depth traversal.
     */
    traverse(callback: (node: INode) => void | boolean): void;


    /********************************************************************/
    /*                        Basic Functinality                        */
    /********************************************************************/

    /**
     * Returns the sanitized node name.
     *
     * Возвращает очищенное имя ноды.
     */
    getName(): string;

    /**
     * Sets a new name for the node (will be sanitized). 
     *
     * Устанавливает новое имя ноды (будет подвергнуто очистке). 
     * @param value - The new name string. / Новая строка имени.
     */
    setName(value: string): void;

    /**
     * Returns the local width of the node.
     *
     * Возвращает локальную ширину ноды.
     */
    getWidth(): number;

    /**
     * Sets the local width. Triggers invalidation.
     *
     * Устанавливает локальную ширину. Запускает инвалидацию.
     * @param value - New width value. / Новое значение ширины.
     */
    setWidth(value: number): void;

    /**
     * Returns the local height of the node.
     *
     * Возвращает локальную высоту ноды.
     */
    getHeight(): number;

    /**
     * Sets the local height. Triggers invalidation.
     *
     * Устанавливает локальную высоту. Запускает инвалидацию.
     * @param value - New height value. / Новое значение высоты.
     */
    setHeight(value: number): void;

    /**
     * Returns both width and height.
     *
     * Возвращает одновременно ширину и высоту.
     */
    getSize(width: number, height: number): Size;


    /**
     * Sets both width and height.
     *
     * Устанавливает одновременно ширину и высоту.
     * @param width - New width. / Новая ширина.
     * @param height - New height. / Новая высота.
     */
    setSize(width: number, height: number): void;

    /**
     * Returns the width after applying scale on the X axis.
     * This does not include rotation or other transformations.
     *
     * Возвращает ширину с учётом масштаба по оси X.
     * Не учитывает поворот и другие трансформации.
     */
    getScaledWidth(): number;

    /**
     * Returns the height after applying scale on the Y axis.
     * This does not include rotation or other transformations.
     *
     * Возвращает высоту с учётом масштаба по оси Y.
     * Не учитывает поворот и другие трансформации.
     */
    getScaledHeight(): number;

    /**
     * Returns the scaled size as a vector (width and height after scale).
     * This is a simplified size and does not represent the final bounds
     * when rotation or other transforms are applied.
     *
     * Возвращает размер с учётом масштаба в виде вектора (ширина и высота).
     * Это упрощённый размер, который не отражает итоговые границы
     * при наличии поворота или других трансформаций.
     */
    getScaledSize(): Size;


    /**
     * Returns the local visibility state.
     *
     * Возвращает состояние локальной видимости.
     */
    isVisible(): boolean;

    /**
     * Checks if the node is visible considering all its ancestors.
     *
     * Проверяет, видна ли нода с учетом всех её предков.
     */
    isVisibleInHierarchy(): boolean;

    /**
     * Sets the local visibility.
     *
     * Устанавливает локальную видимость.
     * @param value - Visibility flag. / Флаг видимости.
     */
    setVisible(value: boolean): void;

    /**
     * Returns the local lock state.
     *
     * Возвращает состояние локальной блокировки.
     */
    isLocked(): boolean;

    /**
     * Checks if the node is locked considering all its ancestors.
     *
     * Проверяет, заблокирована ли нода с учетом всех её предков.
     */
    isLockedInHierarchy(): boolean;

    /**
     * Sets the local lock state.
     *
     * Устанавливает локальное состояние блокировки.
     * @param value - Lock flag. / Флаг блокировки.
     */
    setLocked(value: boolean): void;


    /**
     * Computes and returns the world transformation matrix for this node.
     *
     * The world matrix is obtained by combining the node's local transform
     * with the transforms of all parent nodes in the hierarchy.
     *
     * worldMatrix = parentWorldMatrix * localMatrix
     *
     * The result is cached and recomputed only when the node is marked as dirty,
     * preventing unnecessary matrix multiplications during rendering or updates.
     *
     * Вычисляет и возвращает матрицу преобразования мира для этого узла.
     *
     * Матрица преобразования мира получается путем объединения локального преобразования узла
     * с преобразованиями всех родительских узлов в иерархии.
     *
     * worldMatrix = parentWorldMatrix * localMatrix
     *
     * Результат кэшируется и пересчитывается только тогда, когда узел помечен как загрязненный,
     * что предотвращает ненужное умножение матрицы во время рендеринга или обновления.
     */
    getWorldMatrix(): Matrix;


    /**
     * Computes and returns the world rotation for this node.
     *
     * The world rotation represents the final rotation of the node
     * in world space, taking into account its own local rotation
     * and the rotations of all parent nodes in the hierarchy.
     *
     * worldRotation = parentRotation + localRotation
     *
     * The value is calculated by accumulating the rotation of each
     * parent node up the hierarchy until the root is reached.
     *
     * Вычисляет и возвращает поворот этого узла в мировом пространстве.
     *
     * Мировой поворот представляет итоговый угол поворота узла,
     * учитывая его собственный локальный поворот и повороты всех
     * родительских узлов в иерархии.
     *
     * worldRotation = parentRotation + localRotation
     *
     * Значение вычисляется путем суммирования поворотов каждого
     * родительского узла вверх по иерархии до достижения корневого узла.
     */
    getWorldRotation(): number;


    /**
     * Computes and returns the four corner points of this node's bounding rectangle in world space.
     *
     * The corners are obtained by transforming the local bounding rectangle
     * of the node using its world transformation matrix.
     *
     * The returned points are ordered clockwise starting from the top-left corner:
     *
     * 0 → top-left
     * 1 → top-right
     * 2 → bottom-right
     * 3 → bottom-left
     *
     * These points can be used for computing world bounds, selection boxes,
     * resize handles, and other editor-related operations.
     *
     * Вычисляет и возвращает четыре угловые точки ограничивающего прямоугольника
     * этого узла в мировом пространстве.
     *
     * Углы получаются путем преобразования локального прямоугольника
     * узла с использованием его мировой матрицы трансформации.
     *
     * Возвращаемые точки упорядочены по часовой стрелке,
     * начиная с верхнего левого угла:
     *
     * 0 → верхний левый
     * 1 → верхний правый
     * 2 → нижний правый
     * 3 → нижний левый
     *
     * Эти точки могут использоваться для вычисления мировых границ,
     * рамки выделения, хендлеров изменения размера и других операций редактора.
     */
    getWorldCorners(): [Vector2, Vector2, Vector2, Vector2];




    /********************************************************************/
    /*                        Parent Controller                         */
    /********************************************************************/

    /**
     * Returns the parent node or null if it's a root.
     *
     * Возвращает родительскую ноду или null, если это корень.
     */
    getParent(): INode | null;

    /**
     * Sets a new parent and handles hierarchy updates.
     *
     * Устанавливает нового родителя и обновляет иерархию.
     * @param parent - The new parent node. / Новая родительская нода.
     */
    setParent(parent: INode): void;

    /**
     * Removes the current parent, making this node a root.
     *
     * Удаляет текущего родителя, делая ноду корневой.
     */
    removeParent(): void;



    /********************************************************************/
    /*                       Children Controller                        */
    /********************************************************************/

    /**
     * Returns a read-only array of children.
     *
     * Возвращает массив детей только для чтения.
     */
    getChildren(): readonly INode[];

    /**
     * Adds a child node. Prevents cycles and self-addition.
     *
     * Добавляет дочернюю ноду. Предотвращает циклы и добавление самого себя.
     * @param child - The node to add. / Нода для добавления.
     */
    addChild(child: INode): void;

    /**
     * Removes a child node.
     *
     * Удаляет дочернюю ноду.
     * @param child - The node to remove. / Нода для удаления.
     */
    removeChild(child: INode): void;


    /********************************************************************/
    /*                              Bounds                              */
    /********************************************************************/

    /**
     * Returns the local oriented bounding box (OBB) of this node.
     *
     * The bounds are defined in the node's local coordinate space and
     * represent the rectangular area occupied by the node itself.
     *
     * The rectangle is not affected by parent transforms and always starts
     * at the local origin (0, 0) with the node's width and height.
     *
     * Возвращает ориентированный ограничивающий прямоугольник (OBB)
     * этого узла в локальном пространстве координат.
     *
     * Границы определяются в локальной системе координат узла и
     * представляют прямоугольную область, занимаемую самим узлом.
     *
     * Прямоугольник не зависит от трансформаций родительских узлов
     * и всегда начинается в локальной точке (0, 0) с шириной и высотой узла.
     */
    getLocalOBB(): Rect;

    /**
     * Computes and returns the oriented bounding box (OBB) of this node in world space.
     *
     * The world OBB represents the node's bounds after applying all transforms
     * in the hierarchy, including translation, rotation, and scale.
     *
     * The resulting rectangle preserves its orientation in world space and
     * therefore is not axis-aligned.
     *
     * Вычисляет и возвращает ориентированный ограничивающий прямоугольник (OBB)
     * этого узла в мировом пространстве.
     *
     * Мировой OBB представляет границы узла после применения всех трансформаций
     * в иерархии, включая перемещение, поворот и масштаб.
     *
     * Полученный прямоугольник сохраняет свою ориентацию в мировом пространстве
     * и поэтому не выровнен по осям.
     */
    getWorldOBB(): OrientedRect;

    /**
     * Computes and returns the axis-aligned bounding box (AABB) of this node in world space.
     *
     * The AABB is calculated from the node's world-space corner points and
     * represents the smallest axis-aligned rectangle that fully contains the node.
     *
     * This type of bounds is commonly used for fast hit-testing, visibility checks,
     * and spatial queries.
     *
     * Вычисляет и возвращает ограничивающий прямоугольник,
     * выровненный по осям (AABB), этого узла в мировом пространстве.
     *
     * AABB вычисляется на основе мировых угловых точек узла и
     * представляет наименьший прямоугольник, выровненный по осям,
     * который полностью содержит узел.
     *
     * Такой тип границ часто используется для быстрого hit-test,
     * проверки видимости и пространственных запросов.
     */
    getWorldAABB(): Rect;


    /**
     * Computes and returns the local oriented bounding box (OBB)
     * that contains this node and all of its descendants.
     *
     * The bounds are expressed in the local coordinate space of this node.
     * Each child node's bounds are transformed using its local transform
     * relative to this node.
     *
     * Вычисляет и возвращает локальный ориентированный ограничивающий
     * прямоугольник (OBB), который содержит этот узел и всех его потомков.
     *
     * Границы выражаются в локальной системе координат текущего узла.
     * Границы дочерних узлов преобразуются с использованием их локальных
     * трансформаций относительно данного узла.
     */
    getHierarchyLocalOBB(): Rect;

    /**
     * Computes and returns the oriented bounding box (OBB) of this node's
     * entire hierarchy in world space.
     *
     * The bounds include this node and all of its descendants and are
     * transformed into world space using the node's world transform.
     *
     * This rectangle preserves its orientation in world space.
     *
     * Вычисляет и возвращает ориентированный ограничивающий прямоугольник (OBB)
     * всей иерархии узла в мировом пространстве.
     *
     * Границы включают текущий узел и всех его потомков и
     * преобразуются в мировое пространство с использованием
     * мировой трансформации узла.
     *
     * Этот прямоугольник сохраняет свою ориентацию в мировом пространстве.
     */
    getHierarchyWorldOBB(): OrientedRect;

    /**
     * Computes and returns the axis-aligned bounding box (AABB)
     * of this node's entire hierarchy in world space.
     *
     * The bounds include this node and all descendant nodes and represent
     * the smallest axis-aligned rectangle that fully contains the hierarchy.
     *
     * This is commonly used for fast spatial queries, culling, and selection.
     *
     * Вычисляет и возвращает ограничивающий прямоугольник,
     * выровненный по осям (AABB), всей иерархии узла в мировом пространстве.
     *
     * Границы включают текущий узел и всех его потомков и представляют
     * наименьший прямоугольник, выровненный по осям, который полностью
     * содержит всю иерархию.
     *
     * Обычно используется для быстрых пространственных запросов,
     * отсечения (culling) и выделения объектов.
     */
    getHierarchyWorldAABB(): Rect;


    /**
     * Performs a hit test against this node using world-space coordinates.
     *
     * The method checks whether the given point in world space lies within
     * the node's geometry. Internally, the point is transformed into the
     * node's local coordinate space using the inverse world matrix, and
     * then tested against the node's local bounds.
     *
     * This method is commonly used for selection, interaction, and editor tools.
     *
     * Выполняет проверку попадания в ноду, используя координаты мирового пространства.
     *
     * Метод проверяет, находится ли переданная точка в мировых координатах
     * внутри геометрии узла. Для этого точка преобразуется в локальную систему
     * координат узла с помощью обратной мировой матрицы, после чего выполняется
     * проверка попадания в локальные границы узла.
     *
     * Этот метод обычно используется для выделения объектов, взаимодействия
     * и инструментов редактора.
     *
     * @param worldPoint - Point to test in world space.
     */
    hitTest(worldPoint: Vector2): boolean;


    /********************************************************************/
    /*                              Parsing                             */
    /********************************************************************/
    /**
     * Serializes this node into a JSON-compatible representation.
     *
     * The returned object contains the node's core properties such as
     * transform, size, visibility state, and hierarchy references.
     * This method is typically used for saving scenes, exporting data,
     * or transferring node state between systems.
     *
     * Child nodes are represented by their identifiers rather than full objects
     * to avoid recursive serialization of the entire hierarchy.
     *
     * Сериализует этот узел в JSON-совместимое представление.
     *
     * Возвращаемый объект содержит основные свойства узла, такие как
     * трансформация, размеры, состояние видимости и ссылки на иерархию.
     * Этот метод обычно используется для сохранения сцены, экспорта данных
     * или передачи состояния узла между системами.
     *
     * Дочерние узлы представлены только их идентификаторами, а не полными
     * объектами, чтобы избежать рекурсивной сериализации всей иерархии.
     */
    toJSON(): NodeJSON;

}