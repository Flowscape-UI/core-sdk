<div align="center">

# 🎨 @flowscape-ui/core-sdk

**A scene-based 2D engine for building interactive editor products on infinite canvas**

[![Version](https://img.shields.io/badge/version-2.0.0-0ea5e9.svg)](https://www.npmjs.com/package/@flowscape-ui/core-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@flowscape-ui/core-sdk)](https://bundlephobia.com/package/@flowscape-ui/core-sdk)
[![X (Twitter)](https://img.shields.io/badge/X-@FlowscapeUI-000000?logo=x&logoColor=white)](https://x.com/FlowscapeUI)

[![Documentation](https://img.shields.io/badge/📚_Documentation-FF4785?style=for-the-badge)](https://flowscape-ui.github.io/docs/)
[![Interactive Demo](https://img.shields.io/badge/🎮_Interactive_Demo-FF4785?style=for-the-badge&logo=storybook&logoColor=white)](https://flowscape-ui.github.io/core-sdk/?path=/story/interactive-playground--interactive-playground)
[![Changelog](https://img.shields.io/badge/📝_Changelog-FF4785?style=for-the-badge)](./CHANGELOG.md)

<img 
  src="./assets/readme/preview.gif" 
  alt="Flowscape Canvas Demo" 
  width="900"
/>

</div>

---

## What is Flowscape?

Flowscape is a 2D engine for building products like whiteboards, visual builders, diagram tools, and design editors.  
It is not a UI framework and not a template SDK.  
It gives you a structured scene, nodes, camera, and rendering pipeline so you can build your own editor architecture.

## Why use it?

- Scene architecture with 4 layers: `Background`, `World`, `Overlay`, `UI`
- Node-based model with transforms, hierarchy, bounds (`OBB`, `AABB`), hit testing
- Built-in pan/zoom input controllers for editor-like interactions
- TypeScript-first API
- Renderer architecture that can evolve without rewriting product logic
- Works in browser apps and can be used inside desktop/mobile stacks via web technologies

## 📦 Installation

```bash
npm install @flowscape-ui/core-sdk
# or
pnpm add @flowscape-ui/core-sdk
# or
yarn add @flowscape-ui/core-sdk
# or
bun add @flowscape-ui/core-sdk
```

## 🚀 Quick Start

```ts
import {
  Scene,
  LayerBackground,
  LayerWorld,
  LayerOverlay,
  NodeRect,
  RendererLayerBackgroundCanvas,
  RendererLayerWorldCanvas,
  RendererLayerOverlayCanvas,
  CanvasRendererHost,
  LayerWorldInputController,
  LayerOverlayInputController,
} from '@flowscape-ui/core-sdk';

const container = document.getElementById('app');
if (!container) throw new Error('Container #app not found');

const scene = new Scene(container.clientWidth, container.clientHeight);

// Layers
const layerBackground = new LayerBackground();
const layerWorld = new LayerWorld();
const layerOverlay = new LayerOverlay(layerWorld);

scene.addLayer(layerBackground);
scene.addLayer(layerWorld);
scene.addLayer(layerOverlay);

layerBackground.setFill('#101010');

// Layer renderers
scene.bindLayerRenderer(layerBackground, new RendererLayerBackgroundCanvas());
scene.bindLayerRenderer(layerWorld, new RendererLayerWorldCanvas());
scene.bindLayerRenderer(layerOverlay, new RendererLayerOverlayCanvas());

// Render host
const host = new CanvasRendererHost(container, -1);
scene.addHost(host);

// Input controller (pan/zoom)
scene.inputManager.add(layerWorld, new LayerWorldInputController(), {
  stage: host.getRenderNode(),
  world: layerWorld,
  options: {
    enabled: true,
    panMode: 'right',
    zoomEnabled: true,
    zoomFactor: 1.08,
    preventWheelDefault: false,
    keyboardPanSpeed: 900,
    keyboardPanShiftMultiplier: 1.5,
  },
  emitChange: () => scene.invalidate(),
});

// Input controller (overlay hover/select/transform)
let interactionOwner: string | null = null;

scene.inputManager.add(layerOverlay, new LayerOverlayInputController(), {
  stage: host.getRenderNode(),
  world: layerWorld,
  overlay: layerOverlay,
  emitChange: () => scene.invalidate(),
  getInteractionOwner: () => interactionOwner,
  tryBeginInteraction: (ownerId: string) => {
    if (interactionOwner !== null && interactionOwner !== ownerId) {
      return false;
    }

    interactionOwner = ownerId;
    return true;
  },
  endInteraction: (ownerId: string) => {
    if (interactionOwner === ownerId) {
      interactionOwner = null;
    }
  },
});

// Add a node
const rect = new NodeRect(1);
rect.setPosition(300, 220);
rect.setSize(220, 140);
rect.setFill('#2f7cf6');
layerWorld.addNode(rect);

scene.invalidate();
```

## 🔒 Public API Policy

- Import only from `@flowscape-ui/core-sdk`
- Do not import internals from `src/...`
- Internal files can change between releases

## 📚 Links

- Documentation: [flowscape-ui.github.io/docs/](https://flowscape-ui.github.io/docs/)
- Interactive demo: https://flowscape-ui.github.io/core-sdk/?path=/story/interactive-playground--interactive-playground
- GitHub Issues: https://github.com/Flowscape-UI/core-sdk/issues
- Changelog: `./CHANGELOG.md`

## 📄 License

MIT © Flowscape UI Team
