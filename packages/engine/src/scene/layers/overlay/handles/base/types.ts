import type {
    IDestroyable,
    IEnableable,
    IVisible,
    IWithType,
    Point
} from "../../../../../core";
import type { IShapeBase, Size } from "../../../../../nodes";


/**
 * Draw style for debug visualization - solid or dashed outline.
 *
 * Стиль отрисовки для дебаг визуализации - сплошной или пунктирный контур.
 */
export enum HandleDebugDrawType {
    Solid = "solid",
    Dashed = "dashed",
}

export enum HandleType {
    Base = "handle-base",
    CornerRadius = "handle-corner-radius",
    Hover = "handle-hover",
    Focus = "handle-focus",
    Transform = "handle-transform",
    TransformResize = "handle-transform-resize",
    TransformRotate = "handle-transform-rotate",
    TransformPivot = "handle-transform-pivot",
    TransformPosition = "handle-transform-position",
}



/**
 * Base interface for all interactive handles on the overlay layer.
 * Combines identity, enable/disable, visibility, and destroy lifecycle.
 *
 * Базовый интерфейс для всех интерактивных хэндлов на overlay слое.
 * Объединяет идентификацию, включение/отключение, видимость и жизненный цикл уничтожения.
 */
export interface IHandleBase extends IWithType<HandleType>, IEnableable, IVisible, IDestroyable {
    /**
     * Clears the handle state without destroying it.
     *
     * Сбрасывает состояние хэндла без его уничтожения.
     * @example
     * handle.clear();
     */
    clear(): void;

    /**
     * Returns `true` if the given point is within the handle's hit area.
     *
     * Возвращает `true` если указанная точка находится в зоне попадания хэндла.
     * @example
     * if (handle.hitTest({ x: 100, y: 200 })) handle.select();
     */
    hitTest(point: Point): boolean;


    /***************************************************************************/
    /*                                  Node                                   */
    /***************************************************************************/

    /**
     * Returns the shape node currently attached to this handle, or `null` if none.
     *
     * Возвращает шейп ноду прикреплённую к хэндлу, или `null` если не прикреплена.
     * @example
     * const node = handle.getNode();
     */
    getNode(): IShapeBase | null;

    /**
     * Returns `true` if a shape node is currently attached to this handle.
     *
     * Возвращает `true` если к хэндлу прикреплена шейп нода.
     * @example
     * if (handle.hasNode()) handle.clear();
     */
    hasNode(): boolean;

    /**
     * Attaches a shape node to this handle. Returns `true` if the node was changed.
     *
     * Прикрепляет шейп ноду к хэндлу. Возвращает `true` если нода была изменена.
     * @example
     * handle.setNode(shapeNode);
     */
    setNode(value: IShapeBase | null): boolean;

    /**
     * Detaches the current shape node from this handle.
     *
     * Открепляет текущую шейп ноду от хэндла.
     * @example
     * handle.clearNode();
     */
    clearNode(): void;


    /***************************************************************************/
    /*                                 Sizing                                  */
    /***************************************************************************/

    /**
     * Returns the visual width of the handle in pixels.
     *
     * Возвращает визуальную ширину хэндла в пикселях.
     */
    getWidth(): number;

    /**
     * Returns the visual height of the handle in pixels.
     *
     * Возвращает визуальную высоту хэндла в пикселях.
     */
    getHeight(): number;

    /**
     * Returns the visual size of the handle.
     *
     * Возвращает визуальный размер хэндла.
     * @example
     * const { width, height } = handle.getSize();
     */
    getSize(): Size;

    /**
     * Sets the visual width of the handle in pixels.
     *
     * Устанавливает визуальную ширину хэндла в пикселях.
     * @example
     * handle.setWidth(12);
     */
    setWidth(value: number): void;

    /**
     * Sets the visual height of the handle in pixels.
     *
     * Устанавливает визуальную высоту хэндла в пикселях.
     * @example
     * handle.setHeight(12);
     */
    setHeight(value: number): void;

    /**
     * Sets the visual size of the handle in pixels.
     *
     * Устанавливает визуальный размер хэндла в пикселях.
     * @example
     * handle.setSize(12, 12);
     */
    setSize(width: number, height: number): void;


    /***************************************************************************/
    /*                               Hit Sizing                                */
    /***************************************************************************/

    /**
     * Returns the hit area width of the handle in pixels.
     *
     * Возвращает ширину зоны попадания хэндла в пикселях.
     */
    getHitWidth(): number;

    /**
     * Returns the hit area height of the handle in pixels.
     *
     * Возвращает высоту зоны попадания хэндла в пикселях.
     */
    getHitHeight(): number;

    /**
     * Returns the hit area size of the handle.
     *
     * Возвращает размер зоны попадания хэндла.
     * @example
     * const { width, height } = handle.getHitSize();
     */
    getHitSize(): Size;

    /**
     * Sets the hit area width of the handle in pixels.
     *
     * Устанавливает ширину зоны попадания хэндла в пикселях.
     * @example
     * handle.setHitWidth(20);
     */
    setHitWidth(value: number): void;

