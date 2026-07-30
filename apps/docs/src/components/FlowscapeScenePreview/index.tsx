import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import BrowserOnly from "@docusaurus/BrowserOnly";
import styles from "./styles.module.css";
import {
	Scene,
	LayerBackground,
	LayerWorld,
	LayerOverlay,
	NodeRect,
	NodeEllipse,
	NodeLine,
	NodePath,
	NodePolygon,
	NodeFrame,
	NodeImage,
	NodeVideo,
	NodeText,
	NodeGroup,
	StrokeAlign,
	ImageFit,
	LineCap,
	LineEnding,
	TextAlign,
	TextVerticalAlign,
	TextWrapMode,
	FontStyle,
	FontDecoration,
	FontDecorationUnderlineStyle,
	RendererLayerBackgroundCanvas,
	CanvasRendererHost,
	RendererLayerWorldCanvas,
	RendererLayerOverlayCanvas,
	LayerWorldInputController,
	LayerOverlayInputController,
	type CornerRadius,
	type PathCommand,
	type Rect,
	type StrokeWidth,
	RendererCanvasBase,
} from "@flowscape-ui/core-sdk";

type StrokeWidthInput = number | Partial<StrokeWidth> | StrokeWidth;
type CornerRadiusInput = number | Partial<CornerRadius> | CornerRadius;
type StrokeAlignInput = "inside" | "center" | "outside" | StrokeAlign;
type ImageFitInput = "fill" | "contain" | "cover" | "none" | ImageFit;
type TextAlignInput = "left" | "center" | "right" | "justify" | TextAlign;
type TextVerticalAlignInput = "top" | "center" | "bottom" | TextVerticalAlign;
type TextWrapModeInput = "none" | "word" | "character" | TextWrapMode;
type FontStyleInput = "normal" | "italic" | "oblique" | FontStyle;
type FontDecorationInput =
	"none" | "underline" | "striketrough" | "overline" | FontDecoration;
type FontDecorationUnderlineStyleInput =
	"solid" | "dotted" | "wavy" | FontDecorationUnderlineStyle;
type LineCapInput = "round" | "square" | "butt" | LineCap;
type LineEndingInput =
	| "none"
	| "line-arrow"
	| "triangle-arrow"
	| "reversed-triangle"
	| "circle-arrow"
	| "diamond-arrow"
	| LineEnding;
type Vector2Input = { x: number; y: number };

type ShapeNodePreviewBase = {
	id?: number;
	name?: string;
	x?: number;
	y?: number;
	scaleX?: number;
	scaleY?: number;
	width?: number;
	height?: number;
	rotation?: number;
	opacity?: number;
	visible?: boolean;
	locked?: boolean;
	fill?: string;
	strokeFill?: string;
	strokeWidth?: StrokeWidthInput;
	strokeAlign?: StrokeAlignInput;
};

export type RectNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "rect";
	cornerRadius?: CornerRadiusInput;
};

export type EllipseNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "ellipse";
	innerRatio?: number;
	startAngle?: number;
	endAngle?: number;
};

export type LineNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "line";
	start?: Vector2Input;
	end?: Vector2Input;
	strokeThickness?: number;
	lineCapStart?: LineCapInput;
	lineCapEnd?: LineCapInput;
	startEnding?: LineEndingInput;
	endEnding?: LineEndingInput;
};

export type PathNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "path";
	commands?: PathCommand[];
	svgPath?: string;
};

export type PolygonNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "polygon";
	sideCount?: number;
};

export type FrameNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "frame";
	clipsContent?: boolean;
};

export type ImageNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "image";
	src?: string;
	alt?: string;
	fit?: ImageFitInput;
};

export type VideoNodePreviewSpec = Omit<ImageNodePreviewSpec, "kind"> & {
	kind: "video";
	poster?: string;
	autoplay?: boolean;
	looping?: boolean;
	playbackSpeed?: number;
	volume?: number;
	muted?: boolean;
	currentTime?: number;
	paused?: boolean;
};

export type TextNodePreviewSpec = ShapeNodePreviewBase & {
	kind: "text";
	text?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: number;
	fontStyle?: FontStyleInput;
	textAlign?: TextAlignInput;
	verticalAlign?: TextVerticalAlignInput;
	lineHeight?: number;
	letterSpacing?: number;
	wrapMode?: TextWrapModeInput;
	fontDecoration?: FontDecorationInput;
	underlineStyle?: FontDecorationUnderlineStyleInput;
	underlineSkipInk?: boolean;
	underlineColor?: string;
	underlineThickness?: number;
	underlineOffset?: number;
};

export type SceneNodePreviewSpec =
	| RectNodePreviewSpec
	| EllipseNodePreviewSpec
	| LineNodePreviewSpec
	| PathNodePreviewSpec
	| PolygonNodePreviewSpec
	| FrameNodePreviewSpec
	| ImageNodePreviewSpec
	| VideoNodePreviewSpec
	| TextNodePreviewSpec;
export type GroupNodePreviewSpec = {
	kind: "group";
	id?: number;
	name?: string;
	x?: number;
	y?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	children: SceneNodePreviewSpec[];
};

export type SceneDebugOverlaySpec = {
	enabled?: boolean;
	showWorldOBB?: boolean;
	showWorldAABB?: boolean;
	showPivot?: boolean;
	obbColor?: string;
	aabbColor?: string;
	pivotColor?: string;
	strokeWidth?: number;
	pivotRadius?: number;
};

