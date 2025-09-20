import { Camera, Scene, GridPlugin, LogoPlugin, CameraHotkeysPlugin } from '@flowscape-ui/core-sdk';
import Konva from 'konva';

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

// Attach hotkeys via plugin
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
// Single transformer reused for any selected node
const transformer = new Konva.Transformer({
  rotateEnabled: true,
  enabledAnchors: [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ],
  anchorSize: 8,
  borderStroke: '#22a6f2',
  borderStrokeWidth: 2,
  keepRatio: false,
  ignoreStroke: true,
  // freeTransform: false,
  // ignoreStroke: true,
});
// Add transformer to world so it is affected by camera/world transforms
world.add(transformer);

// Label that appears with selection, shows size "W × H"
const sizeLabel = new Konva.Label({ visible: false });
const sizeLabelTag = new Konva.Tag({
  fill: '#1677ff',
  cornerRadius: 3,
  opacity: 0.9,
});
const sizeLabelText = new Konva.Text({
  text: '',
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
  fontSize: 12,
  fill: 'white',
  padding: 4,
  align: 'center',
});
sizeLabel.add(sizeLabelTag);
sizeLabel.add(sizeLabelText);
world.add(sizeLabel);

function positionSizeLabelFor(node: Konva.Node): void {
  // Get bounds in coordinates relative to world, so placing label inside world works directly
  const bounds = node.getClientRect({ skipShadow: true, skipStroke: false, relativeTo: world });
  const cx = bounds.x + bounds.width / 2;
  const bottom = bounds.y + bounds.height;
  sizeLabelText.text(`${Math.round(bounds.width)} × ${Math.round(bounds.height)}`);
  // center label horizontally on the bottom
  sizeLabel.x(cx - sizeLabel.width() / 2);
  sizeLabel.y(bottom + 6);
}

function showSelection(node: Konva.Node | null): void {
  if (!node) {
    transformer.nodes([]);
    sizeLabel.visible(false);
    stage.batchDraw();
    return;
  }
  transformer.nodes([node as Konva.Node]);
  positionSizeLabelFor(node);
  sizeLabel.visible(true);
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
  const rect = new Konva.Rect({
    x: Math.random() * (stage.width() - 120) + 20,
    y: Math.random() * (stage.height() - 120) + 20,
    width: 100,
    height: 70,
    fill: '#1f6feb',
    stroke: '#d9d9d9',
    strokeWidth: 4,
    strokeScaleEnabled: true,
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
  rect.on('click', () => {
    showSelection(rect);
  });
  // Keep label in sync while moving / transforming
  rect.on('dragmove', () => {
    if (sizeLabel.visible()) {
      positionSizeLabelFor(rect);
      transformer.moveToTop();
      sizeLabel.moveToTop();
      stage.batchDraw();
    }
  });
  rect.on('transform', () => {
    // apply transform to width/height and reset scale, so stroke isn't scaled
    rect.width(rect.width() * rect.scaleX());
    rect.height(rect.height() * rect.scaleY());
    rect.scaleX(1);
    rect.scaleY(1);

    if (sizeLabel.visible()) {
      positionSizeLabelFor(rect);
      transformer.moveToTop();
      sizeLabel.moveToTop();
      stage.batchDraw();
    }
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
  sizeLabel.visible(false);
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
