import logoUrl from './assets/images/logo.png';
import videoUrl from './assets/images/vid.mp4';

import { Scene } from '../../src/scene/Scene';
// import { getNodeWorldCorners } from '../../src/core/scene/layers/overlay';
import { NodeRect, StrokeAlign, NodeEllipse, NodePolygon, NodeStar, NodeLine, LineCap, NodeText, TextWrapMode, NodeImage, NodeVideo, NodePath } from '../../src/nodes';
// import { EffectType } from '../../src/nodes/shape/effect';
// import { EffectInnerShadow, EffectShadow, ShadowMode } from '../../src/renderer/effect';
// import { RendererSceneCanvas } from '../../src/renderer/canvas/scene/RendererSceneCanvas';
// import { RendererLayerBackgroundCanvas } from '../../src/renderer';

import { RendererCanvasBase, RendererLayerBackgroundCanvas } from '../../src/renderer';
import { CanvasRendererHost } from '../../src/renderer/hosts/CanvasRendererHost';
import { RendererLayerWorldCanvas } from '../../src/renderer/canvas/scene/layers/world';
import { RendererLayerOverlayCanvas, RendererLayerOverlayTarget } from '../../src/renderer/canvas/scene/layers/overlay';
import { RendererLayerUI } from '../../src/renderer/ui';
import { LayerWorldInputController } from '../../src/input';
import { LayerOverlayInputController } from '../../src/input/controllers/layers/overlay/LayerOverlayInputController';


const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Container #app not found');
}
// const renderer = new RendererSceneCanvas(container);
// const host = new RenderHost(container);
const scene = new Scene(container.clientWidth, container.clientHeight);

const layerBackground = new RendererLayerBackgroundCanvas();
scene.layerManager.add(
  scene.layerBackground,
  layerBackground,
  scene.layerBackground,
);

const layerWorld = new RendererLayerWorldCanvas();
scene.layerManager.add(
  scene.layerWorld,
  layerWorld,
  scene.layerWorld,
);


const layerOverlay = new RendererLayerOverlayCanvas();
const overlayTarget = new RendererLayerOverlayTarget(
  scene.layerOverlay,
  scene.layerWorld.getCamera()
);
scene.layerManager.add(
  scene.layerOverlay,
  layerOverlay,
  overlayTarget,
);

const layerUI = new RendererLayerUI(container);
scene.layerManager.add(
  scene.layerUI,
  layerUI,
  scene.layerUI,
);

const canvasRendererHost = new CanvasRendererHost(container, -1);
// const htmlRendererHost = new HtmlRendererHost(container, -1);
scene.hostManager.add(canvasRendererHost);
// scene.hostManager.add(htmlRendererHost);

scene.inputManager.add(
  scene.layerWorld,
  new LayerWorldInputController(),
  {
    stage: canvasRendererHost.getRenderNode(),
    world: scene.layerWorld,
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
    }
  }
);

let overlayInteractionOwner: string | null = null;
scene.inputManager.add(
  scene.layerOverlay,
  new LayerOverlayInputController(),
  {
    stage: canvasRendererHost.getRenderNode(),
    world: scene.layerWorld,
    overlay: scene.layerOverlay,
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
  }
);

scene.layerBackground.setFill("#1E1E1E");
scene.layerBackground.setImage(logoUrl);
scene.layerBackground.setImageOpacity(0.5);
scene.layerBackground.setImageSize(250, 250);
scene.layerBackground.setImageOffsetX("50%");
scene.layerBackground.setImageOffsetY("50%");
scene.layerBackground.setImagePosition("50%", "50%");

const rectNode = new NodeRect(1);
scene.layerWorld.addNode(rectNode);

scene.invalidate();

// --- AUTO RESIZE ---
const resizeObserver = new ResizeObserver(() => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene.setSize(width, height);
  scene.invalidate();
});

resizeObserver.observe(container);


// --- CAMERA TRANSFORMATION ---
// scene.layerWorld.getCamera().setRotationRadians(0);

