---
sidebar_position: 1.4
title: Enableable
sidebar_label: Enableable
description: "Enable/disable lifecycle and runtime state management contracts."
---

## Enableable

`Enableable` is the standard runtime switch used across Flowscape core.

It controls whether an object should participate in active processing
(`update`, `render`, `input`, interaction pipelines).

## `IEnableable` Contract

```ts
export interface IEnableable {
	isEnabled(): boolean;
	enable(): void;
	disable(): void;
	setEnabled(value: boolean): void;
}
```

This gives every runtime object a predictable on/off API.

## `Enableable` Base Class

```ts
type Events = {
	change: boolean;
};

export abstract class Enableable implements IEnableable {
	protected _enabled = true;
	private readonly _events = new EventEmitter<Events>();

	public onChange(callback: (state: boolean) => void): () => void {
		return this._events.on("change", callback);
	}

	public isEnabled(): boolean {
		return this._enabled;
	}

	public enable(): void {
		this.setEnabled(true);
	}

	public disable(): void {
		this.setEnabled(false);
	}

	public setEnabled(value: boolean): void {
		if (this._enabled === value) {
			return;
		}

		this._enabled = value;
		this._onEnabledChanged(value);
	}

	protected _onEnabledChanged(value: boolean): void {
		this._events.emit("change", value);
	}
}
```

## Why This Design

- shared toggle behavior for all runtime systems
- idempotent state change (`setEnabled` exits if state is unchanged)
- built-in change event stream
- extension point via `_onEnabledChanged(value)`

## State Transition Rules

- initial state is enabled (`true`)
- `enable()`/`disable()` are convenience wrappers
- only real state changes emit `change` event
- subclasses can react in `_onEnabledChanged` without rewriting toggle logic

## Typical Usage

`Enableable` is commonly used for:

- layers
- tools
- input controllers/modules
- runtime services

## Minimal Example

```ts
class GridModule extends Enableable {
	protected override _onEnabledChanged(value: boolean): void {
		super._onEnabledChanged(value);
		console.log("Grid enabled:", value);
	}

	public update(): void {
		if (!this.isEnabled()) return;
		// update logic
	}
}

const grid = new GridModule();
const off = grid.onChange((state) => {
	console.log("Changed:", state);
});

grid.disable(); // emits false
grid.enable(); // emits true

off();
```

## Practical Rule

Guard expensive work early:

```ts
if (!module.isEnabled()) return;
```

This keeps disabled modules cheap and predictable in frame loops.

## Next

- [Transform](./transform)
