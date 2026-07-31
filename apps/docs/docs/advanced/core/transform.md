---
sidebar_position: 1.5
title: Transform
sidebar_label: Transform
description: "Local transform model in Flowscape core: position, scale, rotation, pivot, and matrix composition."
---

## Transform

`Transform` is the local geometry core of Flowscape.

It defines how an object is moved, scaled, rotated, and pivoted before hierarchy/world composition.

## Core Primitives

### `Vector2`

```ts
export interface Vector2 {
	x: number;
	y: number;
}
```

Basic 2D vector for position, scale, pivot, and points.

### `Matrix`

```ts
export interface Matrix {
	a: number;
	b: number;
	c: number;
	d: number;
	tx: number;
	ty: number;
}
```

2D affine transform matrix:

```text
| a  c  tx |
| b  d  ty |
| 0  0   1 |
```

This matrix is returned by `getLocalMatrix(width, height)` and then used by higher-level world composition.

## `ITransform` Contract

`ITransform` is split into five blocks:

- position
- scale
- rotation
- pivot
- local matrix output

Core contract:

```ts
getLocalMatrix(width: number, height: number): Matrix
```

The method converts normalized pivot (`0..1`) into local coordinates and builds a final affine matrix.

## Position API

- `getX()`, `getY()`, `getPosition()`
- `setX(value)`, `setY(value)`, `setPosition(x, y)`
- `translateX(value)`, `translateY(value)`, `translate(dx, dy)`

Use `set*` for absolute values and `translate*` for deltas.

## Scale API

- `getScaleX()`, `getScaleY()`, `getScale()`
- `setScaleX(value)`, `setScaleY(value)`, `setScale(sx, sy)`

Scale is local and independent per axis.

## Rotation API

- `getRotation()`
- `setRotation(value)`
- `rotate(delta)`

Rotation is in radians.

## Pivot API

- `getPivotX()`, `getPivotY()`, `getPivot()`
- `setPivotX(value)`, `setPivotY(value)`, `setPivot(px, py)`

Pivot values are normalized (commonly `0..1`), so `0.5, 0.5` means center.

## `Transform` Class Behavior

Default state:

- `position = { x: 0, y: 0 }`
- `scale = { x: 1, y: 1 }`
- `rotation = 0`
- `pivot = { x: 0.5, y: 0.5 }`

Implementation details from your class:

- `MathF32.toF32(...)` is used in setters for stable numeric storage
- `MathF32.add(...)`/`MathF32.mul(...)` are used in incremental and matrix math
- `MathF32.normalizeRad(...)` keeps rotation normalized
- no-op guards avoid extra writes when value is unchanged

## Local Matrix Composition

`Transform.getLocalMatrix(width, height)` computes:

```ts
const px = width * pivot.x;
const py = height * pivot.y;

const cos = MathF32.cos(rotation);
const sin = MathF32.sin(rotation);

const a = cos * scale.x;
const b = sin * scale.x;
const c = -sin * scale.y;
const d = cos * scale.y;

const tx = position.x - (a * px + c * py);
const ty = position.y - (b * px + d * py);
```

So rotation and scale are applied around pivot first, then final translation is applied.

## Local vs World

`Transform` handles only local state.  
World matrix/hierarchy composition is handled by node-layer logic above this class.

## Minimal Example

```ts
import { Transform } from "@flowscape-ui/core-sdk";

const t = new Transform();
t.setPosition(160, 90);
t.setScale(1.2, 0.9);
t.setRotation(Math.PI / 6);
t.setPivot(0.5, 0.5);

const local = t.getLocalMatrix(320, 180);
```

## Practical Rules

- Keep local geometry state in `Transform`, not in duplicate fields.
- Use `rotate(delta)` for continuous tools and `setRotation(value)` for absolute control.
- Keep pivot explicit in editor tools, because it affects resize/rotate behavior and matrix output.

## Next

- [Math](./math)