// // --- ADD NODES ---
// const circleNode = new NodeEllipse(2);
// scene.layerWorld.addNode(circleNode);

// rectNode.rotate(0);
// rectNode.setCornerRadius({
//   tl: 25,
//   tr: 10,
//   bl: 5,
//   br: 5
// });
// rectNode.setFill('white');

// circleNode.setWidth(200);
// circleNode.setInnerRatio(0.5);
// circleNode.setEndAngle(30);

// --- CAMERA TRANSFORMATION ---

// --------------------------------------------------
// Helpers
// --------------------------------------------------

// let nextId = 1000;

// function getId(): number {
//   return nextId++;
// }

// function rand(min: number, max: number): number {
//   return Math.random() * (max - min) + min;
// }

// function randInt(min: number, max: number): number {
//   return Math.floor(rand(min, max + 1));
// }

// function pick<T>(items: T[]): T {
//   return items[Math.floor(Math.random() * items.length)];
// }

// function createRect(config: {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   fill?: string;
//   opacity?: number;
//   rotation?: number;
//   radius?: { tl: number; tr: number; br: number; bl: number };
//   strokeWidth?: { t: number; r: number; b: number; l: number };
//   strokeFill?: string;
// }) {
//   const node = new NodeRect(getId());

//   node.setPosition(config.x, config.y);
//   node.setSize(config.width, config.height);

//   if (config.fill) {
//     node.setFill(config.fill);
//   }

//   if (config.opacity !== undefined) {
//     node.setOpacity(config.opacity);
//   }

//   if (config.rotation !== undefined) {
//     node.setRotation(config.rotation);
//   }

//   if (config.radius) {
//     node.setCornerRadius(config.radius);
//   }

//   if (config.strokeWidth) {
//     node.setStrokeWidth(config.strokeWidth);
//   }

//   if (config.strokeFill) {
//     node.setStrokeFill(config.strokeFill);
//   }

//   scene.layerWorld.addNode(node);
//   return node;
// }

// function createEllipse(config: {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   fill?: string;
//   opacity?: number;
//   rotation?: number;
//   innerRatio?: number;
//   endAngle?: number;
// }) {
//   const node = new NodeEllipse(getId());

//   node.setPosition(config.x, config.y);
//   node.setSize(config.width, config.height);

//   if (config.fill) {
//     node.setFill(config.fill);
//   }

//   if (config.opacity !== undefined) {
//     node.setOpacity(config.opacity);
//   }

//   if (config.rotation !== undefined) {
//     node.setRotation(config.rotation);
//   }

//   if (config.innerRatio !== undefined) {
//     node.setInnerRatio(config.innerRatio);
//   }

//   if (config.endAngle !== undefined) {
//     node.setEndAngle(config.endAngle);
//   }

//   scene.layerWorld.addNode(node);
//   return node;
// }

// // --------------------------------------------------
// // Palette
// // --------------------------------------------------

// const colors = {
//   page: "#f5f7fb",
//   panel: "#ffffff",
//   panelSoft: "#f7f9fc",
//   border: "#d9e0ea",
//   blue: "#4c7dff",
//   purple: "#8b5cf6",
//   green: "#22c55e",
//   orange: "#f59e0b",
//   red: "#ef4444",
//   pink: "#ec4899",
//   cyan: "#06b6d4",
// };

// const accentPalette = [
//   colors.blue,
//   colors.purple,
//   colors.green,
//   colors.orange,
//   colors.red,
//   colors.pink,
//   colors.cyan,
// ];

// // --------------------------------------------------
// // Benchmark start
// // --------------------------------------------------

// const buildStart = performance.now();
// let totalObjects = 0;

// function count() {
//   totalObjects++;
// }

// // --------------------------------------------------
// // Big background
// // --------------------------------------------------

// createRect({
//   x: -2000,
//   y: -2000,
//   width: 6000,
//   height: 4000,
//   fill: colors.page,
// });
// count();

// // --------------------------------------------------
// // Header blocks
// // --------------------------------------------------

