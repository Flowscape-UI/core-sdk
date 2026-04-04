import type { ID, IShapeBase } from "../../../../../../nodes";
import type { Point } from "../../../../../camera";

export type CornerRadiusAxis = "tl" | "tr" | "br" | "bl";

export type CornerRadiusHandlePointMap = {
    tl: Point;
    tr: Point;
    br: Point;
    bl: Point;
};

export type CornerRadiusSection = {
    axis: CornerRadiusAxis;
    origin: Point;
    xAxisPoint: Point;
    yAxisPoint: Point;
    inset: number;
    width: number;
    height: number;
};

export interface IHandleCornerRadius {
    getType(): string;

    isDebugEnabled(): boolean;
    setDebugEnabled(value: boolean): void;
    isEnabled(): boolean;
    setEnabled(value: boolean): void;

    hasNode(): boolean;
    getNode(): IShapeBase | null;
    getNodeId(): ID | null;

    setNode(node: IShapeBase): void;
    clearNode(): void;

    getAvailableAxes(): readonly CornerRadiusAxis[];

    /**
     * Возвращает world point конкретного corner radius handle.
     */
    getHandleWorldPoint(axis: CornerRadiusAxis): Point | null;

    /**
     * Возвращает все точки corner radius handles.
     */
    getHandleWorldPoints(): CornerRadiusHandlePointMap | null;

    /**
     * Возвращает геометрию секции угла.
     * Нужна для InputController, чтобы он мог считать drag
     * в правильной четверти rect.
     */
    getSection(axis: CornerRadiusAxis): CornerRadiusSection | null;

    clear(): void;
    destroy(): void;
}