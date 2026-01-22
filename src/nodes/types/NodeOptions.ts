import type { Transform } from "../../core/transform/Transform";

export interface NodeOptions {
    readonly id: string,
    readonly parentId: string | null,
    readonly transform: Transform,
    readonly width: number,
    readonly height: number,
}