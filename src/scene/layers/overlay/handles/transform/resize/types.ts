import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import type { ILayerOverlayHandle } from "../../types";

export type TransformResizeAxis =
    | "n"
    | "e"
    | "s"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw";

export interface IHandleTransformResize extends ILayerOverlayHandle {
    /**
     * Returns true if resize handle has node.
     *
     * Возвращает true, если resize-хендлер имеет ноду.
     */
    hasNode(): boolean;

    /**
     * Returns resize node.
     *
     * Возвращает ноду resize-хендлера.
     */
    getNode(): IShapeBase | null;

    /**
     * Returns resize node id.
     *
     * Возвращает id ноды resize-хендлера.
     */
    getNodeId(): ID | null;

    /**
     * Sets resize node.
     *
     * Устанавливает ноду resize-хендлера.
     */
    setNode(node: IShapeBase): void;

    /**
     * Clears resize node.
     *
     * Очищает ноду resize-хендлера.
     */
    clearNode(): void;

    /**
     * Returns available resize axes.
     *
     * Возвращает доступные оси resize.
     */
    getAvailableAxes(): readonly TransformResizeAxis[];

    /**
     * Returns world position of resize handle.
     *
     * Возвращает мировую позицию resize-хендлера.
     */
    getHandleWorldPoint(axis: TransformResizeAxis): Point | null;

    /**
     * Returns world edge points.
     *
     * Возвращает мировые точки края.
     */
    getEdgeWorldPoints(axis: "n" | "e" | "s" | "w"): readonly [Point, Point] | null;

    /**
     * Hit test resize axis.
     *
     * Проверяет попадание в resize-хендлер.
     */
    hitTestAxis(point: Point): TransformResizeAxis | null;
}