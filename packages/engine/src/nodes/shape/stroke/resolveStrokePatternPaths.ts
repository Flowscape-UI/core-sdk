import { EPSILON, MathF32 } from "../../../core/math";

import type { Vector2 } from "../../../core/transform/types";

import {
	StrokeDashCap,
	type ResolvedStrokePatternContourSegment,
	type ResolvedStrokePatternPathSegment,
	type ShapePathCommand,
} from "../types";

export function resolveStrokePatternPaths(
	segments: readonly ResolvedStrokePatternContourSegment[],
	cap: StrokeDashCap = StrokeDashCap.Flat,
): readonly ResolvedStrokePatternPathSegment[] {
	const resolvedSegments: ResolvedStrokePatternPathSegment[] = [];

	for (const segment of segments) {
		const commands = resolveStrokePatternPath(segment, cap);

		if (commands.length === 0) {
			continue;
		}

		resolvedSegments.push({
			start: segment.start,
			end: segment.end,

			patternIndex: segment.patternIndex,

			commands,
		});
	}

	return resolvedSegments;
}

function resolveStrokePatternPath(
	segment: ResolvedStrokePatternContourSegment,
	cap: StrokeDashCap,
): readonly ShapePathCommand[] {
	const { outer, inner, startTangent, endTangent } = segment;

	if (outer.length < 2 || inner.length < 2) {
		return [];
	}

	const commands: ShapePathCommand[] = [];

	const outerStart = outer[0]!;

	const outerEnd = outer[outer.length - 1]!;

	const innerStart = inner[0]!;

	const innerEnd = inner[inner.length - 1]!;

	/*
	 * Внешняя сторона:
	 *
	 * начало dash -> конец dash
	 */
	commands.push({
		type: "moveTo",
		point: clonePoint(outerStart),
	});

	for (let index = 1; index < outer.length; index += 1) {
		commands.push({
			type: "lineTo",
			point: clonePoint(outer[index]!),
		});
	}

	/*
	 * Конечный cap:
	 *
	 * outerEnd -> innerEnd
	 */
	appendCap(commands, outerEnd, innerEnd, endTangent, cap);

	/*
	 * Внутренняя сторона:
	 *
	 * конец dash -> начало dash
	 */
	for (let index = inner.length - 2; index >= 0; index -= 1) {
		commands.push({
			type: "lineTo",
			point: clonePoint(inner[index]!),
		});
	}

	/*
	 * Начальный cap:
	 *
	 * innerStart -> outerStart.
	 *
	 * Он должен выступать в направлении,
	 * противоположном движению path.
	 */
	appendCap(
		commands,
		innerStart,
		outerStart,
		{
			x: -startTangent.x,
			y: -startTangent.y,
		},
		cap,
	);

	commands.push({
		type: "closePath",
	});

	return commands;
}

function appendCap(
	commands: ShapePathCommand[],
	from: Vector2,
	to: Vector2,
	direction: Vector2,
	cap: StrokeDashCap,
): void {
	if (cap === StrokeDashCap.Flat) {
		commands.push({
			type: "lineTo",
			point: clonePoint(to),
		});

		return;
	}

	const center = {
		x: MathF32.toF32((from.x + to.x) * 0.5),

		y: MathF32.toF32((from.y + to.y) * 0.5),
	};

	const radius = Math.hypot(to.x - from.x, to.y - from.y) * 0.5;

	if (radius <= EPSILON) {
		commands.push({
			type: "lineTo",
			point: clonePoint(to),
		});

		return;
	}

	const startAngle = Math.atan2(from.y - center.y, from.x - center.x);

	const endAngle = Math.atan2(to.y - center.y, to.x - center.x);

	const clockwise = resolveCapClockwise(startAngle, endAngle, direction);

	commands.push({
		type: "arcTo",

		center,

		radiusX: MathF32.toF32(radius),

		radiusY: MathF32.toF32(radius),

		startAngle: MathF32.toF32(radiansToDegrees(startAngle)),

		endAngle: MathF32.toF32(radiansToDegrees(endAngle)),

		clockwise,
	});
}

function resolveCapClockwise(
	startAngle: number,
	endAngle: number,
	direction: Vector2,
): boolean {
	const fullCircle = Math.PI * 2;

	let clockwiseSweep = endAngle - startAngle;

	while (clockwiseSweep < 0) {
		clockwiseSweep += fullCircle;
	}

	while (clockwiseSweep >= fullCircle) {
		clockwiseSweep -= fullCircle;
	}

	const middleAngle = startAngle + clockwiseSweep * 0.5;

	const middleDirection = {
		x: Math.cos(middleAngle),
		y: Math.sin(middleAngle),
	};

	const dot =
		middleDirection.x * direction.x + middleDirection.y * direction.y;

	return dot >= 0;
}

function radiansToDegrees(value: number): number {
	return (value * 180) / Math.PI;
}

function clonePoint(point: Vector2): Vector2 {
	return {
		x: MathF32.toF32(point.x),
		y: MathF32.toF32(point.y),
	};
}
