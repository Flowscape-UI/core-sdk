import type { Meta, StoryObj } from '@storybook/html';
import {
  AreaSelectionPlugin,
  CameraHotkeysPlugin,
  ContentFromClipboardPlugin,
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
    border-left: 1px solid #30363d;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .playground-container.sidebar-collapsed .sidebar {
    width: 0;
    border-left: none;
    overflow: hidden;
  }

  .sidebar-toggle-btn {
    appearance: none;
    background: #21262d;
    border: 1px solid #30363d;
    color: #e6edf3;
    border-radius: 6px;
    cursor: pointer;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .sidebar-toggle-btn:hover {
    border-color: #58a6ff;
  }

  .panel-toggle {
    display: inline-flex;
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
    top: 38px;
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

  .media-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 8px;
  }

  .media-btn {
    height: 64px;
    border-radius: 8px;
    border: 1px solid #30363d;
    background: #0d1117;
    color: #e6edf3;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    transition: all 0.15s;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 8px;
    font-size: 11px;
    font-weight: 600;
    background-size: cover;
    background-position: center;
  }

  .media-btn:hover {
    border-color: #58a6ff;
    transform: translateY(-1px);
  }

  .media-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(13,17,23,0.2) 0%, rgba(13,17,23,0.85) 100%);
    pointer-events: none;
  }

  .media-btn > span {
    position: relative;
    z-index: 1;
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
    right: 16px;
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
    // Sidebar should be on the right
    container.appendChild(canvasArea);
    container.appendChild(sidebar);

    // Sidebar toggle (floating button)
    const syncSidebarToggleUi = () => {
      const collapsed = container.classList.contains('sidebar-collapsed');
      const panelToggleBtn = container.querySelector('#panel-toggle') as HTMLButtonElement | null;

      if (panelToggleBtn) panelToggleBtn.textContent = collapsed ? '☰ Panel' : 'Hide';
    };

    const toggleSidebar = () => {
      container.classList.toggle('sidebar-collapsed');
      syncSidebarToggleUi();
    };

    setTimeout(() => {
      initializePlayground(sidebar, canvasArea, toggleSidebar, syncSidebarToggleUi);
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
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <h2 class="sidebar-title">🎨 Flowscape Playground</h2>
    </div>
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

function initializePlayground(
  sidebar: HTMLElement,
  canvasArea: HTMLElement,
  toggleSidebar: () => void,
  syncSidebarToggleUi: () => void,
) {
  const canvasContainer = canvasArea.querySelector('.canvas-wrapper > div') as HTMLDivElement;
  const sidebarContent = sidebar.querySelector('#sidebar-content') as HTMLElement;
  // const toolbar = canvasArea.querySelector('#toolbar') as HTMLElement;
  const statsBar = canvasArea.querySelector('#stats-bar') as HTMLElement;
  const propertyPanel = canvasArea.querySelector('#property-panel') as HTMLElement;
  const quickActions = canvasArea.querySelector('#quick-actions') as HTMLElement;

  // Initialize plugins
  const pluginInstances = {
    grid: new GridPlugin({ color: '#3d3d3d', enableSnap: true }),
    selection: new SelectionPlugin({
      enableVideoOverlay: {
        uiAccentColor: '#ff8a00',
        uiTrackFilledColor: '#ff8a00',
        uiBackgroundColor: 'rgba(18,18,18,0.92)',
      },
    }),
    nodeHotkeys: new NodeHotkeysPlugin(),
    cameraHotkeys: new CameraHotkeysPlugin(),
    areaSelection: new AreaSelectionPlugin(),
    visualGuides: new VisualGuidesPlugin(),
    history: new HistoryPlugin(),
    ruler: new RulerPlugin(),
    logo: new LogoPlugin({ src: '/images/logo.png', width: 200, height: 200, opacity: 0.3 }),
    clipboard: new ContentFromClipboardPlugin({
      ignoreEditableTargets: true,
      maxImageSize: 1200,
      enableDragDrop: true,
    }),
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

  setupStorybookClipboardFocusFix(core);

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
  setupQuickActions(quickActions, core, toggleSidebar, syncSidebarToggleUi);
  setupEventListeners(core, state, propertyPanel);

  // Add welcome content
  addWelcomeContent(core);
}

function setupStorybookClipboardFocusFix(core: CoreEngine): void {
  const stageContainer = core.stage.container();

  // Make the Konva container focusable so that paste/keyboard shortcuts can reliably target
  // the Storybook iframe document (after TextNode edit textarea is removed).
  if (typeof stageContainer.tabIndex !== 'number' || stageContainer.tabIndex < 0) {
    stageContainer.tabIndex = 0;
  }

  // Avoid focus ring artifacts inside the canvas.
  stageContainer.style.outline = 'none';

  const isEditableTarget = (el: Element | null): boolean => {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    return el.isContentEditable;
  };

  const onKeyDownCapture = (e: KeyboardEvent): void => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    // Only special-case paste; do not interfere with other shortcuts.
    if (e.code !== 'KeyV') return;

    const active = globalThis.document.activeElement;
    if (isEditableTarget(active)) return;

    // Ensure focus is on canvas before the subsequent `paste` event is dispatched.
    if (active !== stageContainer) {
      stageContainer.focus({ preventScroll: true });
    }
  };

  globalThis.addEventListener('keydown', onKeyDownCapture, { capture: true });
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
      <button class="tab" data-tab="icons">Assets</button>
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
        <button class="btn" data-shape="frame">🧩 Frame (experimental)</button>
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
      <div class="section-title">Images</div>
      <div class="media-grid">
        <button class="media-btn" data-image="https://picsum.photos/id/1011/800/600" style="background-image:url('https://picsum.photos/id/1011/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1025/800/600" style="background-image:url('https://picsum.photos/id/1025/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1035/800/600" style="background-image:url('https://picsum.photos/id/1035/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1043/800/600" style="background-image:url('https://picsum.photos/id/1043/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1050/800/600" style="background-image:url('https://picsum.photos/id/1050/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1069/800/600" style="background-image:url('https://picsum.photos/id/1069/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1084/800/600" style="background-image:url('https://picsum.photos/id/1084/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1080/800/600" style="background-image:url('https://picsum.photos/id/1080/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1074/800/600" style="background-image:url('https://picsum.photos/id/1074/400/300')"><span></span></button>
        <button class="media-btn" data-image="https://picsum.photos/id/1060/800/600" style="background-image:url('https://picsum.photos/id/1060/400/300')"><span></span></button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">GIF</div>
      <div class="media-grid">
        <button class="media-btn" data-gif="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHI0MGZ2M3l3N2g3d3I3aTdlcTJrYTY0ZjJycXZ4ZjRrNDhrMXJudiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/100QWMdxQJzQC4/giphy.gif" style="background-image:url('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHI0MGZ2M3l3N2g3d3I3aTdlcTJrYTY0ZjJycXZ4ZjRrNDhrMXJudiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/100QWMdxQJzQC4/giphy.gif')"><span></span></button>
        <button class="media-btn" data-gif="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXdrbXVsZnQxeXIxaGlpc3hiNmx1cndzdXhkbzJvZnpjMDNmcnN2cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aGVvqGKFOXIvC/giphy.gif" style="background-image:url('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXdrbXVsZnQxeXIxaGlpc3hiNmx1cndzdXhkbzJvZnpjMDNmcnN2cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aGVvqGKFOXIvC/giphy.gif')"><span></span></button>
        <button class="media-btn" data-gif="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXl4a2NobzJkaDVqYjlheG1zN2g3bmZ0dXB1a2xjMTBmOGttODZkZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VOPK1BqsMEJRS/giphy.gif" style="background-image:url('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXl4a2NobzJkaDVqYjlheG1zN2g3bmZ0dXB1a2xjMTBmOGttODZkZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VOPK1BqsMEJRS/giphy.gif')"><span></span></button>
        <button class="media-btn" data-gif="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGdmZDBuM2ZoeHhrYmVvZWs4cmhmcmloMjJmZ2lxZWsxa2RrcG9uMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12HZukMBlutpoQ/giphy.gif" style="background-image:url('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGdmZDBuM2ZoeHhrYmVvZWs4cmhmcmloMjJmZ2lxZWsxa2RrcG9uMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12HZukMBlutpoQ/giphy.gif')"><span></span></button>
        <button class="media-btn" data-gif="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzhnanNhNGRjMXJlcm1iOWZzMjlmMnNuNXJkNzcxYWUxYnpzNGRtdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YaKf7ZtM3yAhdgQ5XZ/giphy.gif" style="background-image:url('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzhnanNhNGRjMXJlcm1iOWZzMjlmMnNuNXJkNzcxYWUxYnpzNGRtdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YaKf7ZtM3yAhdgQ5XZ/giphy.gif')"><span></span></button>
        <button class="media-btn" data-gif="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDdvbG5peHNoMjI2Mjh5YWtqYzQzYzY2MzZoMXJ3ZXZvZXI0dHA3diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uvVzR1UfU2RqDISUCS/giphy.gif" style="background-image:url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDdvbG5peHNoMjI2Mjh5YWtqYzQzYzY2MzZoMXJ3ZXZvZXI0dHA3diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uvVzR1UfU2RqDISUCS/giphy.gif')"><span></span></button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">SVG</div>
      <div class="media-grid">
        <button class="media-btn" data-svg="https://konvajs.org/assets/tiger.svg" style="background-image:url('https://konvajs.org/assets/tiger.svg')"><span></span></button>
        <button class="media-btn" data-svg="https://upload.wikimedia.org/wikipedia/commons/6/6b/Bitmap_VS_SVG.svg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/6/6b/Bitmap_VS_SVG.svg')"><span></span></button>
        <button class="media-btn" data-svg="https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg')"><span></span></button>
        <button class="media-btn" data-svg="https://upload.wikimedia.org/wikipedia/commons/3/36/Logo.min.svg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/3/36/Logo.min.svg')"><span></span></button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Videos</div>
      <div class="media-grid">
        <button class="media-btn" data-video="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" style="background-image:url('https://picsum.photos/id/1059/400/300')"><span></span></button>
        <button class="media-btn" data-video="https://media.w3.org/2010/05/sintel/trailer.mp4" style="background-image:url('https://picsum.photos/id/1015/400/300')"><span></span></button>
        <button class="media-btn" data-video="https://media.w3.org/2010/05/video/movie_300.mp4" style="background-image:url('https://picsum.photos/id/1024/400/300')"><span></span></button>
        <button class="media-btn" data-video="https://archive.org/download/apple-september-2017-key-note-at-the-steve-jobs-theater-full-1080p-720p-30fps-h-264-128kbit-aac/Apple%20September%2C%202017%20Key%20Note%20at%20the%20Steve%20Jobs%20Theater%20Full%2C%201080p%20%28720p_30fps_H264-128kbit_AAC%29.mp4" style="background-image:url('https://picsum.photos/id/1039/400/300')"><span></span></button>
      </div>
    </div>

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

    <div class="divider"></div>

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
    clipboard: 'Paste (Ctrl+V) + drag & drop files',
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

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Plugin Options</div>

      <div class="plugin-item">
        <div class="plugin-info">
          <div class="plugin-name">Drag & Drop (Clipboard Plugin)</div>
          <div class="plugin-desc">Enable dropping files from desktop onto canvas</div>
        </div>
        <div class="toggle-switch active" data-plugin-option="clipboard-dragdrop"></div>
      </div>

      <div class="plugin-item">
        <div class="plugin-info">
          <div class="plugin-name">Video Overlay (Selection Plugin)</div>
          <div class="plugin-desc">DOM controls overlay for selected VideoNode</div>
        </div>
        <div class="toggle-switch active" data-plugin-option="selection-video-overlay"></div>
      </div>
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

        <div class="preset-card" data-preset="media-gallery">
          <div class="preset-name">🖼️ Media Gallery</div>
          <div class="preset-desc">Images + SVG + GIF</div>
        </div>
        <div class="preset-card" data-preset="video-wall">
          <div class="preset-name">🎬 Video Wall</div>
          <div class="preset-desc">Remote videos + placeholders</div>
        </div>
        <div class="preset-card" data-preset="svg-stickers">
          <div class="preset-name">✨ SVG Stickers</div>
          <div class="preset-desc">Sharp vector assets</div>
        </div>
        <div class="preset-card" data-preset="mixed-media-board">
          <div class="preset-name">🎭 Mixed Media</div>
          <div class="preset-desc">SVG + Image + GIF + Video</div>
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

  const applyToMultiSelected = (apply: (konvaNode: any) => void) => {
    const selected = Array.isArray(state.selectedNodes) ? state.selectedNodes : [];
    if (selected.length <= 1) return false;
    for (const node of selected) {
      if (!node || typeof node.getKonvaNode !== 'function') continue;
      const kn = node.getKonvaNode();
      if (!kn) continue;
      apply(kn);
      if (typeof kn.getLayer === 'function') kn.getLayer()?.batchDraw();
    }
    return true;
  };

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
        x: pos.x,
        y: pos.y,
        text: 'Hello Flowscape!',
        fontSize: state.currentFontSize,
        fill: state.currentColor,
      });
    },
    frame: () => {
      const pos = getRandomPos();
      const frame = core.nodes.addFrame({
        x: pos.x,
        y: pos.y,
        width: 400,
        height: 260,
        name: 'FrameNode',
        label: 'Frame',
      });

      const contentGroup = frame.getContentGroup();

      const widgetRect = core.nodes.addShape({
        x: 40,
        y: 40,
        width: 160,
        height: 100,
        fill: '#1d4ed8',
        cornerRadius: 12,
      });
      widgetRect.getKonvaNode().moveTo(contentGroup);

      const widgetText = core.nodes.addText({
        x: 60,
        y: 80,
        text: 'Frame content',
        fontSize: 18,
        fill: '#e5e7eb',
      });
      widgetText.getKonvaNode().moveTo(contentGroup);

      const badge = core.nodes.addCircle({
        x: 320,
        y: 70,
        radius: 24,
        fill: '#22c55e',
      });
      badge.getKonvaNode().moveTo(contentGroup);
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
    const v = (e.target as HTMLInputElement).value;
    const applied = applyToMultiSelected((kn) => {
      if (typeof kn.fill === 'function') kn.fill(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('fill', v);
    });

    // If no multi-selection - treat as defaults for next nodes
    if (!applied) state.currentColor = v;
    if (fillPreview) fillPreview.style.background = v;
  });

  const strokeColor = sidebar.querySelector('#stroke-color') as HTMLInputElement;
  const strokePreview = sidebar.querySelector('#stroke-color-preview') as HTMLElement;
  strokeColor?.addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    const applied = applyToMultiSelected((kn) => {
      if (typeof kn.stroke === 'function') kn.stroke(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('stroke', v);
    });
    if (!applied) state.currentStrokeColor = v;
    if (strokePreview) strokePreview.style.background = v;
  });

  // Sliders
  const strokeWidth = sidebar.querySelector('#stroke-width') as HTMLInputElement;
  const strokeWidthValue = sidebar.querySelector('#stroke-width-value')!;
  strokeWidth?.addEventListener('input', (e) => {
    const v = parseInt((e.target as HTMLInputElement).value);
    const applied = applyToMultiSelected((kn) => {
      if (typeof kn.strokeWidth === 'function') kn.strokeWidth(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('strokeWidth', v);
    });
    if (!applied) state.currentStrokeWidth = v;
    strokeWidthValue.textContent = v.toString();
  });

  const opacity = sidebar.querySelector('#opacity') as HTMLInputElement;
  const opacityValue = sidebar.querySelector('#opacity-value')!;
  opacity?.addEventListener('input', (e) => {
    const pct = parseInt((e.target as HTMLInputElement).value);
    const v = pct / 100;
    const applied = applyToMultiSelected((kn) => {
      if (typeof kn.opacity === 'function') kn.opacity(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('opacity', v);
    });
    if (!applied) state.currentOpacity = v;
    opacityValue.textContent = `${pct}%`;
  });

  const fontSize = sidebar.querySelector('#font-size') as HTMLInputElement;
  const fontSizeValue = sidebar.querySelector('#font-size-value')!;
  fontSize?.addEventListener('input', (e) => {
    const v = parseInt((e.target as HTMLInputElement).value);
    const applied = applyToMultiSelected((kn) => {
      if (typeof kn.fontSize === 'function') kn.fontSize(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('fontSize', v);
    });
    if (!applied) state.currentFontSize = v;
    fontSizeValue.textContent = `${v}px`;
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

  const addAtRandom = () => ({
    x: Math.random() * 900 + 100,
    y: Math.random() * 500 + 100,
  });

  sidebar.querySelectorAll('[data-image]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-image');
      if (!src) return;
      const pos = addAtRandom();
      core.nodes.addImage({
        ...pos,
        width: 320,
        height: 220,
        src,
      });
    });
  });

  sidebar.querySelectorAll('[data-gif]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-gif');
      if (!src) return;
      const pos = addAtRandom();
      core.nodes.addGif({
        ...pos,
        width: 260,
        height: 200,
        src,
        autoplay: true,
        placeholder: { accentSpinnerColor: 'red' },
      });
    });
  });

  sidebar.querySelectorAll('[data-svg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-svg');
      if (!src) return;
      const pos = addAtRandom();
      core.nodes.addSvg({
        ...pos,
        width: 260,
        height: 200,
        src,
        placeholder: { accentSpinnerColor: '#58a6ff' },
      });
    });
  });

  sidebar.querySelectorAll('[data-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-video');
      if (!src) return;
      const pos = addAtRandom();
      core.nodes.addVideo({
        ...pos,
        width: 360,
        height: 220,
        src,
        autoplay: true,
        loop: true,
        muted: true,
        placeholder: { accentSpinnerColor: 'yellow' },
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
      const optionKey = toggle.getAttribute('data-plugin-option');
      if (optionKey) {
        const isActive = toggle.classList.contains('active');

        if (optionKey === 'clipboard-dragdrop') {
          const clipboard = plugins.clipboard as ContentFromClipboardPlugin | undefined;
          if (!clipboard) return;

          const currentlyEnabled = isActive;
          const nextEnabled = !currentlyEnabled;
          toggle.classList.toggle('active', nextEnabled);

          // Recreate plugin because enableDragDrop is an option handled at construction time
          const wasActive = core.plugins.list().includes(clipboard);
          if (wasActive) core.plugins.removePlugins([clipboard]);

          const next = new ContentFromClipboardPlugin({
            ignoreEditableTargets: true,
            maxImageSize: 1200,
            enableDragDrop: nextEnabled,
          });
          plugins.clipboard = next;
          if (wasActive) core.plugins.addPlugins([next]);
          return;
        }

        if (optionKey === 'selection-video-overlay') {
          const selection = plugins.selection as SelectionPlugin | undefined;
          if (!selection || typeof selection.setOptions !== 'function') return;

          const currentlyEnabled = isActive;
          const nextEnabled = !currentlyEnabled;
          toggle.classList.toggle('active', nextEnabled);

          // Recreate SelectionPlugin to ensure overlay addon is really attached/detached
          const wasActive = core.plugins.list().includes(selection);
          if (wasActive) core.plugins.removePlugins([selection]);

          const next = new SelectionPlugin(
            nextEnabled
              ? {
                  enableVideoOverlay: {
                    uiAccentColor: '#ff8a00',
                    uiTrackFilledColor: '#ff8a00',
                    uiBackgroundColor: 'rgba(18,18,18,0.92)',
                  },
                }
              : {},
          );
          plugins.selection = next;
          if (wasActive) core.plugins.addPlugins([next]);
          return;
        }
      }

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

    'media-gallery': () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      core.nodes.addText({ x: 60, y: 40, text: 'Media Gallery', fontSize: 32, fill: '#e6edf3' });

      // Public URLs (no local assets)
      const img1 = 'https://picsum.photos/id/1069/640/420';
      const img2 = 'https://picsum.photos/id/1025/640/420';
      const svg1 = 'https://konvajs.org/assets/tiger.svg';
      const gif1 = 'https://konvajs.org/assets/yoda.gif';

      core.nodes.addImage({ x: 60, y: 100, width: 360, height: 240, src: img1 });
      core.nodes.addImage({ x: 450, y: 100, width: 360, height: 240, src: img2 });
      core.nodes.addSvg({
        x: 840,
        y: 100,
        width: 240,
        height: 240,
        src: svg1,
        placeholder: { accentSpinnerColor: '#58a6ff' },
      });
      core.nodes.addGif({
        x: 60,
        y: 380,
        width: 320,
        height: 240,
        src: gif1,
        autoplay: true,
        placeholder: { accentSpinnerColor: 'red' },
      });
    },

    'video-wall': () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      core.nodes.addText({ x: 60, y: 40, text: 'Video Wall', fontSize: 32, fill: '#e6edf3' });

      const video1 =
        'https://archive.org/download/apple-september-2017-key-note-at-the-steve-jobs-theater-full-1080p-720p-30fps-h-264-128kbit-aac/Apple%20September%2C%202017%20Key%20Note%20at%20the%20Steve%20Jobs%20Theater%20Full%2C%201080p%20%28720p_30fps_H264-128kbit_AAC%29.mp4';
      const video2 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

      core.nodes.addVideo({
        x: 60,
        y: 100,
        width: 480,
        height: 270,
        src: video1,
        autoplay: true,
        loop: true,
        muted: true,
        placeholder: { accentSpinnerColor: 'yellow' },
      });

      core.nodes.addVideo({
        x: 580,
        y: 100,
        width: 480,
        height: 270,
        src: video2,
        autoplay: true,
        loop: true,
        muted: true,
        placeholder: { accentSpinnerColor: '#58a6ff' },
      });
    },

    'svg-stickers': () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      core.nodes.addText({ x: 60, y: 40, text: 'SVG Stickers', fontSize: 32, fill: '#e6edf3' });

      const svgs = [
        'https://konvajs.org/assets/tiger.svg',
        'https://upload.wikimedia.org/wikipedia/commons/3/36/Logo.min.svg',
        'https://upload.wikimedia.org/wikipedia/commons/6/6b/Bitmap_VS_SVG.svg',
      ];

      svgs.forEach((src, i) => {
        core.nodes.addSvg({
          x: 60 + i * 360,
          y: 120,
          width: 300,
          height: 220,
          src,
          placeholder: { accentSpinnerColor: '#58a6ff' },
        });
      });
    },

    'mixed-media-board': () => {
      const allNodes = core.nodes.list();
      allNodes.forEach((node) => core.nodes.remove(node));

      core.nodes.addText({
        x: 60,
        y: 40,
        text: 'Mixed Media Board',
        fontSize: 32,
        fill: '#e6edf3',
      });

      const img = 'https://picsum.photos/id/1084/900/600';
      const gif = 'https://konvajs.org/assets/yoda.gif';
      const svg = 'https://konvajs.org/assets/tiger.svg';
      const video = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

      core.nodes.addImage({ x: 60, y: 100, width: 520, height: 340, src: img });
      core.nodes.addSvg({ x: 610, y: 100, width: 260, height: 260, src: svg });
      core.nodes.addGif({
        x: 900,
        y: 100,
        width: 220,
        height: 220,
        src: gif,
        autoplay: true,
        placeholder: { accentSpinnerColor: 'red' },
      });
      core.nodes.addVideo({
        x: 610,
        y: 380,
        width: 510,
        height: 290,
        src: video,
        autoplay: true,
        loop: true,
        muted: true,
        placeholder: { accentSpinnerColor: 'yellow' },
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

  const content = propertyPanel.querySelector('#property-content') as HTMLElement | null;
  if (!content) return;

  content.innerHTML = `
    <div class="section" style="margin-bottom: 12px;">
      <div class="section-title">Selection</div>
      <div style="font-size: 12px; color: #8b949e; line-height: 1.4;">
        Selected: <span id="pp-selected-count" style="color:#58a6ff; font-weight:600;">0</span>
      </div>
    </div>

    <div class="section" style="margin-bottom: 12px;">
      <div class="section-title">Appearance</div>

      <div class="input-group">
        <label class="input-label">Fill</label>
        <div class="color-picker-wrapper">
          <div class="color-preview" id="pp-fill-preview" style="background: #3b82f6"></div>
          <input type="color" class="input-field" id="pp-fill" value="#3b82f6">
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">Stroke</label>
        <div class="color-picker-wrapper">
          <div class="color-preview" id="pp-stroke-preview" style="background: #1e40af"></div>
          <input type="color" class="input-field" id="pp-stroke" value="#1e40af">
        </div>
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Stroke Width</span>
          <span class="slider-value" id="pp-stroke-width-value">2</span>
        </div>
        <input type="range" class="slider" id="pp-stroke-width" min="0" max="20" value="2">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Opacity</span>
          <span class="slider-value" id="pp-opacity-value">100%</span>
        </div>
        <input type="range" class="slider" id="pp-opacity" min="0" max="100" value="100">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">Font Size (Text)</span>
          <span class="slider-value" id="pp-font-size-value">24px</span>
        </div>
        <input type="range" class="slider" id="pp-font-size" min="12" max="120" value="24">
      </div>
    </div>
  `;

  const applyToSelected = (apply: (konvaNode: any) => void) => {
    const selected = Array.isArray(state.selectedNodes) ? state.selectedNodes : [];
    if (selected.length !== 1) return;
    const node = selected[0];
    if (!node || typeof node.getKonvaNode !== 'function') return;
    const kn = node.getKonvaNode();
    if (!kn) return;
    apply(kn);
    if (typeof kn.getLayer === 'function') kn.getLayer()?.batchDraw();
  };

  const fillInput = propertyPanel.querySelector('#pp-fill') as HTMLInputElement | null;
  const fillPreview = propertyPanel.querySelector('#pp-fill-preview') as HTMLElement | null;
  fillInput?.addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    if (fillPreview) fillPreview.style.background = v;
    applyToSelected((kn) => {
      if (typeof kn.fill === 'function') kn.fill(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('fill', v);
    });
  });

  const strokeInput = propertyPanel.querySelector('#pp-stroke') as HTMLInputElement | null;
  const strokePreview = propertyPanel.querySelector('#pp-stroke-preview') as HTMLElement | null;
  strokeInput?.addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    if (strokePreview) strokePreview.style.background = v;
    applyToSelected((kn) => {
      if (typeof kn.stroke === 'function') kn.stroke(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('stroke', v);
    });
  });

  const strokeWidthInput = propertyPanel.querySelector(
    '#pp-stroke-width',
  ) as HTMLInputElement | null;
  const strokeWidthValue = propertyPanel.querySelector(
    '#pp-stroke-width-value',
  ) as HTMLElement | null;
  strokeWidthInput?.addEventListener('input', (e) => {
    const v = Number.parseInt((e.target as HTMLInputElement).value);
    if (strokeWidthValue) strokeWidthValue.textContent = v.toString();
    applyToSelected((kn) => {
      if (typeof kn.strokeWidth === 'function') kn.strokeWidth(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('strokeWidth', v);
    });
  });

  const opacityInput = propertyPanel.querySelector('#pp-opacity') as HTMLInputElement | null;
  const opacityValue = propertyPanel.querySelector('#pp-opacity-value') as HTMLElement | null;
  opacityInput?.addEventListener('input', (e) => {
    const pct = Number.parseInt((e.target as HTMLInputElement).value);
    if (opacityValue) opacityValue.textContent = `${pct}%`;
    const v = Math.max(0, Math.min(1, pct / 100));
    applyToSelected((kn) => {
      if (typeof kn.opacity === 'function') kn.opacity(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('opacity', v);
    });
  });

  const fontSizeInput = propertyPanel.querySelector('#pp-font-size') as HTMLInputElement | null;
  const fontSizeValue = propertyPanel.querySelector('#pp-font-size-value') as HTMLElement | null;
  fontSizeInput?.addEventListener('input', (e) => {
    const v = Number.parseInt((e.target as HTMLInputElement).value);
    if (fontSizeValue) fontSizeValue.textContent = `${v}px`;
    applyToSelected((kn) => {
      if (typeof kn.fontSize === 'function') kn.fontSize(v);
      else if (typeof kn.setAttr === 'function') kn.setAttr('fontSize', v);
    });
  });

  const syncFromFirstSelected = () => {
    const selected = Array.isArray(state.selectedNodes) ? state.selectedNodes : [];
    const first = selected[0];
    const count = selected.length;

    const cntEl = propertyPanel.querySelector('#pp-selected-count');
    if (cntEl) cntEl.textContent = count.toString();

    // This panel is meant for single-node editing only
    if (count !== 1) return;

    if (!first || typeof first.getKonvaNode !== 'function') return;
    const kn: any = first.getKonvaNode();
    if (!kn) return;

    const fill = typeof kn.fill === 'function' ? kn.fill() : kn.getAttr?.('fill');
    const stroke = typeof kn.stroke === 'function' ? kn.stroke() : kn.getAttr?.('stroke');
    const sw =
      typeof kn.strokeWidth === 'function'
        ? kn.strokeWidth()
        : (kn.getAttr?.('strokeWidth') as number | undefined);
    const op = typeof kn.opacity === 'function' ? kn.opacity() : kn.getAttr?.('opacity');
    const fs =
      typeof kn.fontSize === 'function'
        ? kn.fontSize()
        : (kn.getAttr?.('fontSize') as number | undefined);

    if (fillInput && typeof fill === 'string' && fill.startsWith('#')) {
      fillInput.value = fill;
      if (fillPreview) fillPreview.style.background = fill;
    }
    if (strokeInput && typeof stroke === 'string' && stroke.startsWith('#')) {
      strokeInput.value = stroke;
      if (strokePreview) strokePreview.style.background = stroke;
    }
    if (strokeWidthInput && Number.isFinite(sw)) {
      strokeWidthInput.value = String(sw);
      if (strokeWidthValue) strokeWidthValue.textContent = String(sw);
    }
    if (opacityInput && typeof op === 'number' && Number.isFinite(op)) {
      const pct = Math.round(op * 100);
      opacityInput.value = String(pct);
      if (opacityValue) opacityValue.textContent = `${pct}%`;
    }
    if (fontSizeInput && Number.isFinite(fs)) {
      fontSizeInput.value = String(fs);
      if (fontSizeValue) fontSizeValue.textContent = `${fs}px`;
    }
  };

  (state as any)._syncPropertyPanel = syncFromFirstSelected;
}

function setupQuickActions(
  quickActions: HTMLElement,
  core: CoreEngine,
  toggleSidebar: () => void,
  syncSidebarToggleUi: () => void,
) {
  // quickActions.innerHTML = `
  //   <button class="btn tooltip panel-toggle" id="panel-toggle" type="button" data-tooltip="Show Panel">
  //     ☰ Panel
  //   </button>
  //   <button class="btn tooltip" data-action="export" data-tooltip="Export as PNG">
  //     📸 Export
  //   </button>
  //   <button class="btn tooltip" data-action="fullscreen" data-tooltip="Toggle Fullscreen">
  //     ⛶ Fullscreen
  //   </button>
  // `;

  quickActions.innerHTML = `
    <button class="btn tooltip" data-action="export" data-tooltip="Export as PNG">
      📸 Export
    </button>
    <button class="btn tooltip" data-action="fullscreen" data-tooltip="Toggle Fullscreen">
      ⛶ Fullscreen
    </button>
  `;

  const panelToggleBtn = quickActions.querySelector('#panel-toggle') as HTMLButtonElement | null;
  if (panelToggleBtn) {
    panelToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar();
    });
    syncSidebarToggleUi();
  }

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
  const updateSelectedUi = () => {
    const selected = Array.isArray(state.selectedNodes) ? state.selectedNodes : [];
    const count = selected.length;
    const selectedCountEl = document.querySelector('#selected-count');
    if (selectedCountEl) selectedCountEl.textContent = count.toString();

    // Properties panel should appear only for single-node selection
    if (count === 1) propertyPanel.classList.add('visible');
    else propertyPanel.classList.remove('visible');

    const sync = (state as any)._syncPropertyPanel as (() => void) | undefined;
    sync?.();
  };

  core.eventBus.on('node:selected', (node: any) => {
    state.selectedNodes = [node];
    updateSelectedUi();
  });

  core.eventBus.on('selection:multi:created', (nodes: any[]) => {
    state.selectedNodes = Array.isArray(nodes) ? nodes : [];
    updateSelectedUi();
  });

  core.eventBus.on('selection:multi:destroyed', () => {
    // Multi-selection was destroyed (e.g. user clicked away) -> clear UI.
    // If SelectionPlugin selects a single node afterwards, it will emit node:selected.
    state.selectedNodes = [];
    updateSelectedUi();
  });

  core.eventBus.on('node:deselected', () => {
    state.selectedNodes = [];
    updateSelectedUi();
  });

  core.eventBus.on('selection:cleared', () => {
    state.selectedNodes = [];
    updateSelectedUi();
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
