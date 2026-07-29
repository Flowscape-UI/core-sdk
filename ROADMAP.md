# Flowscape Roadmap

Flowscape is a framework-agnostic 2D engine for building editors, design tools, infinite canvas applications, visual builders, whiteboards, and other interactive graphical products.

The current stable version is **2.0.2**.

The goal on the road to **3.0** is to turn Flowscape into a complete editor engine with the core capabilities expected from modern design tools such as Figma, while keeping the engine reusable, framework-agnostic, and independent from any particular application UI.

This roadmap intentionally avoids release dates. Priorities may change as the engine architecture evolves.

---

## 2.x - Foundation Expansion

The 2.x line focuses on completing the core editing model and making existing systems consistent across all supported node types.

### Paint System

- Complete gradient support across all applicable nodes.
- Support gradients for both fills and strokes.
- Support:
  - linear gradients
  - radial gradients
  - conic gradients
  - diamond gradients
  - mesh gradients
- Keep gradient state declarative and renderer-independent.
- Improve caching and rendering performance for expensive gradient types.
- Add editor-friendly gradient handles for direct manipulation on canvas.
- Support editing gradient position, angle, radius, stops, mesh vertices, and related controls directly in the editor.

### Borders and Strokes

- Make border/stroke behavior consistent across all applicable nodes.
- Support independent stroke widths per side where geometry allows it.
- Support:
  - inside
  - center
  - outside
- Ensure strokes work correctly with gradients, corner radii, transforms, effects, export, and hit testing.
- Unify shared stroke rendering logic instead of duplicating it across renderers.

### Transform System

The transform system will be reviewed before 3.0.

Goals:

- robust translation
- rotation
- scaling
- non-uniform scaling
- skew / shear
- pivot/origin control
- nested transforms
- correct world/local conversion
- stable transform decomposition and recomposition
- predictable behavior under deeply nested hierarchies

The implementation should be informed by mature graphics and editor projects, including projects such as Graphite, while preserving Flowscape's own architecture.

### Selection and Manipulation

- Improve selection behavior.
- Multi-selection.
- Selection bounds.
- Resize handles.
- Rotation handles.
- Transform handles.
- Better snapping during manipulation.
- Alignment guides.
- Smart guides.
- Distribution helpers.
- Keyboard-modified transforms.
- Accurate interaction with rotated and transformed objects.

### Shape Editing

Any suitable graphical node should be convertible into an editable shape/path representation.

This should enable:

- converting primitives such as rectangles and ellipses into editable shapes
- adding, removing, and moving control points
- editing segments
- editing Bézier handles
- creating more complex geometry from simple primitives
- preserving predictable transforms after conversion

### Vector Tools

Add the core tools required for direct vector editing:

- Pen tool
- Pencil / freehand tool
- Path editing
- Node/anchor editing
- Bézier handle editing
- Open and closed paths
- Path continuation
- Path joining and splitting

### Selection Tools

- Rectangle/area selection.
- Freeform lasso selection.
- Additive and subtractive selection.
- Selection through nested groups and frames.
- Better hit testing for complex paths.

---

## History and Commands

A first-class history system is required before 3.0.

### Undo / Redo

- Undo.
- Redo.
- Multi-step history.
- Transaction grouping.
- Merge continuous edits into meaningful history entries.
- Avoid creating a history entry for every pointer movement.
- Support history for transforms, geometry edits, fills, strokes, effects, hierarchy changes, creation/deletion, text changes, and path edits.

### Command Architecture

Where practical, editor mutations should become compatible with a command/transaction model.

The history system must not be tightly coupled to a specific UI framework.

---

## Core Editor Features

Before 3.0, Flowscape should provide the reusable engine-level functionality required to build a serious design editor without reimplementing fundamental editing behavior in application code.

### Hierarchy

- Groups.
- Frames.
- Nested nodes.
- Reordering.
- Reparenting.
- Locking.
- Visibility.
- Correct hierarchy bounds.
- Correct transforms under reparenting.

### Grouping and Composition

- Group / ungroup.
- Frame-like containers.
- Clipping and masks.
- Nested clipping.
- Boolean shape operations where practical:
  - union
  - subtract
  - intersect
  - exclude

### Snapping

- Grid snapping.
- Object snapping.
- Edge snapping.
- Center snapping.
- Alignment guides.
- Distance guides.
- Configurable snapping behavior.

### Layout Foundations

Provide reusable foundations for editor layouts without turning the engine into an application framework.

Potential areas include:

- constraints
- alignment
- distribution
- resize behavior
- parent-relative positioning

Advanced auto-layout may be developed after the lower-level layout model is stable.

### Text

- Reliable text rendering.
- Text editing.
- Font configuration.
- Alignment.
- Line height.
- Letter spacing.
- Text bounds.
- Text transforms.
- Text fill and stroke support where applicable.
- Export consistency.

### Images and Media

- Image nodes.
- Video nodes.
- Media transforms.
- Cropping.
- Fitting modes.
- Clipping/masking.
- Opacity.
- Export behavior where applicable.

