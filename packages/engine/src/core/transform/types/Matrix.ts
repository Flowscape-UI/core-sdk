/**
 * 2D affine transformation matrix.
 * Represents scale, rotation, and translation in a single structure.
 *
 * Двумерная аффинная матрица трансформации.
 * Представляет масштаб, поворот и смещение в единой структуре.
 *
 * @example
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 */
export interface Matrix {
    /** Horizontal scaling / cosine of rotation. / Горизонтальный масштаб / косинус угла поворота. */
    a: number;

    /** Vertical skew / sine of rotation. / Вертикальный сдвиг / синус угла поворота. */
    b: number;

    /** Horizontal skew / negative sine of rotation. / Горизонтальный сдвиг / отрицательный синус угла поворота. */
    c: number;

    /** Vertical scaling / cosine of rotation. / Вертикальный масштаб / косинус угла поворота. */
    d: number;

    /** Horizontal translation (X offset). / Смещение по горизонтали (по оси X). */
    tx: number;

    /** Vertical translation (Y offset). / Смещение по вертикали (по оси Y). */
    ty: number;
}