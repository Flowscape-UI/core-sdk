---
sidebar_position: 1.7
title: Camera
sidebar_label: Camera
description: "2D camera contract in Flowscape core: state, coordinate conversion, pan/zoom/rotate, and limits."
---

## Camera

`ICamera` is the world-view controller in Flowscape.

It maps world space to screen space and exposes interaction-safe controls for pan, zoom, and rotation.

## Core Types

`ICamera` works with:

- `Point`
- `CameraState`

From the usage examples, camera state includes at least:

- `x`
- `y`
- `scale`
- `rotation`

## State and Conversion API

### `getState()`

Returns the current camera snapshot.

```ts
const { x, y, scale, rotation } = camera.getState();
```

### `worldToScreen(world: Point)`

Converts a world coordinate into pixel/screen coordinate.

### `screenToWorld(screen: Point)`

Converts a screen coordinate into world coordinate.

This pair is the base for hit-testing, cursor tools, drag logic, and anchored zoom.

## Constraints and Direct Setters

### `setLimits(minScale, maxScale)`

Defines zoom boundaries and prevents unstable extreme zoom values.

### `setPosition(x, y)`

Moves camera center in world space.

### `setScale(scale)`

Sets zoom level (with configured limits applied).

### `setRotationRadians(radians)`

Sets absolute camera rotation in radians.

### `reset()`

Restores default camera state.

### `update(newState: Partial<CameraState>)`

Applies partial state changes in one call.

```ts
camera.update({ x: 200, scale: 1.5 });
```

## Interaction-Focused Methods

### `panByScreen(dx, dy)`

Pans camera using screen deltas (pixels).  
Useful for drag-to-pan tools.

### `zoomAtScreen(screenPoint, factor)`

Zooms around a specific screen anchor (usually cursor position), preserving that anchor context during zoom.

### `rotateAtScreen(screenPoint, deltaRadians)`

Rotates around a specific screen anchor point.

## Minimal Example

```ts
import type { ICamera } from '@flowscape-ui/core-sdk';

function handleWheelZoom(camera: ICamera, clientX: number, clientY: number, deltaY: number) {
  const factor = deltaY > 0 ? 1 / 1.08 : 1.08;
  camera.zoomAtScreen({ x: clientX, y: clientY }, factor);
}

function handlePan(camera: ICamera, dx: number, dy: number) {
  camera.panByScreen(dx, dy);
}
```

## Practical Rules

- Use `zoomAtScreen(...)` instead of manual `setScale(...)` during pointer zoom.
- Use conversion methods (`screenToWorld` / `worldToScreen`) as the single coordinate bridge.
- Keep limits configured early (`setLimits`) to avoid invalid interaction states.

## Next

- [Input System Overview](../input-system/overview)