// for (let i = 0; i < 8; i++) {
//   createRect({
//     x: 80 + i * 175,
//     y: 60,
//     width: 150,
//     height: 72,
//     fill: colors.panel,
//     radius: { tl: 16, tr: 16, br: 16, bl: 16 },
//     strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//     strokeFill: colors.border,
//   });
//   count();

//   createEllipse({
//     x: 98 + i * 175,
//     y: 78,
//     width: 36,
//     height: 36,
//     fill: pick(accentPalette),
//   });
//   count();

//   createRect({
//     x: 144 + i * 175,
//     y: 82,
//     width: 60,
//     height: 10,
//     fill: "#dfe6f0",
//     radius: { tl: 5, tr: 5, br: 5, bl: 5 },
//   });
//   count();

//   createRect({
//     x: 144 + i * 175,
//     y: 100,
//     width: 90,
//     height: 8,
//     fill: "#ecf1f6",
//     radius: { tl: 4, tr: 4, br: 4, bl: 4 },
//   });
//   count();
// }

// // --------------------------------------------------
// // Left sidebar fake menu
// // --------------------------------------------------

// createRect({
//   x: 80,
//   y: 170,
//   width: 240,
//   height: 1120,
//   fill: colors.panel,
//   radius: { tl: 20, tr: 20, br: 20, bl: 20 },
//   strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//   strokeFill: colors.border,
// });
// count();

// for (let i = 0; i < 14; i++) {
//   const y = 210 + i * 72;
//   const accent = pick(accentPalette);

//   createRect({
//     x: 104,
//     y,
//     width: 192,
//     height: 50,
//     fill: i % 3 === 0 ? "#eef3ff" : colors.panelSoft,
//     radius: { tl: 14, tr: 14, br: 14, bl: 14 },
//     strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//     strokeFill: colors.border,
//   });
//   count();

//   createEllipse({
//     x: 120,
//     y: y + 13,
//     width: 24,
//     height: 24,
//     fill: accent,
//   });
//   count();

//   createRect({
//     x: 154,
//     y: y + 14,
//     width: randInt(60, 90),
//     height: 8,
//     fill: "#cfd8e5",
//     radius: { tl: 4, tr: 4, br: 4, bl: 4 },
//   });
//   count();

//   createRect({
//     x: 154,
//     y: y + 28,
//     width: randInt(90, 120),
//     height: 6,
//     fill: "#e7edf4",
//     radius: { tl: 3, tr: 3, br: 3, bl: 3 },
//   });
//   count();
// }

// // --------------------------------------------------
// // Main board cards
// // --------------------------------------------------

// // 72 cards
// // each card ~11 objects
// // 72 * 11 = 792 objects

// const startX = 360;
// const startY = 170;
// const cols = 6;
// const rows = 12;
// const cardWidth = 220;
// const cardHeight = 140;
// const gapX = 26;
// const gapY = 24;

// for (let row = 0; row < rows; row++) {
//   for (let col = 0; col < cols; col++) {
//     const x = startX + col * (cardWidth + gapX);
//     const y = startY + row * (cardHeight + gapY);
//     const accent = pick(accentPalette);

//     // card bg
//     createRect({
//       x,
//       y,
//       width: cardWidth,
//       height: cardHeight,
//       fill: colors.panel,
//       radius: { tl: 18, tr: 18, br: 18, bl: 18 },
//       strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//       strokeFill: colors.border,
//     });
//     count();

//     // avatar / icon
//     createEllipse({
//       x: x + 18,
//       y: y + 18,
//       width: 26,
//       height: 26,
//       fill: accent,
//     });
//     count();

//     // title line
//     createRect({
//       x: x + 54,
//       y: y + 20,
//       width: randInt(70, 110),
//       height: 10,
//       fill: "#d3dbe7",
//       radius: { tl: 5, tr: 5, br: 5, bl: 5 },
//     });
//     count();

//     // subtitle line
//     createRect({
//       x: x + 54,
//       y: y + 38,
//       width: randInt(100, 140),
//       height: 7,
//       fill: "#e8edf4",
//       radius: { tl: 4, tr: 4, br: 4, bl: 4 },
//     });
//     count();

