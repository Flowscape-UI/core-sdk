import logoUrl from './assets/images/logo.png';
import videoUrl from './assets/images/vid.mp4';
import Konva from 'konva';


import { Scene } from '../../src/core/scene/Scene';
import { getNodeWorldCorners } from '../../src/core/scene/layers/overlay';

import { NodeEllipse, NodeFrame, NodeGroup, NodeImage, NodeLine, NodePath, NodePolygon, NodeRect, NodeStar, NodeText, NodeVideo } from "../../src/nodes-new";
import { NodeEllipseRenderer, NodeFrameRenderer, NodeGroupRenderer, NodeLineRenderer, NodePathRenderer, NodePolygonRenderer, NodeRectRenderer, NodeStarRenderer, NodeTextRenderer, NodeVideoRenderer } from '../../src/renderer';
import { NodeImageRenderer } from '../../src/renderer/nodes/NodeImageRenderer';


const scene = new Scene({
  container: document.querySelector('#app')!,
  // width: 200,
  // height: 200,
  // autoResize: false
});

const world = scene.getWorld();
world.gridView.setOptions({
  size: 1
})

const overlay = scene.getOverlay();


const rect = new Konva.Rect({ x: 0, y: 0, width: 100, height: 80, fill: "red" });
const rect2 = new Konva.Rect({ x: 50, y: -20, width: 100, height: 80, fill: "yellow" });

const rectNode = new NodeRect({
    id: "rect-1",
    width: 200,
    height: 120,
    x: 0,
    y: 0,
    fill: "red",
});
const rectNodeRenderer = new NodeRectRenderer(rectNode);


const circleNode = new NodeEllipse({
  id: 'c1',
  width: 0,
  height: 0,
  radiusX: 80,
  radiusY: 180,
  innerRatio: 0.5,
    fill: 'orange',
    startAngle: 0,
  endAngle: 220,
  x: 0,
  y: 0,
});
circleNode.translate(10, 200);
const circleNodeRenderer = new NodeEllipseRenderer(circleNode);

const starNode = new NodeStar({
  id: 'star1',
  width: 80,
  height: 80,
  segmentCount: 5,
  ratio: 1,
  fill: 'gold',
  x: 0,
  y: 0,
});
starNode.translate(-50, -100);
starNode.setSegmentCount(5);
starNode.setRadius(10);
const starNodeRenderer = new NodeStarRenderer(starNode);

const lineNode = new NodeLine({
    id: 'line-1',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 200, y: 80 },
    thickness: 1,
    stroke: '#ff7a00',
    lineCapStart: 'round',
    lineCapEnd: 'square',

    startEnding: 'circle-arrow',
    endEnding: 'triangle-arrow',
    strokeAlign: 'center',
});
const lineRenderer = new NodeLineRenderer(lineNode);

const polygonNode = new NodePolygon({
  id: 'poly-1',
  width: 120,
  height: 120,
  sideCount: 100,
  fill: 'orange',
  stroke: '#222',
  strokeWidth: 4,
  x: 100,
  y: 100,
});
const polygonNodeRenderer = new NodePolygonRenderer(polygonNode);


const imageNode = new NodeImage({
  id: 'img-1',
  width: 100,
  height: 100,
  src: logoUrl,
  x: 200,
  y: 200,
});
const renderer = new NodeImageRenderer(imageNode);

const videoNode = new NodeVideo({
    id: 'video-1',
    width: 320,
    height: 180,
    src: videoUrl,
    autoplay: true,
    loop: true,
    muted: true,
    cornerRadius: 16,
    x: 100,
    y: 120,
});
const videoRenderer = new NodeVideoRenderer(videoNode);


const frameNode = new NodeFrame({
  id: 'frame-1',
  x: 120,
  y: 100,
  width: 320,
  height: 220,
  fill: '#f5f5f5',
  stroke: '#222222',
  strokeWidth: 2,
  cornerRadius: 16,
  clipContent: true,
});
const frameRenderer = new NodeFrameRenderer(frameNode);
frameRenderer.getContentGroup().add(videoRenderer.getShape());


const textNode = new NodeText({
    id: 'text-1',
    x: 120,
    y: 100,
    width: 320,
    height: 140,

    text: 'Flowscape text node\nMultiline test',
    fontSize: 28,
    fontFamily: 'Arial',
    fontStyle: 'normal',

    align: 'right',
    verticalAlign: 'middle',

    lineHeight: 1.25,
    wrap: 'word',
    padding: 16,

    fill: 'red',
});
const textRenderer = new NodeTextRenderer(textNode);


