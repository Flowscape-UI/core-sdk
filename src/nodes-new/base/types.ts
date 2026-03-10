import type { Matrix } from "../../core/transform/types";

export type ID = string | number;
export enum NodeType {
    Base = "base-node",
    Rect = "rect-node",
    Ellipse = "ellipse-node",
    Star = "star-node",
    Polygon = "polygon-node",
    Line = "line-node",
    Text = "text-node",
    Frame = "frame-node",
    Image = "image-node",
    Video = "video-node",
    Path = "path-node",
}

export interface NodeOptions {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface INode {
    readonly id: ID;

    isLocked: boolean;
    isVisible: boolean;

    getParent(): INode | null;
    getChildren(): readonly INode[];

    setParent(parent: INode): void;
    removeParent(): void;


    addChild(child: INode): void;
    removeChild(child: INode): void;

    getLocalMatrix(): Matrix;
    getWorldMatrix(): Matrix;
}