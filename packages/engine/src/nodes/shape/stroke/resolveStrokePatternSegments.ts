import { EPSILON, MathF32 } from "../../../core/math";

import type { Vector2 } from "../../../core/transform/types";

import type {
	ResolvedStrokePatternSegment,
	StrokePathMetricPoint,
	StrokePathMetrics,
	StrokePatternInterval,
} from "../types";

export function resolveStrokePatternSegments(
	metrics: StrokePathMetrics,
	intervals: readonly StrokePatternInterval[],
): readonly ResolvedStrokePatternSegment[] {
	if (
		metrics.points.length < 2 ||
		metrics.length <= EPSILON ||
		intervals.length === 0
	) {
		return [];
	}

	const segments: ResolvedStrokePatternSegment[] = [];

	for (const interval of intervals) {
		const start = Math.max(0, Math.min(metrics.length, interval.start));

		const end = Math.max(start, Math.min(metrics.length, interval.end));

		if (end - start <= EPSILON) {
			continue;
		}

		const startPoint = resolvePointAtDistance(metrics.points, start);

		const endPoint = resolvePointAtDistance(metrics.points, end);

		if (!startPoint || !endPoint) {
			continue;
		}

		const points: Vector2[] = [];

		appendUniquePoint(points, startPoint);

		/*
		 * Добавляем все настоящие точки контура,
		 * оказавшиеся внутри dash-интервала.
		 *
		 * Благодаря этому dash корректно проходит
		 * через углы и границы path-сегментов.
		 */
		for (const metricPoint of metrics.points) {
			if (
				metricPoint.distance <= start + EPSILON ||
				metricPoint.distance >= end - EPSILON
			) {
				continue;
			}

			appendUniquePoint(points, metricPoint.point);
		}

		appendUniquePoint(points, endPoint);

		if (points.length < 2) {
			continue;
		}

		segments.push({
			start: MathF32.toF32(start),

			end: MathF32.toF32(end),

			patternIndex: interval.patternIndex,

			points,
		});
	}

	return segments;
}

function resolvePointAtDistance(
	points: readonly StrokePathMetricPoint[],
	distance: number,
): Vector2 | null {
	if (points.length === 0) {
		return null;
	}

	const first = points[0]!;
	const last = points[points.length - 1]!;

	if (distance <= first.distance + EPSILON) {
		return clonePoint(first.point);
	}

	if (distance >= last.distance - EPSILON) {
		return clonePoint(last.point);
	}

	const nextIndex = findFirstPointAfterDistance(points, distance);

	if (nextIndex <= 0) {
		return clonePoint(first.point);
	}

	const previous = points[nextIndex - 1]!;

	const next = points[nextIndex]!;

	const segmentLength = next.distance - previous.distance;

	if (segmentLength <= EPSILON) {
		return clonePoint(next.point);
	}

	const progress = Math.max(
		0,
		Math.min(1, (distance - previous.distance) / segmentLength),
	);

	return interpolatePoint(previous.point, next.point, progress);
}

function findFirstPointAfterDistance(
	points: readonly StrokePathMetricPoint[],
	distance: number,
): number {
	let low = 1;
	let high = points.length - 1;

	while (low < high) {
		const middle = Math.floor((low + high) / 2);

		if (points[middle]!.distance < distance) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}

	return low;
}

function interpolatePoint(
	start: Vector2,
	end: Vector2,
	progress: number,
): Vector2 {
	return {
		x: MathF32.toF32(start.x + (end.x - start.x) * progress),

		y: MathF32.toF32(start.y + (end.y - start.y) * progress),
	};
}

function appendUniquePoint(points: Vector2[], point: Vector2): void {
	const previous = points[points.length - 1];

	if (
		previous &&
		Math.hypot(point.x - previous.x, point.y - previous.y) <= EPSILON
	) {
		return;
	}

	points.push(clonePoint(point));
}

function clonePoint(point: Vector2): Vector2 {
	return {
		x: MathF32.toF32(point.x),
		y: MathF32.toF32(point.y),
	};
}
