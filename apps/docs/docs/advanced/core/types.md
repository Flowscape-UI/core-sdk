---
sidebar_position: 1.2
title: Core Types
sidebar_label: Types
description: "Shared type primitives and type-system conventions in Flowscape core."
---

## Core Types

Current core type:

```ts
export type ID = string | number;
```

## Why `ID` Exists

`ID` is the base identity type for engine entities.

It is used anywhere the engine needs stable object identity:

- node ids
- layer/handle/module ids
- entity managers and maps
- selection/history/serialization links

Using a shared `ID` type keeps APIs consistent across the whole core.

## Why `string | number`

- `number` is convenient for local runtime ids and counters.
- `string` is convenient for external systems, database keys, UUIDs, and imported JSON.

This union allows both workflows without forcing converters in every subsystem.

## Practical Rule

Choose one ID style per product layer and keep it stable:

- use `number` for purely internal runtime pipelines
- use `string` when ids come from external sources or need cross-system compatibility

## Next

- [Core Events](./events)