//     // divider
//     createRect({
//       x: x + 16,
//       y: y + 60,
//       width: cardWidth - 32,
//       height: 2,
//       fill: "#eef2f7",
//       radius: { tl: 1, tr: 1, br: 1, bl: 1 },
//     });
//     count();

//     // chart/progress lines
//     for (let i = 0; i < 3; i++) {
//       createRect({
//         x: x + 18,
//         y: y + 78 + i * 14,
//         width: randInt(80, 165),
//         height: i === 0 ? 5 : 4,
//         fill: i === 0 ? accent : "#dce4ee",
//         radius: { tl: 3, tr: 3, br: 3, bl: 3 },
//       });
//       count();
//     }

//     // tag 1
//     createRect({
//       x: x + 16,
//       y: y + 118,
//       width: 44,
//       height: 12,
//       fill: accent,
//       opacity: 0.18,
//       radius: { tl: 6, tr: 6, br: 6, bl: 6 },
//     });
//     count();

//     // tag 2
//     createRect({
//       x: x + 68,
//       y: y + 118,
//       width: 36,
//       height: 12,
//       fill: colors.blue,
//       opacity: 0.16,
//       radius: { tl: 6, tr: 6, br: 6, bl: 6 },
//     });
//     count();

//     // button / action chip
//     createRect({
//       x: x + cardWidth - 62,
//       y: y + 112,
//       width: 44,
//       height: 18,
//       fill: colors.panelSoft,
//       radius: { tl: 9, tr: 9, br: 9, bl: 9 },
//       strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//       strokeFill: colors.border,
//     });
//     count();
//   }
// }

// // --------------------------------------------------
// // Right stacked widgets
// // --------------------------------------------------

// for (let i = 0; i < 2400; i++) {
//   const x = 1780;
//   const y = 170 + i * 46;
//   const accent = pick(accentPalette);

//   createRect({
//     x,
//     y,
//     width: 170,
//     height: 34,
//     fill: colors.panel,
//     radius: { tl: 12, tr: 12, br: 12, bl: 12 },
//     strokeWidth: { t: 1, r: 1, b: 1, l: 1 },
//     strokeFill: colors.border,
//   });
//   count();

//   createEllipse({
//     x: x + 12,
//     y: y + 9,
//     width: 16,
//     height: 16,
//     fill: accent,
//   });
//   count();

//   createRect({
//     x: x + 38,
//     y: y + 10,
//     width: randInt(60, 90),
//     height: 7,
//     fill: "#d4dce8",
//     radius: { tl: 4, tr: 4, br: 4, bl: 4 },
//   });
//   count();

//   createRect({
//     x: x + 38,
//     y: y + 20,
//     width: randInt(90, 110),
//     height: 5,
//     fill: "#ecf1f6",
//     radius: { tl: 3, tr: 3, br: 3, bl: 3 },
//   });
//   count();
// }

// // --------------------------------------------------
// // Decorative donut / arc shapes with ellipse
// // --------------------------------------------------

// for (let i = 0; i < 100; i++) {
//   const x = 1850 + (i % 2) * 90;
//   const y = 1320 + Math.floor(i / 2) * 90;
//   const accent = pick(accentPalette);

//   createEllipse({
//     x,
//     y,
//     width: 56,
//     height: 56,
//     fill: accent,
//     innerRatio: 0.62,
//     endAngle: randInt(180, 340),
//   });
//   count();
// }

// // --------------------------------------------------
// // Finish
// // --------------------------------------------------

// const buildEnd = performance.now();

// console.log("Stress test objects:", totalObjects);
// console.log("Build time:", (buildEnd - buildStart).toFixed(2), "ms");
// console.log("Camera:", scene.layerWorld.getCamera());




// scene.invalidate();

// // --- AUTO RESIZE ---
// const resizeObserver = new ResizeObserver(() => {
//   const width = container.clientWidth;
//   const height = container.clientHeight;

//   scene.setSize(width, height);
//   scene.invalidate();
// });

// resizeObserver.observe(container);