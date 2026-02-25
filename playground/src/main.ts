import {
  AreaSelectionPlugin,
  CameraHotkeysPlugin,
  ContentFromClipboardPlugin,
  CoreEngine,
  frameTemplates,
  GridPlugin,
  HistoryPlugin,
  ImageHoverFilterAddon,
  NodeHotkeysPlugin,
  PersistencePlugin,
  RulerGuidesAddon,
  RulerGuidesPlugin,
  RulerHighlightAddon,
  RulerHighlightPlugin,
  RulerManagerAddon,
  RulerManagerPlugin,
  RulerPlugin,
  SelectionPlugin,
  ShapeHoverHighlightAddon,
  TextAutoTrimAddon,
  VisualGuidesPlugin,
} from '@flowscape-ui/core-sdk';
import TestSvg from './assets/images/cursor-rotation.svg';
import Image from './assets/images/img.jpg';
import logoUrl from './assets/images/logo.png';


import { Scene } from '../../src/core/scene/Scene';

const hotkeys = new CameraHotkeysPlugin();

const nodeHotkeys = new NodeHotkeysPlugin();

const selection = new SelectionPlugin({
  // enableVideoOverlay: true,
  enableVideoOverlay: {
    uiAccentColor: '#ff8a00',
    uiTrackFilledColor: '#ff8a00',
    uiBackgroundColor: 'rgba(18,18,18,0.92)',
  },
});


const rulerPlugin = new RulerPlugin();

rulerPlugin.addons.add([
  new RulerGuidesAddon({
    snapToGrid: true,
    gridStep: 1,
  }),
  new RulerHighlightAddon({
    highlightColor: '#2b83ff',
    highlightOpacity: 0.3,
  }),
  new RulerManagerAddon({
    enabled: true,
  }),
]);

const areaSelection = new AreaSelectionPlugin();

const historyPlugin = new HistoryPlugin();

const visualGuidesPlugin = new VisualGuidesPlugin({
  // thresholdPx: 10,
  // guidelineColor: 'red',
  // guidelineDash: [0, 0],
});

const cfc = new ContentFromClipboardPlugin();

const persistencePlugin = new PersistencePlugin({
  canvasId: 'playground-canvas',
  debounceMs: 500,
  autoRestore: true,
});

// playground/src/main.ts
const gridPlugin = new GridPlugin({
  color: '#3d3d3d',
  enableSnap: true,
});

const scene = new Scene({
  container: document.querySelector('#app')!,
});

// scene.setBackground('white');
// scene.setBackground('rgba(255, 0, 0, 0.5)');

// Check directions for CSS linear gradients
// scene.setBackground('linear-gradient(to right, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to left, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to top, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to bottom, #ff0000, #0000ff)');

// scene.setBackground('linear-gradient(to top left, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to top right, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to bottom left, #ff0000, #0000ff)');
// // scene.setBackground('repeating-linear-gradient(to bottom right, #ff0000 20%, #0000ff 5%)');
// scene.setBackground('linear-gradient(to left, #ff0000 0% 50%, #0000ff 50% 90%, #ff0000)');

scene.setBackgroundImage({url: logoUrl, width: 300, height: 300})
// scene.setHeight(2000);
// scene.setBackgroundColor('#FFFFFF');

// const core = new CoreEngine({
//   container: document.querySelector('#app')!,
//   plugins: [
//     logoPlugin,
//     hotkeys,
//     gridPlugin,
//     selection,
//     areaSelection,
//     nodeHotkeys,
//     rulerPlugin,
//     visualGuidesPlugin,
//     cfc,
//     historyPlugin, // Undo/Redo: Ctrl+Z / Ctrl+Shift+Z
//     // persistencePlugin, // Auto-save to IndexedDB
//   ],
// });

// ==================== Persistence Plugin Test UI ====================
// const createPersistenceUI = () => {
//   const container = document.createElement('div');
//   container.style.cssText = `
//     position: fixed;
//     top: 10px;
//     right: 10px;
//     z-index: 9999;
//     display: flex;
//     flex-direction: column;
//     gap: 8px;
//     padding: 12px;
//     background: rgba(30, 30, 30, 0.95);
//     border-radius: 8px;
//     font-family: system-ui, sans-serif;
//     font-size: 12px;
//     color: #fff;
//   `;

//   const title = document.createElement('div');
//   title.textContent = 'Persistence Plugin';
//   title.style.cssText = 'font-weight: bold; margin-bottom: 4px; color: #ffcc00;';
//   container.appendChild(title);

//   const createButton = (text: string, onClick: () => void) => {
//     const btn = document.createElement('button');
//     btn.textContent = text;
//     btn.style.cssText = `
//       padding: 6px 12px;
//       background: #333;
//       border: 1px solid #555;
//       border-radius: 4px;
//       color: #fff;
//       cursor: pointer;
//       transition: background 0.2s;
//     `;
//     btn.onmouseenter = () => (btn.style.background = '#444');
//     btn.onmouseleave = () => (btn.style.background = '#333');
//     btn.onclick = onClick;
//     return btn;
//   };

