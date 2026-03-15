import logoUrl from './assets/images/logo.png';
import videoUrl from './assets/images/vid.mp4';
import Konva from 'konva';


import { Scene } from '../../src/core/scene/Scene';
import { getNodeWorldCorners } from '../../src/core/scene/layers/overlay';


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

world.add(rect);
world.add(rect2);


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