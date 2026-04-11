import type { Rect } from "../../nodes";

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

/**
 * 2D Camera interface for world transformation management.
 *
 * Интерфейс 2D камеры для управления трансформациями мирового пространства.
 */
export interface ICamera {
    /**
     * Subscribes to camera state changes. Returns an unsubscribe function.
     *
     * Подписывается на изменения состояния камеры. Возвращает функцию отписки.
     * @example
     * const unsubscribe = camera.onChange((state) => console.log(state));
     * // later:
     * unsubscribe();
     */
    onChange(callback: (state: Readonly<CameraState>) => void): () => void;

    /**
     * Returns the current camera state.
     *
     * Возвращает текущее состояние камеры.
     * @example
     * const { x, y, scale, rotation } = camera.getState();
     */
    getState(): CameraState;

    /**
     * Returns the current viewport size in pixels.
     *
     * Возвращает текущий размер вьюпорта в пикселях.
     * @example
     * const { width, height } = camera.getViewport();
     */
    getViewport(): Readonly<Viewport>;

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

    /**
     * Locks camera movement along the X axis. Updates to `x` will be ignored.
     *
     * Блокирует перемещение камеры по оси X. Обновления `x` будут игнорироваться.
     * @example
     * camera.lockX();
     */
    lockX(): void;

    /**
     * Locks camera movement along the Y axis. Updates to `y` will be ignored.
     *
     * Блокирует перемещение камеры по оси Y. Обновления `y` будут игнорироваться.
     * @example
     * camera.lockY();
     */
    lockY(): void;

    /**
     * Locks camera scaling. Updates to `scale` will be ignored.
     *
     * Блокирует масштабирование камеры. Обновления `scale` будут игнорироваться.
     * @example
     * camera.lockScale();
     */
    lockScale(): void;

    /**
     * Locks camera rotation. Updates to `rotation` will be ignored.
     *
     * Блокирует вращение камеры. Обновления `rotation` будут игнорироваться.
     * @example
     * camera.lockRotation();
     */
    lockRotation(): void;

    /**
     * Locks all camera parameters at once.
     *
     * Блокирует все параметры камеры одновременно.
     * @example
     * camera.lock();
     */
    lock(): void;

    /**
     * Unlocks camera movement along the X axis.
     *
     * Разблокирует перемещение камеры по оси X.
     * @example
     * camera.unlockX();
     */
    unlockX(): void;

    /**
     * Unlocks camera movement along the Y axis.
     *
     * Разблокирует перемещение камеры по оси Y.
     * @example
     * camera.unlockY();
     */
    unlockY(): void;

    /**
     * Unlocks camera scaling.
     *
     * Разблокирует масштабирование камеры.
     * @example
     * camera.unlockScale();
     */
    unlockScale(): void;

    /**
     * Unlocks camera rotation.
     *
     * Разблокирует вращение камеры.
     * @example
     * camera.unlockRotation();
     */
    unlockRotation(): void;

    /**
     * Unlocks all camera parameters at once.
     *
     * Разблокирует все параметры камеры одновременно.
     * @example
     * camera.unlock();
     */
    unlock(): void;

    /**
     * Returns `true` only if all parameters are locked simultaneously (x, y, scale, rotation).
     *
     * Возвращает `true` только если все параметры заблокированы одновременно (x, y, scale, rotation).
     * @example
     * if (camera.isLocked()) return;
     */
    isLocked(): boolean;

    /**
     * Returns the lock state of each camera parameter individually.
     *
     * Возвращает состояние блокировки каждого параметра камеры по отдельности.
     * @example
     * const { x, y, scale, rotation } = camera.getLocks();
     */
    getLocks(): { x: boolean; y: boolean; scale: boolean; rotation: boolean };

    /**
     * Adjusts the camera to fit the given rect within the viewport.
     * Optionally resets rotation and adds padding around the rect.
     *
     * Подгоняет камеру так чтобы заданный прямоугольник влез во вьюпорт.
     * Опционально сбрасывает вращение и добавляет отступ вокруг прямоугольника.
     * @example
     * camera.fitToRect({ x: 0, y: 0, width: 1920, height: 1080 });
     * camera.fitToRect(rect, { padding: 50 });
     * camera.fitToRect(rect, { padding: 50, resetRotation: true });
     */
    fitToRect(rect: Rect, options?: { padding?: number; resetRotation?: boolean }): void;
}