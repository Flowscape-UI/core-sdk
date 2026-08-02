import {
	EPSILON,
	MathF32,
} from "../../../core/math";

import type { Vector2 } from "../../../core/transform/types";

import type {
	ResolvedStrokePatternContourSegment,
	ResolvedStrokePatternOffsetEdge,
	ResolvedStrokePatternOffsetSegment,
} from "../types";

export function resolveStrokePatternContours(
	segments: readonly ResolvedStrokePatternOffsetSegment[],
): readonly ResolvedStrokePatternContourSegment[] {
	const resolvedSegments:
		ResolvedStrokePatternContourSegment[] = [];

	for (const segment of segments) {
		if (segment.edges.length === 0) {
			continue;
		}

		const outer =
			resolveOffsetContour(
				segment.edges,
				"outer",
			);

		const inner =
			resolveOffsetContour(
				segment.edges,
				"inner",
			);

		if (
			outer.length < 2 ||
			inner.length < 2
		) {
			continue;
		}

		const firstEdge =
			segment.edges[0]!.source;

		const lastEdge =
			segment.edges[
				segment.edges.length - 1
			]!.source;

		resolvedSegments.push({
			start: segment.start,
			end: segment.end,

			patternIndex:
				segment.patternIndex,

			startTangent: {
				x: firstEdge.tangent.x,
				y: firstEdge.tangent.y,
			},

			endTangent: {
				x: lastEdge.tangent.x,
				y: lastEdge.tangent.y,
			},

			outer,
			inner,
		});
	}

	return resolvedSegments;
}

function resolveOffsetContour(
	edges: readonly ResolvedStrokePatternOffsetEdge[],
	side: "outer" | "inner",
): Vector2[] {
	const firstEdge =
		edges[0]!;

	const points: Vector2[] = [
		clonePoint(
			side === "outer"
				? firstEdge.outerStart
				: firstEdge.innerStart,
		),
	];

	for (
		let index = 1;
		index < edges.length;
		index += 1
	) {
		const previous =
			edges[index - 1]!;

		const current =
			edges[index]!;

		const previousStart =
			side === "outer"
				? previous.outerStart
				: previous.innerStart;

		const previousEnd =
			side === "outer"
				? previous.outerEnd
				: previous.innerEnd;

		const currentStart =
			side === "outer"
				? current.outerStart
				: current.innerStart;

		const currentEnd =
			side === "outer"
				? current.outerEnd
				: current.innerEnd;

		const previousDirection = {
			x:
				previousEnd.x -
				previousStart.x,

			y:
				previousEnd.y -
				previousStart.y,
		};

		const currentDirection = {
			x:
				currentEnd.x -
				currentStart.x,

			y:
				currentEnd.y -
				currentStart.y,
		};

		const intersection =
			intersectLines(
				previousStart,
				previousDirection,

				currentStart,
				currentDirection,
			);

		if (intersection) {
			appendUniquePoint(
				points,
				intersection,
			);

			continue;
		}

		/*
		 * Параллельные или почти параллельные
		 * рёбра. Используем среднюю точку
		 * между двумя offset-концами.
		 */
		appendUniquePoint(
			points,
			{
				x:
					(
						previousEnd.x +
						currentStart.x
					) * 0.5,

				y:
					(
						previousEnd.y +
						currentStart.y
					) * 0.5,
			},
		);
	}

	const lastEdge =
		edges[edges.length - 1]!;

	appendUniquePoint(
		points,
		side === "outer"
			? lastEdge.outerEnd
			: lastEdge.innerEnd,
	);

	return points;
}

function intersectLines(
	firstPoint: Vector2,
	firstDirection: Vector2,

	secondPoint: Vector2,
	secondDirection: Vector2,
): Vector2 | null {
	const denominator =
		firstDirection.x *
			secondDirection.y -
		firstDirection.y *
			secondDirection.x;

	if (
		Math.abs(denominator) <=
		EPSILON
	) {
		return null;
	}

	const delta = {
		x:
			secondPoint.x -
			firstPoint.x,

		y:
			secondPoint.y -
			firstPoint.y,
	};

	const t =
		(
			delta.x *
				secondDirection.y -
			delta.y *
				secondDirection.x
		) /
		denominator;

	if (!Number.isFinite(t)) {
		return null;
	}

	return {
		x: MathF32.toF32(
			firstPoint.x +
				firstDirection.x * t,
		),

		y: MathF32.toF32(
			firstPoint.y +
				firstDirection.y * t,
		),
	};
}

function appendUniquePoint(
	points: Vector2[],
	point: Vector2,
): void {
	const previous =
		points[points.length - 1];

	if (
		previous &&
		Math.hypot(
			point.x - previous.x,
			point.y - previous.y,
		) <= EPSILON
	) {
		return;
	}

	points.push(
		clonePoint(point),
	);
}

function clonePoint(
	point: Vector2,
): Vector2 {
	return {
		x: MathF32.toF32(point.x),
		y: MathF32.toF32(point.y),
	};
}