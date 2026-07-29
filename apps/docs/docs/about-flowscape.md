---
sidebar_position: 1.66
title: About Flowscape - Open-Source 2D Engine for Editor-Style Apps
sidebar_label: About Flowscape
slug: /about-flowscape
description: "Flowscape is an open-source MIT-licensed 2D engine for editor-style products with scene layers, camera control, and a renderer-agnostic architecture."
---

## About Flowscape

Flowscape is an open-source 2D engine for building editor-style products such as whiteboards, visual builders, diagram tools, and design editors.  
It is framework-agnostic and TypeScript-first, so you can embed it into existing React, Vue, Svelte, Angular, or vanilla TypeScript applications.  
The architecture is centered around a scene model, camera, and separated layers, which makes interaction-heavy products easier to build and maintain.

## Key Facts

| | |
|---|---|
| **Type** | 2D engine for editor-style applications |
| **Package** | [`@flowscape-ui/core-sdk`](https://www.npmjs.com/package/@flowscape-ui/core-sdk) |
| **Current major version** | `2.x` |
| **Language** | TypeScript |
| **License** | MIT |
| **GitHub** | [github.com/Flowscape-UI/core-sdk](https://github.com/Flowscape-UI/core-sdk) |
| **Issues** | [GitHub Issues](https://github.com/Flowscape-UI/core-sdk/issues) |
| **Community** | [Discord](https://discord.gg/GBVWxGuyTn) |

## Where Flowscape Fits

Flowscape is an engine, not an opinionated UI framework and not a narrow domain SDK.  
That means you control your product architecture while using engine-level primitives for rendering, camera, input, and node lifecycle.

It can be used in:

- Browser apps (single-page apps, admin tools, editors)
- Desktop apps (Electron, Tauri)
- Mobile apps through WebView-based stacks (for example, Capacitor-based products)

## Architecture

Flowscape scene composition:

```text
Scene
|- Background  (visual base)
|- World       (main editable content)
|- Overlay     (selection, handles, guides)
`- UI          (toolbars and interface modules)
```

- **Background**: Fill, image, and visual foundation.
- **World**: Nodes and main editable coordinates.
- **Overlay**: Interaction visuals and transform helpers.
- **UI**: Interface modules that are not part of world transforms.

This layered design helps isolate responsibilities and keeps large editor codebases manageable.

## Core Capabilities

- Scene-based architecture with clear layer responsibilities
- Camera control for pan/zoom workflows
- Node-based world model for shapes and editor objects
- Renderer abstraction for backend flexibility (current canvas stack, future backend evolution)
- Input controller model for predictable editor interactions
- TypeScript-first API for safer integrations and refactors

## Links

- [Intro](./intro)
- [Overview](./overview)
- [Support](./support)
- [Donate](./donate)
- [Changelog](./changelog)
- [GitHub Repository](https://github.com/Flowscape-UI/core-sdk)
- [Issues](https://github.com/Flowscape-UI/core-sdk/issues)
