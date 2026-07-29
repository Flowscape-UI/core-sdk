import type { IShapeBase } from "../shape";

export enum GroupChildrenResizeMode {
    Size = "size",
    Scale = "scale",
}

export interface INodeGroup extends IShapeBase {
    resizeChildrenBySize(width: number, height: number): void;
    resizeChildrenByScale(width: number, height: number): void;
}
