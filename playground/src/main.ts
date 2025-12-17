import {
  AreaSelectionPlugin,
  CameraHotkeysPlugin,
  ContentFromClipboardPlugin,
  CoreEngine,
  GridPlugin,
  HistoryPlugin,
  ImageHoverFilterAddon,
  LogoPlugin,
  NodeHotkeysPlugin,
  RulerGuidesAddon,
  RulerHighlightAddon,
  RulerManagerAddon,
  RulerPlugin,
  SelectionPlugin,
  ShapeHoverHighlightAddon,
  TextAutoTrimAddon,
  VisualGuidesPlugin,
} from '@flowscape-ui/core-sdk';
import TestSvg from './assets/images/cursor-rotation.svg';
import Image from './assets/images/img.jpg';
import logoUrl from './assets/images/logo.png';

const logoPlugin = new LogoPlugin({
  src: logoUrl,
  width: 330,
  height: 330,
  opacity: 0.5,
});

const hotkeys = new CameraHotkeysPlugin();

const nodeHotkeys = new NodeHotkeysPlugin();

const selection = new SelectionPlugin({
  // enableVideoOverlay: true,
  enableVideoOverlay: {
    uiAccentColor: '#ff8a00',
    uiTrackFilledColor: '#ff8a00',
    uiBackgroundColor: 'rgba(18,18,18,0.92)',
  },
  // selectablePredicate: (node) => {
  //   const cls = node.getClassName();
  //   return cls === 'Text';
  // },
});

// selection.setOptions({
//   selectablePredicate: (node) => {
//     const cls = node.getClassName();
//     return cls === 'Rect';
//   },
// });

// playground/src/main.ts
const gridPlugin = new GridPlugin({
  color: '#3d3d3d',
  enableSnap: true,
});

const rulerPlugin = new RulerPlugin();
// const rulerGuidesPlugin = new RulerGuidesPlugin({
//   snapToGrid: true, // привязка к сетке
//   gridStep: 1, // шаг 1px для точного позиционирования
// });
// const rulerHighlightPlugin = new RulerHighlightPlugin({
//   highlightColor: '#2b83ff',
//   highlightOpacity: 0.3,
// });
// const rulerManagerPlugin = new RulerManagerPlugin({
//   enabled: true, // включить управление по Shift+R
// });

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

const core = new CoreEngine({
  container: document.querySelector('#app')!,
  plugins: [
    logoPlugin,
    hotkeys,
    gridPlugin,
    selection,
    areaSelection,
    nodeHotkeys,
    rulerPlugin,
    visualGuidesPlugin,
    cfc,
    // rulerGuidesPlugin, // ВАЖНО: добавляем ПОСЛЕ RulerPlugin
    // rulerHighlightPlugin, // ВАЖНО: добавляем ПОСЛЕ RulerPlugin
    // rulerManagerPlugin, // Управление видимостью по Shift+R
    historyPlugin, // Undo/Redo: Ctrl+Z / Ctrl+Shift+Z
  ],
});

const onNodeRemoved = (node: unknown) => {
  console.log('node removed', node);
};

core.eventBus.once('node:removed', onNodeRemoved);

const svgNode = core.nodes.addSvg({
  x: 450,
  y: 500,
  width: 200,
  height: 200,
  src: 'https://konvajs.org/assets/tiger.svg',
  onLoad: (node) => {
    console.log('SVG загружен!', node);
  },
  onError: (error) => {
    console.error('Ошибка загрузки SVG:', error);
  },
});

setTimeout(() => {
  svgNode.setSrc(TestSvg);
}, 5000);

const videoNode = core.nodes.addVideo({
  x: 1500,
  y: 200,
  width: 640,
  height: 360,
  src: 'https://archive.org/download/apple-september-2017-key-note-at-the-steve-jobs-theater-full-1080p-720p-30fps-h-264-128kbit-aac/Apple%20September%2C%202017%20Key%20Note%20at%20the%20Steve%20Jobs%20Theater%20Full%2C%201080p%20%28720p_30fps_H264-128kbit_AAC%29.mp4',
  placeholder: {
    accentSpinnerColor: 'yellow',
  },
  autoplay: true,
  loop: true,
  muted: true,
  onLoadedMetadata: (node, videoElement) => {
    console.log('Видео загружено');
    console.log('Длительность:', videoElement.duration);
  },
  onPlay: (node) => {
    console.log('Воспроизведение началось');
  },
  onPause: (node) => {
    console.log('Воспроизведение приостановлено');
  },
  onEnded: (node) => {
    console.log('Видео завершено');
  },
});
videoNode.setLoop(true);
videoNode.setCurrentTime(3000);

