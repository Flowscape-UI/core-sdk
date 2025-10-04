<div align="center">

# 🎨 @flowscape-ui/core-sdk

**Powerful 2D canvas engine built on Konva**

[![npm version](https://img.shields.io/npm/v/@flowscape-ui/core-sdk.svg)](https://www.npmjs.com/package/@flowscape-ui/core-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/flowscape)
[Documentation](https://github.com/Flowscape-UI/core-sdk#readme) • [Examples](https://github.com/Flowscape-UI/core-sdk/tree/main/playground) • [Changelog](./CHANGELOG.md)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@flowscape-ui/core-sdk)](https://bundlephobia.com/package/@flowscape-ui/core-sdk)

</div>

---

## ✨ Features

- 🎯 **Framework-agnostic** — works with React, Vue, Svelte, Angular or vanilla JS
- 🧩 **Plugin system** — extensible architecture with ready-to-use plugins
- 📐 **Complete toolset** — grid, rulers, guides, area selection
- ⌨️ **Hotkeys** — Ctrl+C/V/X, Delete, Ctrl+G for grouping
- 🎨 **Rich shapes** — rectangles, circles, text, images, arrows, stars
- 🔄 **Transformations** — rotation, scaling, movement with aspect ratio lock
- 📦 **TypeScript-first** — full typing out of the box
- 🚀 **Optimized** — tree-shaking, ESM + CJS, source maps

## 📦 Installation

```bash
npm install @flowscape-ui/core-sdk
# or
yarn add @flowscape-ui/core-sdk
# or
bun add @flowscape-ui/core-sdk
```

## 🚀 Quick Start

```typescript
import { CoreEngine, GridPlugin, SelectionPlugin, NodeHotkeysPlugin } from '@flowscape-ui/core-sdk';

// Create engine with plugins
const core = new CoreEngine({
  container: document.getElementById('canvas-container')!,
  width: 1200,
  height: 800,
  plugins: [
    new GridPlugin({ enabled: true }),
    new SelectionPlugin({ dragEnabled: true }),
    new NodeHotkeysPlugin(), // Ctrl+C/V/X, Delete
  ],
});

// Add shapes
const rect = core.nodes.addShape({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#3b82f6',
  cornerRadius: 8,
});

const text = core.nodes.addText({
  x: 120,
  y: 140,
  text: 'Hello Flowscape!',
  fontSize: 24,
  fill: 'white',
});

// Grouping
const group = core.nodes.addGroup({
  x: 400,
  y: 200,
});
rect.getNode().moveTo(group.getNode());
text.getNode().moveTo(group.getNode());
```

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────┐
│         CoreEngine                  │
│  ┌──────────────────────────────┐   │
│  │     Plugin System            │   │
│  │  - GridPlugin                │   │
│  │  - SelectionPlugin           │   │
│  │  - RulerPlugin               │   │
│  │  - NodeHotkeysPlugin         │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │     Node Manager             │   │
│  │  - ShapeNode                 │   │
│  │  - TextNode                  │   │
│  │  - ImageNode                 │   │
│  │  - GroupNode                 │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │     Camera Manager           │   │
│  │  - Zoom (Ctrl+Wheel)         │   │
│  │  - Pan (Space+Drag)          │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Plugin System

Plugins extend engine functionality without modifying the core:

```typescript
import { Plugin } from '@flowscape-ui/core-sdk';

class CustomPlugin extends Plugin {
  protected onAttach(core: CoreEngine): void {
    // Initialize on attach
    core.eventBus.on('node:created', (node) => {
      console.log('Node created:', node);
    });
  }

  protected onDetach(core: CoreEngine): void {
    // Cleanup on detach
    core.eventBus.off('node:created');
  }
}

// Usage
const core = new CoreEngine({
  container: element,
  plugins: [new CustomPlugin()],
});
```

### Built-in Plugins

| Plugin                 | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `GridPlugin`           | Adaptive grid with automatic scaling             |
| `SelectionPlugin`      | Selection, transformation, drag & drop, grouping |
| `NodeHotkeysPlugin`    | Copy/paste/cut nodes, delete, z-index management |
| `CameraHotkeysPlugin`  | Zoom and pan controls with keyboard              |
| `RulerPlugin`          | Rulers with measurement units                    |
| `RulerGuidesPlugin`    | Draggable guide lines from rulers                |
| `RulerHighlightPlugin` | Ruler highlighting on hover                      |
| `RulerManagerPlugin`   | Toggle rulers and manage guides                  |
| `AreaSelectionPlugin`  | Area selection with frame (Shift+Drag)           |
| `LogoPlugin`           | Watermark/logo on canvas                         |

### ⌨️ Keyboard Shortcuts

#### Node Operations (NodeHotkeysPlugin)

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Ctrl+C`               | Copy selected nodes      |
| `Ctrl+X`               | Cut selected nodes       |
| `Ctrl+V`               | Paste nodes              |
| `Delete` / `Backspace` | Delete selected nodes    |
| `Ctrl+]`               | Move node up (z-index)   |
| `Ctrl+[`               | Move node down (z-index) |

#### Grouping (SelectionPlugin)

| Shortcut       | Action                            |
| -------------- | --------------------------------- |
| `Ctrl+G`       | Group selected nodes              |
| `Ctrl+Shift+G` | Ungroup selected group            |
| `Shift+Click`  | Add/remove node to/from selection |
| `Shift`        | Lock aspect ratio during resize   |

#### Camera Controls (CameraHotkeysPlugin)

| Shortcut            | Action             |
| ------------------- | ------------------ |
| `Ctrl+Wheel`        | Zoom in/out        |
| `+` / `=`           | Zoom in            |
| `-`                 | Zoom out           |
| `Arrow Keys`        | Pan camera         |
| `Space+Drag`        | Pan camera (mouse) |
| `Middle Mouse+Drag` | Pan camera         |
| `Right Mouse+Drag`  | Pan camera         |

#### Ruler Controls (RulerManagerPlugin)

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Shift+R`              | Toggle rulers visibility |
| `Delete` / `Backspace` | Delete active guide      |
| `Drag from ruler`      | Create guide line        |

## 📚 Usage Examples

### Creating Shapes

```typescript
// Rectangle with rounded corners
const rect = core.nodes.addShape({
  x: 50,
  y: 50,
  width: 200,
  height: 100,
  fill: '#10b981',
  cornerRadius: 12,
});

// Circle
const circle = core.nodes.addCircle({
  x: 300,
  y: 100,
  radius: 50,
  fill: '#f59e0b',
  stroke: '#d97706',
  strokeWidth: 3,
});

// Text
const text = core.nodes.addText({
  x: 400,
  y: 50,
  text: 'Flowscape UI',
  fontSize: 32,
  fontFamily: 'Inter',
  fill: '#1f2937',
});

// Image
const image = core.nodes.addImage({
  x: 100,
  y: 200,
  width: 200,
  height: 150,
  src: '/path/to/image.jpg',
});
```

### Working with Events

```typescript
// Subscribe to events
core.eventBus.on('node:created', (node) => {
  console.log('Node created:', node);
});

core.eventBus.on('node:selected', (node) => {
  console.log('Node selected:', node);
});

core.eventBus.on('camera:zoom', ({ scale }) => {
  console.log('Zoom changed:', scale);
});

// Unsubscribe
const handler = (node) => console.log(node);
core.eventBus.on('node:created', handler);
core.eventBus.off('node:created', handler);
```

### Grouping and Management

```typescript
// Create group
const group = core.nodes.addGroup({ x: 0, y: 0 });

// Add nodes to group
const rect1 = core.nodes.addShape({ x: 10, y: 10, width: 50, height: 50 });
const rect2 = core.nodes.addShape({ x: 70, y: 10, width: 50, height: 50 });

rect1.getNode().moveTo(group.getNode());
rect2.getNode().moveTo(group.getNode());

// Manage z-index
rect1.getNode().moveUp(); // Move up one level
rect2.getNode().moveDown(); // Move down one level
rect1.getNode().moveToTop(); // Move to top
```

### Camera and Navigation

```typescript
// Programmatic zoom
core.camera.zoomIn(); // Zoom in
core.camera.zoomOut(); // Zoom out
core.camera.setZoom(1.5); // Set specific scale

// Panning
core.camera.pan(100, 50); // Pan by dx, dy

// Center on node
const node = core.nodes.addShape({ x: 500, y: 500, width: 100, height: 100 });
core.camera.centerOn(node);

// Reset camera
core.camera.reset();
```

## 🔧 Development

```bash
# Install dependencies
bun install

# Run playground
bun run dev

# Build library
bun run build

# Tests
bun run test          # Watch mode
bun run test:run      # Single run
bun run test:coverage # With coverage

# Linting
bun run lint          # ESLint
bun run lint:ts       # TypeScript check
bun run lint:fix      # Auto-fix
```

## 📖 Documentation

Coming soon

## 📄 License

MIT © [Flowscape UI Team](https://github.com/Flowscape-UI)

---

<div align="center">

**[⭐ Star on GitHub](https://github.com/Flowscape-UI/core-sdk)** • **[🐛 Report Bug](https://github.com/Flowscape-UI/core-sdk/issues)** • **[💡 Request Feature](https://github.com/Flowscape-UI/core-sdk/issues/new)**

</div>
