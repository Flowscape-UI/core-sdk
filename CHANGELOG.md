# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.0.0] - 2026-04-09

### Status

- Not everything planned for version 2.0.0 is fully implemented yet.
- Some parts are still being finalized and stabilized.

### Architecture

- Reworked project architecture with clearer engine-level boundaries.
- Added and expanded helper tooling around the core runtime.
- Made project structure easier to navigate and maintain.
- Split modules by responsibility so each zone has a clear ownership model.

### Improvements

- The project now aligns with an engine-level direction, not a mixed toolkit state.
- Returning to previous behavior/version paths is now simpler and higher quality due to clearer module boundaries.
- Internal development workflows are more predictable and easier to scale.

## [1.0.8] - 2026-01-24

### ✨ New Features

- **Alt+Drag cloning for nodes**
  - Hold `Alt` and drag with **left mouse button** to clone selected nodes
  - Cloned nodes follow the cursor while originals stay in place for precise duplication
  - Works with multi-selection and respects existing selection behavior

### 🐛 Fixes

- Alt key state after paste/drag & drop
  - Fixed cases where browsers (especially Firefox-based) could leave `Alt` stuck as pressed
  - Ensures Alt-based hotkeys and cloning mode reliably reset after paste and drag & drop operations
- Middle mouse paste vs. canvas interactions
  - Resolved conflicts between middle-click paste from clipboard and canvas interactions
  - Prevents accidental content insertion while using middle mouse for navigation/interaction
- Camera panning and cursor behavior
  - Stabilized middle/right mouse panning to work even when other Konva handlers stop events
  - Kept grab cursor consistent during panning via DOM-level listeners

### 🛠 Improvements

- Alt-clone UX
  - Auto-pan canvas near viewport edges while Alt-cloning, keeping cloned nodes in view on large canvases
  - Improved clone drag behavior with selection and visual guides
  - Better interaction with frame nodes and nested structures

## [1.0.7] - 2026-01-18

### ✨ New Features

- PersistencePlugin: local canvas persistence backed by IndexedDB
  - Automatic saving and restore of canvas state
  - JSON import/export helpers for backup and sharing

### 🐛 Fixes

- Deserialization: restore transform attributes for all node types on load
  - Apply `scaleX/scaleY`, `rotation`, `skewX/skewY`, `offsetX/offsetY` during canvas restore
  - Fixes the issue where visual sizes were lost after page reload for many node types

### 🛠 Improvements

- Storybook Playground: auto-save via `PersistencePlugin` when editing from UI
  - Sidebar controls (fill, stroke, stroke width, opacity, font size) trigger `save()`
  - Property panel for selected node also triggers `save()` on changes

## [1.0.6] - 2025-12-23

### ✨ New Features

- **FrameNode (experimental)**
  - New container node type inspired by Figma frames
  - Supports dragging by label and by bbox (including auto-pan)
  - Provides clipped content area via internal `contentGroup`

### ⚠️ Experimental Status & Limitations

- FrameNode is **experimental** and intentionally shipped with some limitations:
  - No copy/paste of FrameNode yet
  - No nesting: FrameNode inside another FrameNode is not supported yet
  - No grouping FrameNode with other nodes via `GroupNode`
  - No grouping FrameNode with other FrameNodes
- These limitations are planned to be lifted in future releases as the API and UX stabilize.

---

## [1.0.5] - 2025-12-19

### 🐛 Fixes

    - Temp-multi selection with auto-pan, rotation, and virtualization
    - Keep temp-multi nodes visible during viewport culling to prevent visual "loss" of group members
    - Prevent culling of real Konva.Group children to maintain stable group transforms
    - Apply temp-multi transforms in world-local coordinates to isolate from camera pan/zoom
    - Shift overlay transform reference point during auto-pan to keep resize deltas consistent
    - Enable auto-pan loop for temp-multi resize operations
    - Add rotation support

---

## [1.0.4] - 2025-12-18

### ✨ New Features

- **Paste from Clipboard (Ctrl+C / Ctrl+V)**
  - Paste **images of any browser-supported format** directly into the canvas
  - Paste **GIFs**
  - Paste **videos of any browser-supported format**
  - Paste **SVG files**
  - Paste **text**
  - Works the same way as in Figma — copy from any source, paste into the canvas

- **Drag & Drop from Desktop**
  - Drag & drop all supported file types directly from your computer into the canvas

- **Custom Rotation Cursor**
  - Added a custom cursor when rotating objects, improving UX and precision

---

### 🐛 Fixes

- Fixed an issue where **resizing non-standard shapes** could break their geometry
- Improved **text component behavior**
  - Text now **auto-resizes correctly**
  - Fixed a bug where text would jump out when entering text edit mode
- Fixed **lasso selection** behavior
  - Lasso continues to work correctly even when dragged outside the canvas bounds
- Fixed a bug with **multi-selection using Shift**
  - Selection state is now consistent and predictable

---

### 🛠 Improvements

- Overall stability and interaction polish across selection, resizing, and editing workflows

## [1.0.3] - 2025-12-13

### Added

- ✨ **History System** — Full undo/redo support with `HistoryPlugin`
  - Ctrl+Z for undo
  - Ctrl+Shift+Z for redo
  - Configurable history size
  - Tracks node creation, deletion, transformation, and grouping
- 📏 **Alignment Guides** — Smart visual guides with `VisualGuidesPlugin`
  - Automatic alignment guides during node movement and resizing
  - Center and edge alignment
  - Configurable snap threshold and guide colors