export type FlowscapeScenePreviewSpec = {
	background?: {
		fill?: string;
		showLogo?: boolean;
		logoOpacity?: number;
		logoSize?: { width: number; height: number };
	};
	camera?: {
		padding?: number;
		minScale?: number;
		maxScale?: number;
	};
	debug?: SceneDebugOverlaySpec;
	nodes: Array<SceneNodePreviewSpec | GroupNodePreviewSpec>;
};

type WorldAddNodeArg = Parameters<LayerWorld["addNode"]>[0];

type FlowscapeScenePreviewProps = {
	className?: string;
	height?: number | string;
	logoUrl?: string;
	spec?: FlowscapeScenePreviewSpec;
	debugNodes?: {
		showOBB?: boolean;
		showAABB?: boolean;
		showPivot?: boolean;
		showViewBounds?: boolean;
		showOrbit?: boolean;
	};
};

const logoDefaultUrl = require("@site/static/img/logo.png").default as string;

const DEFAULT_SPEC: FlowscapeScenePreviewSpec = {
	background: {
		showLogo: true,
		logoOpacity: 0.35,
		logoSize: { width: 220, height: 220 },
	},
	camera: {
		padding: 72,
		minScale: 0.2,
		maxScale: 2.4,
	},
	debug: {
		enabled: false,
		showWorldOBB: false,
		showWorldAABB: false,
		showPivot: false,
		obbColor: "#22d3ee",
		aabbColor: "#f59e0b",
		pivotColor: "#f43f5e",
		strokeWidth: 2,
		pivotRadius: 6,
	},
	nodes: [
		{
			kind: "rect",
			width: 280,
			height: 180,
			fill: "#0b1220",
			strokeFill: "#2f7cf6",
			strokeWidth: 6,
			cornerRadius: 18,
			strokeAlign: "inside",
		},
	],
};

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function toStrokeWidth(
	input: StrokeWidthInput | undefined,
): StrokeWidth | undefined {
	if (input == null) {
		return undefined;
	}

	if (typeof input === "number") {
		return { t: input, r: input, b: input, l: input };
	}

	return {
		t: input.t ?? 0,
		r: input.r ?? 0,
		b: input.b ?? 0,
		l: input.l ?? 0,
	};
}

function toCornerRadius(
	input: CornerRadiusInput | undefined,
): CornerRadius | undefined {
	if (input == null) {
		return undefined;
	}

	if (typeof input === "number") {
		return { tl: input, tr: input, br: input, bl: input };
	}

	return {
		tl: input.tl ?? 0,
		tr: input.tr ?? 0,
		br: input.br ?? 0,
		bl: input.bl ?? 0,
	};
}

function toStrokeAlign(
	input: StrokeAlignInput | undefined,
): StrokeAlign | undefined {
	if (input == null) {
		return undefined;
	}

	if (typeof input === "number") {
		return input;
	}

	if (input === "inside") {
		return StrokeAlign.Inside;
	}

	if (input === "outside") {
		return StrokeAlign.Outside;
	}

	return StrokeAlign.Center;
}

function toImageFit(input: ImageFitInput | undefined): ImageFit | undefined {
	if (input == null) {
		return undefined;
	}

	const imageFitMap: Record<string, ImageFit> = {
		fill: ImageFit.Fill,
		contain: ImageFit.Contain,
		cover: ImageFit.Cover,
		none: ImageFit.None,
	};

	return imageFitMap[String(input)] ?? ImageFit.Cover;
}

function toLineCap(input: LineCapInput | undefined): LineCap | undefined {
	if (input == null) {
		return undefined;
	}

	const lineCapMap: Record<string, LineCap> = {
		round: LineCap.Round,
		square: LineCap.Square,
		butt: LineCap.Butt,
	};

	return lineCapMap[String(input)] ?? LineCap.Butt;
}

function toLineEnding(
	input: LineEndingInput | undefined,
): LineEnding | undefined {
	if (input == null) {
		return undefined;
	}

	const lineEndingMap: Record<string, LineEnding> = {
		none: LineEnding.None,
		"line-arrow": LineEnding.LineArrow,
		"triangle-arrow": LineEnding.TriangleArrow,
		"reversed-triangle": LineEnding.ReversedTriangle,
		"circle-arrow": LineEnding.CircleArrow,
		"diamond-arrow": LineEnding.DiamondArrow,
	};

	return lineEndingMap[String(input)] ?? LineEnding.None;
}

function toTextAlign(input: TextAlignInput | undefined): TextAlign | undefined {
	if (input == null) {
		return undefined;
	}

	const textAlignMap: Record<string, TextAlign> = {
		left: TextAlign.Left,
		center: TextAlign.Center,
		right: TextAlign.Right,
		justify: TextAlign.Justify,
	};

	return textAlignMap[String(input)] ?? TextAlign.Left;
}

function toTextVerticalAlign(
	input: TextVerticalAlignInput | undefined,
): TextVerticalAlign | undefined {
	if (input == null) {
		return undefined;
	}

	const textVerticalAlignMap: Record<string, TextVerticalAlign> = {
		top: TextVerticalAlign.Top,
		center: TextVerticalAlign.Center,
		bottom: TextVerticalAlign.Bottom,
	};

	return textVerticalAlignMap[String(input)] ?? TextVerticalAlign.Top;
}

