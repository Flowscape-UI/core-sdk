import type { Matrix } from "../../core/transform/types";

export function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
    return {
        a: a.a * b.a + a.c * b.b,
        b: a.b * b.a + a.d * b.b,

        c: a.a * b.c + a.c * b.d,
        d: a.b * b.c + a.d * b.d,

        tx: a.a * b.tx + a.c * b.ty + a.tx,
        ty: a.b * b.tx + a.d * b.ty + a.ty,
    };
}