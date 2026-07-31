---
sidebar_position: 1.1
title: Core Interfaces
sidebar_label: Interfaces
description: "Foundational core interfaces used across Flowscape engine architecture."
---

## Core Interfaces

This page covers the most fundamental interfaces in Flowscape core.

They define three base concerns:

- lifecycle (`attach`, `detach`, `destroy`)
- identity and classification (`id`, `type`)
- execution flow (`update`, `render`, `invalidate`)

## Lifecycle Contracts

### `IAttachable<T>`

```ts
export interface IAttachable<T> {
	attach(target: T): void;
	detach(): void;
}
```

Use it when an object needs explicit binding/unbinding to runtime context.

Typical examples:

- renderer attaching to a layer
- input controller attaching to stage/world context
- UI module attaching to HTML container

### `IDestroyable`

```ts
export interface IDestroyable {
	destroy(): void;
}
```

Defines irreversible cleanup: remove listeners, release caches, clear references.

## Identity Contracts

### `IWithId<TId extends ID = ID>`

```ts
export interface IWithId<TId extends ID = ID> {
	readonly id: TId;
}
```

Stable identity for maps, managers, history, selection, and serialization.

### `IWithType<TType = string>`

```ts
export interface IWithType<TType = string> {
	readonly type: TType;
}
```

Classification used by registries/factories and behavior routing.

### `IEntity<TType, TId>`

```ts
export interface IEntity<TType = string, TId extends ID = ID>
	extends IWithId<TId>, IWithType<TType> {}
```

Combines identity (`id`) and classification (`type`).  
Most engine objects naturally fit this contract.

## Execution Contracts

### `IUpdatable`

```ts
export interface IUpdatable {
	update(): void;
}
```

Per-frame or per-tick state synchronization.

### `IRenderable`

```ts
export interface IRenderable {
	render(): void;
}
```

Draw output (canvas/html/webgl backend implementation).

### `IInvalidatable`

```ts
import type { IRenderable } from "./IRenderable";

export interface IInvalidatable {
	invalidate(render: IRenderable): void;
}
```

Dirty-trigger contract to request rendering only when needed.

## How They Work Together

```text
IWithId + IWithType -> IEntity
IAttachable + IDestroyable -> lifecycle-safe components
IUpdatable + IRenderable + IInvalidatable -> frame pipeline
```

Practical flow:

1. object is `attach`ed to runtime context
2. state changes in `update`
3. `invalidate` requests/coordinates redraw
4. `render` produces output
5. `detach` and `destroy` clean resources

## Minimal Example

```ts
type LayerType = "world-layer";
type LayerId = number;

class DebugLayer
	implements
		IEntity<LayerType, LayerId>,
		IAttachable<{ mount: HTMLElement }>,
		IUpdatable,
		IRenderable,
		IDestroyable
{
	public readonly id: LayerId;
	public readonly type: LayerType = "world-layer";
	private _mount: HTMLElement | null = null;

	constructor(id: LayerId) {
		this.id = id;
	}

	public attach(target: { mount: HTMLElement }): void {
		this._mount = target.mount;
	}

	public detach(): void {
		this._mount = null;
	}

	public update(): void {
		// sync state
	}

	public render(): void {
		if (!this._mount) return;
		// draw output
	}

	public destroy(): void {
		this.detach();
	}
}
```

## Next

- [Core Types](./types)
