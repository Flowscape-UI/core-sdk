# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Flowscape-UI/core-sdk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Flowscape-UI/core-sdk/releases/tag/v1.0.0
