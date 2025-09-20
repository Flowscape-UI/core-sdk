import { Camera, CameraHotkeys, Logo, Scene } from '@flowscape-ui/core-sdk';
import Konva from 'konva';

const container = document.getElementById('container') as HTMLDivElement;

const canvas = new Scene({
  container,
  autoResize: true,
  backgroundColor: '#1e1e1e',
});
const stage = canvas.getStage();
const world = canvas.getWorld();
const layer = canvas.getLayer();

// Use the canvas' world group for content (affects camera transforms)
// All shapes go into world; we keep layer reference implicit

// Setup camera to control the world group (infinite canvas)
const camera = new Camera({ stage, target: world, initialScale: 1 });
camera.lookAt('cursor');

// Demo: Logo (background, centered to camera, fixed pixel size)

// const logo = new Logo({
//   stage,
//   layer,
//   src: '../../src/images/logo.png',
//   width: 329,
//   height: 329,
//   opacity: 0.5,
// });

// Attach hotkeys module from the library (external to Camera)
const hotkeys = new CameraHotkeys(camera, {
  preventDefault: true,
  ignoreEditableTargets: true,
  enablePlusMinus: true,
  enableArrows: true,
  // Defaults: zoomStep=1.1, panStep=40
  zoomStep: 2,
  wheelStep: 1.1,
  panStep: 40,
  // Wheel zoom only when modifier is held
  requireCtrlForWheel: true,
  treatMetaAsCtrl: true,
});

// Simple UI to switch zoom anchor type for testing
const toolbar = document.querySelector('.toolbar');
const select = document.createElement('select');
select.id = 'zoom-anchor';
select.style.marginLeft = '8px';
select.innerHTML = `
  <option value="cursor">Zoom to cursor</option>
  <option value="center">Zoom to center</option>
  <option value="last-rect">Zoom to last rect</option>
`;
toolbar?.appendChild(select);

let lastRect: Konva.Rect | null = null;

function updateZoomAnchor(mode: string) {
  if (mode === 'cursor') {
    camera.lookAt('cursor');
    return;
  }
  if (mode === 'center') {
    const cx = stage.width() / 2;
    const cy = stage.height() / 2;
    const t = new Konva.Transform();
    t.translate(cx, cy);
    camera.lookAt(t);
    return;
  }
  if (mode === 'last-rect' && lastRect) {
    const bounds = lastRect.getClientRect({ skipShadow: true, skipStroke: false });
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const t = new Konva.Transform();
    t.translate(cx, cy);
    camera.lookAt(t);
    return;
  }
  camera.lookAt('cursor');
}

select.addEventListener('change', (e) => {
  const value = (e.target as HTMLSelectElement).value;
  updateZoomAnchor(value);
});

function addRectangle() {
  const rect = new Konva.Rect({
    x: Math.random() * (stage.width() - 120) + 20,
    y: Math.random() * (stage.height() - 120) + 20,
    width: 100,
    height: 70,
    fill: '#1f6feb',
    stroke: '#d9d9d9',
    strokeWidth: 2,
    draggable: true,
  });
  rect.on('mouseover', () => {
    document.body.style.cursor = 'grab';
  });
  rect.on('mouseout', () => {
    document.body.style.cursor = 'default';
  });
  rect.on('dragstart', () => (document.body.style.cursor = 'grabbing'));
  rect.on('dragend', () => (document.body.style.cursor = 'grab'));
  world.add(rect);
  lastRect = rect;
  stage.batchDraw();
}

document.getElementById('add-rect')?.addEventListener('click', addRectangle);
document.getElementById('clear')?.addEventListener('click', () => {
  world.destroyChildren();
  stage.batchDraw();
});

// seed a first rectangle
addRectangle();
