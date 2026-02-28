export * from './ICamera';

/**
 * Represents a 2D point or vector.
 *
 * Представляет точку или вектор в 2D пространстве.
 */
export type Point = {
    /**
     * X coordinate (can be world units or pixels).
     *
     * Координата X (может быть в мировых единицах или пикселях). 
     */
    x: number;

    /**
     * Y coordinate (can be world units or pixels).
     *
     * Координата Y (может быть в мировых единицах или пикселях). 
     */
    y: number;
};

/**
 * Defines the complete state of the 2D camera.
 *
 * Определяет полное состояние 2D камеры.
 */
export type CameraState = {
    /**
     * The X coordinate in the world space that is currently at the center of the screen.
     *
     * Координата X в мировом пространстве, которая в данный момент находится в центре экрана.
     * @example 0
     */
    x: number;

    /**
     * The Y coordinate in the world space that is currently at the center of the screen.
     *
     * Координата Y в мировом пространстве, которая в данный момент находится в центре экрана.
     * @example 0
     */
    y: number;

    /**
     * Zoom level where 1.0 is 100% scale.
     *
     * Уровень масштабирования, где 1.0 - это масштаб 100%.
     * @example 1.0
     */
    scale: number;

    /**
     * Camera rotation angle in radians.
     *
     * Угол поворота камеры в радианах.
     * @example
     * // Degrees to Radians
     * const radian = deg * (Math.PI / 180);
     *
     * // Radians to Degrees
     * const degree = rad * (180 / Math.PI);
     * 
     * @example
     * // 90 degrees
     * rotation: Math.PI / 2 
     * 
     * @example
     * // 180 degrees
     * rotation: Math.PI 
    */
    rotation: number;
};


/**
 * Represents the dimensions of the visible area (canvas/container).
 *
 * Представляет размеры видимой области (холста или контейнера).
 */
export type Viewport = {
    /**
     * Width of the viewport in pixels.
     *
     * Ширина области просмотра в пикселях. 
     */
    width: number;
    
    /**
     * Height of the viewport in pixels.
     *
     * Высота области просмотра в пикселях. 
     */
    height: number;
};