//   // Export JSON button
//   container.appendChild(
//     createButton('📥 Export JSON', async () => {
//       await persistencePlugin.downloadJSON('canvas-export.json');
//     }),
//   );

//   // Import JSON button
//   container.appendChild(
//     createButton('📤 Import JSON', async () => {
//       await persistencePlugin.uploadJSON();
//     }),
//   );

//   // Manual Save button
//   container.appendChild(
//     createButton('💾 Save Now', async () => {
//       await persistencePlugin.save();
//     }),
//   );

//   // Clear Storage button
//   container.appendChild(
//     createButton('🗑️ Clear Storage', async () => {
//       if (confirm('Clear all saved canvas data?')) {
//         await persistencePlugin.clear();
//       }
//     }),
//   );

//   //   // Status indicator
//   const status = document.createElement('div');
//   status.style.cssText = 'font-size: 10px; color: #888; margin-top: 4px;';
//   persistencePlugin.hasSavedState().then((hasSaved) => {
//     status.textContent = hasSaved ? '✅ Has saved state' : '⚪ No saved state';
//   });
//   container.appendChild(status);

//   document.body.appendChild(container);
// };

// // Create UI after DOM is ready
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', createPersistenceUI);
// } else {
//   createPersistenceUI();
// }

// const shape = core.nodes.addShapeNewNode({
//   id: 'shape-1',
//   width: 250,
//   height: 250,
//   x: 400,
//   y: 200,
//   stroke: 'black',
//   strokeWidth: 10,
//   backgroundColor: 'yellow',
// });
// shape.setPosition(1700, 200);
// shape.setRotation(45);
// shape.setSize(250, 450);
// // shape.setBorderRadius(20);
// // console.log(shape.getBorderRadius(), 'shape');
// console.log(shape, 'shape');

// const svgNode = core.nodes.addSvg({
//   x: 450,
//   y: 500,
//   width: 200,
//   height: 200,
//   src: 'https://konvajs.org/assets/tiger.svg',
// });

// console.log(svgNode, 'svgNode');

// setTimeout(() => {
//   svgNode.setSrc(TestSvg);
// }, 5000);

// const { desktopFrame } = frameTemplates;

// core.nodes.addFrame({
//   x: -2000,
//   y: 200,
//   ...desktopFrame,
// });

// core.nodes.addFrame({
//   x: -2500,
//   y: 200,
//   ...desktopFrame,
//   background: 'red',
//   // labelHoverColor: 'black',
//   // labelColor: 'red',
// });

// const frame = core.nodes.addFrame({
//   x: -3000,
//   y: 400,
//   width: 400,
//   height: 260,
//   name: 'FrameNode',
//   label: 'Frame',
// });

// const contentGroup = frame.getContentGroup();

// const widgetRect = core.nodes.addShape({
//   x: 40,
//   y: 40,
//   width: 160,
//   height: 100,
//   fill: '#1d4ed8',
//   cornerRadius: 12,
// });
// widgetRect.getKonvaNode().moveTo(contentGroup);

// const widgetText = core.nodes.addText({
//   x: 60,
//   y: 80,
//   text: 'Frame content',
//   fontSize: 18,
//   fill: '#e5e7eb',
// });
// widgetText.getKonvaNode().moveTo(contentGroup);

// const badge = core.nodes.addCircle({
//   x: 320,
//   y: 70,
//   radius: 24,
//   fill: '#22c55e',
// });
// badge.getKonvaNode().moveTo(contentGroup);

// const videoNode = core.nodes.addVideo({
//   x: 1500,
//   y: 200,
//   width: 640,
//   height: 360,
//   src: 'https://archive.org/download/apple-september-2017-key-note-at-the-steve-jobs-theater-full-1080p-720p-30fps-h-264-128kbit-aac/Apple%20September%2C%202017%20Key%20Note%20at%20the%20Steve%20Jobs%20Theater%20Full%2C%201080p%20%28720p_30fps_H264-128kbit_AAC%29.mp4',
//   placeholder: {
//     accentSpinnerColor: 'yellow',
//   },
//   autoplay: true,
//   loop: true,
//   muted: true,
// });
// videoNode.setLoop(true);
// videoNode.setCurrentTime(3000);

// core.nodes.addGif({
//   x: 750,
//   y: -150,
//   width: 200,
//   height: 200,
//   src: 'https://konvajs.org/assets/yoda.gif',
//   autoplay: true,
//   placeholder: {
//     accentSpinnerColor: 'red',
//   },
// });

// core.nodes
//   .addText({
//     x: 200,
//     y: 150,
//     text: 'Hello, Flowscape!',
//     fontSize: 120,
//     fill: '#ffcc00',
//     align: 'left',
//   })
//   .addons.add(new TextAutoTrimAddon());

// const img = core.nodes.addImage({
//   x: 200,
//   y: 500,
//   src: logoUrl,
// });
// img.addons.add(new ImageHoverFilterAddon({ mode: 'sepia' }));

// // core.nodes.addImage({
// //   x: 500,
// //   y: 200,
// //   src: logoUrl,
// // });

// // core.nodes.addEllipse({
// //   x: 300,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });

