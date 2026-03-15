import type { IShapeBase } from "../shape";

export interface INodePolygon extends IShapeBase {
    /**
     * Returns the number of sides of the polygon.
     *
     * Возвращает количество сторон полигона.
     */
    getSideCount(): number;

    /**
     * Sets the number of sides of the polygon.
     * The value is clamped to a valid polygon range.
     *
     * Устанавливает количество сторон полигона.
     * Значение ограничивается допустимым диапазоном.
     */
    setSideCount(value: number): void;
}