---

## Import and Export

Flowscape should provide a practical media and document interchange layer.

### SVG

- Import SVG.
- Export SVG.
- Preserve common paths, fills, strokes, transforms, gradients, and groups where possible.
- Gracefully handle unsupported SVG features.

### Raster Export

- PNG export.
- JPEG/WebP export where appropriate.
- Export selected nodes.
- Export frames.
- Export arbitrary scene regions.
- Configurable scale / pixel ratio.
- Transparent backgrounds.

### Media Import

Support common media used in graphical editors, including:

- SVG
- PNG
- JPEG
- WebP
- GIF where applicable
- video formats supported by the runtime

### Clipboard

- Copy.
- Cut.
- Paste.
- Duplicate.
- Preserve internal Flowscape data when copying between Flowscape editors.
- Interoperate with browser clipboard formats where practical.

---

## Editor Interaction Foundations

### Keyboard and Shortcuts

- Shortcut-friendly action model.
- Modifier-aware interactions.
- Nudge and large-nudge movement.
- Delete / duplicate / group / ungroup actions.
- Tool switching hooks.

The engine should expose primitives rather than hard-code one product's final shortcut scheme.

### Camera and Canvas

Continue improving:

- pan
- zoom
- zoom-to-selection
- zoom-to-fit
- rulers
- grids
- guides
- viewport transforms
- large-scene navigation

### Cursor and Tool State

Create a clean tool-state model suitable for:

- select
- move
- pen
- pencil
- lasso
- text
- shape creation
- hand/pan
- future custom tools

---

## Rendering and Performance

Flowscape must remain suitable for large editor documents.

Priorities include:

- renderer-independent engine state
- backend-specific rendering isolated from node state
- shared paint pipeline
- shared stroke pipeline
- dirty-state rendering
- demand-driven invalidation
- render caching
- gradient caching
- spatial culling
- efficient hit testing
- efficient hierarchy traversal
- reduced unnecessary allocations
- predictable behavior under animation

Expensive features such as mesh gradients should avoid full rerasterization when their effective state has not changed.

---

## Document Model and Serialization

Before 3.0, scene data should be robust enough for real editor documents.

Goals:

- stable serialization
- stable deserialization
- version-aware document format
- hierarchy restoration
- deterministic node state
- assets/media references
- compatibility strategy for future schema changes

Document data must not depend on a particular renderer backend.

---

## 3.0 - Complete Editor Engine Foundation

Flowscape 3.0 is the milestone where the engine should provide the **core capabilities required to build a modern Figma-class 2D editor experience without rebuilding the fundamental editor systems from scratch**.

The application developer should primarily need to build:

- product-specific UI
- panels
- menus
- branding
- workflows
- collaboration/business logic
- application-specific features

The underlying engine should already provide the reusable graphical editor foundation.

Expected 3.0-level capabilities include:

- complete shape primitives
- fills and advanced gradients
- borders/strokes
- vector paths and point editing
- Pen and Pencil tools
- lasso and area selection
- multi-selection
- transforms including skew
- snapping and guides
- groups and frames
- clipping/masking
- history with undo/redo
- robust hit testing
- import/export
- clipboard foundations
- text and media support
- editor-ready interaction primitives
- performant rendering for large scenes
- stable serialization

---

## Beyond 3.0

The following areas are intentionally considered longer-term work and are not required to define the 3.0 milestone.

### Rendering Backends

Continue moving toward a renderer-agnostic architecture capable of supporting multiple backends.

Potential backends include:

- Canvas 2D / Konva
- PixiJS / WebGL
- WebGPU

The engine model should not be rewritten for each backend.

### Framework Integration

Flowscape should remain web-first and framework-agnostic.

Framework packages should be thin adapters around the same core engine rather than separate implementations.

Potential adapters include:

- React
- Vue
- Angular
- Svelte
- other web frameworks

### WASM / Native Core

Long-term investigation may include moving performance-sensitive parts of the engine to Rust/WASM where there is a measurable benefit.

This should be driven by profiling rather than by architecture for its own sake.

### Extensibility

Long-term goals may include:

- custom node types
- custom tools
- custom renderers
- plugin-style extensions
- reusable editor modules

---

## Roadmap Principles

1. **Core before UI.** Flowscape provides editor foundations, not one fixed editor interface.
2. **Framework-agnostic by default.** Engine logic must not depend on React, Vue, Angular, or another UI framework.
3. **Renderer-independent where possible.** Core node state must not depend on Konva or another rendering backend.
4. **Public API stability matters.** Breaking changes should be deliberate and justified.
5. **Performance is part of correctness.** Features that work but make large documents unusable are not complete.
6. **Reusable primitives over product-specific features.** New engine functionality should be useful across multiple kinds of editors.
7. **Architecture may evolve.** The roadmap describes product direction, not immutable implementation details.

---

## Status

This document describes the intended direction from **2.0.2** toward **3.0**.

Items may move between milestones as implementation experience reveals better architectural boundaries.

Progress should be reflected through releases, the changelog, issues, and pull requests.
