---
sidebar_position: 2
title: Input
sidebar_label: Input
description: "Static Input API in Flowscape: keyboard, mouse, wheel, and global input behavior flags."
---

## Input

`Input` is a static runtime input state hub used by controllers.

It tracks keyboard, mouse, wheel, and pointer data, then exposes frame-based getters and helpers.

In normal usage you do not initialize it manually.  
`Scene` / input manager registers surfaces and controls lifecycle.

## Core Types

### `InputEventInfo`

| Field | Type | Description |
| --- | --- | --- |
| `type` | event union | Input event type emitted through `onInput(...)`. |
| `keyCode` | `KeyCode` | Present for keyboard events. |
| `mouseButton` | `number` | Present for mouse/pointer button events. |

Supported `type` values:

```ts
"keydown" | "keyup"
| "mousedown" | "mouseup" | "mousemove"
| "mouseenter" | "mouseleave"
| "wheel"
| "pointerdown" | "pointermove" | "pointerup" | "pointercancel"
| "pointerenter" | "pointerleave" | "pointerover" | "pointerout"
| "gotpointercapture" | "lostpointercapture"
```

### `InputOptions`

| Option | Default | Description |
| --- | --- | --- |
| `preventAltDefault` | `false` | Calls `preventDefault()` for Alt-modified key events (when cancelable). |
| `preventContextMenu` | `false` | Prevents browser context menu on registered surfaces. |
| `preventWheelDefault` | `false` | Prevents browser wheel default behavior (scroll/zoom) on registered surfaces. |
| `usePointerCapture` | `true` | Uses pointer capture in pointer down/up flow. |

## Integration API

| API | Returns | Description |
| --- | --- | --- |
| `onInput(callback)` | `void` | Subscribes one global callback to raw input event stream (`InputEventInfo`). |
| `configure(options)` | `void` | Updates runtime input options (`InputOptions`). |

## Common reads inside controllers

```ts
import { Input, MouseButton, KeyCode } from '@flowscape-ui/core-sdk';

const scroll = Input.mouseScrollDelta;
const pointer = Input.mousePosition;
const pointerDelta = Input.mousePositionDelta;

const isPanning = Input.getMouseButton(MouseButton.Right);
const pressedCtrl = Input.ctrlPressed;
const zoomShortcut = Input.getKeyDownCombo(KeyCode.LeftControl, KeyCode.Equals);
```

## Keyboard Getters

| Getter | Type | Description |
| --- | --- | --- |
| `inputString` | `string` | Typed characters collected from keydown in current frame. |
| `anyKey` | `boolean` | Any key currently held. |
| `anyKeyDown` | `boolean` | Any key pressed this frame. |
| `ctrlPressed` | `boolean` | Left or right Control is held. |
| `shiftPressed` | `boolean` | Left or right Shift is held. |
| `altPressed` | `boolean` | Left or right Alt is held. |
| `metaPressed` | `boolean` | Command/Windows key is held. |
| `isAnyModifierPressed` | `boolean` | Any modifier key is held. |

## Mouse and Wheel Getters

| Getter | Type | Description |
| --- | --- | --- |
| `mousePosition` | `Vector2` | Current mouse position in client coordinates. |
| `mousePositionDelta` | `Vector2` | Accumulated per-frame mouse delta. |
| `mousePositionDeltaNormalized` | `Vector2` | Normalized version of mouse delta. |
| `mouseScrollDelta` | `Vector2` | Wheel delta for current frame. |
| `mouseScrollX` | `number` | Wheel X delta. |
| `mouseScrollY` | `number` | Wheel Y delta. |
| `mouseInside` | `boolean` | Mouse is currently inside registered surface. |
| `anyMouseButton` | `boolean` | Any mouse button currently held. |
| `anyMouseButtonDown` | `boolean` | Any mouse button pressed this frame. |
| `scrollCtrl` | `boolean` | Ctrl state captured from latest wheel event. |
| `scrollShift` | `boolean` | Shift state captured from latest wheel event. |
| `scrollAlt` | `boolean` | Alt state captured from latest wheel event. |
| `scrollMeta` | `boolean` | Meta state captured from latest wheel event. |
| `cursor` | `string` | Current cursor string applied to registered surfaces. |

## Pointer Getters

| Getter | Type | Description |
| --- | --- | --- |
| `pointerPosition` | `Vector2` | Current pointer position in client coordinates. |
| `pointerDelta` | `Vector2` | Per-frame pointer delta. |
| `pointerDown` | `boolean` | Pointer is down. |
| `pointerInside` | `boolean` | Pointer is inside surface. |
| `pointerCaptured` | `boolean` | Pointer is currently captured by surface. |
| `pointerType` | `"mouse" \| "pen" \| "touch"` | Active pointer type. |
| `pointerPressure` | `number` | Current pointer pressure. |
| `activePointerId` | `number \| null` | Active pointer id or `null`. |
| `coalescedEvents` | `ReadonlyArray<PointerEvent>` | Coalesced pointer events from latest pointer move. |
| `predictedEvents` | `ReadonlyArray<PointerEvent>` | Predicted pointer events from latest pointer move. |

