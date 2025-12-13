import type { Meta, StoryObj } from '@storybook/html';
import {
  AreaSelectionPlugin,
  CameraHotkeysPlugin,
  CoreEngine,
  GridPlugin,
  HistoryPlugin,
  LogoPlugin,
  NodeHotkeysPlugin,
  RulerGuidesAddon,
  RulerHighlightAddon,
  RulerManagerAddon,
  RulerPlugin,
  SelectionPlugin,
  VisualGuidesPlugin,
} from '../src/index';

const meta: Meta = {
  title: 'Interactive/Playground',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

// Enhanced styles with more UI elements
const styles = `
  * {
    box-sizing: border-box;
  }

  .playground-container {
    display: flex;
    width: 100%;
    height: 100vh;
    background: #0f1115;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }

  .sidebar {
    width: 320px;
    background: #161b22;
    border-right: 1px solid #30363d;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #30363d;
    background: #0d1117;
  }

  .sidebar-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #58a6ff;
  }

  .sidebar-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }

  .canvas-area {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    background: #161b22;
    border-bottom: 1px solid #30363d;
    padding: 12px 16px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    gap: 4px;
    padding: 0 8px;
    border-right: 1px solid #30363d;
  }

  .toolbar-group:last-child {
    border-right: none;
  }

  .canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .stats-bar {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(22, 27, 34, 0.95);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 13px;
    z-index: 1000;
    backdrop-filter: blur(10px);
    min-width: 200px;
  }

  .stats-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    align-items: center;
  }

  .stats-item:last-child {
    margin-bottom: 0;
  }

  .stats-label {
    color: #8b949e;
    margin-right: 16px;
  }

  .stats-value {
    color: #58a6ff;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: #8b949e;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: #58a6ff;
    border-radius: 2px;
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .button-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .btn {
    padding: 8px 12px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
    font-weight: 500;
  }

  .btn:hover {
    background: #30363d;
    border-color: #58a6ff;
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    padding: 6px;
    font-size: 16px;
  }

  .btn-primary {
    background: #238636;
    border-color: #238636;
    color: white;
  }

  .btn-primary:hover {
    background: #2ea043;
    border-color: #2ea043;
  }

  .btn-danger {
    background: #da3633;
    border-color: #da3633;
    color: white;
  }

  .btn-danger:hover {
    background: #f85149;
    border-color: #f85149;
  }

  .btn-full {
    grid-column: 1 / -1;
  }

  .btn-active {
    background: #1f6feb;
    border-color: #1f6feb;
    color: white;
  }

  .plugin-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    margin-bottom: 6px;
    transition: all 0.15s;
  }

  .plugin-item:hover {
    background: #2d333b;
  }

  .plugin-info {
    flex: 1;
  }

  .plugin-name {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .plugin-desc {
    font-size: 11px;
    color: #8b949e;
  }

  .toggle-switch {
    width: 40px;
    height: 22px;
    background: #30363d;
    border-radius: 11px;
    position: relative;
    transition: background 0.2s;
    cursor: pointer;
    flex-shrink: 0;
  }

  .toggle-switch.active {
    background: #238636;
  }

  .toggle-switch::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .toggle-switch.active::after {
    transform: translateX(18px);
  }

  .input-group {
    margin-bottom: 12px;
  }

  .input-label {
    display: block;
    font-size: 12px;
    color: #8b949e;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .input-field {
    width: 100%;
    padding: 8px 10px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 13px;
    transition: all 0.15s;
  }

  .input-field:focus {
    outline: none;
    border-color: #58a6ff;
    background: #161b22;
  }

  .color-picker-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .color-preview {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid #30363d;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-preview:hover {
    border-color: #58a6ff;
  }

  .slider-group {
    margin-bottom: 14px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .slider-label {
    font-size: 12px;
    color: #8b949e;
    font-weight: 500;
  }

  .slider-value {
    font-size: 12px;
    color: #58a6ff;
    font-weight: 600;
    min-width: 40px;
    text-align: right;
  }

  .slider {
    width: 100%;
    height: 6px;
    background: #30363d;
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #58a6ff;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
  }

  .slider::-webkit-slider-thumb:hover {
    background: #79c0ff;
    transform: scale(1.1);
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #58a6ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }

  .slider::-moz-range-thumb:hover {
    background: #79c0ff;
    transform: scale(1.1);
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 8px;
  }

  .icon-btn {
    aspect-ratio: 1;
    padding: 8px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: #30363d;
    border-color: #58a6ff;
    transform: scale(1.05);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  .property-panel {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(22, 27, 34, 0.95);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px;
    min-width: 250px;
    max-width: 300px;
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: none;
  }

  .property-panel.visible {
    display: block;
  }

  .property-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #58a6ff;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid #30363d;
  }

  .tab {
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #8b949e;
    font-size: 12px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    font-weight: 500;
  }

  .tab:hover {
    color: #e6edf3;
  }

  .tab.active {
    color: #58a6ff;
    border-bottom-color: #58a6ff;
  }

  .tab-content {
    display: none;
  }

  .tab-content.active {
    display: block;
  }

  .quick-actions {
    position: absolute;
    top: 16px;
    left: 16px;
    display: flex;
    gap: 8px;
    z-index: 999;
  }

  .tooltip {
    position: relative;
    top: 20px;   
    left: 20px;                     
  }

  .tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-4px);
    background: #161b22;
    color: #e6edf3;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    border: 1px solid #30363d;
  }

  .tooltip:hover::after {
    opacity: 1;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .recording {
    animation: pulse 1.5s ease-in-out infinite;
  }

  .badge {
    display: inline-block;
    padding: 2px 6px;
    background: #1f6feb;
    color: white;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 6px;
  }

  .divider {
    height: 1px;
    background: #30363d;
    margin: 16px 0;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .preset-card {
    padding: 12px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preset-card:hover {
    background: #2d333b;
    border-color: #58a6ff;
    transform: translateY(-2px);
  }

  .preset-name {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .preset-desc {
    font-size: 10px;
    color: #8b949e;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #0d1117;
  }

  ::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #484f58;
  }
`;

export const InteractivePlayground: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'playground-container';

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const { sidebar, canvasArea } = createLayout();
    container.appendChild(sidebar);
    container.appendChild(canvasArea);

    setTimeout(() => {
      initializePlayground(sidebar, canvasArea);
    }, 0);

    return container;
  },
};