// // core.nodes.addShape({
// //   x: 1200,
// //   y: 800,
// //   width: 1200,
// //   height: 2000,
// //   fill: 'grey',
// //   strokeWidth: 0,
// // });

// // core.nodes.addEllipse({
// //   x: 500,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });
// // core.nodes.addEllipse({
// //   x: 400,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });
// // core.nodes.addEllipse({
// //   x: 300,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });
// // core.nodes.addEllipse({
// //   x: 200,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });
// // core.nodes.addEllipse({
// //   x: 150,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });
// // core.nodes.addEllipse({
// //   x: 100,
// //   y: 150,
// //   radiusX: 120,
// //   radiusY: 60,
// //   fill: '#66ccff',
// //   stroke: '#003366',
// //   strokeWidth: 2,
// // });

// // core.nodes.addCircle({
// //   x: 100,
// //   y: 100,
// //   radius: 60,
// //   fill: 'orange',
// //   stroke: 'black',
// //   strokeWidth: 3,
// // });

// const rect = core.nodes.addShape({
//   x: 500,
//   y: 250,
//   width: 200,
//   height: 150,
//   fill: 'skyblue',
//   stroke: 'red',
//   strokeWidth: 14,
// });

// core.nodes.addArc({
//   x: 600,
//   y: 120,
//   innerRadius: 30,
//   outerRadius: 60,
//   angle: 120,
//   rotation: 45,
//   clockwise: true,
//   fill: '#ffeecc',
//   stroke: '#aa6600',
//   strokeWidth: 2,
// });

// core.nodes.addArrow({
//   x: 100,
//   y: 400,
//   points: [0, 0, 150, 0, 200, 50], // пример ломаной стрелки
//   tension: 0.2,
//   pointerLength: 12,
//   pointerWidth: 12,
//   fill: '#0077ff',
//   stroke: '#003366',
//   strokeWidth: 3,
// });

// core.nodes.addStar({
//   x: 950,
//   y: 160,
//   numPoints: 5,
//   innerRadius: 25,
//   outerRadius: 50,
//   fill: '#fff2a8',
//   stroke: '#c7a100',
//   strokeWidth: 2,
// });

// core.nodes.addRing({
//   x: 1050,
//   y: 260,
//   innerRadius: 30,
//   outerRadius: 60,
//   fill: '#e6f7ff',
//   stroke: '#006d99',
//   strokeWidth: 2,
// });

// const rect2 = core.nodes.addShape({
//   width: 200,
//   height: 200,
//   fill: 'skyblue',
//   strokeWidth: 0,
//   // stroke: 'red',
// });

// rect.addons.add(
//   new ShapeHoverHighlightAddon({
//     mode: 'fill',
//     fill: 'green',
//   }),
// );

// rect.setPosition({ x: 900, y: 500 });

// rect2.setPosition({ x: 1500, y: 550 });

// // console.log(rect2.setFill('green').setCornerRadius(120000).setSize({ width: 120, height: 120 }));

// // Создаём группу
// const group = core.nodes.addGroup({
//   x: 400,
//   y: 400,
//   draggable: true,
// });

// const gCircle = core.nodes.addCircle({
//   x: 0,
//   y: 0,
//   radius: 80,
//   fill: '#ffb347',
//   stroke: '#c97a00',
//   strokeWidth: 2,
// });

// const polygon = core.nodes.addRegularPolygon({
//   x: 800,
//   y: 220,
//   sides: 5,
//   radius: 60,
//   fill: '#d1ffd1',
//   stroke: '#1a7f1a',
//   strokeWidth: 2,
// });

// group.addChild(gCircle.getKonvaNode());
// group.addChild(polygon.getKonvaNode());

// setTimeout(() => {
//   img.setSrc(Image);
// }, 5000);

// let stepA = 0;

// function testAuroraEffect() {
//     const time = stepA * 0.015; // Медленная, ленивая анимация
    
//     // Глубокий полночный фон задаем через первую точку или подложку
//     // Точки "плавают" широко, заходя за края экрана (от -20% до 120%)
//     const x1 = 50 + 60 * Math.cos(time * 0.7);
//     const y1 = 20 + 40 * Math.sin(time * 0.5);

//     const x2 = 20 + 50 * Math.sin(time * 0.8);
//     const y2 = 80 + 30 * Math.cos(time * 0.6);

//     const x3 = 80 + 40 * Math.cos(time * 1.1);
//     const y3 = 50 + 50 * Math.sin(time * 0.9);

//     // Используем очень большие радиусы (0.8 - 1.5), 
//     // чтобы пятна не выглядели как круги, а заполняли всё пространство
//     const auroraGradient = `mesh-gradient(
//         circle 1.5 at ${x1}% ${y1}% #001a2e, 
//         circle 1.2 at ${x2}% ${y2}% #00ff87, 
//         circle 1.3 at ${x3}% ${y3}% #6000ff,
//         circle 1.0 at 50% 50% #0052d4
//     )`;

//     scene.setBackground(auroraGradient);

//     stepA++;
//     requestAnimationFrame(testAuroraEffect);
// }

// testAuroraEffect();