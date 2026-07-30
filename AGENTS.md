# AGENTS.md

## Purpose

This file defines the default working rules for AI coding agents operating in the Flowscape repository.

Flowscape is a developer-first, framework-agnostic 2D engine for building infinite-canvas editors, design tools, visual builders, whiteboards, diagram editors, and similar graphical applications.

Treat Flowscape as an engine, not as an application framework or a collection of UI components. Preserve the separation between scene state, node state, rendering, input, hosts, and application-level code.

These rules apply to the entire repository unless a more specific `AGENTS.md` exists deeper in the directory tree.

---

## Repository Layout

Flowscape is a Bun + Turborepo monorepo.

```text
flowscape/
├── apps/
│   ├── docs/
│   └── playground/
├── packages/
│   └── engine/
├── package.json
├── turbo.json
└── bun.lock
```

Primary ownership:

- `packages/engine` - the Flowscape engine, published as `@flowscape-ui/core-sdk`.
- `apps/playground` - the development and manual-testing application.
- `apps/docs` - the Docusaurus documentation site.
- root - monorepo orchestration and shared tooling only.

Add dependencies to the workspace that actually uses them. Do not place package-specific runtime dependencies in the root package.

---

## Project Identity and Architectural Direction

Flowscape is a low-level scene engine. It should provide reusable foundations for editor-like products without becoming coupled to a specific UI framework or product implementation.

Core principles:

1. Keep engine state independent from rendering-backend objects whenever practical.
2. Keep rendering logic out of node/model classes.
3. Keep input/controller logic separate from renderers.
4. Keep application-specific behavior out of the engine unless it is a reusable editor primitive.
5. Prefer stable, extensible public APIs over shortcuts that expose implementation details.
6. Preserve the ability to evolve rendering backends without rewriting product logic.
7. Do not introduce abstractions only because they look cleaner; introduce them when they solve a real ownership, reuse, performance, or extensibility problem.

Do not “simplify” an existing architecture until you understand why the abstraction exists.

---

## Public API Rules

The published package is:

```text
@flowscape-ui/core-sdk
```

Consumers and repository applications must use the public package API:

```ts
import { Scene, NodeRect } from "@flowscape-ui/core-sdk";
```

Do not use consumer-facing deep imports such as:

```ts
import { Scene } from "@flowscape-ui/core-sdk/src/scene";
```

The engine public entry point is:

```text
packages/engine/src/index.ts
```

The root entry point re-exports the engine domains such as `core`, `grid`, `input`, `nodes`, `renderer`, `scene`, and `style-sheet`.

When adding functionality intended for users:

1. Implement it in the correct internal ownership area.
2. Export it through the appropriate local barrel.
3. Ensure it is reachable from `packages/engine/src/index.ts`.
4. Test it through `@flowscape-ui/core-sdk` where practical.
5. Update docs when the public behavior or API changes.

Do not expose an internal implementation type merely because it is convenient for one feature.

Public API stability matters. Before changing a public API, check whether the goal can be achieved by adding a new API, extending an existing type, using an adapter, or deprecating old behavior instead of breaking it.

---

## Playground Resolution Rules

The Playground depends on `@flowscape-ui/core-sdk` as a workspace dependency.

During Vite development, the package name is intentionally aliased to:

```text
packages/engine/src/index.ts
```

The Playground TypeScript config also maps `@flowscape-ui/core-sdk` to the engine source entry point for development.

This is intentional: engine changes should be visible immediately during Playground development while application code still imports the public package name.

Do not replace Playground imports with direct engine `src/...` imports. Do not remove the development alias merely to make module resolution look simpler.

---

## Scene Lifecycle and Invalidation

`Scene` owns the top-level update/render scheduling model.

Flowscape currently uses demand-driven rendering rather than an unconditional permanent render loop.

`scene.invalidate()`:

1. schedules at most one pending `requestAnimationFrame`,
2. calls `scene.update()`,
3. calls `scene.render()`.

Repeated invalidations before the scheduled frame are coalesced.

Do not replace this with an always-running render loop unless the requested feature explicitly requires a continuous mode and the architectural consequences are understood.

Animations or continuously changing external state must explicitly keep the scene invalidated for as long as they are active.

Current update order:

```text
InputManager.update()
→ enabled layer renderer updates
→ render host updates
```

Current render order:

```text
enabled layer renderer renders
→ render hosts render
→ Input._endFrame()
```

Preserve ordering unless a change specifically requires different lifecycle semantics.

Input events currently invalidate the scene. Controllers may also receive an `emitChange` callback that invalidates the scene. Avoid redundant custom render loops inside controllers.