function toTextWrapMode(
	input: TextWrapModeInput | undefined,
): TextWrapMode | undefined {
	if (input == null) {
		return undefined;
	}

	const textWrapModeMap: Record<string, TextWrapMode> = {
		none: TextWrapMode.None,
		word: TextWrapMode.Word,
		character: TextWrapMode.Character,
	};

	return textWrapModeMap[String(input)] ?? TextWrapMode.Word;
}

function toFontStyle(input: FontStyleInput | undefined): FontStyle | undefined {
	if (input == null) {
		return undefined;
	}

	const fontStyleMap: Record<string, FontStyle> = {
		normal: FontStyle.Normal,
		italic: FontStyle.Italic,
		oblique: FontStyle.Oblique,
	};

	return fontStyleMap[String(input)] ?? FontStyle.Normal;
}

function toFontDecoration(
	input: FontDecorationInput | undefined,
): FontDecoration | undefined {
	if (input == null) {
		return undefined;
	}

	const fontDecorationMap: Record<string, FontDecoration> = {
		none: FontDecoration.None,
		underline: FontDecoration.Underline,
		striketrough: FontDecoration.Striketrough,
		overline: FontDecoration.Overline,
	};

	return fontDecorationMap[String(input)] ?? FontDecoration.None;
}

function toUnderlineStyle(
	input: FontDecorationUnderlineStyleInput | undefined,
): FontDecorationUnderlineStyle | undefined {
	if (input == null) {
		return undefined;
	}

	const underlineStyleMap: Record<string, FontDecorationUnderlineStyle> = {
		solid: FontDecorationUnderlineStyle.Solid,
		dotted: FontDecorationUnderlineStyle.Dotted,
		wavy: FontDecorationUnderlineStyle.Wavy,
	};

	return (
		underlineStyleMap[String(input)] ?? FontDecorationUnderlineStyle.Solid
	);
}

type ShapeNodeLike = {
	setSize(width: number, height: number): void;
	setPosition(x: number, y: number): void;
	setName(value: string): void;
	setFill(value: string): void;
	setStrokeFill(value: string): void;
	setStrokeWidth(value: StrokeWidth): void;
	setStrokeAlign(value: StrokeAlign): void;
	setOpacity(value: number): void;
	setVisible(value: boolean): void;
	setLocked(value: boolean): void;
	setRotation(value: number): void;
	setScale(sx: number, sy: number): void;
};

function applyCommonShapeProps(
	node: ShapeNodeLike,
	nodeSpec: ShapeNodePreviewBase,
): void {
	node.setSize(nodeSpec.width ?? 280, nodeSpec.height ?? 180);
	node.setPosition(nodeSpec.x ?? 0, nodeSpec.y ?? 0);

	if (typeof nodeSpec.name === "string") {
		node.setName(nodeSpec.name);
	}

	if (typeof nodeSpec.fill === "string") {
		node.setFill(nodeSpec.fill);
	}

	if (typeof nodeSpec.strokeFill === "string") {
		node.setStrokeFill(nodeSpec.strokeFill);
	}

	const strokeWidth = toStrokeWidth(nodeSpec.strokeWidth);
	if (strokeWidth) {
		node.setStrokeWidth(strokeWidth);
	}

	const strokeAlign = toStrokeAlign(nodeSpec.strokeAlign);
	if (strokeAlign != null) {
		node.setStrokeAlign(strokeAlign);
	}

	if (typeof nodeSpec.opacity === "number") {
		node.setOpacity(nodeSpec.opacity);
	}

	if (typeof nodeSpec.visible === "boolean") {
		node.setVisible(nodeSpec.visible);
	}

	if (typeof nodeSpec.locked === "boolean") {
		node.setLocked(nodeSpec.locked);
	}

	if (typeof nodeSpec.rotation === "number") {
		node.setRotation(nodeSpec.rotation);
	}

	if (
		typeof nodeSpec.scaleX === "number" ||
		typeof nodeSpec.scaleY === "number"
	) {
		node.setScale(nodeSpec.scaleX ?? 1, nodeSpec.scaleY ?? 1);
	}
}

type LineNodeLike = {
	setPosition(x: number, y: number): void;
	setName(value: string): void;
	setFill(value: string): void;
	setStrokeFill(value: string): void;
	setStrokeWidth(value: StrokeWidth): void;
	setStrokeAlign(value: StrokeAlign): void;
	setOpacity(value: number): void;
	setVisible(value: boolean): void;
	setLocked(value: boolean): void;
	setRotation(value: number): void;
	setScale(sx: number, sy: number): void;
	setStart(value: Vector2Input): void;
	setEnd(value: Vector2Input): void;
	setStrokeThickness(value: number): void;
	setLineCapStart(value: LineCap): void;
	setLineCapEnd(value: LineCap): void;
	setStartEnding(value: LineEnding): void;
	setEndEnding(value: LineEnding): void;
};

