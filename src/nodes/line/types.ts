import type { Vector2 } from '../../core/transform/types';
import type { IShapeBase } from '../shape';

export enum LineCap {
    Round = 'round',
    Square = 'square',
    Butt = 'butt',
}

export enum LineEnding {
    None = 'none',
    LineArrow = 'line-arrow',
    TriangleArrow = 'triangle-arrow',
    ReversedTriangle = 'reversed-triangle',
    CircleArrow = 'circle-arrow',
    DiamondArrow = 'diamond-arrow',
}

export interface INodeLine extends IShapeBase {
    /**
     * Returns the start point of the line in local space.
     *
     * Возвращает начальную точку линии в локальном пространстве.
     */
    getStart(): Vector2;

    /**
     * Sets the start point of the line in local space.
     *
     * Updating the start point may also update the derived bounds
     * of the line node so that the container remains consistent
     * with the line geometry.
     *
     * Устанавливает начальную точку линии в локальном пространстве.
     *
     * Изменение начальной точки также может обновить производные границы
     * ноды линии, чтобы контейнер оставался согласованным
     * с геометрией линии.
     */
    setStart(value: Vector2): void;

    /**
     * Returns the end point of the line in local space.
     *
     * Возвращает конечную точку линии в локальном пространстве.
     */
    getEnd(): Vector2;

    /**
     * Sets the end point of the line in local space.
     *
     * Updating the end point may also update the derived bounds
     * of the line node so that the container remains consistent
     * with the line geometry.
     *
     * Устанавливает конечную точку линии в локальном пространстве.
     *
     * Изменение конечной точки также может обновить производные границы
     * ноды линии, чтобы контейнер оставался согласованным
     * с геометрией линии.
     */
    setEnd(value: Vector2): void;



    /*********************************************************/
    /*                         Stroke                        */
    /*********************************************************/

    /**
     * Returns the stroke thickness of the line.
     *
     * Возвращает толщину обводки линии.
     */
    getStrokeThickness(): number;

    /**
     * Sets the stroke thickness of the line.
     *
     * Устанавливает толщину обводки линии.
     */
    setStrokeThickness(value: number): void;



    /*********************************************************/
    /*                     Stroke Endings                    */
    /*********************************************************/

    /**
     * Returns the stroke cap style at the start of the line.
     *
     * Возвращает стиль окончания линии в начальной точке.
     */
    getLineCapStart(): LineCap;

    /**
     * Sets the stroke cap style at the start of the line.
     *
     * Устанавливает стиль окончания линии в начальной точке.
     */
    setLineCapStart(value: LineCap): void;

    /**
     * Returns the stroke cap style at the end of the line.
     *
     * Возвращает стиль окончания линии в конечной точке.
     */
    getLineCapEnd(): LineCap;

    /**
     * Sets the stroke cap style at the end of the line.
     *
     * Устанавливает стиль окончания линии в конечной точке.
     */
    setLineCapEnd(value: LineCap): void;

    /**
     * Returns the decorative ending applied to the start of the line.
     *
     * Возвращает декоративное окончание, применённое к началу линии.
     */
    getStartEnding(): LineEnding;

    /**
     * Sets the decorative ending applied to the start of the line.
     *
     * Устанавливает декоративное окончание для начала линии.
     */
    setStartEnding(value: LineEnding): void;

    /**
     * Returns the decorative ending applied to the end of the line.
     *
     * Возвращает декоративное окончание, применённое к концу линии.
     */
    getEndEnding(): LineEnding;

    /**
     * Sets the decorative ending applied to the end of the line.
     *
     * Устанавливает декоративное окончание для конца линии.
     */
    setEndEnding(value: LineEnding): void;



    /*********************************************************/
    /*                        Overrides                      */
    /*********************************************************/

    /**
     * Sets the width of the line container.
     *
     * Unlike box-based shapes, changing the line width does not change
     * the stroke thickness. Instead, the line segment is rescaled
     * horizontally inside its local container so that the line geometry
     * stretches with the box.
     *
     * Устанавливает ширину контейнера линии.
     *
     * В отличие от прямоугольных фигур, изменение ширины линии
     * не меняет толщину обводки. Вместо этого сегмент линии
     * масштабируется по горизонтали внутри своего локального контейнера,
     * чтобы геометрия линии растягивалась вместе с боксом.
     */
    setWidth(value: number): void;

    /**
     * Sets the height of the line container.
     *
     * Unlike box-based shapes, changing the line height does not change
     * the stroke thickness. Instead, the line segment is rescaled
     * vertically inside its local container so that the line geometry
     * stretches with the box.
     *
     * Устанавливает высоту контейнера линии.
     *
     * В отличие от прямоугольных фигур, изменение высоты линии
     * не меняет толщину обводки. Вместо этого сегмент линии
     * масштабируется по вертикали внутри своего локального контейнера,
     * чтобы геометрия линии растягивалась вместе с боксом.
     */
    setHeight(value: number): void;

    /**
     * Sets the size of the line container.
     *
     * The line geometry is rescaled inside the local container so that
     * the start and end points remain proportionally positioned
     * within the updated bounds. The stroke thickness is not affected.
     *
     * Устанавливает размер контейнера линии.
     *
     * Геометрия линии масштабируется внутри локального контейнера так,
     * чтобы начальная и конечная точки сохраняли пропорциональное положение
     * в обновлённых границах. Толщина обводки при этом не изменяется.
     */
    setSize(width: number, height: number): void;

    /**
     * Performs a hit test against the actual line shape using world-space coordinates.
     *
     * The method first performs a fast bounding-box check and then transforms
     * the world point into the line's local space. After that, it checks
     * the distance from the point to the line segment, taking the stroke
     * thickness into account. Depending on the line cap style, the hit area
     * may also include round or square extensions at the line ends.
     *
     * Выполняет проверку попадания по реальной форме линии,
     * используя координаты мирового пространства.
     *
     * Сначала метод выполняет быструю проверку по ограничивающему прямоугольнику,
     * затем преобразует мировую точку в локальное пространство линии.
     * После этого проверяется расстояние от точки до сегмента линии
     * с учётом толщины обводки. В зависимости от стиля окончания линии,
     * область попадания также может включать круглые или квадратные
     * продолжения на концах линии.
     */
    hitTest(worldPoint: Vector2): boolean;
}