---

## Scene Ownership

The scene owns:

- registered layers,
- layer-to-renderer bindings,
- renderer lifecycle for bound layers,
- render hosts through `ManagerRenderHost`,
- input controllers through `InputManager`,
- frame invalidation scheduling.

When replacing a bound layer renderer, the existing renderer is detached and destroyed before replacement.

When a host is added, the scene registers its input surface and attaches the host. When removed, the surface is unregistered and the host is detached and destroyed.

Do not move layer-renderer lifecycle responsibility into render hosts. Hosts should remain host/surface concerns.

---

## Layer Responsibilities

Flowscape uses a layered scene architecture:

```text
Scene
├── Background Layer
├── World Layer
│   └── scene nodes
├── Overlay Layer
│   └── selection / hover / transform / handles
└── UI Layer
```

Keep responsibilities in the correct layer.

Examples:

- persistent scene content belongs in World,
- editor handles and selection visuals belong in Overlay,
- background rendering belongs in Background,
- viewport-level UI belongs in UI.

Do not put editor overlay state into scene nodes merely because it is visually associated with a node.

---

## Node Model Rules

`NodeBase` is model/state code. It must not depend on Konva objects or other backend-specific render resources.

Node responsibilities include:

- identity and type,
- transform state,
- size,
- visibility and locking,
- hierarchy,
- cached world transforms,
- local/world/hierarchy bounds,
- hit testing,
- serialization.

### Dirty-state semantics

`setDirty()` has important directional behavior:

- hierarchy bounds are invalidated upward through ancestors,
- world-transform caches are invalidated downward through descendants.

`setHierarchyBoundsDirty()` invalidates hierarchy bounds upward without unnecessarily invalidating transforms.

Do not replace these with broad cache clearing unless required. Do not manually mutate cached transform/bounds fields from unrelated classes.

When geometry changes without changing the transform, prefer the narrowest invalidation that preserves correctness.

### Hierarchy semantics

Hierarchy operations must continue to prevent:

- adding a node to itself,
- cyclic parent/child relationships,
- inconsistent parent/child ownership.

Visibility and lock state propagate through hierarchy-specific cached state. Preserve these semantics when modifying hierarchy code.

### Locked nodes

Transform and size mutators currently reject changes when a node is locked in its hierarchy. New mutation APIs should be consistent with existing lock semantics unless explicitly designed otherwise.

---

## Shape State and Paint

`ShapeBase` owns declarative shape appearance state, including:

- corner radius,
- fill mode and fill string,
- stroke mode and stroke string,
- per-side stroke width,
- stroke alignment,
- shape effects.

Supported paint modes currently include:

- color,
- linear gradient,
- radial gradient,
- conic gradient,
- diamond gradient,
- mesh gradient.

Keep node paint state declarative. Do not store `CanvasGradient`, `Konva.Shape`, offscreen canvases, parsed Gradiente instances, or other backend resources in node classes.

Gradiente is an engine implementation dependency. Public shape APIs should remain simple and backend-independent where practical, with string-based paint values interpreted by renderers/adapters.

Before changing mode-switch behavior or default fill behavior, inspect existing tests and usages. Do not silently change state-preservation semantics as part of an unrelated renderer refactor.

---

## Renderer Boundaries

Canvas/Konva renderer code may depend on Konva. Core node state must not.

A renderer should translate model state into backend state; it should not become the authoritative owner of persistent scene data.

The current rectangle renderer demonstrates the intended split:

- `NodeRect` / `ShapeBase` own declarative appearance and geometry state,
- `RendererCanvasRect` owns Konva shapes and backend-specific drawing,
- expensive gradient paint resources are cached in renderer-owned caches,
- effects are mounted/rendered through renderer-specific effect helpers.

When implementing the same capability for multiple shapes, do not duplicate expensive paint/gradient infrastructure across every renderer. Prefer a shared renderer-level abstraction when the logic is genuinely shape-independent.

Keep geometry-specific path construction in the geometry renderer and reusable paint/cache logic in shared renderer infrastructure.

---

## Gradient Rendering and Performance

Gradients are transformed to the Canvas/Konva rendering target through Flowscape-owned Gradiente transformer adapters.

Current renderer behavior caches transformed gradient paint by shape, mode, and value. Preserve caching in hot paths.

Rules for gradient work:

