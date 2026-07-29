import type { Matrix } from "../../core/transform/types";

export function matrixInvert(m: Matrix): Matrix {
    const determinant = m.a * m.d - m.b * m.c;
    
    if (determinant === 0) {
        throw new Error("Can't invert a matrix with zero determinant");
    }

    const invDet = 1 / determinant;

    return {
        a: m.d * invDet,
        b: -m.b * invDet,
        c: -m.c * invDet,
        d: m.a * invDet,
        tx: (m.c * m.ty - m.d * m.tx) * invDet,
        ty: (m.b * m.tx - m.a * m.ty) * invDet
    };
}