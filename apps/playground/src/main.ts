import logoUrl from "./assets/images/logo.png";

import {
	Scene,
	LayerBackground,
	LayerWorld,
	LayerOverlay,
	LayerUI,
	RendererLayerBackgroundCanvas,
	RendererLayerWorldCanvas,
	RendererLayerOverlayCanvas,
	CanvasRendererHost,
	NodeEllipse,
	NodeLine,
	NodePath,
	NodePolygon,
	NodeRect,
	NodeStar,
	NodeText,
	// NodeGroup,
	LineCap,
	TextAlign,
	TextWrapMode,
	TextVerticalAlign,
	LayerWorldInputController,
	LayerOverlayInputController,
	FillMode,
} from "@flowscape-ui/core-sdk";

const container = document.querySelector<HTMLDivElement>("#app");

if (!container) {
	throw new Error("Container #app not found");
}

const { clientHeight: height, clientWidth: width } = container;
const scene = new Scene(width, height);

const layerBackground = new LayerBackground();
const layerWorld = new LayerWorld();
const layerOverlay = new LayerOverlay(layerWorld);
const layerUI = new LayerUI(layerWorld);
// layerOverlay.handleManager.add("hover", new HandleHover());

scene.addLayer(layerBackground);
scene.addLayer(layerWorld);
scene.addLayer(layerOverlay);
scene.addLayer(layerUI);

scene.bindLayerRenderer(layerBackground, new RendererLayerBackgroundCanvas());
scene.bindLayerRenderer(layerWorld, new RendererLayerWorldCanvas());
scene.bindLayerRenderer(layerOverlay, new RendererLayerOverlayCanvas());

const canvasRendererHost = new CanvasRendererHost(container, -1);
scene.addHost(canvasRendererHost);

scene.inputManager.add(layerWorld, new LayerWorldInputController(), {
	stage: canvasRendererHost.getRenderNode(),
	world: layerWorld,
	options: {
		enabled: true,
		panMode: "right",
		zoomEnabled: true,
		zoomFactor: 1.08,
		preventWheelDefault: false,
		keyboardPanSpeed: 900,
		keyboardPanShiftMultiplier: 1.5,
	},
	emitChange: () => {
		scene.invalidate();
	},
});

