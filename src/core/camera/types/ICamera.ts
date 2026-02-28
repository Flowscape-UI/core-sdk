import type { CameraState, Point } from ".";

/**
 * 2D Camera interface for world transformation management.
 *
 * Интерфейс 2D камеры для управления трансформациями мирового пространства.
 */
export interface ICamera {
    /**
     * Returns the current camera state.
     *
     * Возвращает текущее состояние камеры.
     * @example
     * const { x, y, scale, rotation } = camera.getState();
     */
    getState(): CameraState;

    /**
     * Converts world coordinates to screen (pixel) coordinates.
     *
     * Преобразует мировые координаты в экранные (пиксельные).
     * @example
     * const point = camera.worldToScreen({ x: 100, y: 100 });
     */
    worldToScreen(world: Point): Point;

    /**
     * Converts screen coordinates to world coordinates.
     *
     * Преобразует экранные координаты в мировые.
     * @example
     * const worldPos = camera.screenToWorld({ x: e.clientX, y: e.clientY });
     */
    screenToWorld(screen: Point): Point;

    /**
     * Sets scaling limits to prevent excessive zoom-in or zoom-out.
     *
     * Устанавливает границы масштабирования для ограничения зума.
     * @example
     * camera.setLimits(0.1, 10);
     */
    setLimits(minScale: number, maxScale: number): void;

    /**
     * Sets camera position in world coordinates (center of the screen).
     *
     * Устанавливает позицию камеры в мировых координатах (центр экрана).
     * @example
     * camera.setPosition(0, 0);
     */
    setPosition(x: number, y: number): void;

    /**
     * Sets the scaling factor within predefined limits.
     *
     * Устанавливает коэффициент масштабирования с учетом лимитов.
     * @example
     * camera.setScale(2.0);
     */
    setScale(scale: number): void;

    /**
     * Sets the camera rotation angle in radians.
     *
     * Устанавливает угол поворота камеры в радианах.
     * @example
     * camera.setRotationRadians(Math.PI / 4); // 45 degrees
     */
    setRotationRadians(radians: number): void;

    /**
     * Resets all camera parameters to default values.
     *
     * Сбрасывает все параметры камеры в значения по умолчанию.
     */
    reset(): void;

    /**
     * Updates camera state partially or fully.
     *
     * Выполняет частичное или полное обновление состояния камеры.
     * @example
     * camera.update({ scale: 1.5, x: 200 });
     */
    update(newState: Partial<CameraState>): void;

    /**
     * Moves the camera by screen delta (pixels).
     *
     * Перемещает камеру на основе экранного смещения (в пикселях).
     * @example
     * camera.panByScreen(10, 0); // Move 10px to the right
     */
    panByScreen(dx: number, dy: number): void;

    /**
     * Zooms the camera relative to a specific screen point (e.g., cursor position).
     *
     * Масштабирует камеру относительно точки на экране (например, под курсором).
     * @example
     * camera.zoomAtScreen({ x: 400, y: 300 }, 1.1);
     */
    zoomAtScreen(screenPoint: Point, factor: number): void;

    /**
     * Rotates the camera relative to a specific screen point.
     *
     * Вращает камеру относительно указанной точки на экране.
     * @example
     * camera.rotateAtScreen({ x: 400, y: 300 }, 0.05);
     */
    rotateAtScreen(screenPoint: Point, deltaRadians: number): void;
}