function applyCommonLineProps(
	node: LineNodeLike,
	nodeSpec: LineNodePreviewSpec,
): void {
	node.setPosition(nodeSpec.x ?? 0, nodeSpec.y ?? 0);
	node.setStart(nodeSpec.start ?? { x: 0, y: 0 });
	node.setEnd(nodeSpec.end ?? { x: 220, y: 0 });

	if (typeof nodeSpec.name === "string") {
		node.setName(nodeSpec.name);
	}

	if (typeof nodeSpec.fill === "string") {
		node.setFill(nodeSpec.fill);
	}

	if (typeof nodeSpec.strokeFill === "string") {
		node.setStrokeFill(nodeSpec.strokeFill);
	}

	const strokeWidth = toStrokeWidth(nodeSpec.strokeWidth);
	if (strokeWidth) {
		node.setStrokeWidth(strokeWidth);
	}

	if (typeof nodeSpec.strokeThickness === "number") {
		node.setStrokeThickness(nodeSpec.strokeThickness);
	}

	const strokeAlign = toStrokeAlign(nodeSpec.strokeAlign);
	if (strokeAlign != null) {
		node.setStrokeAlign(strokeAlign);
	}

	const lineCapStart = toLineCap(nodeSpec.lineCapStart);
	if (lineCapStart != null) {
		node.setLineCapStart(lineCapStart);
	}

	const lineCapEnd = toLineCap(nodeSpec.lineCapEnd);
	if (lineCapEnd != null) {
		node.setLineCapEnd(lineCapEnd);
	}

	const startEnding = toLineEnding(nodeSpec.startEnding);
	if (startEnding != null) {
		node.setStartEnding(startEnding);
	}

	const endEnding = toLineEnding(nodeSpec.endEnding);
	if (endEnding != null) {
		node.setEndEnding(endEnding);
	}

	if (typeof nodeSpec.opacity === "number") {
		node.setOpacity(nodeSpec.opacity);
	}

	if (typeof nodeSpec.visible === "boolean") {
		node.setVisible(nodeSpec.visible);
	}

	if (typeof nodeSpec.locked === "boolean") {
		node.setLocked(nodeSpec.locked);
	}

	if (typeof nodeSpec.rotation === "number") {
		node.setRotation(nodeSpec.rotation);
	}

	if (
		typeof nodeSpec.scaleX === "number" ||
		typeof nodeSpec.scaleY === "number"
	) {
		node.setScale(nodeSpec.scaleX ?? 1, nodeSpec.scaleY ?? 1);
	}
}

type PathNodeLike = {
	setPosition(x: number, y: number): void;
	setSize(width: number, height: number): void;
	setName(value: string): void;
	setFill(value: string): void;
	setStrokeFill(value: string): void;
	setStrokeWidth(value: StrokeWidth): void;
	setStrokeAlign(value: StrokeAlign): void;
	setOpacity(value: number): void;
	setVisible(value: boolean): void;
	setLocked(value: boolean): void;
	setRotation(value: number): void;
	setScale(sx: number, sy: number): void;
	setCommands(value: PathCommand[]): void;
};

function applyCommonPathProps(
	node: PathNodeLike,
	nodeSpec: PathNodePreviewSpec,
): void {
	node.setPosition(nodeSpec.x ?? 0, nodeSpec.y ?? 0);

	if (
		typeof nodeSpec.width === "number" &&
		typeof nodeSpec.height === "number"
	) {
		node.setSize(nodeSpec.width, nodeSpec.height);
	}

	if (typeof nodeSpec.name === "string") {
		node.setName(nodeSpec.name);
	}

	if (typeof nodeSpec.fill === "string") {
		node.setFill(nodeSpec.fill);
	}

	if (typeof nodeSpec.strokeFill === "string") {
		node.setStrokeFill(nodeSpec.strokeFill);
	}

	const strokeWidth = toStrokeWidth(nodeSpec.strokeWidth);
	if (strokeWidth) {
		node.setStrokeWidth(strokeWidth);
	}

	const strokeAlign = toStrokeAlign(nodeSpec.strokeAlign);
	if (strokeAlign != null) {
		node.setStrokeAlign(strokeAlign);
	}

	if (Array.isArray(nodeSpec.commands)) {
		node.setCommands(nodeSpec.commands);
	} else if (
		typeof nodeSpec.svgPath === "string" &&
		nodeSpec.svgPath.trim().length > 0
	) {
		node.setCommands(NodePath.parseSvgPathToCommands(nodeSpec.svgPath));
	}

	if (typeof nodeSpec.opacity === "number") {
		node.setOpacity(nodeSpec.opacity);
	}

	if (typeof nodeSpec.visible === "boolean") {
		node.setVisible(nodeSpec.visible);
	}

	if (typeof nodeSpec.locked === "boolean") {
		node.setLocked(nodeSpec.locked);
	}

	if (typeof nodeSpec.rotation === "number") {
		node.setRotation(nodeSpec.rotation);
	}

	if (
		typeof nodeSpec.scaleX === "number" ||
		typeof nodeSpec.scaleY === "number"
	) {
		node.setScale(nodeSpec.scaleX ?? 1, nodeSpec.scaleY ?? 1);
	}
}

type ImageNodeLike = ShapeNodeLike & {
	setSrc(value: string): void;
	setAlt(value: string): void;
	setFit(value: ImageFit): void;
};

type ImageNodeLikeSpec = ShapeNodePreviewBase & {
	src?: string;
	alt?: string;
	fit?: ImageFitInput;
};

function applyCommonImageProps(
	node: ImageNodeLike,
	nodeSpec: ImageNodeLikeSpec,
): void {
	applyCommonShapeProps(node, nodeSpec);

	if (typeof nodeSpec.src === "string") {
		node.setSrc(nodeSpec.src);
	}

	if (typeof nodeSpec.alt === "string") {
		node.setAlt(nodeSpec.alt);
	}

	const fit = toImageFit(nodeSpec.fit);
	if (fit != null) {
		node.setFit(fit);
	}
}