let overlayInteractionOwner: string | null = null;
scene.inputManager.add(layerOverlay, new LayerOverlayInputController(), {
	stage: canvasRendererHost.getRenderNode(),
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

layerBackground.setFill("#1E1E1E");
layerBackground.setImage(logoUrl);
layerBackground.setImageOpacity(0.5);
layerBackground.setImageSize(250, 250);
layerBackground.setImageOffsetX("50%");
layerBackground.setImageOffsetY("50%");
layerBackground.setImagePosition("50%", "50%");

// const groupNode = new NodeGroup(1000);

const rectNode = new NodeRect(1);
rectNode.setFillMode(FillMode.MeshGradient);
rectNode.setFill(
	"mesh-gradient(grid 4 4 method bicubic in oklab, vertex v00 0% 0% #67e8f9, vertex v10 31.7% 0% #f472b6, vertex v20 75.02% 0.72% #9333ea, vertex v30 100% 0.56% hsl(195, 80%, 55%), vertex v01 0% 27.05% #7c3aed, vertex v11 40.2% 39.97% #2563eb, vertex v21 68.24% 35.81% #9333ea, vertex v31 98.83% 25.52% hsl(57, 69%, 69%), vertex v02 1.98% 70.17% #2563eb, vertex v12 38.88% 72.37% #67e8f9, vertex v22 60.62% 63.5% #2563eb, vertex v32 98.39% 72.18% #7c3aed, vertex v03 0% 100% #9333ea, vertex v13 40.73% 99.92% #06b6d4, vertex v23 74% 98.88% #f472b6, vertex v33 99.19% 99.73% #ec4899, patch p00 v00 v10 v11 v01, patch p10 v10 v20 v21 v11, patch p20 v20 v30 v31 v21, patch p01 v01 v11 v12 v02, patch p11 v11 v21 v22 v12, patch p21 v21 v31 v32 v22, patch p02 v02 v12 v13 v03, patch p12 v12 v22 v23 v13, patch p22 v22 v32 v33 v23)",
);

rectNode.setStrokeMode(FillMode.ConicGradient);
rectNode.setStrokeFill(
	"mesh-gradient(grid 3 3 method bicubic in oklab, vertex v00 0% 0% #67e8f9, vertex v10 50% 0% #f472b6, vertex v20 100% 0% #9333ea, vertex v01 0% 50% #7c3aed, vertex v11 48% 42% #facc15, vertex v21 100% 50% #06b6d4, vertex v02 0% 100% #2563eb, vertex v12 50% 100% #ec4899, vertex v22 100% 100% #111827, patch p00 v00 v10 v11 v01, patch p10 v10 v20 v21 v11, patch p01 v01 v11 v12 v02, patch p11 v11 v21 v22 v12)",
);

rectNode.setFillMode(FillMode.MeshGradient);

// const MESH_ANIMATION_FPS = 30;
// const MESH_FRAME_INTERVAL = 1000 / MESH_ANIMATION_FPS;

// let meshAnimationFrameId = 0;
// let previousMeshFrameTime = 0;

// function roundPercent(value: number): number {
// 	return Math.round(value * 100) / 100;
// }

// function createAnimatedRectMesh(time: number): string {
// 	const t = time * 0.001;

// 	const topX = roundPercent(
// 		50 + Math.sin(t * 0.8) * 8,
// 	);

// 	const leftY = roundPercent(
// 		50 + Math.cos(t * 0.7) * 8,
// 	);

// 	const rightY = roundPercent(
// 		50 + Math.sin(t * 0.9) * 8,
// 	);

// 	const bottomX = roundPercent(
// 		50 + Math.cos(t * 0.75) * 8,
// 	);

// 	const centerX = roundPercent(
// 		50 + Math.sin(t * 1.1) * 14,
// 	);

// 	const centerY = roundPercent(
// 		50 + Math.cos(t * 1.3) * 14,
// 	);

// 	const centerHue = Math.round(
// 		(time * 0.035) % 360,
// 	);

// 	return [
// 		"mesh-gradient(",
// 		"grid 3 3 method bicubic in oklab, ",

// 		"vertex v00 0% 0% #67e8f9, ",
// 		`vertex v10 ${topX}% 0% #f472b6, `,
// 		"vertex v20 100% 0% #9333ea, ",

// 		`vertex v01 0% ${leftY}% #7c3aed, `,
// 		`vertex v11 ${centerX}% ${centerY}% hsl(${centerHue}, 88%, 62%), `,
// 		`vertex v21 100% ${rightY}% #06b6d4, `,

// 		"vertex v02 0% 100% #2563eb, ",
// 		`vertex v12 ${bottomX}% 100% #ec4899, `,
// 		"vertex v22 100% 100% #facc15, ",

// 		"patch p00 v00 v10 v11 v01, ",
// 		"patch p10 v10 v20 v21 v11, ",
// 		"patch p01 v01 v11 v12 v02, ",
// 		"patch p11 v11 v21 v22 v12",
// 		")",
// 	].join("");
// }

// function animateRectMesh(time: number): void {
// 	const elapsed = time - previousMeshFrameTime;

// 	if (elapsed >= MESH_FRAME_INTERVAL) {
// 		previousMeshFrameTime =
// 			time - (elapsed % MESH_FRAME_INTERVAL);

// 		rectNode.setFill(
// 			createAnimatedRectMesh(time),
// 		);

// 		scene.invalidate();
// 	}

// 	meshAnimationFrameId =
// 		requestAnimationFrame(animateRectMesh);
// }

// meshAnimationFrameId =
// 	requestAnimationFrame(animateRectMesh);
rectNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });
// rectNode.setPosition(120, 110);
// rectNode.setSize(580, 520);
// rectNode.setCornerRadius({
//   tl: 28,
//   tr: 28,
//   bl: 0,
//   br: 0
// });
// rectNode.setFill("#D1D5DB");
// rectNode.setStrokeFill("red");
// rectNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });
// rectNode.setRotation(-8);