function createLayout() {
  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';

  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'sidebar-header';
  sidebarHeader.innerHTML = `
    <h2 class="sidebar-title">🎨 Flowscape Playground</h2>
  `;

  const sidebarContent = document.createElement('div');
  sidebarContent.className = 'sidebar-content';
  sidebarContent.id = 'sidebar-content';

  sidebar.appendChild(sidebarHeader);
  sidebar.appendChild(sidebarContent);

  // Canvas area
  const canvasArea = document.createElement('div');
  canvasArea.className = 'canvas-area';

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.id = 'toolbar';

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'canvas-wrapper';

  const canvasContainer = document.createElement('div');
  canvasContainer.style.width = '100%';
  canvasContainer.style.height = '100%';
  canvasWrapper.appendChild(canvasContainer);

  const statsBar = document.createElement('div');
  statsBar.className = 'stats-bar';
  statsBar.id = 'stats-bar';

  const propertyPanel = document.createElement('div');
  propertyPanel.className = 'property-panel';
  propertyPanel.id = 'property-panel';

  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';
  quickActions.id = 'quick-actions';

  canvasWrapper.appendChild(statsBar);
  canvasWrapper.appendChild(propertyPanel);
  canvasWrapper.appendChild(quickActions);

  // canvasArea.appendChild(toolbar);
  canvasArea.appendChild(canvasWrapper);

  return {
    sidebar,
    canvasArea,
    canvasContainer,
    sidebarContent,
    toolbar,
    statsBar,
    propertyPanel,
    quickActions,
  };
}

