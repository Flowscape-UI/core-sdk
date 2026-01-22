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
    /**
     * Returns the local position of the object.
     *
     * The position is relative to the object's parent (if any).
     *
     * @example
     * ```ts
     * const pos = transform.getPosition();
     * console.log(pos.x, pos.y);
     * ```
     */
    getPosition(): Vector2;

    /**
     * Sets the local position of the object.
     *
     * @param x - Local X coordinate
     * @param y - Local Y coordinate
     *
     * @example
     * ```ts
     * transform.setPosition(200, 100);
     * ```
     */
    setPosition(x: number, y: number): void;

    /**
     * Translates the object in local space.
     *
     * This adds a delta to the current local position.
     *
     * @param dx - Delta X
     * @param dy - Delta Y
     *
     * @example
     * ```ts
     * // Move object 10px to the right and 5px down
     * transform.translate(10, 5);
     * ```
     */
    translate(dx: number, dy: number): void;

    /**
     * Returns the local scale of the object.
     *
     * A scale of `{ x: 1, y: 1 }` represents the original size.
     *
     * @example
     * ```ts
     * const scale = transform.getScale();
     * console.log(scale.x, scale.y);
     * ```
     */
    getScale(): Vector2;

    /**
     * Sets the local scale of the object.
     *
     * @param sx - Scale factor along the X axis
     * @param sy - Scale factor along the Y axis
     *
     * @example
     * ```ts
     * // Double the size of the object
     * transform.setScale(2, 2);
     * ```
     */
    setScale(sx: number, sy: number): void;

    /**
     * Returns the local rotation of the object.
     *
     * The rotation is expressed in radians and represents
     * a rotation around the Z axis (2D rotation).
     *
     * @example
     * ```ts
     * const angle = transform.getRotation();
     * console.log(angle);
     * ```
     */
    getRotation(): number;

    /**
     * Sets the local rotation of the object.
     *
     * @param angle - Rotation angle in radians
     *
     * @example
     * ```ts
     * // Rotate 90 degrees clockwise
     * transform.setRotation(Math.PI / 2);
     * ```
     */
    setRotation(angle: number): void;

    /**
     * Returns the pivot (anchor) point of the object.
     *
     * The pivot is normalized:
     * - (0, 0)     → top-left
     * - (0.5, 0.5) → center
     * - (1, 1)     → bottom-right
     *
     * @example
     * ```ts
     * const pivot = transform.getPivot();
     * console.log(pivot);
     * ```
     */
    getPivot(): Vector2;

    /**
     * Sets the pivot (anchor) point of the object.
     *
     * The pivot is specified in normalized coordinates `[0..1]`.
     *
     * @param px - Normalized pivot X
     * @param py - Normalized pivot Y
     *
     * @example
     * ```ts
     * // Set pivot to center
     * transform.setPivot(0.5, 0.5);
     *
     * // Set pivot to top-left
     * transform.setPivot(0, 0);
     * ```
     */
    setPivot(px: number, py: number): void;

    /**
     * Returns the local transformation matrix.
     *
     * The matrix is composed from the local position, rotation,
     * scale and pivot.
     *
     * Geometry size is provided externally by the owner (e.g. Node)
     * and is required to correctly apply the pivot.
     *
     * @param width  - Local unscaled width of the geometry
     * @param height - Local unscaled height of the geometry
     *
     * @example
     * ```ts
     * const matrix = transform.getLocalMatrix(100, 50);
     * ctx.setTransform(
     *   matrix.a,
     *   matrix.b,
     *   matrix.c,
     *   matrix.d,
     *   matrix.tx,
     *   matrix.ty
     * );
     * ```
     */
    getLocalMatrix(width: number, height: number): Matrix;
}