1. Do not parse/transform an unchanged gradient on every `sceneFunc` call.
2. Keep backend-specific gradient resources in renderer-owned caches.
3. Prefer `WeakMap` when cache lifetime should follow a backend shape/object.
4. Reuse offscreen canvases for rasterized gradients instead of allocating a canvas on every draw.
5. Re-rasterize only when relevant input changes, such as paint value, dimensions, or the chosen quality scale.
6. Treat conic, diamond, and especially mesh rasterization as potentially expensive CPU work.
7. Avoid continuous scale values that invalidate raster caches on tiny camera changes; use deliberate quality levels where appropriate.
8. Avoid unnecessary allocations inside `sceneFunc`, pointer-move loops, wheel handlers, or other hot paths.

Do not move gradient caches into `ShapeBase` or other model classes.

---

## Renderer Effects

Effects such as drop shadows and inner shadows have model state and renderer-specific implementations.

Maintain that split.

When adding a new effect:

- define reusable state/API at the node/shape level,
- keep Konva-specific nodes, filters, masks, and cache resources in renderer code,
- ensure renderer lifecycle cleanup is handled,
- test stacking/order interactions with fill, stroke, and other effects.

Do not let an effect renderer silently become the owner of node geometry.

---

## Input and Interaction Rules

Input code should describe interaction behavior, not rendering implementation.

Controllers may request scene redraw through the provided change/invalidation flow. Avoid direct backend drawing from input controllers unless the architecture explicitly assigns that controller a renderer-backed helper.

For overlay interactions, preserve interaction ownership rules so competing tools/handles do not begin conflicting interactions simultaneously.

When changing pointer, wheel, keyboard, drag, selection, resize, rotate, or pan/zoom behavior:

- test mouse and touchpad paths where relevant,
- verify interaction cancellation/ownership,
- verify coordinate conversion between client, surface, screen, world, and local spaces,
- test nested/transformed nodes, not only unrotated root nodes.

---

## Math, Transforms, and Bounds

Transform and bounds code is correctness-sensitive and performance-sensitive.

Before changing it, identify which coordinate space every value uses:

- client,
- surface,
- screen,
- world,
- parent-local,
- node-local.

Do not mix spaces implicitly.

Existing node code uses `MathF32` heavily to normalize numeric behavior. Follow the surrounding numeric conventions when modifying transform, size, bounds, or geometry code.

For hit testing, preserve fast-rejection + accurate-test patterns when applicable rather than replacing them with a slower universal path.

Test transform changes with combinations of:

- parent transforms,
- scale,
- rotation,
- pivot,
- hierarchy bounds,
- zero/non-invertible scale,
- visible/hidden descendants.

---

## TypeScript Rules

Flowscape is TypeScript-first.

- Preserve strong types at architectural boundaries.
- Prefer `import type` for type-only imports.
- Avoid `any`; ESLint currently warns on explicit `any`.
- Do not suppress type errors merely to finish a change.
- Keep public types extensible and stable.
- Use `readonly` where ownership is intentionally immutable.
- Do not expose mutable internal collections directly; return readonly or copied views where the surrounding API follows that pattern.

If a cast is necessary, keep it narrow and explain unusual safety assumptions in code when they are not obvious.

---

## Formatting and Linting

The repository Prettier configuration is authoritative:

```text
useTabs: true
tabWidth: 4
singleQuote: false
semi: true
```

Therefore new/modified formatted code should use:

- tabs for indentation,
- tab width 4,
- double quotes,
- semicolons.

Do not bulk-format unrelated files as part of a focused feature or bug fix.

Shared ESLint rules include:

- strict equality (`eqeqeq`),
- `prefer-const`,
- braces for control flow (`curly`),
- unused variables/arguments are errors unless intentionally prefixed with `_`,
- explicit `any` is a warning.

Follow the configured tools rather than manually enforcing a conflicting style.

---

## Commands

Use Bun from the repository root.

Install:

```bash
bun install
```

Common root commands currently declared:

```bash
bun run build
bun run dev
bun run typecheck
bun run lint
bun run format
bun run format:check
bun run dev:playground
bun run dev:docs
bun run build:playground
bun run build:docs
```

Engine tests are currently declared in `packages/engine/package.json`:

```bash
cd packages/engine
bun run test
```

Important: the current root `package.json` does not declare a `test` script even though `turbo.json` contains a `test` task and `CONTRIBUTING.md` mentions `bun run test`.

Do not claim that `bun run test` was run successfully from the root unless the root script has actually been added. When documentation and package scripts disagree, treat the actual package scripts/configuration as the execution source of truth and report the mismatch.

Similarly, before claiming repository-wide lint coverage, verify that the affected workspaces actually expose the lint task expected by Turborepo.

---

## Turborepo Rules

Current Turbo tasks include:

