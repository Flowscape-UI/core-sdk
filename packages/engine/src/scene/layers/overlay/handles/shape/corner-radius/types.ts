import type { Point } from "../../../../../../core/camera";
import type { IHandleBase } from "../../base";

export type CornerRadiusAxis = "tl" | "tr" | "br" | "bl";

export type CornerRadiusSection = {
    axis: CornerRadiusAxis;
    origin: Point;
    xAxisPoint: Point;
    yAxisPoint: Point;
    inset: number;
    width: number;
    height: number;
};

export interface IHandleCornerRadius extends IHandleBase {
    getHandleWorldPoint(): Point | null;
    getSection(): CornerRadiusSection | null;
}
