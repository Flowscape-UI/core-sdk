<div align="center">

# Flowscape

**A developer-first 2D engine for building infinite canvas editors, design tools, and visual builders.**

`@flowscape-ui/core-sdk`

[![npm version](https://img.shields.io/npm/v/@flowscape-ui/core-sdk)](https://www.npmjs.com/package/@flowscape-ui/core-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@flowscape-ui/core-sdk)](https://bundlephobia.com/package/@flowscape-ui/core-sdk)
[![X](https://img.shields.io/badge/X-@FlowscapeUI-000000?logo=x&logoColor=white)](https://x.com/FlowscapeUI)

[![Documentation](https://img.shields.io/badge/Documentation-FF4785?style=for-the-badge)](https://flowscape-ui.github.io/docs/)
[![npm](https://img.shields.io/badge/npm-@flowscape--ui/core--sdk-CB3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@flowscape-ui/core-sdk)
[![Changelog](https://img.shields.io/badge/Changelog-181717?style=for-the-badge&logo=github)](./CHANGELOG.md)

</div>

---

## What is Flowscape?

Flowscape is a framework-agnostic 2D engine for building complex editor-like products.

It provides the engine layer between low-level rendering libraries and full applications, giving developers a structured foundation for scenes, nodes, transforms, rendering, interaction systems, overlays, and infinite canvas workflows.

Flowscape is designed for products such as:

- Figma-like design tools
- Infinite canvas applications
- Whiteboards and diagram editors
- Visual and page builders
- Node-based editors
- CAD-like 2D interfaces
- Internal graphical editor tools

It is not a UI framework and it does not dictate how your application should look.

You own the product.

Flowscape provides the engine underneath it.

---

## Features

- **Scene-based architecture** with dedicated `Background`, `World`, `Overlay`, and `UI` layers
- **Node system** with transforms, hierarchy, bounds, hit testing, and grouping
- **Infinite canvas foundations** including camera movement, pan, and zoom
- **Renderer abstraction** designed to evolve independently from application logic
- **Input controllers** for editor-style interactions
- **Overlay architecture** for selection, handles, and transformation tools
- **TypeScript-first API**
- **Framework-agnostic**
- **ES module support** for modern applications
- **Standalone browser build** for direct usage through `<script>`

---

## Installation

Using Bun:

```bash
bun add @flowscape-ui/core-sdk
```

Using pnpm:

```bash
pnpm add @flowscape-ui/core-sdk
```

Using npm:

```bash
npm install @flowscape-ui/core-sdk
```

Using Yarn:

```bash
yarn add @flowscape-ui/core-sdk
```

---

## Usage

### ES Modules

Flowscape can be imported as a regular package in TypeScript and JavaScript applications.

```ts
import {
  Scene,
  LayerBackground,
  LayerWorld,
  LayerOverlay,
  RendererLayerBackgroundCanvas,
  RendererLayerWorldCanvas,
  RendererLayerOverlayCanvas,
  CanvasRendererHost,
  NodeRect,
} from '@flowscape-ui/core-sdk';
```

### Browser Script

Flowscape can also be used directly in the browser without a bundler.

```html
<script src="https://unpkg.com/@flowscape-ui/core-sdk/dist/flowscape.global.js"></script>

<script>
  const scene = new Flowscape.Scene(1280, 720);
</script>
```

The standalone build exposes the public API through the global `Flowscape` object.

```js
const rect = new Flowscape.NodeRect(1);
```

---

## Quick Start

Create a container:

```html
<div id="app"></div>
```

Make sure it has a visible size:

```css
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}
```

Then create a scene:

```ts
import {
  Scene,
  LayerBackground,
  LayerWorld,
  LayerOverlay,
  RendererLayerBackgroundCanvas,
  RendererLayerWorldCanvas,
  RendererLayerOverlayCanvas,
  CanvasRendererHost,
  NodeRect,
} from '@flowscape-ui/core-sdk';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Container #app not found');
}

const scene = new Scene(
  container.clientWidth,
  container.clientHeight,
);

// Create layers
const background = new LayerBackground();
const world = new LayerWorld();
const overlay = new LayerOverlay(world);

scene.addLayer(background);
scene.addLayer(world);
scene.addLayer(overlay);

// Bind renderers
scene.bindLayerRenderer(
  background,
  new RendererLayerBackgroundCanvas(),
);

scene.bindLayerRenderer(
  world,
  new RendererLayerWorldCanvas(),
);

scene.bindLayerRenderer(
  overlay,
  new RendererLayerOverlayCanvas(),
);

// Create a render host
const host = new CanvasRendererHost(container, -1);

scene.addHost(host);

// Configure the background
background.setFill('#101010');

// Add a node
const rect = new NodeRect(1);

rect.setPosition(300, 220);
rect.setSize(220, 140);
rect.setFill('#3b82f6');

world.addNode(rect);

// Render
scene.invalidate();
```

For input controllers, selection, transformations, camera controls, and more advanced editor workflows, see the documentation.

---

## Architecture

Flowscape separates scene state, rendering, and interaction logic.

```text
Scene
├── Background Layer
├── World Layer
│   └── Nodes
├── Overlay Layer
│   └── Handles / Selection / Transformations
└── UI Layer
```

The main architectural areas are:

```text
Scene
│
├── Layers
│   ├── Background
│   ├── World
│   ├── Overlay
│   └── UI
│
├── Nodes
│   ├── Rect
│   ├── Ellipse
│   ├── Polygon
│   ├── Star
│   ├── Line
│   ├── Path
│   ├── Text
│   └── Group
│
├── Renderers
│
├── Renderer Hosts
│
└── Input Controllers
```

This separation allows rendering implementations to evolve without requiring editor-level product logic to be rewritten.

---

## Philosophy

Most canvas libraries provide rendering primitives.

Flowscape aims to provide the architectural layer above those primitives.

Instead of rebuilding the same infrastructure for every graphical product, developers can start with reusable foundations for:

- scene organization
- node hierarchy
- coordinate systems
- camera behavior
- rendering
- hit testing
- selection
- transformation
- interaction systems
- editor overlays

Flowscape is closer in philosophy to an engine for building graphical applications than to a component library or ready-made editor.

---

## Repository Structure

Flowscape is developed as a Turborepo monorepo.

```text
flowscape/
├── apps/
│   ├── docs/
│   └── playground/
│
├── packages/
│   └── engine/
│
├── package.json
├── turbo.json
└── bun.lock
```

### `apps/docs`

The Flowscape documentation application.

### `apps/playground`

Interactive development environment used to test Flowscape through its public package API.

### `packages/engine`

The core Flowscape engine, published as:

```text
@flowscape-ui/core-sdk
```

---

## Development

Flowscape uses:

- Bun
- Turborepo
- TypeScript
- tsdown

Clone the repository and install dependencies:

```bash
bun install
```

Run the Playground:

```bash
bun run dev:playground
```

Run the documentation:

```bash
bun run dev:docs
```

Build the monorepo:

```bash
bun run build
```

Run type checking:

```bash
bun run typecheck
```

Run tests:

```bash
bun run test
```

More information about contributing can be found in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Public API Policy

Applications should import Flowscape exclusively through the public package API:

```ts
import {
  Scene,
  NodeRect,
} from '@flowscape-ui/core-sdk';
```

Do not import internal modules directly:

```ts
// ❌ Do not do this
import { Scene } from '@flowscape-ui/core-sdk/src/scene';
```

Internal project structure may change between releases.

Only exports available through `@flowscape-ui/core-sdk` should be considered part of the public API.

---

## Project Status

Flowscape is under active development.

The architecture and internal implementation continue to evolve as the engine expands toward more advanced rendering, interaction, and editor systems.

Public API stability is treated as a priority, but major releases may introduce intentional breaking changes when necessary for the long-term architecture of the engine.

See [`CHANGELOG.md`](./CHANGELOG.md) for release history.

---

## Documentation

- [Documentation](https://flowscape-ui.github.io/docs/)
- [npm Package](https://www.npmjs.com/package/@flowscape-ui/core-sdk)
- [GitHub Issues](https://github.com/Flowscape-UI/core-sdk/issues)
- [Changelog](./CHANGELOG.md)

---

## Contributing

Contributions, bug reports, and feature proposals are welcome.

Before contributing, please read [`CONTRIBUTING.md`](./CONTRIBUTING.md).

For bugs and feature requests, use the project's GitHub Issues.

---

## Authors

See [`AUTHORS.md`](./AUTHORS.md).

---

## Support Flowscape

Flowscape is developed as an open-source project.

If Flowscape is useful to you or your team, you can support its continued development through GitHub Sponsors.

Your support helps fund development, documentation, tooling, testing, and long-term maintenance.

[❤️ Sponsor Flowscape](https://buymeacoffee.com/flowscape)

## License

Flowscape is released under the [MIT License](./LICENSE).

© Flowscape UI Team