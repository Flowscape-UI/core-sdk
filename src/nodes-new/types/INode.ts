import type { Matrix } from "../../core/transform/types";

export interface INode {
    readonly id: string;

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