type VideoNodeLike = ImageNodeLike & {
	setPoster(value: string): void;
	setAutoplay(value: boolean): void;
	setLooping(value: boolean): void;
	setPlaybackSpeed(value: number): void;
	setVolume(value: number): void;
	mute(): void;
	unmute(): void;
	setCurrentTime(value: number): void;
	play(): void;
	pause(): void;
};

function applyCommonVideoProps(
	node: VideoNodeLike,
	nodeSpec: VideoNodePreviewSpec,
): void {
	applyCommonImageProps(node, nodeSpec);

	if (typeof nodeSpec.poster === "string") {
		node.setPoster(nodeSpec.poster);
	}

	if (typeof nodeSpec.autoplay === "boolean") {
		node.setAutoplay(nodeSpec.autoplay);
	}

	if (typeof nodeSpec.looping === "boolean") {
		node.setLooping(nodeSpec.looping);
	}

	if (typeof nodeSpec.playbackSpeed === "number") {
		node.setPlaybackSpeed(nodeSpec.playbackSpeed);
	}

	if (typeof nodeSpec.volume === "number") {
		node.setVolume(nodeSpec.volume);
	}

	if (typeof nodeSpec.currentTime === "number") {
		node.setCurrentTime(nodeSpec.currentTime);
	}

	if (typeof nodeSpec.muted === "boolean") {
		if (nodeSpec.muted) {
			node.mute();
		} else {
			node.unmute();
		}
	}

	if (typeof nodeSpec.paused === "boolean") {
		if (nodeSpec.paused) {
			node.pause();
		} else {
			node.play();
		}
	} else if (nodeSpec.autoplay === true) {
		// Autoplay flag alone does not flip NodeVideo paused state in current SDK.
		// Start playback explicitly for preview/demo configurations.
		node.play();
	}
}

type TextNodeLike = ShapeNodeLike & {
	setText(value: string): void;
	setFontFamily(value: string): void;
	setFontSize(value: number): void;
	setFontWeight(value: number): void;
	setFontStyle(value: FontStyle): void;
	setTextAlign(value: TextAlign): void;
	setVerticalAlign(value: TextVerticalAlign): void;
	setLineHeight(value: number): void;
	setLetterSpacing(value: number): void;
	setWrapMode(value: TextWrapMode): void;
	setFontDecoration(value: FontDecoration): void;
	setUnderlineStyle(value: FontDecorationUnderlineStyle): void;
	setUnderlineSkipInk(value: boolean): void;
	setUnderlineColor(value: string): void;
	setUnderlineThickness(value: number): void;
	setUnderlineOffset(value: number): void;
};

function applyCommonTextProps(
	node: TextNodeLike,
	nodeSpec: TextNodePreviewSpec,
): void {
	applyCommonShapeProps(node, nodeSpec);

	if (typeof nodeSpec.text === "string") {
		node.setText(nodeSpec.text);
	}

	if (typeof nodeSpec.fontFamily === "string") {
		node.setFontFamily(nodeSpec.fontFamily);
	}

	if (typeof nodeSpec.fontSize === "number") {
		node.setFontSize(nodeSpec.fontSize);
	}

	if (typeof nodeSpec.fontWeight === "number") {
		node.setFontWeight(nodeSpec.fontWeight);
	}

	const fontStyle = toFontStyle(nodeSpec.fontStyle);
	if (fontStyle != null) {
		node.setFontStyle(fontStyle);
	}

	const textAlign = toTextAlign(nodeSpec.textAlign);
	if (textAlign != null) {
		node.setTextAlign(textAlign);
	}

	const verticalAlign = toTextVerticalAlign(nodeSpec.verticalAlign);
	if (verticalAlign != null) {
		node.setVerticalAlign(verticalAlign);
	}

	if (typeof nodeSpec.lineHeight === "number") {
		node.setLineHeight(nodeSpec.lineHeight);
	}

	if (typeof nodeSpec.letterSpacing === "number") {
		node.setLetterSpacing(nodeSpec.letterSpacing);
	}

	const wrapMode = toTextWrapMode(nodeSpec.wrapMode);
	if (wrapMode != null) {
		node.setWrapMode(wrapMode);
	}

	const fontDecoration = toFontDecoration(nodeSpec.fontDecoration);
	if (fontDecoration != null) {
		node.setFontDecoration(fontDecoration);
	}

	const underlineStyle = toUnderlineStyle(nodeSpec.underlineStyle);
	if (underlineStyle != null) {
		node.setUnderlineStyle(underlineStyle);
	}

	if (typeof nodeSpec.underlineSkipInk === "boolean") {
		node.setUnderlineSkipInk(nodeSpec.underlineSkipInk);
	}

	if (typeof nodeSpec.underlineColor === "string") {
		node.setUnderlineColor(nodeSpec.underlineColor);
	}

	if (typeof nodeSpec.underlineThickness === "number") {
		node.setUnderlineThickness(nodeSpec.underlineThickness);
	}

	if (typeof nodeSpec.underlineOffset === "number") {
		node.setUnderlineOffset(nodeSpec.underlineOffset);
	}
}

type BoundsNode = {
	getWorldAABB(): Rect;
	getWorldViewAABB?: () => Rect;
};

type OverlayDebugNode = BoundsNode & {
	getWorldCorners(): [Vector2Input, Vector2Input, Vector2Input, Vector2Input];
	getWorldMatrix(): {
		a: number;
		b: number;
		c: number;
		d: number;
		tx: number;
		ty: number;
	};
	getWidth(): number;
	getHeight(): number;
	getPivotX(): number;
	getPivotY(): number;
};