## Keyboard Methods

| API | Returns | Description |
| --- | --- | --- |
| `getKey(key)` | `boolean` | Key is currently held. |
| `getKeyDown(key)` | `boolean` | Key pressed this frame. |
| `getKeyUp(key)` | `boolean` | Key released this frame. |
| `getKeyCombo(...keys)` | `boolean` | All keys are currently held. |
| `getKeyDownCombo(...keys)` | `boolean` | Combo active and at least one key pressed this frame. |
| `getKeyRepeat(key, options?)` | `boolean` | Repeat helper with `delay` and `interval`. |
| `onceKeyDown(key, callback)` | `void` | One-shot callback on next keydown for given key. |
| `getKeyDownOnce(key)` | `boolean` | Alias of `getKeyDown(key)`. |

## Mouse Methods

| API | Returns | Description |
| --- | --- | --- |
| `getMouseButton(button)` | `boolean` | Mouse button is currently held. |
| `getMouseButtonDown(button)` | `boolean` | Mouse button pressed this frame. |
| `getMouseButtonUp(button)` | `boolean` | Mouse button released this frame. |
| `getMouseButtonPressOrigin(button)` | `Vector2` | Position captured at mousedown for that button. |
| `getMouseButtonHoldDuration(button)` | `number` | Hold duration in milliseconds. |
| `getMouseDragDelta(button)` | `Vector2` | Delta from mousedown origin to current mouse position. |
| `getMouseDragDistance(button)` | `number` | Distance from mousedown origin. |
| `isMouseButtonHeld(button, duration)` | `boolean` | Button held at least `duration` ms. |
| `getMouseButtonClickCount(button, threshold?)` | `number` | Sequential click count within threshold. |
| `getMouseButtonDoubleClick(button, threshold?)` | `boolean` | True on frame where double-click is detected. |
| `getMouseButtonTripleClick(button, threshold?)` | `boolean` | True on frame where triple-click is detected. |
| `setCursor(value)` | `void` | Sets cursor for all registered surfaces. |
| `resetCursor()` | `void` | Resets cursor to `default`. |

## Pointer and General Methods

| API | Returns | Description |
| --- | --- | --- |
| `lockPointer(element)` | `void` | Requests pointer lock on element. |
| `unlockPointer()` | `void` | Exits pointer lock. |
| `isPointerLocked` | `boolean` | Whether pointer lock is active. |
| `getModifiers()` | `{ ctrl, shift, alt, meta }` | Snapshot of current modifier keys. |
| `getAxisValue(neg, pos)` | `number` | Axis helper (`-1`, `0`, `1`) from two keys. |
| `getVector(left, right, up, down)` | `Vector2` | Normalized 2D direction from four keys. |
| `isIdle(timeout)` | `boolean` | No input detected longer than timeout (ms). |

## Engine Lifecycle (Internal)

These methods are engine internals (prefixed with `_`) and are managed by scene/input systems.

| Internal API | Description |
| --- | --- |
| `_initialize()` | Registers global listeners (`keydown`, `keyup`, `blur`). |
| `_registerSurface(surface)` | Attaches mouse/pointer/contextmenu listeners to a surface. |
| `_unregisterSurface(surface)` | Detaches listeners from a surface. |
| `_destroy()` | Full teardown of listeners and cached state. |
| `_endFrame()` | Clears frame-only states (`Down/Up`, deltas, input string, coalesced/predicted events). |

## Frame Model

`Input` has two state types:

- persistent until changed: `getKey`, `getMouseButton`, `pointerDown`, positions
- one-frame state: `getKeyDown`, `getKeyUp`, `mousePositionDelta`, `mouseScrollDelta`, `inputString`

One-frame state is reset in `_endFrame()`.

## Configuration Example

```ts
Input.configure({
  preventContextMenu: true,
  preventWheelDefault: true,
  usePointerCapture: true,
});
```

Typical case: wheel is used for canvas zoom, browser scroll is disabled on surface.

## Current Constraints

- Input tracks both Mouse and Pointer flows in parallel.
- Active pointer state is single-pointer (`activePointerId`), not full multi-touch map.
- `inputString` is shortcut/simple typing focused (not IME-complete text input).
- Scroll modifier getters (`scrollCtrl`, etc.) reflect wheel-event modifiers, not global key state.

## Practical rules

- Read `Input` inside controllers/modules, not directly in random UI components.
- Keep browser-behavior toggles (`preventWheelDefault`) explicit and centralized.
- Treat `Input` as state source, and keep interaction decisions in controllers.

## Next

- [Controllers Overview](./controllers/overview)