function initializePlayground(sidebar: HTMLElement, canvasArea: HTMLElement) {
  const canvasContainer = canvasArea.querySelector('.canvas-wrapper > div') as HTMLDivElement;
  const sidebarContent = sidebar.querySelector('#sidebar-content') as HTMLElement;
  // const toolbar = canvasArea.querySelector('#toolbar') as HTMLElement;
  const statsBar = canvasArea.querySelector('#stats-bar') as HTMLElement;
  const propertyPanel = canvasArea.querySelector('#property-panel') as HTMLElement;
  const quickActions = canvasArea.querySelector('#quick-actions') as HTMLElement;

  // Initialize plugins
  const pluginInstances = {
    grid: new GridPlugin({ color: '#3d3d3d', enableSnap: true }),
    selection: new SelectionPlugin(),
    nodeHotkeys: new NodeHotkeysPlugin(),
    cameraHotkeys: new CameraHotkeysPlugin(),
    areaSelection: new AreaSelectionPlugin(),
    visualGuides: new VisualGuidesPlugin(),
    history: new HistoryPlugin(),
    ruler: new RulerPlugin(),
    logo: new LogoPlugin({ src: '/images/logo.png', width: 200, height: 200, opacity: 0.3 }),
  };

  pluginInstances.ruler.addons.add([
    new RulerGuidesAddon(),
    new RulerHighlightAddon(),
    new RulerManagerAddon(),
  ]);

  const core = new CoreEngine({
    container: canvasContainer,
    plugins: Object.values(pluginInstances),
  });

  const state = {
    selectedNodes: [] as any[],
    currentTool: 'select',
    currentColor: '#3b82f6',
    currentStrokeColor: '#1e40af',
    currentStrokeWidth: 2,
    currentOpacity: 1,
    currentFontSize: 24,
    gridSize: 20,
    snapEnabled: true,
  };

  // Setup UI
  // setupToolbar(toolbar, core, state);
  setupSidebar(sidebarContent, core, state, pluginInstances);
  setupStatsBar(statsBar, core);
  setupPropertyPanel(propertyPanel, core, state);
  setupQuickActions(quickActions, core);
  setupEventListeners(core, state, propertyPanel);

  // Add welcome content
  addWelcomeContent(core);
}

// function setupToolbar(toolbar: HTMLElement, core: CoreEngine, state: any) {
//   toolbar.innerHTML = `
//     <div class="toolbar-group">
//       <button class="btn btn-icon btn-active tooltip" data-tool="select" data-tooltip="Select (V)">
//         <span>↖</span>
//       </button>
//       <button class="btn btn-icon tooltip" data-tool="hand" data-tooltip="Hand (H)">
//         <span>✋</span>
//       </button>
//     </div>

//     <div class="toolbar-group">
//       <button class="btn btn-icon tooltip" data-tool="rect" data-tooltip="Rectangle (R)">
//         <span>▭</span>
//       </button>
//       <button class="btn btn-icon tooltip" data-tool="circle" data-tooltip="Circle (C)">
//         <span>●</span>
//       </button>
//       <button class="btn btn-icon tooltip" data-tool="text" data-tooltip="Text (T)">
//         <span>T</span>
//       </button>
//       <button class="btn btn-icon tooltip" data-tool="star" data-tooltip="Star (S)">
//         <span>★</span>
//       </button>
//     </div>

//     <div class="toolbar-group">
//       <button class="btn tooltip" data-action="undo" data-tooltip="Undo (Ctrl+Z)">
//         <span>↶ Undo</span>
//       </button>
//       <button class="btn tooltip" data-action="redo" data-tooltip="Redo (Ctrl+Shift+Z)">
//         <span>↷ Redo</span>
//       </button>
//     </div>

//     <div class="toolbar-group">
//       <button class="btn tooltip" data-action="zoom-in" data-tooltip="Zoom In (+)">
//         <span>🔍+</span>
//       </button>
//       <button class="btn tooltip" data-action="zoom-out" data-tooltip="Zoom Out (-)">
//         <span>🔍-</span>
//       </button>
//       <button class="btn tooltip" data-action="zoom-reset" data-tooltip="Reset Zoom (0)">
//         <span>100%</span>
//       </button>
//     </div>

//     <div class="toolbar-group">
//       <button class="btn btn-danger tooltip" data-action="clear" data-tooltip="Clear All">
//         <span>🗑 Clear</span>
//       </button>
//     </div>
//   `;

// Tool selection
// toolbar.querySelectorAll('[data-tool]').forEach((btn) => {
//   btn.addEventListener('click', () => {
//     const tool = btn.getAttribute('data-tool')!;
//     state.currentTool = tool;

//     toolbar.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('btn-active'));
//     btn.classList.add('btn-active');
//   });
// });

// Actions
// const actions: Record<string, () => void> = {
//   undo: () => {
//     console.log('Undo action (history plugin integration needed)');
//   },
//   redo: () => {
//     console.log('Redo action (history plugin integration needed)');
//   },
//   'zoom-in': () => core.camera.zoomIn(),
//   'zoom-out': () => core.camera.zoomOut(),
//   'zoom-reset': () => core.camera.reset(),
//   clear: () => {
//     if (confirm('Clear all nodes?')) {
//       const allNodes = core.nodes.list();
//       allNodes.forEach((node) => core.nodes.remove(node));
//     }
//   },
// };

