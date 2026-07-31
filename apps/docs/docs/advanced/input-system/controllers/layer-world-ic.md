---
sidebar_position: 2
title: Layer World IC
sidebar_label: Layer World IC
description: "Built-in world input controller in Flowscape: pan, zoom, keyboard navigation, and world interaction."
---

## Layer World IC

`LayerWorldInputController` is the built-in controller for world-space navigation.

It handles camera interactions like pan and zoom using stage and world context.

## Typical setup

```ts
import { LayerWorldInputController } from "@flowscape-ui/core-sdk";

const worldController = new LayerWorldInputController();

scene.inputManager.add(layerWorld, worldController, {
	stage: host.getRenderNode(),
	world: layerWorld,
	options: {
		enabled: true,
		panMode: "right",
		zoomEnabled: true,
		zoomFactor: 1.08,
		preventWheelDefault: true,
		keyboardPanSpeed: 900,
		keyboardPanShiftMultiplier: 1.5,
	},
	emitChange: () => scene.invalidate(),
});
```

## Context fields

- `stage`: render stage node for screen-space references
- `world`: world layer (camera + content)
- `options`: pan/zoom/keyboard behavior
- `emitChange`: redraw callback

## `WorldInputOptions` API

| Option                       | Type                                           | Description                                         |
| ---------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `enabled`                    | `boolean`                                      | Enables/disables world input handling.              |
| `panMode`                    | `"middle" \| "right" \| "spaceLeft" \| "left"` | Pan activation mode.                                |
| `zoomEnabled`                | `boolean`                                      | Enables zoom logic (for example Ctrl + wheel).      |
| `zoomFactor`                 | `number`                                       | Zoom factor step.                                   |
| `preventWheelDefault`        | `boolean`                                      | Prevents browser default wheel behavior over stage. |
| `keyboardPanSpeed`           | `number`                                       | Arrow-key pan speed in pixels per second.           |
| `keyboardPanShiftMultiplier` | `number`                                       | Shift multiplier for keyboard pan speed.            |

## Practical notes

- Keep `zoomFactor` stable for predictable UX.
- Use `preventWheelDefault: true` when canvas should own wheel input.
- Route camera changes through `emitChange()` so redraw is explicit.

## Next

- [Layer Overlay IC](./layer-overlay-ic)
