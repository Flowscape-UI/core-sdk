import type { Color } from "culori";
import type { ShapeEffect } from "./effect";
import type { INode, OrientedRect, Rect } from "../base";
import type { Matrix, Vector2 } from "../../core/transform/types";

export type CornerRadius = {
    tl: number;
    tr: number;
    br: number;
    bl: number;
};

export type StrokeWidth = {
    t: number;
    r: number;
    b: number;
    l: number;
};

export enum StrokeAlign {
    Inside = 0,
    Center = 1,
    Outside = 2,
}

export type ShapeGeometry = {
    worldMatrix: Matrix;

    localOBB: Rect;
    worldCorners: [Vector2, Vector2, Vector2, Vector2];
    worldOBB: OrientedRect;
    worldAABB: Rect;

    localViewOBB: Rect;
    worldViewCorners: [Vector2, Vector2, Vector2, Vector2];
    worldViewOBB: OrientedRect;
    worldViewAABB: Rect;
};

export type ShapePathCommand =
    | {
        type: "moveTo";
        point: Vector2;
    }
    | {
        type: "lineTo";
        point: Vector2;
    }
    | {
        type: "arcTo";
        center: Vector2;
        radiusX: number;
        radiusY: number;
        startAngle: number;
        endAngle: number;
        clockwise: boolean;
    }
    | {
        type: "closePath";
    };

export interface IShapeBase extends INode {
    readonly effect: ShapeEffect;

    /**
     * Returns a geometry snapshot of this shape.
     *
     * Includes transform matrix and both pure-geometry and view (stroke-aware) bounds
     * in local/world space for overlay and editor tooling.
     *
     * Возвращает снимок геометрии этой фигуры.
     *
     * Включает матрицу трансформации, а также геометрические и визуальные
     * (с учетом stroke) границы в локальном/мировом пространстве для overlay-инструментов.
     */
    getGeometry(): ShapeGeometry;

    toPathCommands(): readonly ShapePathCommand[];

    /***********************************************************/
    /*                        Appearance                       */
    /***********************************************************/
    /**
     * Returns the corner radius values for the rectangle.
     *
     * Возвращает значения радиусов углов прямоугольника.
     */
    getCornerRadius(): CornerRadius;

    /**
     * Sets the corner radius values for the rectangle.
     *
     * Устанавливает радиусы углов прямоугольника.
     */
    setCornerRadius(value: CornerRadius): void;


    /**
     * Returns the fill color of the rectangle in hex format.
     *
     * Возвращает цвет заливки прямоугольника в формате hex.
     */
    getFill(): string;

    /**
     * Sets the fill color of the rectangle.
     * Accepts a CSS color string or a culori Color object.
     *
     * Устанавливает цвет заливки прямоугольника.
     * Принимает строку цвета CSS или объект цвета culori.
     */
    setFill(value: string | Color): void;


    /***********************************************************/
    /*                          Stroke                         */
    /***********************************************************/

    /**
     * Returns the stroke width for each side of the rectangle.
     *
     * Возвращает толщину обводки для каждой стороны прямоугольника.
     */
    getStrokeWidth(): StrokeWidth;

    /**
     * Sets the stroke width for each side of the rectangle.
     *
     * Устанавливает толщину обводки для каждой стороны прямоугольника.
     */
    setStrokeWidth(value: StrokeWidth): void;

    /**
     * Returns the stroke color in hex format.
     *
     * Возвращает цвет обводки в формате hex.
     */
    getStrokeFill(): string;

    /**
     * Sets the stroke color.
     * Accepts a CSS color string or a culori Color object.
     *
     * Устанавливает цвет обводки.
     * Принимает строку цвета CSS или объект цвета culori.
     */
    setStrokeFill(value: string | Color): void;

    /**
     * Returns the stroke alignment mode.
     *
     * Возвращает режим выравнивания обводки.
     */
    getStrokeAlign(): StrokeAlign;

    /**
     * Sets the stroke alignment mode.
     *
     * Устанавливает режим выравнивания обводки.
     */
    setStrokeAlign(value: StrokeAlign): void;



    /***********************************************************/
    /*                       View Bounds                       */
    /***********************************************************/

    /**
     * Returns the local oriented bounding box (OBB) of the shape including its visual stroke.
     * Unlike getLocalOBB(), this method expands the bounds based on stroke width and stroke alignment.
     *
     * This represents the actual visible area of the shape in local space.
     *
     * Возвращает локальный ориентированный bounding box (OBB) фигуры с учетом её обводки (stroke).
     * В отличие от getLocalOBB(), этот метод расширяет границы с учетом толщины и выравнивания stroke.
     *
     * Это фактическая видимая область фигуры в локальном пространстве.
     */
    getLocalViewOBB(): Rect;

    /**
     * Returns the world-space corner points of the shape including its visual stroke.
     * These points represent the transformed corners of the view bounds (with stroke applied).
     *
     * Unlike getWorldCorners(), which is based on pure geometry,
     * this method reflects the actual rendered shape including stroke.
     *
     * Возвращает угловые точки фигуры в мировых координатах с учетом обводки (stroke).
     * В отличие от getWorldCorners(), который основан только на геометрии,
     * этот метод учитывает реальный визуальный размер фигуры.
     */
    getWorldViewCorners(): [Vector2, Vector2, Vector2, Vector2];

    /**
     * Returns the world-space oriented bounding box (OBB) of the shape including stroke.
     * This box follows the object's rotation and represents its visual bounds.
     *
     * Useful for rotated selection outlines and editor overlays.
     *
     * Возвращает ориентированный bounding box (OBB) в мировых координатах с учетом stroke.
     * Этот прямоугольник вращается вместе с объектом и отражает его визуальные границы.
     *
     * Используется для выделения повернутых объектов и overlay в редакторе.
     */
    getWorldViewOBB(): OrientedRect;

    /**
     * Returns the world-space axis-aligned bounding box (AABB) of the shape including stroke.
     * This box is aligned to the world axes and fully contains the visual representation of the shape.
     *
     * Unlike getWorldAABB(), this includes stroke width and represents what is actually visible.
     *
     * Useful for selection frames, hit testing, and spatial queries.
     *
     * Возвращает axis-aligned bounding box (AABB) в мировых координатах с учетом stroke.
     * Этот прямоугольник выровнен по осям мира и полностью охватывает видимую часть фигуры.
     *
     * В отличие от getWorldAABB(), учитывает толщину обводки и отражает реальную визуальную область.
     *
     * Используется для рамки выделения, hit-test и пространственных проверок.
     */
    getWorldViewAABB(): Rect;
}