const groupNode = new NodeGroup({
    id: 'group-1',
    x: 1000,
    y: 180,
    width: 0,
    height: 0,
});
groupNode.translate(200, 0);

const rectNode0 = new NodeRect({
    id: 'rect-1',
    width: 120,
    height: 80,
    fill: 'orange',
    x: 0,
    y: 0,
});

const ellipseNode1 = new NodeEllipse({
    id: 'ellipse-1',
    width: 100,
    height: 100,
    fill: 'skyblue',
    x: 140,
    y: 20,
    radiusX: 100,
    radiusY: 200,
});

groupNode.addChild(rectNode0);
groupNode.addChild(ellipseNode1);

const groupRenderer = new NodeGroupRenderer(groupNode);
const rectRenderer = new NodeRectRenderer(rectNode0);
const ellipseRenderer = new NodeEllipseRenderer(ellipseNode1);

groupRenderer.getShape().add(rectRenderer.getShape());
groupRenderer.getShape().add(ellipseRenderer.getShape());



const heartNode = new NodePath({
    id: 'heart-1',
    x: 380,
    y: 100,
    width: 200,
    height: 200,
    path: `
        M 100 30
        C 100 0, 0 0, 0 80
        C 0 140, 100 180, 100 180
        C 100 180, 200 140, 200 80
        C 200 0, 100 0, 100 30
        Z
    `,
    fill: 'crimson',
    stroke: '#222',
    strokeWidth: 2,
});

const pathRenderer = new NodePathRenderer(heartNode);


const cornersW = getNodeWorldCorners(rect, world.getWorldRoot());
overlay.setSelectionCornersWorld(cornersW);




world.camera.update({
  rotation: 0
});


// 1) pivot в центре локального rect
rect.offsetX(rect.width() / 2);
rect.offsetY(rect.height() / 2);

// 2) позицию переносим в центр (потому что x/y теперь означают позицию pivot)
rect.x(rect.x() + rect.width() / 2);
rect.y(rect.y() + rect.height() / 2);

// world.add(rect);
// world.add(rect2);
// world.add(rectNodeRenderer.getShape());
// world.add(circleNodeRenderer.getShape());
// world.add(starNodeRenderer.getShape());
// world.add(lineRenderer.getShape());
// world.add(polygonNodeRenderer.getShape());
// world.add(renderer.getShape());
// // world.add(videoRenderer.getShape());
// world.add(frameRenderer.getShape());
// world.add(textRenderer.getShape());
world.add(groupRenderer.getShape());
world.add(pathRenderer.getShape());

rectNode.translate(250, 100);
rectNodeRenderer.sync();

// selection helper
// const updateSelection = () => {
//   overlay.setSelectionCornersWorld(getNodeWorldCorners(rect, world.getWorldRoot()));
//   overlay.setSelectionCornersWorld(getNodeWorldCorners(rect2, world.getWorldRoot()));
// };

// updateSelection();

// 3) фиксируем стартовый угол НА СТАРТЕ drag
// let startRotation = 0;

// overlay.onRotateStart(() => {
//   startRotation = rect.rotation(); // degrees
// });

// overlay.onRotate(({ deltaRadians }) => {
//   rect.rotation(startRotation + (deltaRadians * 180) / Math.PI);
//   updateSelection();
// });
// scene.setBackground('white');
// scene.setBackground('rgba(255, 0, 0, 0.5)');

// Check directions for CSS linear gradients
// scene.setBackground('linear-gradient(to right, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to left, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to top, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to bottom, #ff0000, #0000ff)');

scene.setBackground('linear-gradient(to top left, #ff0000, #0000ff)');
scene.setBackground('linear-gradient(to top right, #ff0000, #0000ff)');
scene.setBackground('linear-gradient(to bottom left, #ff0000, #0000ff)');
// scene.setBackground('repeating-linear-gradient(to bottom right, #ff0000 20%, #0000ff 5%)');
// scene.setBackground('linear-gradient(to left, #ff0000 0% 50%, #0000ff 50% 90%, #ff0000)');

// scene.setBackground('transparent');
scene.setBackgroundImage({url: logoUrl, width: 300, height: 300})


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