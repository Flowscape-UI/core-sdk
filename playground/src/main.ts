import {
  CoreEngine,
  GridPlugin,
  LogoPlugin,
  SelectionPlugin,
  CameraHotkeysPlugin,
} from '@flowscape-ui/core-sdk';
import logoUrl from './images/logo.png';
import Image from './images/img.jpg';

const logoPlugin = new LogoPlugin({
  src: logoUrl,
  width: 330,
  height: 330,
  opacity: 0.5,
});

const hotkeys = new CameraHotkeysPlugin({});

const selection = new SelectionPlugin({
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
  minScaleToShow: 15,
});

const core = new CoreEngine({
  container: document.querySelector('#app')!,
  plugins: [logoPlugin, hotkeys, selection, gridPlugin],
});

const onNodeRemoved = (node: unknown) => {
  console.log('node removed', node);
};

core.eventBus.once('node:removed', onNodeRemoved);

core.nodes.addText({
  x: 200,
  y: 150,
  text: 'Hello, Flowscape!',
  fontSize: 120,
  fill: '#ffcc00',
  align: 'center',
  padding: 10,
});

const img = core.nodes.addImage({
  x: 200,
  y: 500,
  src: logoUrl,
});

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
  stroke: 'red',
});

rect.setFill('orange');

rect.setPosition({ x: 900, y: 500 });

rect2.setPosition({ x: 1500, y: 550 });

console.log(core.nodes.list(), '??');

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

group.addChild(gCircle.getNode());
group.addChild(polygon.getNode());

setTimeout(() => {
  img.setSrc(Image);
  core.eventBus.off('node:removed', onNodeRemoved);
}, 5000);