const rectNode2 = new NodeRect(20);
rectNode2.setPosition(-100, 0);
rectNode2.setSize(180, 120);
rectNode2.setCornerRadius({
	tl: 28,
	tr: 28,
	bl: 0,
	br: 0,
});

rectNode;
rectNode2.setFill("#D1D5DB");
rectNode2.setStrokeFill("blue");
rectNode2.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });
// rectNode2.setRotation(-8);

const ellipseNode = new NodeEllipse(2);
ellipseNode.setPosition(370, 120);
ellipseNode.setSize(190, 130);
ellipseNode.setFill("#FDBA74");
ellipseNode.setInnerRatio(0.48);
ellipseNode.setStartAngle(20);
ellipseNode.setEndAngle(320);
ellipseNode.setStrokeFill("#7C2D12");
ellipseNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });

const polygonNode = new NodePolygon(3);
// polygonNode.setPosition(610, 100);
polygonNode.setSize(180, 150);
polygonNode.setSideCount(7);
polygonNode.setFill("#86EFAC");
// polygonNode.setStrokeFill("#14532D");
// polygonNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });

const starNode = new NodeStar(4);
starNode.setPosition(170, 320);
starNode.setSize(180, 170);
starNode.setInnerRatio(0.45);
starNode.setFill("#93C5FD");
starNode.setStrokeFill("#1E3A8A");
starNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });
starNode.setRotation(12);

const pathNode = new NodePath(5);
pathNode.setPosition(440, 300);
pathNode.setSize(250, 180);
pathNode.setFill("#67E8F9");
pathNode.setStrokeFill("#155E75");
pathNode.setStrokeWidth({ t: 3, r: 3, b: 3, l: 3 });
pathNode.moveTo({ x: 22, y: 125 });
pathNode.cubicTo({ x: 55, y: 10 }, { x: 165, y: 12 }, { x: 210, y: 80 });
pathNode.quadTo({ x: 240, y: 118 }, { x: 190, y: 150 });
pathNode.lineTo({ x: 55, y: 160 });
pathNode.closePath();

const lineNode = new NodeLine(6);
lineNode.setPosition(720, 320);
lineNode.setStart({ x: 20, y: 20 });
lineNode.setEnd({ x: 220, y: 140 });
lineNode.setStrokeFill("#FCA5A5");
lineNode.setStrokeThickness(18);
lineNode.setLineCapStart(LineCap.Round);
lineNode.setLineCapEnd(LineCap.Square);

const textNode = new NodeText(7);
textNode.setPosition(700, 80);
textNode.setSize(320, 160);
textNode.setFill("#E2E8F0");
textNode.setFontFamily("Inter");
textNode.setFontSize(24);
textNode.setFontWeight(700);
textNode.setLineHeight(1.25);
textNode.setLetterSpacing(0.3);
textNode.setTextAlign(TextAlign.Left);
textNode.setVerticalAlign(TextVerticalAlign.Top);
textNode.setWrapMode(TextWrapMode.Word);
textNode.setText(
	"Flowscape Editor\n" +
		"Precision tools for building\n" +
		"interactive scene systems.",
);

// groupNode.addChild(rectNode);
// groupNode.addChild(rectNode2);
// layerWorld.addNode(groupNode);

// layerWorld.addNode(textNode);
// layerWorld.addNode(lineNode);
// layerWorld.addNode(polygonNode);
// layerWorld.addNode(rectNode2);
layerWorld.addNode(rectNode);
// layerWorld.addNode(ellipseNode);
// layerWorld.addNode(starNode);
// layerWorld.addNode(pathNode);

// layerWorld.moveNodesToTop([polygonNode.id]);

scene.invalidate();

// --- AUTO RESIZE ---
const resizeObserver = new ResizeObserver(() => {
	const width = container.clientWidth;
	const height = container.clientHeight;

	scene.setSize(width, height);
	scene.invalidate();
});

resizeObserver.observe(container);
