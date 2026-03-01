// overlay/types.ts
import type Konva from "konva";
import type { LayerWorld } from "../../LayerWorld";
import type { Point } from "../../../../camera";
import type { DragSession } from "../modules/handles/DragSession";

export type WorldCorners = [Point, Point, Point, Point]; // tl, tr, br, bl

export type OverlayOptions = {
    listening?: boolean;
    handleSize?: number;
    borderWidth?: number;
    showHandles?: boolean;
    showBorder?: boolean;

    showRotateHandle?: boolean;
    rotateHandleSize?: number;
    rotateHandleOffset?: number;
};

export const DEFAULT_OVERLAY_OPTIONS: Required<OverlayOptions> = {
    listening: true,
    handleSize: 8,
    borderWidth: 1,
    showHandles: true,
    showBorder: true,
    showRotateHandle: true,
    rotateHandleSize: 10,
    rotateHandleOffset: 28,
};

export type OverlayContext = {
    stage: Konva.Stage;
    world: LayerWorld;
    width: number;
    height: number;
    selectionCornersWorld: WorldCorners | null;
    drag: DragSession;
};

export interface IOverlayModule {
    /** root node which will be added to overlay root */
    getRoot(): Konva.Group;

    /** called before draw() each frame */
    setContext(ctx: OverlayContext): void;

    /** update visuals (positions, visibility) */
    draw(): void;

    destroy(): void;
}


export interface IOverlayHandle {
    readonly id: string;

    /** Konva node that будет добавлен в overlay layer */
    readonly node: Konva.Group | Konva.Shape;

    /** overlay context (stage, world, selection, camera...) */
    setContext(ctx: OverlayContext): void;

    /** called on overlay redraw */
    draw(): void;

    /** optional cleanup */
    destroy?(): void;
}