    /**
     * Sets the hit area height of the handle in pixels.
     *
     * Устанавливает высоту зоны попадания хэндла в пикселях.
     * @example
     * handle.setHitHeight(20);
     */
    setHitHeight(value: number): void;

    /**
     * Sets the hit area size of the handle in pixels.
     *
     * Устанавливает размер зоны попадания хэндла в пикселях.
     * @example
     * handle.setHitSize(20, 20);
     */
    setHitSize(width: number, height: number): void;

    getHitFill(): string;
    setHitFill(value: string): void;

    getHitOpacity(): number;
    setHitOpacity(value: number): void;


    /***************************************************************************/
    /*                                Layering                                 */
    /***************************************************************************/

    /**
     * Returns the z-index of the handle within its layer.
     *
     * Возвращает z-index хэндла внутри его слоя.
     */
    getZIndex(): number;

    /**
     * Sets the z-index of the handle within its layer.
     *
     * Устанавливает z-index хэндла внутри его слоя.
     * @example
     * handle.setZIndex(10);
     */
    setZIndex(value: number): void;


    /***************************************************************************/
    /*                               Positioning                               */
    /***************************************************************************/

    /**
     * Returns the X position of the handle in screen coordinates.
     *
     * Возвращает позицию хэндла по оси X в экранных координатах.
     */
    getX(): number;

    /**
     * Returns the Y position of the handle in screen coordinates.
     *
     * Возвращает позицию хэндла по оси Y в экранных координатах.
     */
    getY(): number;

    /**
     * Returns the position of the handle in screen coordinates.
     *
     * Возвращает позицию хэндла в экранных координатах.
     * @example
     * const { x, y } = handle.getPosition();
     */
    getPosition(): Point;

    /**
     * Sets the X position of the handle in screen coordinates.
     *
     * Устанавливает позицию хэндла по оси X в экранных координатах.
     * @example
     * handle.setX(100);
     */
    setX(value: number): void;

    /**
     * Sets the Y position of the handle in screen coordinates.
     *
     * Устанавливает позицию хэндла по оси Y в экранных координатах.
     * @example
     * handle.setY(200);
     */
    setY(value: number): void;

    /**
     * Sets the position of the handle in screen coordinates.
     *
     * Устанавливает позицию хэндла в экранных координатах.
     * @example
     * handle.setPosition({ x: 100, y: 200 });
     */
    setPosition(value: Point): void;

    /**
     * Returns the X offset of the handle relative to its position.
     *
     * Возвращает смещение хэндла по оси X относительно его позиции.
     */
    getOffsetX(): number;

    /**
     * Returns the Y offset of the handle relative to its position.
     *
     * Возвращает смещение хэндла по оси Y относительно его позиции.
     */
    getOffsetY(): number;

    /**
     * Returns the offset of the handle relative to its position.
     *
     * Возвращает смещение хэндла относительно его позиции.
     * @example
     * const { x, y } = handle.getOffset();
     */
    getOffset(): Point;

    /**
     * Sets the X offset of the handle relative to its position.
     *
     * Устанавливает смещение хэндла по оси X относительно его позиции.
     * @example
     * handle.setOffsetX(-6);
     */
    setOffsetX(value: number): void;

    /**
     * Sets the Y offset of the handle relative to its position.
     *
     * Устанавливает смещение хэндла по оси Y относительно его позиции.
     * @example
     * handle.setOffsetY(-6);
     */
    setOffsetY(value: number): void;

    /**
     * Sets the offset of the handle relative to its position.
     *
     * Устанавливает смещение хэндла относительно его позиции.
     * @example
     * handle.setOffset({ x: -6, y: -6 });
     */
    setOffset(value: Point): void;


    /***************************************************************************/
    /*                                 Styles                                  */
    /***************************************************************************/

    /**
     * Returns the fill color of the handle.
     *
     * Возвращает цвет заливки хэндла.
     */
    getFill(): string;

    /**
     * Sets the fill color of the handle.
     *
     * Устанавливает цвет заливки хэндла.
     * @example
     * handle.setFill('#ffffff');
     */
    setFill(value: string): void;

    /**
     * Returns the stroke width of the handle in pixels.
     *
     * Возвращает ширину обводки хэндла в пикселях.
     */
    getStrokeWidth(): number;

    /**
     * Sets the stroke width of the handle in pixels.
     *
     * Устанавливает ширину обводки хэндла в пикселях.
     * @example
     * handle.setStrokeWidth(2);
     */
    setStrokeWidth(value: number): void;

    /**
     * Returns the stroke color of the handle.
     *
     * Возвращает цвет обводки хэндла.
     */
    getStrokeFill(): string;

    /**
     * Sets the stroke color of the handle.
     *
     * Устанавливает цвет обводки хэндла.
     * @example
     * handle.setStrokeFill('#000000');
     */
    setStrokeFill(value: string): void;

    /**
     * Returns the opacity of the handle (0 to 1).
     *
     * Возвращает прозрачность хэндла (от 0 до 1).
     */
    getOpacity(): number;