- ✏️ **Inline Text Editing** — Double-click text nodes to edit directly on canvas
  - Native contenteditable-based editing
  - Preserves text formatting
  - Auto-focus and selection
- 🔧 **Addons API** — Extend any component with custom functionality
  - Plugin addons for extending plugin behavior
  - Node addons for extending node behavior
  - Easy attachment and detachment
- 📐 **Canvas Auto-Resize** — Automatically adjusts canvas to window size changes
  - Responsive canvas behavior
  - Maintains aspect ratio and scale
- 🎨 **New Layer Shortcuts** — Enhanced z-index management
  - Ctrl+Shift+] — Bring to front
  - Ctrl+Shift+[ — Send to back
  - Ctrl+] — Move forward
  - Ctrl+[ — Move backward
- 🎮 **Storybook Demo** — Interactive playground to test all features
  - Complete documentation with live examples
  - All plugins and features demonstrated

### Changed

- 📦 **Full TypeScript Coverage** — Complete type definitions across all components
- ⚡ **Performance Improvements** — Optimized to handle 1000+ nodes without FPS drops
  - Improved rendering pipeline
  - Better event handling
  - Optimized transformation calculations
- SelectionPlugin: honors a stage-level `_skipSelectionEmptyClickOnce` flag to avoid clearing selection after marquee
- Playground (stories): plugin toggles now call `core.plugins.addPlugins/removePlugins` to enable/disable plugins at runtime

### Fixed

- AreaSelectionPlugin: fixed issue where a click right after lasso release immediately cleared the temporary group. Implemented one-time empty-click suppression and mouseup-driven suppression flag
- AreaSelectionPlugin: stabilized lasso behavior when the rectangle temporarily leaves intersected nodes (keeps last non-empty set instead of instant reset)
- Fixed lasso selection altering z-index inside temporary groups
- Fixed incorrect drag behavior inside parent groups before double-click edit mode

### Documentation

- 📚 Updated README with all new features and Storybook badge
- 📖 Complete Storybook documentation with interactive examples
- 🔗 Added Storybook deployment link
- ✨ Added "What's New in 1.0.3" section
- 📝 Updated all keyboard shortcuts documentation
- 🎯 Added comprehensive plugin documentation

## [1.0.1] - 2025-01-04

### Changed

- 🚀 **Bundle size optimization** — reduced from 1.8 MB to ~200-300 KB (6-9x smaller)
  - Disabled source maps in production build
  - Enabled minification for smaller bundle
  - TypeScript declarations remain fully readable
- 📚 **Documentation improvements**
  - Added complete keyboard shortcuts reference
  - Added all missing plugins to documentation (RulerHighlightPlugin, RulerManagerPlugin)
  - Added Buy Me A Coffee badge
  - Documented all hotkeys: Ctrl+G, Ctrl+Shift+G, Ctrl+C/V/X, Delete, Shift+R, etc.

### Fixed

- 🐛 Fixed production build issues with hotkeys and node type detection

## [1.0.0] - 2025-01-04

### Added

- 🎉 First public release
- ✨ Core `CoreEngine` built on Konva
- 🧩 Plugin system with extensible architecture
- 📐 Node manager with support for various shape types:
  - `ShapeNode` — rectangles with rounded corners
  - `CircleNode` — circles
  - `EllipseNode` — ellipses
  - `TextNode` — text elements
  - `ImageNode` — images
  - `ArcNode` — arcs
  - `ArrowNode` — arrows
  - `StarNode` — stars
  - `RingNode` — rings
  - `RegularPolygonNode` — regular polygons
  - `GroupNode` — element grouping
- 📷 Camera manager with zoom and panning
- 🎨 Built-in plugins:
  - `GridPlugin` — adaptive grid
  - `SelectionPlugin` — selection and transformation
  - `NodeHotkeysPlugin` — hotkeys (Ctrl+C/V/X, Delete, Ctrl+[/])
  - `CameraHotkeysPlugin` — camera controls (Ctrl+wheel, arrows)
  - `RulerPlugin` — rulers with measurement units
  - `RulerGuidesPlugin` — guide lines
  - `RulerHighlightPlugin` — ruler highlighting
  - `RulerManagerPlugin` — ruler management
  - `AreaSelectionPlugin` — area selection with frame
  - `LogoPlugin` — watermark/logo
- 🔄 `EventBus` system for inter-component communication
- 📦 Dual package (ESM + CJS) with full TypeScript typing
- 🧪 Comprehensive test coverage:
  - Copy/paste/cut operation tests
  - Grouping/ungrouping tests
  - Transformation and nested structure tests
- 📚 Detailed documentation and usage examples
- 🚀 Performance optimizations:
  - Tree-shaking support
  - Source maps for debugging
  - Minimal bundle size

### Fixed

- 🐛 Fixed hotkeys in production build
- 🐛 Fixed node serialization during copy/paste
- 🐛 Fixed plugin lookup via `instanceof` (minification-safe)
- 🐛 Fixed export typing for correct work in different environments

### Changed

- 🔧 Improved plugin system architecture
- 🔧 Optimized Konva layer handling (reduced layer count)
- 🔧 Improved keyboard event handling in production

[Unreleased]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.8...HEAD
[1.0.8]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.6...v1.0.7
[1.0.3]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.1...v1.0.3
[1.0.1]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Flowscape-UI/core-sdk/releases/tag/v1.0.0
