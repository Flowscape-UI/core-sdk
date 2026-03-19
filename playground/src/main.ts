import logoUrl from './assets/images/logo.png';
import videoUrl from './assets/images/vid.mp4';

import { Scene } from '../../src/core/scene/Scene';
import { getNodeWorldCorners } from '../../src/core/scene/layers/overlay';
import { NodeRect, StrokeAlign, NodeEllipse, NodePolygon, NodeStar, NodeLine, LineCap, NodeText, TextWrapMode, NodeImage, NodeVideo, NodePath } from '../../src/nodes';
import { EffectType } from '../../src/nodes/shape/effect';
import { EffectInnerShadow, EffectShadow, ShadowMode } from '../../src/renderer/effect';


const scene = new Scene({
  container: document.querySelector('#app')!,
  // width: 200,
  // height: 200,
  // autoResize: false
});

const world = scene.getWorld();

const rectNode = new NodeRect(1);
// rectNode.translate(100, -20);
rectNode.setFill("rgba(250,0,0,1)");
rectNode.setStrokeAlign(StrokeAlign.Outside);
// rectNode.setStrokeFill("rgba(250,0,0,0)");
rectNode.setCornerRadius({
  tl: 10,
  tr: 10,
  bl: 10,
  br: 10,
});
rectNode.setStrokeWidth({
  t: 10,
  r: 10,
  b: 10,
  l: 10,
});
// // =========== Positioning case ===========
// rectNode.setX(200);
// rectNode.setLocked(true);
// rectNode.setY(200);
// rectNode.translateX(10);
// rectNode.translateY(10);
// rectNode.translate(10, 10);
// // rectNode.setPosition(0, 0);
// console.log(rectNode.getPosition())
// console.log(rectNode.getY())

// // =========== Scale case ===========
// rectNode.setScale(6, 1.5);
// rectNode.setSize(300, 300);
// console.log("Width:", rectNode.getWidth());
// console.log("Height:", rectNode.getHeight());
// console.log("Scale:", rectNode.getScale());
// console.log("Scaled width:", rectNode.getScaledWidth());
// console.log("Scaled height:", rectNode.getScaledHeight());
// console.log("ScaleX:", rectNode.getScaleX());
// console.log("ScaleY:", rectNode.getScaleY());

// // =========== Rotation case ===========
// rectNode.setRotation(45);
// rectNode.rotate(5);
// console.log("Rotation:", rectNode.getRotation());
// console.log("WorldRotation:", rectNode.getWorldRotation());

// =========== Pivot case ===========
// rectNode.setPivot(0.5, 0.5);
// console.log("WorldRotation:", rectNode.getWorldRotation());


// const ellipseNode = new NodeEllipse(2);
// const polygonNode = new NodePolygon(3);
// const starNode = new NodeStar(4);
// const lineNode = new NodeLine(5);
// const textNode = new NodeText(6);
// const imageNode = new NodeImage(7);
// const videoNode = new NodeVideo(8);
// const pathNode = new NodePath(10);

// pathNode.moveTo({ x: 50, y: 95 });

// pathNode.cubicTo(
//     { x: 15, y: 75 },
//     { x: 0, y: 35 },
//     { x: 25, y: 15 }
// );

// pathNode.cubicTo(
//     { x: 40, y: 0 },
//     { x: 50, y: 15 },
//     { x: 50, y: 28 }
// );

// pathNode.cubicTo(
//     { x: 50, y: 15 },
//     { x: 60, y: 0 },
//     { x: 75, y: 15 }
// );

// pathNode.cubicTo(
//     { x: 100, y: 35 },
//     { x: 85, y: 75 },
//     { x: 50, y: 95 }
// );

// pathNode.closePath();

// pathNode.setFill("#ff4d6d");
// pathNode.setPosition(220, 180);
// pathNode.closePath();
// pathNode.setRotation(0);

// videoNode.setWidth(2);
// videoNode.setAutoplay(true);
// videoNode.translate(0, 200);
// videoNode.setSrc(videoUrl);
// videoNode.setFill("red");


// imageNode.setWidth(100);
// imageNode.translate(0, -200);
// imageNode.setSrc(logoUrl);
// imageNode.setFill("red");

// textNode.setWidth(100);
// textNode.translate(0, -200);
// textNode.setWrapMode(TextWrapMode.Word);
// textNode.setFontWeight(700);
// textNode.setText("🔥 FlowScape 🚀 Привет мир 🌍\n\nこんにちは 世界");
// textNode.setFontSize(NodeText.TEXT_SCALE['base']);

// lineNode.setFill("rgba(55,255,55,1)");
// lineNode.setWidth(300);
// lineNode.setHeight(300);
// lineNode.setRotation(0);
// lineNode.setOpacity(1);
// lineNode.translate(100, 200);
// lineNode.setStrokeFill('red');
// lineNode.setLineCapStart(LineCap.Butt);
// lineNode.setLineCapEnd(LineCap.Round);


// // polygonNode.setSideCount(6);
// starNode.setFill("rgba(55,255,55,1)");
// starNode.setWidth(300);
// starNode.setHeight(300);
// starNode.setRotation(0);
// starNode.setOpacity(1);
// starNode.setSideCount(100);
// starNode.setInnerRatio(0.5);
// starNode.translate(100, 200);
// // starNode.setInnerRatio(0.1);


