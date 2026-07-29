---
sidebar_position: 1.3
title: Core Events
sidebar_label: Events
description: "Event contracts and event-driven design in Flowscape core."
---

## Core Events

Core event layer is based on a typed event map and a generic emitter.

## Event Map

```ts
export type EventMap = Record<string, any>;
```

`EventMap` defines the shape of event names and payload types.

Example:

```ts
type SceneEvents = {
  change: { source: 'camera' | 'world' };
  error: { message: string };
};
```

## EventEmitter

```ts
export class EventEmitter<Events extends EventMap> {
  private _listeners: {
    [K in keyof Events]?: Set<(payload: Events[K]) => void>;
  } = {};

  on<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void
  ): () => void

  emit<K extends keyof Events>(
    event: K,
    payload: Events[K]
  )

  clear()
}
```

## Why This Design

- strong typing for payloads per event name
- no stringly-typed payload guessing in subscribers
- unsubscribe function returned from `on(...)`
- lightweight runtime model (Map of Sets)

## Method Behavior

### `on(event, listener)`

- creates internal set for event if needed
- registers listener
- returns `unsubscribe()` callback

### `emit(event, payload)`

- calls all listeners for that event
- payload type is validated by TypeScript at compile time

### `clear()`

- clears all listeners across all events
- useful for teardown and avoiding memory leaks

## Minimal Usage

```ts
type SceneEvents = {
  change: { source: 'camera' | 'world' };
  error: { message: string };
};

const events = new EventEmitter<SceneEvents>();

const offChange = events.on('change', (payload) => {
  console.log(payload.source);
});

events.emit('change', { source: 'camera' });
events.emit('error', { message: 'Renderer not ready' });

offChange();
events.clear();
```

## Practical Rule

Keep one explicit `EventMap` per subsystem (scene, input, renderer, tooling).  
It makes contracts stable and easier to evolve.

## Next

- [Enableable](./enableable)
