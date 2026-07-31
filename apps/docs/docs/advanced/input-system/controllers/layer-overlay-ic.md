---
sidebar_position: 3
title: Layer Overlay IC
sidebar_label: Layer Overlay IC
description: "Built-in overlay input controller in Flowscape: interaction handles, ownership, and overlay tools."
---

## Layer Overlay IC

`LayerOverlayInputController` handles overlay tooling interaction:

- selection controls
- transform handles
- interaction overlays synchronized with world camera

## Typical setup

```ts
import { LayerOverlayInputController } from "@flowscape-ui/core-sdk";

let overlayInteractionOwner: string | null = null;
const overlayController = new LayerOverlayInputController();

scene.inputManager.add(layerOverlay, overlayController, {
	stage: host.getRenderNode(),
	world: layerWorld,
	overlay: layerOverlay,
	emitChange: () => scene.invalidate(),
	getInteractionOwner: () => overlayInteractionOwner,
	tryBeginInteraction: (ownerId: string) => {
		if (overlayInteractionOwner !== null) {
			return overlayInteractionOwner === ownerId;
		}
		overlayInteractionOwner = ownerId;
		return true;
	},
	endInteraction: (ownerId: string) => {
		if (overlayInteractionOwner === ownerId) {
			overlayInteractionOwner = null;
		}
	},
});
```

## Why ownership exists

Overlay tools can compete for pointer control.

Ownership callbacks guarantee that one tool owns interaction at a time.

## `OverlayInputOptions` API

`OverlayInputOptions` currently exists as an empty type:

```ts
export type OverlayInputOptions = {};
```

This keeps the API symmetrical with world controller options and allows non-breaking expansion later.

## Practical notes

- Keep `ownerId` stable for each tool.
- Always release ownership in `endInteraction(...)`.
- Call `emitChange()` after overlay state mutations.

## Next

- [Custom Controller](./custom-controller)
