import type { Transform } from '../../core/transform/Transform';

export interface NodeOptions {
  readonly id: string;
  readonly parentId: string | null;
  readonly transform: Transform;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
