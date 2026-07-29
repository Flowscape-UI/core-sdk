---
sidebar_position: 1
---

# Flowscape Intro

## What is Flowscape

Flowscape is a framework-agnostic 2D engine for editor-style products.  
It integrates into whiteboards, visual builders, diagram tools, and custom internal canvas workflows.  
Its goal is to give teams a solid scene and interaction foundation, so they can ship product logic instead of rebuilding canvas basics.

## The idea

- Keep the engine focused on editor primitives: scene, camera, world, overlay, and input.
- Separate rendering and interaction layers so each concern can evolve without breaking the rest.
- Support predictable pan/zoom and node lifecycle behavior from day one.
- Stay TypeScript-first to make integrations safer in large codebases.

## Quick example

```ts
import {
  Scene,
  LayerBackground,
  LayerWorld,
  LayerOverlay,
  LayerUI,
  NodeRect,
  RendererLayerBackgroundCanvas,
  RendererLayerWorldCanvas,
  RendererLayerOverlayCanvas,
  RendererLayerUI,
  CanvasRendererHost,
  LayerWorldInputController,
  LayerOverlayInputController,
} from '@flowscape-ui/core-sdk';

export function createFlowscape(container: HTMLDivElement) {
  const scene = new Scene(container.clientWidth, container.clientHeight);
  const layerBackground = new LayerBackground();
  const layerWorld = new LayerWorld();
  const layerOverlay = new LayerOverlay(layerWorld);
  const layerUI = new LayerUI(layerWorld);

  scene.addLayer(layerBackground);
  scene.addLayer(layerWorld);
  scene.addLayer(layerOverlay);
  scene.addLayer(layerUI);

  const backgroundRenderer = new RendererLayerBackgroundCanvas();
  scene.bindLayerRenderer(layerBackground, backgroundRenderer);

  const worldRenderer = new RendererLayerWorldCanvas();
  scene.bindLayerRenderer(layerWorld, worldRenderer);

  const overlayRenderer = new RendererLayerOverlayCanvas();
  scene.bindLayerRenderer(layerOverlay, overlayRenderer);

  const uiRenderer = new RendererLayerUI(container);
  scene.bindLayerRenderer(layerUI, uiRenderer);

  const host = new CanvasRendererHost(container, -1);
  scene.addHost(host);

  const worldInputController = new LayerWorldInputController();
  scene.inputManager.add(layerWorld, worldInputController, {
    stage: host.getRenderNode(),
    world: layerWorld,
    options: {
      enabled: true,
      panMode: 'right',
      zoomEnabled: true,
      zoomFactor: 1.08,
      preventWheelDefault: true,
      keyboardPanSpeed: 900,
      keyboardPanShiftMultiplier: 1.5,
    },
    emitChange: () => scene.invalidate(),
  });

  let overlayInteractionOwner: string | null = null;
  const overlayInputController = new LayerOverlayInputController();
  scene.inputManager.add(layerOverlay, overlayInputController, {
    stage: host.getRenderNode(),
    world: layerWorld,
    overlay: layerOverlay,
    emitChange: () => scene.invalidate(),
    getInteractionOwner: () => overlayInteractionOwner,
    tryBeginInteraction: (ownerId: string) => {
      if (overlayInteractionOwner !== null) return overlayInteractionOwner === ownerId;
      overlayInteractionOwner = ownerId;
      return true;
    },
    endInteraction: (ownerId: string) => {
      if (overlayInteractionOwner === ownerId) overlayInteractionOwner = null;
    },
  });

  layerBackground.setFill('#101010');

  const node = new NodeRect(1);
  node.setSize(220, 140);
  node.setPosition(0, 0);
  layerWorld.addNode(node);

  scene.invalidate();

  const resizeObserver = new ResizeObserver(() => {
    scene.setSize(container.clientWidth, container.clientHeight);
    scene.invalidate();
  });
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    scene.inputManager.remove(worldInputController.id);
    scene.inputManager.remove(overlayInputController.id);
    scene.removeHost(-1);
  };
}
```

## Install Flowscape

```bash
npm install @flowscape-ui/core-sdk
# or
pnpm add @flowscape-ui/core-sdk
# or
yarn add @flowscape-ui/core-sdk
# or
bun add @flowscape-ui/core-sdk
```

## Why Flowscape

- Editor-first architecture instead of generic drawing-only abstractions.
- Flexible layer model for background, world, overlay, and UI concerns.
- Predictable camera and input behavior for pan/zoom-heavy products.
- TypeScript-first surface for safer integrations and refactors.
- Extensible foundation you can evolve with product requirements.

## What you can build

- Whiteboards for real-time collaboration.
- Visual builders for pages, flows, and dashboards.
- Diagram and node-graph tools.
- Design editors for product teams.
- Internal canvas tools for operations or analytics.
- Dataflow and workflow canvas applications.
- Charts.

