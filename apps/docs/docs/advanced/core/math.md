---
sidebar_position: 1.6
title: Math
sidebar_label: Math
description: "Float32-safe constants and MathF32 helpers used across Flowscape core."
---

## Math

Flowscape core math is intentionally split into two parts:

- constants (`constants.ts`)
- runtime helpers (`MathF32`)

This gives predictable numeric behavior for transforms, camera, bounds, and input systems.

## Constants

Core constants are grouped by responsibility.

### Angles

```ts
export const PI = Math.PI;
export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
export const QUARTER_PI = Math.PI / 4;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
```

Use these constants instead of repeating literal values in camera/transform code.

### Epsilon

```ts
export const EPSILON = 1e-6;
export const EPSILON_STRICT = 1e-9;
```

- `EPSILON` for common float checks
- `EPSILON_STRICT` for stricter geometry comparisons

### Float32 limits

```ts
export const FLOAT32_MAX = 3.4028235e38;
export const FLOAT32_MIN = -3.4028235e38;
export const FLOAT32_EPSILON = 1.1920929e-7;
```

These values align with float32/WebGL-style numeric boundaries.

## `MathF32`

`MathF32` is a static utility class for clamped float32-like operations.

## Validation and normalization

```ts
MathF32.isValidNumber(value)
MathF32.toF32(value)
```

`toF32` behavior:

- `NaN` -> `0`
- `Infinity` -> `FLOAT32_MAX`
- `-Infinity` -> `FLOAT32_MIN`
- out-of-range numbers -> clamped to float32 bounds

## Arithmetic helpers

```ts
MathF32.add(a, b)
MathF32.sub(a, b)
MathF32.mul(a, b)
MathF32.div(a, b)
MathF32.neg(value)
MathF32.abs(value)
MathF32.min(a, b)
MathF32.max(a, b)
MathF32.clamp(value, min, max)
```

Notes:

- every operation normalizes inputs through `toF32`
- `div(a, 0)` safely returns `0`
- `clamp` auto-swaps `min/max` if passed in reverse order

## Precision helpers

```ts
MathF32.nearlyEqual(a, b, epsilon?)
MathF32.lerp(a, b, t)
MathF32.round(value)
MathF32.floor(value)
MathF32.ceil(value)
```

`nearlyEqual` defaults to `EPSILON`, but you can pass stricter tolerances when needed.

## Trigonometry and angle utilities

```ts
MathF32.sin(value)
MathF32.cos(value)
MathF32.tan(value)
MathF32.atan(value)
MathF32.atan2(y, x)
MathF32.asin(value)
MathF32.acos(value)
MathF32.radToDeg(rad)
MathF32.degToRad(deg)
MathF32.normalizeRad(angle)
MathF32.normalizeDeg(angle)
```

Angle normalization ranges:

- `normalizeRad` -> `[-PI, PI]`
- `normalizeDeg` -> `[-180, 180]`

## Minimal Example

```ts
import { MathF32, DEG_TO_RAD } from '@flowscape-ui/core-sdk';

const angle = MathF32.normalizeRad(450 * DEG_TO_RAD);
const x = MathF32.cos(angle);
const y = MathF32.sin(angle);

const zoom = MathF32.clamp(1.25, 0.1, 8);
const same = MathF32.nearlyEqual(0.3000001, 0.3);
```

## Practical Rules

- Use `MathF32` in engine runtime paths instead of raw `Math` where deterministic clamping matters.
- Use shared constants (`PI`, `TAU`, `DEG_TO_RAD`, `RAD_TO_DEG`) instead of magic numbers.
- Use `nearlyEqual` for float checks in geometry and camera logic.

## Next

- [Camera](./camera)
