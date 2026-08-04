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
	StrokeAlign,
	StrokeStyle,
	StrokeDashCap,
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
rectNode.setFillMode(FillMode.LinearGradient);
rectNode.setFill("linear-gradient(red, blue)");
rectNode.setStrokeWidth([5]);
rectNode.setStrokeAlign(StrokeAlign.Outside);
rectNode.setStrokeFill("white");
rectNode.setStrokeStyle(StrokeStyle.Dotted);
rectNode.setStrokeStyleProperties(
	StrokeStyle.Dashed,
	20,
	10,
	StrokeDashCap.Round,
);

const rectNode2 = new NodeRect(20);
rectNode2.setPosition(-100, 0);
rectNode2.setSize(180, 120);
rectNode2.setCornerRadius([28]);


rectNode2.setFill("#D1D5DB");
rectNode2.setStrokeFill("blue");
rectNode2.setStrokeWidth([3]);
// rectNode2.setRotation(-8);

const ellipseNode = new NodeEllipse(2);
ellipseNode.setPosition(370, 120);
ellipseNode.setSize(190, 130);
ellipseNode.setFillMode(FillMode.MeshGradient);
ellipseNode.setStrokeStyle(StrokeStyle.Dotted);
// ellipseNode.setFill("#FDBA74");
ellipseNode.setInnerRatio(0.48);
ellipseNode.setStartAngle(20);
ellipseNode.setEndAngle(320);
ellipseNode.setStrokeFill("#7C2D12");
ellipseNode.setStrokeWidth([3]);

const polygonNode = new NodePolygon(3);

polygonNode.setStrokeAlign(StrokeAlign.Inside);
polygonNode.setFillMode(FillMode.LinearGradient);
polygonNode.setFill(
	"linear-gradient(to right, red, white)"
);
// polygonNode.setPosition(610, 100);
polygonNode.setSize(180, 150);
polygonNode.setSideCount(7);
polygonNode.setStrokeStyle(StrokeStyle.Dotted);
polygonNode.setStrokeWidth([5]);
polygonNode.setStrokeMode(FillMode.LinearGradient);
polygonNode.setStrokeFill("linear-gradient(to right, red, black)");

const starNode = new NodeStar(4);
starNode.setPosition(170, 320);
starNode.setSize(180, 170);
starNode.setInnerRatio(0.45);
starNode.setFillMode(FillMode.MeshGradient);
// starNode.setFill("#93C5FD");
starNode.setStrokeFill("#1E3A8A");
starNode.setStrokeWidth([3]);
starNode.setRotation(12);
starNode.setSideCount(25);

const pathNode = new NodePath(5);
pathNode.setPosition(440, 300);
pathNode.setSize(250, 180);
pathNode.setFillMode(FillMode.LinearGradient);
// pathNode.setFill("#67E8F9");
pathNode.setStrokeFill("#155E75");
pathNode.setStrokeWidth([3]);
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
// textNode.setFill("#E2E8F0");
// textNode.setFillMode(FillMode.LinearGradient);
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

layerWorld.addNode(textNode);
layerWorld.addNode(lineNode);
layerWorld.addNode(polygonNode);
layerWorld.addNode(rectNode2);
layerWorld.addNode(rectNode);
layerWorld.addNode(ellipseNode);
layerWorld.addNode(starNode);
layerWorld.addNode(pathNode);

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