core.nodes.addGif({
  x: 750,
  y: -150,
  width: 200,
  height: 200,
  src: 'https://konvajs.org/assets/yoda.gif',
  autoplay: true,
  placeholder: {
    accentSpinnerColor: 'red',
    // backgroundColor: 'transparent',
  },
  onLoad: (node) => {
    console.log('GIF загружен!', node);
  },
  onError: (error) => {
    console.error('Ошибка загрузки GIF:', error);
  },
  // onFrame: (node, frameIndex) => {
  //   console.log('Кадр:', frameIndex);
  // },
});

core.nodes
  .addText({
    x: 200,
    y: 150,
    text: 'Hello, Flowscape!',
    fontSize: 120,
    fill: '#ffcc00',
    align: 'left',
  })
  .addons.add(new TextAutoTrimAddon());

const img = core.nodes.addImage({
  x: 200,
  y: 500,
  src: logoUrl,
});
img.addons.add(new ImageHoverFilterAddon({ mode: 'sepia' }));

core.nodes.addImage({
  x: 500,
  y: 200,
  src: logoUrl,
});

core.nodes.addEllipse({
  x: 300,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});

core.nodes.addShape({
  x: 1200,
  y: 800,
  width: 1200,
  height: 2000,
  fill: 'grey',
  strokeWidth: 0,
});

core.nodes.addEllipse({
  x: 500,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});
core.nodes.addEllipse({
  x: 400,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});
core.nodes.addEllipse({
  x: 300,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});
core.nodes.addEllipse({
  x: 200,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});
core.nodes.addEllipse({
  x: 150,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});
core.nodes.addEllipse({
  x: 100,
  y: 150,
  radiusX: 120,
  radiusY: 60,
  fill: '#66ccff',
  stroke: '#003366',
  strokeWidth: 2,
});

core.nodes.addCircle({
  x: 100,
  y: 100,
  radius: 60,
  fill: 'orange',
  stroke: 'black',
  strokeWidth: 3,
});

const rect = core.nodes.addShape({
  x: 500,
  y: 250,
  width: 200,
  height: 150,
  fill: 'skyblue',
  stroke: 'red',
  strokeWidth: 14,
});

core.nodes.addArc({
  x: 600,
  y: 120,
  innerRadius: 30,
  outerRadius: 60,
  angle: 120,
  rotation: 45,
  clockwise: true,
  fill: '#ffeecc',
  stroke: '#aa6600',
  strokeWidth: 2,
});

core.nodes.addArrow({
  x: 100,
  y: 400,
  points: [0, 0, 150, 0, 200, 50], // пример ломаной стрелки
  tension: 0.2,
  pointerLength: 12,
  pointerWidth: 12,
  fill: '#0077ff',
  stroke: '#003366',
  strokeWidth: 3,
});

core.nodes.addStar({
  x: 950,
  y: 160,
  numPoints: 5,
  innerRadius: 25,
  outerRadius: 50,
  fill: '#fff2a8',
  stroke: '#c7a100',
  strokeWidth: 2,
});

core.nodes.addRing({
  x: 1050,
  y: 260,
  innerRadius: 30,
  outerRadius: 60,
  fill: '#e6f7ff',
  stroke: '#006d99',
  strokeWidth: 2,
});

const rect2 = core.nodes.addShape({
  width: 200,
  height: 200,
  fill: 'skyblue',
  strokeWidth: 0,
  // stroke: 'red',
});

rect.addons.add(
  new ShapeHoverHighlightAddon({
    mode: 'fill',
    fill: 'green',
  }),
);

rect.setPosition({ x: 900, y: 500 });

rect2.setPosition({ x: 1500, y: 550 });

// console.log(rect2.setFill('green').setCornerRadius(120000).setSize({ width: 120, height: 120 }));

// Создаём группу
const group = core.nodes.addGroup({
  x: 400,
  y: 400,
  draggable: true,
});

const gCircle = core.nodes.addCircle({
  x: 0,
  y: 0,
  radius: 80,
  fill: '#ffb347',
  stroke: '#c97a00',
  strokeWidth: 2,
});

const polygon = core.nodes.addRegularPolygon({
  x: 800,
  y: 220,
  sides: 5,
  radius: 60,
  fill: '#d1ffd1',
  stroke: '#1a7f1a',
  strokeWidth: 2,
});

group.addChild(gCircle.getKonvaNode());
group.addChild(polygon.getKonvaNode());

setTimeout(() => {
  img.setSrc(Image);
  core.eventBus.off('node:removed', onNodeRemoved);
  // rulerPlugin.addons.clear();
}, 5000);
