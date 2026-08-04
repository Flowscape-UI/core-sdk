import { EPSILON, MathF32 } from "../../../core/math";

import type {
	ResolvedStrokeStylePattern,
	StrokePatternInterval,
} from "../types";

export function resolveStrokePatternIntervals(
	pathLength: number,
	pattern: ResolvedStrokeStylePattern,
): readonly StrokePatternInterval[] {
	const normalizedPathLength = Number.isFinite(pathLength)
		? Math.max(0, pathLength)
		: 0;

	if (normalizedPathLength <= EPSILON || pattern.length === 0) {
		return [];
	}

	const patternLength = pattern.reduce(
		(total, item) =>
			total + Math.max(0, item.length) + Math.max(0, item.gap),
		0,
	);

	/*
	 * Защита от паттерна, который вообще
	 * не способен сдвигать курсор.
	 *
	 * Например:
	 * [{ length: 0, gap: 0 }]
	 */
	if (patternLength <= EPSILON) {
		return [];
	}

	const intervals: StrokePatternInterval[] = [];

	let distance = 0;
	let patternIndex = 0;

	while (distance < normalizedPathLength - EPSILON) {
		const item = pattern[patternIndex]!;

		const visibleLength = Math.max(
			0,
			Number.isFinite(item.length) ? item.length : 0,
		);

		const gapLength = Math.max(0, Number.isFinite(item.gap) ? item.gap : 0);

		const start = distance;

		const end = Math.min(normalizedPathLength, start + visibleLength);

		if (end - start > EPSILON) {
			appendInterval(intervals, {
				start: MathF32.toF32(start),

				end: MathF32.toF32(end),

				patternIndex,
			});
		}

		distance += visibleLength + gapLength;

		patternIndex = (patternIndex + 1) % pattern.length;
	}

	return intervals;
}

function appendInterval(
	intervals: StrokePatternInterval[],
	next: StrokePatternInterval,
): void {
	const previous = intervals[intervals.length - 1];

	/*
	 * Если gap равен нулю, соседние
	 * видимые интервалы объединяем.
	 */
	if (previous && next.start <= previous.end + EPSILON) {
		intervals[intervals.length - 1] = {
			start: previous.start,

			end: Math.max(previous.end, next.end),

			patternIndex: previous.patternIndex,
		};

		return;
	}

	intervals.push(next);
}
