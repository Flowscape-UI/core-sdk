import { Canvas, Camera } from '@flowscape-ui/engine';
import Konva from 'konva';

const container = document.getElementById('container') as HTMLDivElement;

const canvas = new Canvas({
  container,
  autoResize: true,
  backgroundColor: '#0f1115',
});
const stage = canvas.getStage();
const world = canvas.getWorld();

// Use the canvas' world group for content (affects camera transforms)
// All shapes go into world; we keep layer reference implicit

// Setup camera to control the world group (infinite canvas)
const camera = new Camera({ stage, target: world, initialScale: 1 });
camera.lookAt('cursor');

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
        stroke: '#e6edf3',
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

// Canvas handles auto-resize internally when autoResize=true

// seed a first rectangle
addRectangle();

// Example external controls: zoom buttons via keyboard (outside of library)
window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.05 : 1 / 1.05;
    camera.translate(0, 0, factor);
}, { passive: false });

let isPanning = false;
let last: { x: number; y: number } | null = null;
stage.container().addEventListener('mousedown', (e) => {
    if (e.button !== 1 && e.button !== 2 && !e.shiftKey) return;
    isPanning = true;
    last = { x: e.clientX, y: e.clientY };
});
stage.container().addEventListener('mousemove', (e) => {
    if (!isPanning || !last) return;
    camera.translate(e.clientX - last.x, e.clientY - last.y);
    last = { x: e.clientX, y: e.clientY };
});
stage.container().addEventListener('mouseup', () => { isPanning = false; last = null; });
stage.container().addEventListener('mouseleave', () => { isPanning = false; last = null; });
// prevent context menu on right mouse button, to enable RMB pan
stage.container().addEventListener('contextmenu', (e) => { e.preventDefault(); });

// Arrow keys to move camera
const KEY_STEP = 40;
window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.shiftKey ? KEY_STEP * 2 : KEY_STEP;
    switch (e.key) {
        case 'ArrowLeft':
            camera.translate(step, 0);
            break;
        case 'ArrowRight':
            camera.translate(-step, 0);
            break;
        case 'ArrowUp':
            camera.translate(0, step);
            break;
        case 'ArrowDown':
            camera.translate(0, -step);
            break;
    }
});


