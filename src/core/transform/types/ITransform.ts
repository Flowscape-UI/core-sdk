import type { Matrix } from "./Matrix";
import type { Vector2 } from "./Vector2";


/**
 * ITransform defines a local 2D transformation contract.
 *
 * A transform describes how an object is positioned, rotated,
 * scaled and pivoted in its **local coordinate space**.
 *
 * World-space transformations (parent hierarchy, world matrices)
 * are handled externally.
 *
 * @example Basic usage
 * ```ts
 * const transform: ITransform = new Transform();
 *
 * transform.setPosition(100, 50);
 * transform.setRotation(Math.PI / 4);
 * transform.setScale(2, 2);
 * ```
 */
export interface ITransform {
    /*****************************************************************/
    /*                           Position                            */
    /*****************************************************************/

    /**
     * Returns the X position in local space.
     * Возвращает позицию по оси X в локальном пространстве.
     */
    getX(): number;

    /**
     * Returns the Y position in local space.
     * Возвращает позицию по оси Y в локальном пространстве.
     */
    getY(): number;

    /**
     * Returns the full position as a vector.
     * Возвращает полную позицию в виде вектора.
     */
    getPosition(): Vector2;

    /**
     * Sets the X position in local space.
     * Устанавливает позицию по оси X в локальном пространстве.
     */
    setX(value: number): void;

    /**
     * Sets the Y position in local space.
     * Устанавливает позицию по оси Y в локальном пространстве.
     */
    setY(value: number): void;

    /**
     * Sets the position using X and Y values.
     * Устанавливает позицию по осям X и Y.
     */
    setPosition(x: number, y: number): void;

    /**
     * Moves the position along the X axis by a given offset.
     * Смещает позицию по оси X на заданное значение.
     */
    translateX(value: number): void;

    /**
     * Moves the position along the Y axis by a given offset.
     * Смещает позицию по оси Y на заданное значение.
     */
    translateY(value: number): void;

    /**
     * Moves the position by a given offset on both axes.
     * Смещает позицию по осям X и Y на заданные значения.
     */
    translate(dx: number, dy: number): void;



    /*****************************************************************/
    /*                             Scale                             */
    /*****************************************************************/

    /**
     * Returns the scale value on the X axis.
     * Возвращает масштаб по оси X.
     */
    getScaleX(): number;

    /**
     * Returns the scale value on the Y axis.
     * Возвращает масштаб по оси Y.
     */
    getScaleY(): number;

    /**
     * Returns the full scale as a vector.
     * Возвращает масштаб в виде вектора.
     */
    getScale(): Vector2;

    /**
     * Sets the scale value on the X axis.
     * Устанавливает масштаб по оси X.
     */
    setScaleX(value: number): void;

    /**
     * Sets the scale value on the Y axis.
     * Устанавливает масштаб по оси Y.
     */
    setScaleY(value: number): void;

    /**
     * Sets the scale using X and Y values.
     * Устанавливает масштаб по осям X и Y.
     */
    setScale(sx: number, sy: number): void;



    /*****************************************************************/
    /*                           Rotation                            */
    /*****************************************************************/

    /**
     * Returns the rotation in radians.
     * Возвращает угол поворота в радианах.
     */
    getRotation(): number;

    /**
     * Sets the rotation in radians.
     * Устанавливает угол поворота в радианах.
     */
    setRotation(value: number): void;

    /**
     * Sets the rotation in radians of the last setted value.
     * Устанавливает угол поворота в радианах от последнего сохранённого угла.
     */
    rotate(delta: number): void;



    /*****************************************************************/
    /*                            Pivot                              */
    /*****************************************************************/

    /**
     * Returns the pivot X (normalized, usually 0..1).
     * Возвращает pivot по оси X (нормализованное значение, обычно 0..1).
     */
    getPivotX(): number;

    /**
     * Returns the pivot Y (normalized, usually 0..1).
     * Возвращает pivot по оси Y (нормализованное значение, обычно 0..1).
     */
    getPivotY(): number;

    /**
     * Returns the pivot as a vector.
     * Возвращает pivot в виде вектора.
     */
    getPivot(): Vector2;

    /**
     * Sets the pivot X (normalized).
     * Устанавливает pivot по оси X (нормализованное значение).
     */
    setPivotX(value: number): void;

    /**
     * Sets the pivot Y (normalized).
     * Устанавливает pivot по оси Y (нормализованное значение).
     */
    setPivotY(value: number): void;

    /**
     * Sets the pivot using X and Y values (normalized).
     * Устанавливает pivot по осям X и Y (нормализованные значения).
     */
    setPivot(px: number, py: number): void;



    /*****************************************************************/
    /*                         Local Matrix                          */
    /*****************************************************************/

    /**
     * Computes the local transformation matrix for the object.
     *
     * This matrix combines position, scale, rotation and pivot into a single structure
     * that can be used by the renderer to correctly transform the object in space.
     *
     * The width and height are required to convert the normalized pivot (0..1)
     * into actual local coordinates.
     *
     * In simple terms:
     * - position moves the object
     * - scale resizes it
     * - rotation rotates it
     * - pivot defines the point around which transformations happen
     *
     * The resulting matrix is then used to render the object on the canvas.
     *
     * Вычисляет локальную матрицу трансформации объекта.
     *
     * Эта матрица объединяет позицию, масштаб, поворот и pivot
     * в одну структуру, которая используется рендерером для правильного
     * преобразования объекта в пространстве.
     *
     * Ширина и высота нужны для перевода нормализованного pivot (0..1)
     * в реальные локальные координаты.
     *
     * Проще говоря:
     * - position перемещает объект
     * - scale изменяет размер
     * - rotation вращает
     * - pivot задаёт точку, относительно которой происходят трансформации
     *
     * Итоговая матрица используется при отрисовке объекта.
     */
    getLocalMatrix(width: number, height: number): Matrix;
}