//   toolbar.querySelectorAll('[data-action]').forEach((btn) => {
//     btn.addEventListener('click', () => {
//       const action = btn.getAttribute('data-action')!;
//       actions[action]?.();
//     });
//   });
// }

function setupSidebar(sidebar: HTMLElement, core: CoreEngine, state: any, plugins: any) {
  sidebar.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="shapes">Shapes</button>
      <button class="tab" data-tab="icons">Icons</button>
      <button class="tab" data-tab="plugins">Plugins</button>
      <button class="tab" data-tab="presets">Presets</button>
    </div>

    <div class="tab-content active" data-content="shapes">
      ${createShapesTab(core, state)}
    </div>

    <div class="tab-content" data-content="icons">
      ${createIconsTab(core, state)}
    </div>

    <div class="tab-content" data-content="plugins">
      ${createPluginsTab(plugins)}
    </div>

    <div class="tab-content" data-content="presets">
      ${createPresetsTab(core)}
    </div>
  `;

  // Tab switching
  sidebar.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab')!;

      sidebar.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      sidebar.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      sidebar.querySelector(`[data-content="${tabName}"]`)?.classList.add('active');
    });
  });

  setupShapesTabListeners(sidebar, core, state);
  setupIconsTabListeners(sidebar, core, state);
  setupPluginsTabListeners(sidebar, core, plugins);
  setupPresetsTabListeners(sidebar, core);
}

function createShapesTab(core: CoreEngine, state: any) {
  return `
    <div class="section">
      <div class="section-title">Basic Shapes</div>
      <div class="button-grid">
        <button class="btn" data-shape="rect">▭ Rectangle</button>
        <button class="btn" data-shape="circle">● Circle</button>
        <button class="btn" data-shape="ellipse">⬭ Ellipse</button>
        <button class="btn" data-shape="star">★ Star</button>
        <button class="btn" data-shape="polygon">⬡ Polygon</button>
        <button class="btn" data-shape="ring">◯ Ring</button>
        <button class="btn" data-shape="arrow">→ Arrow</button>
        <button class="btn" data-shape="text">T Text</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Quick Actions</div>
      <div class="button-grid">
        <button class="btn btn-primary btn-full" data-action="add-random-10">
          ✨ Add 10 Random
        </button>
        <button class="btn" data-action="add-grid">📊 Create Grid</button>
        <button class="btn" data-action="add-pattern">🎨 Add Pattern</button>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Appearance</div>
      
      <div class="input-group">
        <label class="input-label">Fill Color</label>
        <div class="color-picker-wrapper">
          <div class="color-preview" id="fill-color-preview" style="background: ${state.currentColor}"></div>
          <input type="color" class="input-field" id="fill-color" value="${state.currentColor}">
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">Stroke Color</label>
        <div class="color-picker-wrapper">
          <div class="color-preview" id="stroke-color-preview" style="background: ${state.currentStrokeColor}"></div>
          <input type="color" class="input-field" id="stroke-color" value="${state.currentStrokeColor}">
        </div>
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Stroke Width</span>
          <span class="slider-value" id="stroke-width-value">${state.currentStrokeWidth}</span>
        </div>
        <input type="range" class="slider" id="stroke-width" min="0" max="20" value="${state.currentStrokeWidth}">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Opacity</span>
          <span class="slider-value" id="opacity-value">${Math.round(state.currentOpacity * 100)}%</span>
        </div>
        <input type="range" class="slider" id="opacity" min="0" max="100" value="${state.currentOpacity * 100}">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Font Size</span>
          <span class="slider-value" id="font-size-value">${state.currentFontSize}px</span>
        </div>
        <input type="range" class="slider" id="font-size" min="12" max="72" value="${state.currentFontSize}">
      </div>
    </div>
  `;
}

function createIconsTab(core: CoreEngine, state: any) {
  const icons = [
    '🏠',
    '⚙️',
    '🔔',
    '📧',
    '📱',
    '💻',
    '🖥️',
    '⌚',
    '📷',
    '🎥',
    '🎵',
    '🎮',
    '🎯',
    '🎨',
    '✏️',
    '📝',
    '📊',
    '📈',
    '📉',
    '💰',
    '🔒',
    '🔓',
    '🔑',
    '🔍',
    '❤️',
    '⭐',
    '✨',
    '🔥',
    '💡',
    '🚀',
    '🎉',
    '🎁',
    '👤',
    '👥',
    '💬',
    '📢',
    '🌐',
    '📍',
    '🕒',
    '📅',
    '✅',
    '❌',
    '⚠️',
    '❓',
    '➕',
    '➖',
    '✖️',
    '➗',
  ];

  return `
    <div class="section">
      <div class="section-title">Emoji Icons</div>
      <div class="icon-grid">
        ${icons
          .map(
            (icon) => `
          <button class="icon-btn" data-icon="${icon}">${icon}</button>
        `,
          )
          .join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Custom Text</div>
      <div class="input-group">
        <input type="text" class="input-field" id="custom-text" placeholder="Enter custom text...">
        <button class="btn btn-primary btn-full" id="add-custom-text" style="margin-top: 8px;">
          Add Custom Text
        </button>
      </div>
    </div>
  `;
}

function createPluginsTab(plugins: any) {
  const pluginInfo: Record<string, string> = {
    grid: 'Adaptive grid with snap',
    selection: 'Select and transform nodes',
    nodeHotkeys: 'Copy/paste shortcuts',
    cameraHotkeys: 'Zoom and pan controls',
    areaSelection: 'Area selection frame',
    visualGuides: 'Alignment guides',
    history: 'Undo/redo support',
    ruler: 'Rulers with guides',
    logo: 'Watermark overlay',
  };

  return `
    <div class="section">
      <div class="section-title">Active Plugins</div>
      ${Object.entries(plugins)
        .map(
          ([key, plugin]) => `
        <div class="plugin-item">
          <div class="plugin-info">
            <div class="plugin-name">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div class="plugin-desc">${pluginInfo[key] || 'Plugin'}</div>
          </div>
          <div class="toggle-switch active" data-plugin="${key}"></div>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function createPresetsTab(core: CoreEngine) {
  return `
    <div class="section">
      <div class="section-title">Quick Presets</div>
      <div class="preset-grid">
        <div class="preset-card" data-preset="dashboard">
          <div class="preset-name">📊 Dashboard</div>
          <div class="preset-desc">Analytics layout</div>
        </div>
        <div class="preset-card" data-preset="wireframe">
          <div class="preset-name">📱 Wireframe</div>
          <div class="preset-desc">Mobile mockup</div>
        </div>
        <div class="preset-card" data-preset="flowchart">
          <div class="preset-name">🔄 Flowchart</div>
          <div class="preset-desc">Process diagram</div>
        </div>
        <div class="preset-card" data-preset="mindmap">
          <div class="preset-name">🧠 Mind Map</div>
          <div class="preset-desc">Idea organization</div>
        </div>
      </div>
    </div>
  `;
}

function setupShapesTabListeners(sidebar: HTMLElement, core: CoreEngine, state: any) {
  const getRandomPos = () => ({
    x: Math.random() * 800 + 100,
    y: Math.random() * 400 + 100,
  });

  const shapeActions: Record<string, () => void> = {
    rect: () => {
      const pos = getRandomPos();
      core.nodes.addShape({
        ...pos,
        width: 150,
        height: 100,
        fill: 'grey',
        // stroke: 0,
        // strokeWidth: state.currentStrokeWidth,
      });
    },
    circle: () => {
      const pos = getRandomPos();
      core.nodes.addCircle({
        ...pos,
        radius: 50,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    ellipse: () => {
      const pos = getRandomPos();
      core.nodes.addEllipse({
        ...pos,
        radiusX: 80,
        radiusY: 50,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    star: () => {
      const pos = getRandomPos();
      core.nodes.addStar({
        ...pos,
        numPoints: 5,
        innerRadius: 30,
        outerRadius: 60,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    polygon: () => {
      const pos = getRandomPos();
      core.nodes.addRegularPolygon({
        ...pos,
        sides: 6,
        radius: 50,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    ring: () => {
      const pos = getRandomPos();
      core.nodes.addRing({
        ...pos,
        innerRadius: 30,
        outerRadius: 60,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    arrow: () => {
      const pos = getRandomPos();
      core.nodes.addArrow({
        ...pos,
        points: [0, 0, 150, 0, 200, 50],
        pointerLength: 12,
        pointerWidth: 12,
        fill: state.currentColor,
        stroke: state.currentStrokeColor,
        strokeWidth: state.currentStrokeWidth,
      });
    },
    text: () => {
      const pos = getRandomPos();
      core.nodes.addText({
        ...pos,
        text: 'Hello Flowscape!',
        fontSize: state.currentFontSize,
        fill: state.currentColor,
      });
    },
  };

  const quickActions: Record<string, () => void> = {
    'add-random-10': () => {
      const shapes = ['rect', 'circle', 'ellipse', 'star'];
      for (let i = 0; i < 10; i++) {
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        shapeActions[shape]?.();
      }
    },
    'add-grid': () => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          core.nodes.addShape({
            x: 100 + col * 180,
            y: 100 + row * 150,
            width: 150,
            height: 100,
            fill: colors[(row * 4 + col) % colors.length],
          });
        }
      }
    },
    'add-pattern': () => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 200;
        core.nodes.addCircle({
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          radius: 40,
          fill: colors[i],
        });
      }
    },
  };

  sidebar.querySelectorAll('[data-shape]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shape = btn.getAttribute('data-shape')!;
      shapeActions[shape]?.();
    });
  });

  sidebar.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action')!;
      quickActions[action]?.();
    });
  });

  // Color pickers
  const fillColor = sidebar.querySelector('#fill-color') as HTMLInputElement;
  const fillPreview = sidebar.querySelector('#fill-color-preview') as HTMLElement;
  fillColor?.addEventListener('input', (e) => {
    state.currentColor = (e.target as HTMLInputElement).value;
    if (fillPreview) fillPreview.style.background = state.currentColor;
  });

  const strokeColor = sidebar.querySelector('#stroke-color') as HTMLInputElement;
  const strokePreview = sidebar.querySelector('#stroke-color-preview') as HTMLElement;
  strokeColor?.addEventListener('input', (e) => {
    state.currentStrokeColor = (e.target as HTMLInputElement).value;
    if (strokePreview) strokePreview.style.background = state.currentStrokeColor;
  });

  // Sliders
  const strokeWidth = sidebar.querySelector('#stroke-width') as HTMLInputElement;
  const strokeWidthValue = sidebar.querySelector('#stroke-width-value')!;
  strokeWidth?.addEventListener('input', (e) => {
    state.currentStrokeWidth = parseInt((e.target as HTMLInputElement).value);
    strokeWidthValue.textContent = state.currentStrokeWidth.toString();
  });

  const opacity = sidebar.querySelector('#opacity') as HTMLInputElement;
  const opacityValue = sidebar.querySelector('#opacity-value')!;
  opacity?.addEventListener('input', (e) => {
    state.currentOpacity = parseInt((e.target as HTMLInputElement).value) / 100;
    opacityValue.textContent = `${Math.round(state.currentOpacity * 100)}%`;
  });

  const fontSize = sidebar.querySelector('#font-size') as HTMLInputElement;
  const fontSizeValue = sidebar.querySelector('#font-size-value')!;
  fontSize?.addEventListener('input', (e) => {
    state.currentFontSize = parseInt((e.target as HTMLInputElement).value);
    fontSizeValue.textContent = `${state.currentFontSize}px`;
  });
}

function setupIconsTabListeners(sidebar: HTMLElement, core: CoreEngine, state: any) {
  sidebar.querySelectorAll('[data-icon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const icon = btn.getAttribute('data-icon')!;
      core.nodes.addText({
        x: Math.random() * 800 + 100,
        y: Math.random() * 400 + 100,
        text: icon,
        fontSize: 48,
      });
    });
  });

  const customTextInput = sidebar.querySelector('#custom-text') as HTMLInputElement;
  const addCustomTextBtn = sidebar.querySelector('#add-custom-text');

  addCustomTextBtn?.addEventListener('click', () => {
    const text = customTextInput?.value || 'Custom Text';
    core.nodes.addText({
      x: Math.random() * 800 + 100,
      y: Math.random() * 400 + 100,
      text,
      fontSize: state.currentFontSize,
      fill: state.currentColor,
    });
    if (customTextInput) customTextInput.value = '';
  });
}

function setupPluginsTabListeners(sidebar: HTMLElement, core: CoreEngine, plugins: any) {
  sidebar.querySelectorAll('.toggle-switch').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const pluginKey = toggle.getAttribute('data-plugin');
      const isActive = toggle.classList.contains('active');

      if (isActive) {
        toggle.classList.remove('active');
        const inst = pluginKey ? plugins[pluginKey] : null;
        if (inst) core.plugins.removePlugins([inst]);
      } else {
        toggle.classList.add('active');
        const inst = pluginKey ? plugins[pluginKey] : null;
        if (inst) core.plugins.addPlugins([inst]);
      }
    });
  });
}

function setupPresetsTabListeners(sidebar: HTMLElement, core: CoreEngine) {
  const presets: Record<string, () => void> = {
    dashboard: () => {
      // Clear and create dashboard layout
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      // Header
      core.nodes.addShape({
        x: 50,
        y: 50,
        width: 900,
        height: 80,
        fill: '#1f2937',
      });
      core.nodes.addText({ x: 80, y: 75, text: 'Dashboard', fontSize: 32, fill: '#e6edf3' });

      // Cards
      const cardColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      for (let i = 0; i < 4; i++) {
        core.nodes.addShape({
          x: 50 + i * 230,
          y: 160,
          width: 200,
          height: 120,
          fill: cardColors[i],
          // cornerRadius: 8,
        });
      }

      // Chart area
      core.nodes.addShape({
        x: 50,
        y: 310,
        width: 580,
        height: 300,
        fill: '#1f2937',
        // cornerRadius: 8,
      });
      core.nodes.addText({ x: 80, y: 340, text: '📊 Analytics', fontSize: 24, fill: '#e6edf3' });
    },
    wireframe: () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      // Phone frame
      core.nodes.addShape({
        x: 300,
        y: 50,
        width: 400,
        height: 700,
        fill: '#1f2937',
        cornerRadius: 20,
        stroke: '#30363d',
        strokeWidth: 4,
      });

      // Status bar
      core.nodes.addShape({
        x: 320,
        y: 70,
        width: 360,
        height: 30,
        fill: '#0d1117',
        cornerRadius: 4,
      });

      // Header
      core.nodes.addShape({
        x: 320,
        y: 110,
        width: 360,
        height: 60,
        fill: '#3b82f6',
        cornerRadius: 4,
      });
      core.nodes.addText({ x: 350, y: 130, text: 'App Header', fontSize: 20, fill: 'white' });

      // Content cards
      for (let i = 0; i < 4; i++) {
        core.nodes.addShape({
          x: 320,
          y: 190 + i * 120,
          width: 360,
          height: 100,
          fill: '#21262d',
          cornerRadius: 8,
        });
      }
    },
    flowchart: () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      // Start
      core.nodes.addCircle({ x: 500, y: 100, radius: 40, fill: '#10b981' });
      core.nodes.addText({ x: 480, y: 95, text: 'Start', fontSize: 16, fill: 'white' });

      // Process boxes
      const steps = ['Process 1', 'Process 2', 'Process 3'];
      steps.forEach((step, i) => {
        core.nodes.addShape({
          x: 400,
          y: 180 + i * 120,
          width: 200,
          height: 80,
          fill: '#3b82f6',
          cornerRadius: 8,
        });
        core.nodes.addText({
          x: 450,
          y: 210 + i * 120,
          text: step,
          fontSize: 18,
          fill: 'white',
        });
      });

      // End
      core.nodes.addCircle({ x: 500, y: 560, radius: 40, fill: '#ef4444' });
      core.nodes.addText({ x: 485, y: 555, text: 'End', fontSize: 16, fill: 'white' });
    },
    mindmap: () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      // Central idea
      core.nodes.addCircle({ x: 500, y: 300, radius: 60, fill: '#8b5cf6' });
      core.nodes.addText({ x: 465, y: 295, text: 'Main Idea', fontSize: 16, fill: 'white' });

      // Branches
      const branches = [
        { angle: 0, text: 'Branch 1', color: '#3b82f6' },
        { angle: Math.PI / 3, text: 'Branch 2', color: '#10b981' },
        { angle: (2 * Math.PI) / 3, text: 'Branch 3', color: '#f59e0b' },
        { angle: Math.PI, text: 'Branch 4', color: '#ef4444' },
        { angle: (4 * Math.PI) / 3, text: 'Branch 5', color: '#ec4899' },
        { angle: (5 * Math.PI) / 3, text: 'Branch 6', color: '#06b6d4' },
      ];

      branches.forEach((branch) => {
        const x = 500 + Math.cos(branch.angle) * 200;
        const y = 300 + Math.sin(branch.angle) * 200;

        core.nodes.addCircle({ x, y, radius: 40, fill: branch.color });
        core.nodes.addText({
          x: x - 30,
          y: y - 5,
          text: branch.text,
          fontSize: 12,
          fill: 'white',
        });
      });
    },
  };

  sidebar.querySelectorAll('[data-preset]').forEach((card) => {
    card.addEventListener('click', () => {
      const preset = card.getAttribute('data-preset')!;
      presets[preset]?.();
    });
  });
}

function setupStatsBar(statsBar: HTMLElement, core: CoreEngine) {
  statsBar.innerHTML = `
    <div class="stats-item">
      <span class="stats-label">Nodes:</span>
      <span class="stats-value" id="node-count">0</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">Selected:</span>
      <span class="stats-value" id="selected-count">0</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">Zoom:</span>
      <span class="stats-value" id="zoom-level">100%</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">FPS:</span>
      <span class="stats-value" id="fps-counter">60</span>
    </div>
  `;

  let lastTime = performance.now();
  let fps = 60;

  function updateStats() {
    const nodeCount = core.nodes.list().length;
    const nodeCountEl = statsBar.querySelector('#node-count');
    if (nodeCountEl) nodeCountEl.textContent = nodeCount.toString();

    const zoom = Math.round((core.nodes.world.scaleX() || 1) * 100);
    const zoomEl = statsBar.querySelector('#zoom-level');
    if (zoomEl) zoomEl.textContent = `${zoom}%`;

    const now = performance.now();
    const delta = now - lastTime;
    fps = Math.round(1000 / delta);
    const fpsEl = statsBar.querySelector('#fps-counter');
    if (fpsEl) fpsEl.textContent = fps.toString();
    lastTime = now;

    requestAnimationFrame(updateStats);
  }

  core.eventBus.on('node:created', () => {
    const el = statsBar.querySelector('#node-count');
    if (el) el.textContent = core.nodes.list().length.toString();
  });

  core.eventBus.on('node:removed', () => {
    const el = statsBar.querySelector('#node-count');
    if (el) el.textContent = core.nodes.list().length.toString();
  });

  core.eventBus.on('camera:zoom', ({ scale }) => {
    const el = statsBar.querySelector('#zoom-level');
    if (el) el.textContent = `${Math.round(scale * 100)}%`;
  });

  updateStats();
}

function setupPropertyPanel(propertyPanel: HTMLElement, core: CoreEngine, state: any) {
  propertyPanel.innerHTML = `
    <div class="property-title">Properties</div>
    <div id="property-content">
      <p style="color: #8b949e; font-size: 12px;">Select a node to edit properties</p>
    </div>
  `;
}

function setupQuickActions(quickActions: HTMLElement, core: CoreEngine) {
  quickActions.innerHTML = `
    <button class="btn tooltip" data-action="export" data-tooltip="Export as PNG">
      📸 Export
    </button>
    <button class="btn tooltip" data-action="fullscreen" data-tooltip="Toggle Fullscreen">
      ⛶ Fullscreen
    </button>
  `;

  quickActions.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    const stage = core.stage;
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'flowscape-export.png';
    link.href = dataURL;
    link.click();
  });

  quickActions.querySelector('[data-action="fullscreen"]')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
}

function setupEventListeners(core: CoreEngine, state: any, propertyPanel: HTMLElement) {
  core.eventBus.on('node:selected', (node: any) => {
    state.selectedNodes = [node];
    const selectedCountEl = document.querySelector('#selected-count');
    if (selectedCountEl) selectedCountEl.textContent = '1';
    propertyPanel.classList.add('visible');
  });

  core.eventBus.on('node:deselected', () => {
    state.selectedNodes = [];
    const selectedCountEl = document.querySelector('#selected-count');
    if (selectedCountEl) selectedCountEl.textContent = '0';
    propertyPanel.classList.remove('visible');
  });
}

function addWelcomeContent(core: CoreEngine) {
  core.nodes.addText({
    x: 100,
    y: 80,
    text: '🎨 Welcome to Flowscape Playground!',
    fontSize: 48,
    fill: '#58a6ff',
  });

  core.nodes.addText({
    x: 100,
    y: 150,
    text: 'Use the sidebar and toolbar to create amazing designs',
    fontSize: 18,
    fill: '#8b949e',
  });

  // Sample shapes
  core.nodes.addShape({
    x: 100,
    y: 250,
    width: 150,
    height: 100,
    fill: '#3b82f6',
    cornerRadius: 8,
  });

  core.nodes.addCircle({
    x: 350,
    y: 300,
    radius: 50,
    fill: '#10b981',
  });

  core.nodes.addStar({
    x: 550,
    y: 300,
    numPoints: 5,
    innerRadius: 30,
    outerRadius: 60,
    fill: '#f59e0b',
  });
}