    /**
     * Sets the opacity of the handle (0 to 1).
     *
     * Устанавливает прозрачность хэндла (от 0 до 1).
     * @example
     * handle.setOpacity(0.5);
     */
    setOpacity(value: number): void;


    /***************************************************************************/
    /*                                  Debug                                  */
    /***************************************************************************/

    /**
     * Returns `true` if debug visualization is enabled for this handle.
     *
     * Возвращает `true` если дебаг визуализация включена для этого хэндла.
     */
    isEnabledDebug(): boolean;

    /**
     * Sets the debug visualization state explicitly.
     *
     * Устанавливает состояние дебаг визуализации явно.
     * @example
     * handle.setEnabledDebug(true);
     */
    setEnabledDebug(value: boolean): void;

    /**
     * Enables debug visualization for this handle.
     *
     * Включает дебаг визуализацию для этого хэндла.
     * @example
     * handle.enableDebug();
     */
    enableDebug(): void;

    /**
     * Disables debug visualization for this handle.
     *
     * Отключает дебаг визуализацию для этого хэндла.
     * @example
     * handle.disableDebug();
     */
    disableDebug(): void;

    /**
     * Returns the fill draw type for the debug overlay.
     *
     * Возвращает тип заливки для дебаг оверлея.
     */
    getDebugFillType(): HandleDebugDrawType;

    /**
     * Sets the fill draw type for the debug overlay.
     *
     * Устанавливает тип заливки для дебаг оверлея.
     * @example
     * handle.setDebugFillType('dashed');
     */
    setDebugFillType(value: HandleDebugDrawType): void;

    /**
     * Returns the opacity of the debug overlay (0 to 1).
     *
     * Возвращает прозрачность дебаг оверлея (от 0 до 1).
     */
    getDebugOpacity(): number;

    /**
     * Sets the opacity of the debug overlay (0 to 1).
     *
     * Устанавливает прозрачность дебаг оверлея (от 0 до 1).
     * @example
     * handle.setDebugOpacity(0.3);
     */
    setDebugOpacity(value: number): void;

    /**
     * Returns the fill color of the debug overlay.
     *
     * Возвращает цвет заливки дебаг оверлея.
     */
    getDebugFill(): string;

    /**
     * Returns the fill color of the debug stroke overlay.
     *
     * Возвращает цвет заливки обводки дебаг оверлея.
     */
    getDebugStrokeFill(): string;

    /**
     * Sets the fill color of the debug overlay.
     *
     * Устанавливает цвет заливки дебаг оверлея.
     * @example
     * handle.setDebugFill('rgba(255, 0, 0, 0.2)');
     */
    setDebugFill(value: string): void;

    /**
     * Sets the fill color of the debug stroke overlay.
     *
     * Устанавливает цвет заливки дебаг обводки оверлея.
     * @example
     * handle.setDebugStrokeFill('rgba(255, 0, 0, 0.2)');
     */
    setDebugStrokeFill(value: string): void;

    /**
     * Returns the width of the debug overlay in pixels.
     *
     * Возвращает ширину дебаг оверлея в пикселях.
     */
    getDebugWidth(): number;

    /**
     * Returns the height of the debug overlay in pixels.
     *
     * Возвращает высоту дебаг оверлея в пикселях.
     */
    getDebugHeight(): number;

    /**
     * Returns the size of the debug overlay.
     *
     * Возвращает размер дебаг оверлея.
     * @example
     * const { width, height } = handle.getDebugSize();
     */
    getDebugSize(): Size;

    /**
     * Sets the width of the debug overlay in pixels.
     *
     * Устанавливает ширину дебаг оверлея в пикселях.
     * @example
     * handle.setDebugWidth(20);
     */
    setDebugWidth(value: number): void;

    /**
     * Sets the height of the debug overlay in pixels.
     *
     * Устанавливает высоту дебаг оверлея в пикселях.
     * @example
     * handle.setDebugHeight(20);
     */
    setDebugHeight(value: number): void;

    /**
     * Sets the size of the debug overlay in pixels.
     *
     * Устанавливает размер дебаг оверлея в пикселях.
     * @example
     * handle.setDebugSize(20, 20);
     */
    setDebugSize(width: number, height: number): void;

    /**
     * Returns the stroke width of the debug overlay in pixels.
     *
     * Возвращает ширину обводки дебаг оверлея в пикселях.
     */
    getDebugStrokeWidth(): number;

    /**
     * Sets the stroke width of the debug overlay in pixels.
     *
     * Устанавливает ширину обводки дебаг оверлея в пикселях.
     * @example
     * handle.setDebugStrokeWidth(1);
     */
    setDebugStrokeWidth(value: number): void;

    /**
     * Returns the stroke draw type for the debug overlay.
     *
     * Возвращает тип обводки для дебаг оверлея.
     */
    getDebugStrokeType(): HandleDebugDrawType;

    /**
     * Sets the stroke draw type for the debug overlay.
     *
     * Устанавливает тип обводки для дебаг оверлея.
     * @example
     * handle.setDebugStrokeType('dashed');
     */
    setDebugStrokeType(value: HandleDebugDrawType): void;
}