type RequiredSceneDebugOverlaySpec = Required<SceneDebugOverlaySpec>;

function getNodeBounds(node: BoundsNode): Rect {
	if (typeof node.getWorldViewAABB === "function") {
		return node.getWorldViewAABB();
	}
	return node.getWorldAABB();
}

function getWorldPivot(node: OverlayDebugNode): Vector2Input {
	const matrix = node.getWorldMatrix();
	const localPivotX = node.getWidth() * node.getPivotX();
	const localPivotY = node.getHeight() * node.getPivotY();

	return {
		x: matrix.a * localPivotX + matrix.c * localPivotY + matrix.tx,
		y: matrix.b * localPivotX + matrix.d * localPivotY + matrix.ty,
	};
}

function addDebugOverlays(
	layerWorld: LayerWorld,
	nodes: OverlayDebugNode[],
	options: RequiredSceneDebugOverlaySpec,
	getNextId: () => number,
): void {
	if (!options.enabled) {
		return;
	}

	const strokeWidth = Math.max(1, options.strokeWidth);
	const pivotRadius = Math.max(2, options.pivotRadius);

	for (const node of nodes) {
		if (options.showWorldAABB) {
			const aabb = node.getWorldAABB();
			const aabbNode = new NodeRect(getNextId());
			aabbNode.setName("__debug_aabb__");
			aabbNode.setSize(Math.max(1, aabb.width), Math.max(1, aabb.height));
			aabbNode.setPosition(
				aabb.x + aabb.width / 2,
				aabb.y + aabb.height / 2,
			);
			aabbNode.setFill("#00000000");
			aabbNode.setStrokeFill(options.aabbColor);
			aabbNode.setStrokeWidth({
				t: strokeWidth,
				r: strokeWidth,
				b: strokeWidth,
				l: strokeWidth,
			});
			aabbNode.setLocked(true);
			layerWorld.addNode(aabbNode as unknown as WorldAddNodeArg);
		}

		if (options.showWorldOBB) {
			const corners = node.getWorldCorners();

			for (let i = 0; i < corners.length; i += 1) {
				const from = corners[i];
				const to = corners[(i + 1) % corners.length];
				const edgeNode = new NodeLine(getNextId());
				edgeNode.setName("__debug_obb_edge__");
				edgeNode.setStart({ x: from.x, y: from.y });
				edgeNode.setEnd({ x: to.x, y: to.y });
				edgeNode.setStrokeFill(options.obbColor);
				edgeNode.setStrokeThickness(strokeWidth);
				edgeNode.setLocked(true);
				layerWorld.addNode(edgeNode as unknown as WorldAddNodeArg);
			}
		}

		if (options.showPivot) {
			const pivot = getWorldPivot(node);
			const pivotNode = new NodeEllipse(getNextId());
			pivotNode.setName("__debug_pivot__");
			pivotNode.setSize(pivotRadius * 2, pivotRadius * 2);
			pivotNode.setPosition(pivot.x, pivot.y);
			pivotNode.setFill(options.pivotColor);
			pivotNode.setStrokeFill("#ffffff");
			pivotNode.setStrokeWidth({ t: 1, r: 1, b: 1, l: 1 });
			pivotNode.setLocked(true);
			layerWorld.addNode(pivotNode as unknown as WorldAddNodeArg);
		}
	}
}

function mergeBounds(boundsList: Rect[]): Rect | null {
	if (boundsList.length === 0) {
		return null;
	}

	let minX = boundsList[0].x;
	let minY = boundsList[0].y;
	let maxX = boundsList[0].x + boundsList[0].width;
	let maxY = boundsList[0].y + boundsList[0].height;

	for (let i = 1; i < boundsList.length; i += 1) {
		const bounds = boundsList[i];
		minX = Math.min(minX, bounds.x);
		minY = Math.min(minY, bounds.y);
		maxX = Math.max(maxX, bounds.x + bounds.width);
		maxY = Math.max(maxY, bounds.y + bounds.height);
	}

	return {
		x: minX,
		y: minY,
		width: Math.max(maxX - minX, 1),
		height: Math.max(maxY - minY, 1),
	};
}

