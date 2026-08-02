import {
    EPSILON,
    MathF32,
} from "../../../core/math";

import type {
    ResolvedStrokePatternEdge,
    ResolvedStrokePatternEdgeSegment,
    ResolvedStrokePatternSegment,
} from "../types";

export function resolveStrokePatternEdges(
    segments: readonly ResolvedStrokePatternSegment[],
    winding: number,
): readonly ResolvedStrokePatternEdgeSegment[] {
    if (segments.length === 0) {
        return [];
    }

    /*
     * Для замкнутого контура сторона определяется
     * направлением обхода.
     *
     * У открытого контура winding равен нулю,
     * поэтому используем стабильную правую нормаль.
     */
    const windingSign =
        winding < -EPSILON
            ? -1
            : 1;

    const resolvedSegments:
        ResolvedStrokePatternEdgeSegment[] = [];

    for (const segment of segments) {
        const edges: ResolvedStrokePatternEdge[] = [];

        for (
            let index = 1;
            index < segment.points.length;
            index += 1
        ) {
            const start =
                segment.points[index - 1]!;

            const end =
                segment.points[index]!;

            const dx =
                end.x - start.x;

            const dy =
                end.y - start.y;

            const length =
                Math.hypot(dx, dy);

            if (length <= EPSILON) {
                continue;
            }

            const tangent = {
                x: MathF32.toF32(
                    dx / length,
                ),

                y: MathF32.toF32(
                    dy / length,
                ),
            };

            /*
             * Та же система winding, что уже
             * используется в ShapeBase:
             *
             * positive winding -> right normal наружу
             * negative winding -> left normal наружу
             */
            const outwardNormal = {
                x: MathF32.toF32(
                    (windingSign * dy) /
                    length,
                ),

                y: MathF32.toF32(
                    (-windingSign * dx) /
                    length,
                ),
            };

            let currentDistance = segment.start;

            const startDistance =
                currentDistance;

            const endDistance =
                Math.min(
                    segment.end,
                    startDistance + length,
                );

            edges.push({
                start: clonePoint(start),
                end: clonePoint(end),

                startDistance:
                    MathF32.toF32(
                        startDistance,
                    ),

                endDistance:
                    MathF32.toF32(
                        endDistance,
                    ),

                length:
                    MathF32.toF32(length),

                tangent,
                outwardNormal,
            });
        }

        if (edges.length === 0) {
            continue;
        }

        resolvedSegments.push({
            start: segment.start,
            end: segment.end,

            patternIndex:
                segment.patternIndex,

            edges,
        });
    }

    return resolvedSegments;
}

function clonePoint(
    point: {
        x: number;
        y: number;
    },
): {
    x: number;
    y: number;
} {
    return {
        x: MathF32.toF32(point.x),
        y: MathF32.toF32(point.y),
    };
}