import type { INodeRect } from "../types";

export interface INodeFrame extends INodeRect {
    /**
     * Returns whether the frame clips its children to its bounds.
     *
     * Возвращает, обрезает ли фрейм дочерние ноды по своим границам.
     */
    getClipsContent(): boolean;

    /**
     * Enables or disables clipping of child nodes inside the frame bounds.
     *
     * Включает или отключает обрезку дочерних нод внутри границ фрейма.
     */
    setClipsContent(value: boolean): void;
}