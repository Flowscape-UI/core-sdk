import { MathF32 } from "../../../core/math";

import type { Vector2 } from "../../../core/transform/types";

import {
	StrokeAlign,
	type ResolvedStrokePatternEdgeSegment,
	type ResolvedStrokePatternOffsetEdge,
	type ResolvedStrokePatternOffsetSegment,
} from "../types";

export function resolveStrokePatternOffsets(
	segments: readonly ResolvedStrokePatternEdgeSegment[],
	strokeWidth: number,
	strokeAlign: StrokeAlign,
): readonly ResolvedStrokePatternOffsetSegment[] {
	const width = MathF32.max(
		0,
		Number.isFinite(strokeWidth) ? strokeWidth : 0,
	);

	if (segments.length === 0 || width <= 0) {
		return [];
	}

	const { outerOffset, innerOffset } = resolveStrokeOffsets(
		width,
		strokeAlign,
	);

	const resolvedSegments: ResolvedStrokePatternOffsetSegment[] = [];

	for (const segment of segments) {
		const edges: ResolvedStrokePatternOffsetEdge[] = [];

		for (const edge of segment.edges) {
			edges.push({
				source: edge,

				outerOffset,
				innerOffset,

				outerStart: offsetPoint(
					edge.start,
					edge.outwardNormal,
					outerOffset,
				),

				outerEnd: offsetPoint(
					edge.end,
					edge.outwardNormal,
					outerOffset,
				),

				innerStart: offsetPoint(
					edge.start,
					edge.outwardNormal,
					innerOffset,
				),

				innerEnd: offsetPoint(
					edge.end,
					edge.outwardNormal,
					innerOffset,
				),
			});
		}

		if (edges.length === 0) {
			continue;
		}

		resolvedSegments.push({
			start: segment.start,

			end: segment.end,

			patternIndex: segment.patternIndex,

			edges,
		});
	}

	return resolvedSegments;
}

function resolveStrokeOffsets(
	strokeWidth: number,
	strokeAlign: StrokeAlign,
): {
	outerOffset: number;
	innerOffset: number;
} {
	switch (strokeAlign) {
		case StrokeAlign.Inside:
			return {
				outerOffset: 0,
				innerOffset: -strokeWidth,
			};

		case StrokeAlign.Center:
			return {
				outerOffset: strokeWidth * 0.5,

				innerOffset: -strokeWidth * 0.5,
			};

		case StrokeAlign.Outside:
			return {
				outerOffset: strokeWidth,

				innerOffset: 0,
			};

		default:
			return {
				outerOffset: strokeWidth * 0.5,

				innerOffset: -strokeWidth * 0.5,
			};
	}
}

function offsetPoint(point: Vector2, normal: Vector2, offset: number): Vector2 {
	return {
		x: MathF32.toF32(point.x + normal.x * offset),

		y: MathF32.toF32(point.y + normal.y * offset),
	};
}