function FlowscapeScenePreviewInner({
	className,
	height,
	logoUrl,
	spec,
	debugNodes,
}: Required<FlowscapeScenePreviewProps>) {
	const { showAABB, showOBB, showPivot, showViewBounds, showOrbit } =
		debugNodes;

	RendererCanvasBase.DEBUG_OBB = showOBB;
	RendererCanvasBase.DEBUG_AABB = showAABB;
	RendererCanvasBase.DEBUG_ORBIT = showOrbit;
	RendererCanvasBase.DEBUG_PIVOT = showPivot;
	RendererCanvasBase.DEBUG_VIEW_BOUNDS = showViewBounds;
	const mountRef = useRef<HTMLDivElement | null>(null);

	const resolvedSpec = useMemo<FlowscapeScenePreviewSpec>(() => {
		return {
			...DEFAULT_SPEC,
			...spec,
			background: {
				...DEFAULT_SPEC.background,
				...spec?.background,
				logoSize: {
					...DEFAULT_SPEC.background?.logoSize,
					...spec?.background?.logoSize,
				},
			},
			camera: {
				...DEFAULT_SPEC.camera,
				...spec?.camera,
			},
			debug: {
				...(DEFAULT_SPEC.debug ?? {}),
				...spec?.debug,
			},
			nodes: spec?.nodes?.length ? spec.nodes : DEFAULT_SPEC.nodes,
		};
	}, [spec]);

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) {
			return;
		}

		const scene = new Scene(mount.clientWidth, mount.clientHeight);
		const layerBackground = new LayerBackground();
		const layerWorld = new LayerWorld();
		const layerOverlay = new LayerOverlay(layerWorld);

		scene.addLayer(layerBackground);
		scene.addLayer(layerWorld);
		scene.addLayer(layerOverlay);

		const backgroundRenderer = new RendererLayerBackgroundCanvas();
		scene.bindLayerRenderer(layerBackground, backgroundRenderer);

		const worldRenderer = new RendererLayerWorldCanvas();
		scene.bindLayerRenderer(layerWorld, worldRenderer);

		const overlayRenderer = new RendererLayerOverlayCanvas();
		scene.bindLayerRenderer(layerOverlay, overlayRenderer);

		const host = new CanvasRendererHost(mount, -1);
		scene.addHost(host);

		const worldInputController = new LayerWorldInputController();
		scene.inputManager.add(layerWorld, worldInputController, {
			stage: host.getRenderNode(),
			world: layerWorld,
			options: {
				enabled: true,
				panMode: "right",
				zoomEnabled: true,
				zoomFactor: 1.08,
				preventWheelDefault: true,
				keyboardPanSpeed: 900,
				keyboardPanShiftMultiplier: 1.5,
			},
			emitChange: () => {
				scene.invalidate();
			},
		});

		let overlayInteractionOwner: string | null = null;
		const overlayInputController = new LayerOverlayInputController();
		scene.inputManager.add(layerOverlay, overlayInputController, {
			stage: host.getRenderNode(),
			world: layerWorld,
			overlay: layerOverlay,
			emitChange: () => {
				scene.invalidate();
			},
			getInteractionOwner: () => overlayInteractionOwner,
			tryBeginInteraction: (ownerId: string) => {
				if (overlayInteractionOwner !== null) {
					return overlayInteractionOwner === ownerId;
				}
				overlayInteractionOwner = ownerId;
				return true;
			},
			endInteraction: (ownerId: string) => {
				if (overlayInteractionOwner === ownerId) {
					overlayInteractionOwner = null;
				}
			},
		});

		const background = resolvedSpec.background ?? DEFAULT_SPEC.background!;
		layerBackground.setFill(background.fill ?? "#1E1E1E");
		if (background.showLogo) {
			layerBackground.setImage(logoUrl);
			layerBackground.setImageOpacity(background.logoOpacity ?? 0.35);
			layerBackground.setImageSize(
				background.logoSize?.width ?? 220,
				background.logoSize?.height ?? 220,
			);
			layerBackground.setImageOffsetX("50%");
			layerBackground.setImageOffsetY("50%");
			layerBackground.setImagePosition("50%", "50%");
		}

		const createdNodes: BoundsNode[] = [];
		let nextId = 1;

		const createRenderableNode = (
			nodeSpec: SceneNodePreviewSpec,
			parent?: NodeGroup,
		): BoundsNode | null => {
			if (nodeSpec.kind === "rect") {
				const rectNode = new NodeRect(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonShapeProps(rectNode, nodeSpec);

				const cornerRadius = toCornerRadius(nodeSpec.cornerRadius);
				if (cornerRadius) {
					rectNode.setCornerRadius(cornerRadius);
				}

				if (parent) {
					parent.addChild(rectNode);
				} else {
					layerWorld.addNode(rectNode);
				}
				return rectNode;
			}

			if (nodeSpec.kind === "ellipse") {
				const ellipseNode = new NodeEllipse(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonShapeProps(ellipseNode, nodeSpec);

				if (typeof nodeSpec.innerRatio === "number") {
					ellipseNode.setInnerRatio(nodeSpec.innerRatio);
				}

				if (typeof nodeSpec.startAngle === "number") {
					ellipseNode.setStartAngle(nodeSpec.startAngle);
				}

				if (typeof nodeSpec.endAngle === "number") {
					ellipseNode.setEndAngle(nodeSpec.endAngle);
				}

				if (parent) {
					parent.addChild(ellipseNode);
				} else {
					layerWorld.addNode(ellipseNode);
				}
				return ellipseNode;
			}

			if (nodeSpec.kind === "line") {
				const lineNode = new NodeLine(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonLineProps(lineNode, nodeSpec);

				layerWorld.addNode(lineNode);
				return lineNode;
			}

			if (nodeSpec.kind === "path") {
				const pathNode = new NodePath(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonPathProps(pathNode, nodeSpec);

				if (parent) {
					parent.addChild(pathNode);
				} else {
					layerWorld.addNode(pathNode);
				}
				return pathNode;
			}

			if (nodeSpec.kind === "polygon") {
				const polygonNode = new NodePolygon(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonShapeProps(polygonNode, nodeSpec);

				if (typeof nodeSpec.sideCount === "number") {
					polygonNode.setSideCount(nodeSpec.sideCount);
				}

				// Intentionally no group parent binding for polygon previews.
				layerWorld.addNode(polygonNode);
				return polygonNode;
			}

			if (nodeSpec.kind === "frame") {
				const frameNode = new NodeFrame(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonShapeProps(frameNode, nodeSpec);

				if (typeof nodeSpec.clipsContent === "boolean") {
					frameNode.setClipsContent(nodeSpec.clipsContent);
				}

				if (parent) {
					parent.addChild(frameNode);
				} else {
					layerWorld.addNode(frameNode);
				}
				return frameNode;
			}

			if (nodeSpec.kind === "image") {
				const imageNode = new NodeImage(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonImageProps(imageNode, nodeSpec);

				if (parent) {
					parent.addChild(imageNode);
				} else {
					layerWorld.addNode(imageNode);
				}
				return imageNode;
			}

			if (nodeSpec.kind === "video") {
				const videoNode = new NodeVideo(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonVideoProps(videoNode, nodeSpec);

				if (parent) {
					parent.addChild(videoNode);
				} else {
					layerWorld.addNode(videoNode);
				}
				return videoNode;
			}

			if (nodeSpec.kind === "text") {
				const textNode = new NodeText(nodeSpec.id ?? nextId);
				nextId += 1;

				applyCommonTextProps(textNode, nodeSpec);

				// Intentionally standalone: add text directly to world.
				layerWorld.addNode(textNode);
				return textNode;
			}

			return null;
		};

		const createGroupNode = (groupSpec: GroupNodePreviewSpec): void => {
			const groupNode = new NodeGroup(groupSpec.id ?? nextId);
			nextId += 1;

			if (typeof groupSpec.name === "string") {
				groupNode.setName(groupSpec.name);
			}

			groupNode.setPosition(groupSpec.x ?? 0, groupSpec.y ?? 0);

			if (typeof groupSpec.rotation === "number") {
				groupNode.setRotation(groupSpec.rotation);
			}

			if (
				typeof groupSpec.scaleX === "number" ||
				typeof groupSpec.scaleY === "number"
			) {
				groupNode.setScale(
					groupSpec.scaleX ?? 1,
					groupSpec.scaleY ?? 1,
				);
			}

			// Group is structural in the current renderer, but we still register it in world.
			layerWorld.addNode(groupNode as unknown as WorldAddNodeArg);

			for (const childSpec of groupSpec.children) {
				const node = createRenderableNode(childSpec, groupNode);
				if (node) {
					createdNodes.push(node);
				}
			}
		};

		for (const nodeSpec of resolvedSpec.nodes) {
			if (nodeSpec.kind === "group") {
				createGroupNode(nodeSpec);
				continue;
			}

			const node = createRenderableNode(nodeSpec);
			if (node) {
				createdNodes.push(node);
			}
		}

		const debugOptions = {
			...(DEFAULT_SPEC.debug ?? {}),
			...resolvedSpec.debug,
		} as RequiredSceneDebugOverlaySpec;

		const getNextId = (): number => {
			const id = nextId;
			nextId += 1;
			return id;
		};

		addDebugOverlays(
			layerWorld,
			createdNodes as OverlayDebugNode[],
			debugOptions,
			getNextId,
		);

		const fitSceneToContent = () => {
			const camera = layerWorld.camera;
			const cameraCfg = resolvedSpec.camera ?? DEFAULT_SPEC.camera!;
			const padding = cameraCfg.padding ?? 72;
			const minScale = cameraCfg.minScale ?? 0.2;
			const maxScale = cameraCfg.maxScale ?? 2.4;

			const boundsList = createdNodes.map((node) => getNodeBounds(node));
			const mergedBounds = mergeBounds(boundsList);
			if (!mergedBounds) {
				scene.invalidate();
				return;
			}

			const viewWidth = Math.max(mount.clientWidth, 1);
			const viewHeight = Math.max(mount.clientHeight, 1);
			const availableWidth = Math.max(viewWidth - padding * 2, 1);
			const availableHeight = Math.max(viewHeight - padding * 2, 1);

			const scaleX = availableWidth / Math.max(mergedBounds.width, 1);
			const scaleY = availableHeight / Math.max(mergedBounds.height, 1);
			const targetScale = clamp(
				Math.min(scaleX, scaleY),
				minScale,
				maxScale,
			);

			camera.setLimits(minScale, maxScale);
			camera.setPosition(
				mergedBounds.x + mergedBounds.width / 2,
				mergedBounds.y + mergedBounds.height / 2,
			);
			camera.setScale(targetScale);
			scene.invalidate();
		};

		fitSceneToContent();

		const resizeObserver = new ResizeObserver(() => {
			scene.setSize(mount.clientWidth, mount.clientHeight);
			fitSceneToContent();
		});
		resizeObserver.observe(mount);

		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
		};
		mount.addEventListener("wheel", onWheel, { passive: false });

		return () => {
			resizeObserver.disconnect();
			mount.removeEventListener("wheel", onWheel);
			scene.inputManager.remove(worldInputController.id);
			scene.inputManager.remove(overlayInputController.id);
			scene.removeHost(-1);
		};
	}, [logoUrl, resolvedSpec]);

	return (
		<div className={clsx(styles.previewRoot, className)} style={{ height }}>
			<div ref={mountRef} className={styles.previewMount} />
		</div>
	);
}

export default function FlowscapeScenePreview({
	className = "",
	height = 360,
	logoUrl = logoDefaultUrl,
	spec = DEFAULT_SPEC,
	debugNodes = {
		showAABB: false,
		showOBB: false,
		showOrbit: false,
		showPivot: false,
		showViewBounds: false,
	},
}: FlowscapeScenePreviewProps) {
	return (
		<BrowserOnly>
			{() => (
				<FlowscapeScenePreviewInner
					className={className}
					height={height}
					logoUrl={logoUrl}
					spec={spec}
					debugNodes={debugNodes}
				/>
			)}
		</BrowserOnly>
	);
}
