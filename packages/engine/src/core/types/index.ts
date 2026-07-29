/**
 * A unique identifier. Can be a string or a number.
 *
 * Уникальный идентификатор. Может быть строкой или числом.
 * @example
 * const id: ID = 'node-1';
 * const id: ID = 42;
 */
export type ID = string | number;


/**
 * Cardinal and intercardinal directions used for handle positioning and resize logic.
 *
 * Основные и промежуточные направления используемые для позиционирования хэндлов и логики ресайза.
 */
export enum Direction {
    /** North / Север */
    N = "n",

    /** South / Юг */
    S = "s",

    /** West / Запад */
    W = "w",

    /** East / Восток */
    E = "e",

    /** North-West / Северо-Запад */
    NW = "nw",

    /** North-East / Северо-Восток */
    NE = "ne",

    /** South-West / Юго-Запад */
    SW = "sw",

    /** South-East / Юго-Восток */
    SE = "se",
}