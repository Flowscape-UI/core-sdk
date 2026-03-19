import type { IShapeBase } from "../shape";

export interface INodeEllipse extends IShapeBase {
    /*********************************************************/
    /*                         Ratio                         */
    /*********************************************************/

    /**
     * Returns the inner ratio of the ellipse.
     * A value greater than 0 creates a donut-like shape.
     *
     * Возвращает внутреннее соотношение эллипса.
     * Значение больше 0 создаёт форму кольца (donut).
     */
    getInnerRatio(): number;

    /**
     * Sets the inner ratio of the ellipse.
     * The value is clamped to the range [0, 0.999].
     *
     * Устанавливает внутреннее соотношение эллипса.
     * Значение ограничивается диапазоном [0, 0.999].
     */
    setInnerRatio(value: number): void;


    /*********************************************************/
    /*                         Angle                         */
    /*********************************************************/

    /**
     * Returns the start angle of the ellipse arc in degrees.
     *
     * Возвращает начальный угол дуги эллипса в градусах.
     */
    getStartAngle(): number;

    /**
     * Sets the start angle of the ellipse arc in degrees.
     *
     * Устанавливает начальный угол дуги эллипса в градусах.
     */
    setStartAngle(value: number): void;


    /**
     * Returns the end angle of the ellipse arc in degrees.
     *
     * Возвращает конечный угол дуги эллипса в градусах.
     */
    getEndAngle(): number;

    /**
     * Sets the end angle of the ellipse arc in degrees.
     *
     * Устанавливает конечный угол дуги эллипса в градусах.
     */
    setEndAngle(value: number): void;


    /**
     * Returns the sweep angle of the ellipse arc, in degrees.
     * The sweep angle is calculated as endAngle - startAngle.
     *
     * Возвращает угол дуги эллипса в градусах.
     * Угол дуги вычисляется как endAngle - startAngle.
     */
    getSweepAngle(): number;
}