// polygonNode.setSideCount(6);
// polygonNode.setFill("rgba(55,255,55,1)");
// polygonNode.setWidth(200);
// polygonNode.setHeight(300);
// polygonNode.setRotation(10);
// polygonNode.setOpacity(0.1);



// ellipseNode.setFill("rgba(255,255,55,1)");
// ellipseNode.setWidth(200);
// ellipseNode.setHeight(300);
// ellipseNode.setRotation(10);
// // ellipseNode.setOpacity(0.1);

// ellipseNode.setInnerRatio(0.6)
// ellipseNode.setStartAngle(10);
// ellipseNode.setEndAngle(20);


const dropShadowEffect = new EffectShadow();
dropShadowEffect.setMode(ShadowMode.Cutout);
dropShadowEffect.setX(50);
dropShadowEffect.setY(50);
dropShadowEffect.setFill("red");
dropShadowEffect.setBlur(20);
dropShadowEffect.setSpread(0);
rectNode.effect.add(dropShadowEffect);

const innerShadowEffect = new EffectInnerShadow();
innerShadowEffect.setX(0);
innerShadowEffect.setY(0);
innerShadowEffect.setFill("red");
innerShadowEffect.setBlur(0);
innerShadowEffect.setSpread(0);
rectNode.effect.add(innerShadowEffect);


let stepA = 0;

function test() {
  stepA += 0.1;

  rectNode.setRotation(stepA);
  // rectNode.setWidth(50 + (Math.sin(stepA) * 0.5 + 0.5) * 100);
  // rectNode.setHeight(50 + (Math.cos(stepA) * 0.5 + 0.5) * 150);
  // rectNode.setCornerRadius({
  //   tl: (Math.cos(stepA) * 0.5 + 0.5) * 150,
  //   tr: (Math.cos(stepA) * 0.5 + 0.5) * 150,
  //   bl: (Math.cos(stepA) * 0.5 + 0.5) * 150,
  //   br: (Math.cos(stepA) * 0.5 + 0.5) * 150
  // });

  // pathNode.setRotation(stepA);
  world.render();
  requestAnimationFrame(test);
}

test();
world.addNode(rectNode);
// world.addNode(ellipseNode);
// world.addNode(polygonNode);
// world.addNode(starNode);
// world.addNode(lineNode);
// world.addNode(textNode);
// world.addNode(imageNode);
// world.addNode(videoNode);
// world.addNode(pathNode);


world.gridView.setOptions({
  size: 1
});



// world.add(rect);
// world.add(rect2);


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

// scene.setBackground('linear-gradient(to top left, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to top right, #ff0000, #0000ff)');
// scene.setBackground('linear-gradient(to bottom left, #ff0000, #0000ff)');
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



// import Konva from "konva";

// const stage = new Konva.Stage({ container: 'app', width: 500, height: 500 });

// // Layer 1 — основной контент
// const mainLayer = new Konva.Layer();

// // Layer 2 — inner shadow поверх
// const shadowLayer = new Konva.Layer({
//     listening: false,
// });

// stage.add(mainLayer, shadowLayer);

// // Основная фигура
// const rect = new Konva.Rect({
//     x: 100, y: 100,
//     width: 100, height: 100,
//     fill: 'blue',
// });
// mainLayer.add(rect);
// mainLayer.draw();

// // Inner shadow на shadowLayer с clipFunc
// const shadowGroup = new Konva.Group({
//     clipFunc: (ctx) => {
//         ctx.rect(100, 100, 100, 100);
//     }
// });

// const outerRect = new Konva.Rect({
//     x: 280, y: 80,
//     width: 40, height: 40,
//     fill: 'red',
//     opacity: 0.8,
// });

// shadowGroup.add(outerRect);
// shadowLayer.add(shadowGroup);
// shadowLayer.draw();

// import Konva from "konva";

// const stage = new Konva.Stage({ container: 'app', width: 500, height: 500 });
// const layer = new Konva.Layer();
// stage.add(layer);

// const offsetX = 10;
// const offsetY = 10;
// const blur = 15;
// const padding = Math.ceil(blur * 3);

// const group = new Konva.Group({
//     x: 100, y: 100,
//     clipFunc: (ctx) => {
//         ctx.rect(0, 0, 100, 100);
//     }
// });

// const blurRoot = new Konva.Group();

// const outerRect = new Konva.Rect({
//     x: offsetX - padding,
//     y: offsetY - padding,
//     width: 100 + padding * 2,
//     height: 100 + padding * 2,
//     fill: 'red',
// });

// const holeShape = new Konva.Rect({
//     x: offsetX, y: offsetY,
//     width: 100, height: 100,
//     fill: '#000',
//     globalCompositeOperation: 'destination-out',
// });

// blurRoot.add(outerRect, holeShape);
// group.add(blurRoot);
// layer.add(group);

// blurRoot.cache({ 
//     x: offsetX - padding, 
//     y: offsetY - padding, 
//     width: 100 + padding * 2, 
//     height: 100 + padding * 2 
// });
// blurRoot.filters([Konva.Filters.Blur]);
// blurRoot.blurRadius(blur);

// layer.draw();