- `build` - depends on dependency builds and caches `dist/**`,
- `lint` - depends on dependency lint tasks,
- `typecheck` - depends on dependency typecheck tasks,
- `test` - depends on dependency builds and has no cached output,
- `dev` - persistent and uncached.

When adding a new workspace script, keep Turbo task naming consistent unless there is a concrete reason not to.

Do not bypass workspace dependency ordering with ad-hoc root scripts when Turbo already models the dependency graph.

---

## Engine Build and Package Metadata

`packages/engine` is the publishable package.

Build configuration is owned by `tsdown.config.ts`; package entry metadata is owned by `packages/engine/package.json`.

Do not change output formats, `exports`, `main`, `module`, `types`, global IIFE naming, externalization, or package side-effect metadata casually. These are consumer-facing distribution contracts.

When modifying build output, verify that package metadata points only to files that are actually generated.

---

## Documentation

Public API and user-facing behavior belong in `apps/docs`.

The README should remain focused on project identity, installation, quick start, and high-level architecture.

For public features, documentation should explain:

- what the feature does,
- why/when to use it,
- the public API,
- relevant limitations,
- a small example.

New public documentation should default to English unless the task explicitly targets another locale. Do not rewrite existing bilingual/internal comments solely for style.

User-facing notable changes may require `CHANGELOG.md` updates.

---

## Testing Expectations

For engine behavior changes:

- add or update Vitest tests when practical,
- add regression coverage for bug fixes when practical,
- use the Playground for visual and interaction verification,
- test through the public package API whenever possible.

For rendering changes, verify at least:

- default state,
- transformed nodes,
- resize,
- zoom/pan redraw,
- relevant stroke alignment,
- visibility,
- high-DPI behavior where relevant,
- repeated redraws/cache reuse,
- expensive gradients/effects if the changed code touches shared paint paths.

For interaction changes, test both isolated nodes and nested/grouped nodes.

Do not declare a visual change complete based only on type checking.

---

## Dependency Rules

Before adding a dependency:

1. confirm the functionality does not already exist in the repository,
2. confirm the dependency belongs at engine/app/tooling level,
3. consider bundle/runtime cost for `@flowscape-ui/core-sdk`,
4. avoid introducing a framework dependency into the core engine,
5. avoid coupling public APIs to dependency-specific types unless intentional.

Framework integrations should be adapters around the engine rather than duplicated engine implementations.

---

## Change Discipline

Before editing:

1. inspect the relevant model, renderer, input, and public-export path,
2. identify who owns the state being changed,
3. identify whether the change affects public API,
4. identify invalidation/cache consequences,
5. inspect neighboring implementations before inventing a new pattern.

While editing:

- make the smallest coherent change,
- preserve unrelated behavior,
- avoid opportunistic large refactors,
- keep package boundaries intact,
- avoid duplicating logic that already has a clear shared owner.

After editing:

1. run the relevant type checks,
2. run relevant tests,
3. run formatting/lint checks that are actually configured for the affected workspace,
4. test visual/interaction changes in the Playground,
5. verify public exports if a public API changed,
6. update docs/changelog when appropriate.

---

## Do Not

Do not:

- import engine internals from applications instead of `@flowscape-ui/core-sdk`,
- put Konva objects or Canvas resources into node/model state,
- move layer-renderer lifecycle from `Scene` into renderer hosts,
- add a permanent render loop to solve an invalidation bug,
- call expensive gradient parsing/rasterization on every redraw when inputs are unchanged,
- duplicate shared gradient/paint logic across every shape renderer,
- expose Gradiente implementation objects as the default public shape API,
- add React/Vue/Svelte/Angular dependencies to the engine core for convenience,
- mutate hierarchy arrays or parent links outside their ownership APIs,
- clear all transform/bounds caches when narrower invalidation is sufficient,
- change public API names or semantics as part of an unrelated refactor,
- change build/export metadata without verifying generated artifacts,
- add dependencies to the monorepo root when only one workspace uses them,
- hide type/lint failures with broad disables,
- bulk-format unrelated code,
- claim tests/lint/build passed unless the corresponding command actually ran successfully.

---

## Decision Rule for Architectural Changes

For a change that crosses major boundaries - node model, scene lifecycle, renderer ownership, input ownership, public API, package structure, or build output - do not guess the intended architecture.

First inspect the surrounding implementation and existing public behavior. Prefer preserving the current ownership model. When multiple designs are plausible and the choice would create a long-lived contract, surface the tradeoff instead of silently choosing a new architecture.

Flowscape should evolve deliberately: reusable engine primitives first, application-specific behavior outside the core, and backend-specific implementation details behind renderer boundaries.
