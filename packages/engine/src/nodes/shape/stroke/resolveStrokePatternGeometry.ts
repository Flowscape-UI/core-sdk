import {
	StrokeAlign,
	StrokeDashCap,
	type ResolvedStrokePatternPathSegment,
	type ShapePathCommand,
	type StrokeStyleGap,
	type StrokeStyleLength,
} from "../types";

import { resolveStrokePathMetrics } from "./index";
import { resolveStrokeStylePattern } from "./index";
import { resolveStrokePatternIntervals } from "./resolveStrokePatternIntervals";
import { resolveStrokePatternSegments } from "./resolveStrokePatternSegments";
import { resolveStrokePatternEdges } from "./resolveStrokePatternEdges";
import { resolveStrokePatternOffsets } from "./resolveStrokePatternOffsets";
import { resolveStrokePatternContours } from "./resolveStrokePatternContours";
import { resolveStrokePatternPaths } from "./resolveStrokePatternPaths";

export type ResolveStrokePatternGeometryOptions =
	Readonly<{
		strokeWidth: number;
		strokeAlign: StrokeAlign;

		length: StrokeStyleLength;
		gap: StrokeStyleGap;

		cap?: StrokeDashCap;
	}>;

export function resolveStrokePatternGeometry(
	commands: readonly ShapePathCommand[],
	options: ResolveStrokePatternGeometryOptions,
): readonly ResolvedStrokePatternPathSegment[] {
	const metrics =
		resolveStrokePathMetrics(
			commands,
		);

	if (
		metrics.points.length < 2 ||
		metrics.length <= 0
	) {
		return [];
	}

	const pattern =
		resolveStrokeStylePattern(
			options.length,
			options.gap,
		);

	const intervals =
		resolveStrokePatternIntervals(
			metrics.length,
			pattern,
		);

	const segments =
		resolveStrokePatternSegments(
			metrics,
			intervals,
		);

	const edges =
		resolveStrokePatternEdges(
			segments,
			metrics.winding,
		);

	const offsets =
		resolveStrokePatternOffsets(
			edges,
			options.strokeWidth,
			options.strokeAlign,
		);

	const contours =
		resolveStrokePatternContours(
			offsets,
		);

	return resolveStrokePatternPaths(
		contours,
		options.cap ??
			StrokeDashCap.Flat,
	);
}