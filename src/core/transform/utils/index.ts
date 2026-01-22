import type { Matrix, Vector2 } from '../types';

export function composeMatrix(
    position: Vector2,
    scale: Vector2,
    rotation: number,
    px: number,
    py: number
): Matrix {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return {
        a: cos * scale.x,
        b: sin * scale.x,
        c: -sin * scale.y,
        d: cos * scale.y,
        tx: position.x - (px * cos - py * sin) * scale.x,
        ty: position.y - (px * sin + py * cos) * scale.y,
    };
}