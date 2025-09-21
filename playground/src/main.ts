import { Camera, Scene, GridPlugin, LogoPlugin, CameraHotkeysPlugin } from '@flowscape-ui/core-sdk';
import { FlowscapeRect } from '../../src/FlowscapeRect';
import Konva from 'konva';
import { FlowscapeLabel } from '../../src/FlowscapeLabel';
import { EdgeTransformer } from '../../src/EdgeTransformer';

const container = document.getElementById('container') as HTMLDivElement;

const canvas = new Scene({
  container,
  autoResize: true,
  backgroundColor: '#1e1e1e',
});

const stage = canvas.getStage();
const world = canvas.getWorld();

const camera = new Camera({ stage, target: world, initialScale: 1 });
camera.lookAt('cursor');

const gridPlugin = new GridPlugin({
  visible: true,
  stepX: 1,
  stepY: 1,
  color: '#2b313a',
  lineWidth: 1,
  minScaleToShow: 8,
});

const logo = new LogoPlugin({
  src: '../../src/images/logo.png',
  width: 329,
  height: 329,
  opacity: 0.5,
});

const hotkeysPlugin = new CameraHotkeysPlugin(camera, {
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

camera.addPlugins([hotkeysPlugin]);
canvas.addPlugins([gridPlugin, logo]);

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

// --- Selection and label (Konva-only) ---
const transformer = new EdgeTransformer({
  rotateEnabled: true,
  enabledAnchors: [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'middle-left',
    'middle-right',
    'top-center',
    'bottom-center',
  ],
  anchorSize: 8,
  borderStroke: '#22a6f2',
  borderStrokeWidth: 2,
  keepRatio: false,
  ignoreStroke: true,
  // freeTransform: false,
  // ignoreStroke: true,
});
world.add(transformer);

const sizeLabel = new FlowscapeLabel();
world.add(sizeLabel);

function positionSizeLabelFor(node: Konva.Node): void {
  sizeLabel.updateFor(node, world);
}

function showSelection(node: Konva.Node | null): void {
  if (!node) {
    transformer.nodes([]);
    sizeLabel.detach();
    stage.batchDraw();
    return;
  }
  transformer.nodes([node as Konva.Node]);
  sizeLabel.attach(node, world);
  // always draw selection frame and label on top
  transformer.moveToTop();
  sizeLabel.moveToTop();
  stage.batchDraw();
}

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
  const rect = new FlowscapeRect({
    x: Math.random() * (stage.width() - 120) + 20,
    y: Math.random() * (stage.height() - 120) + 20,
    width: 100,
    height: 70,
    transformer,
    sizeLabel,
    showSelection,
    positionSizeLabelFor,
  });

  world.add(rect);
  lastRect = rect;
  stage.batchDraw();
}

document.getElementById('add-rect')?.addEventListener('click', addRectangle);
document.getElementById('clear')?.addEventListener('click', () => {
  // Remove only rectangles; keep transformer and label
  world.getChildren((n) => n instanceof Konva.Rect).forEach((n) => n.destroy());
  transformer.nodes([]);
  sizeLabel.hide();
  stage.batchDraw();
});

// Deselect on empty space click/tap
stage.on('mousedown', (e) => {
  if (e.target === stage) {
    showSelection(null);
  }
});

// seed a first rectangle
addRectangle();
