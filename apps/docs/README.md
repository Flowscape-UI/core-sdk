# Flowscape Documentation Website

This repository contains the official documentation website for **Flowscape**.

It is built with [Docusaurus](https://docusaurus.io/) and documents the engine from basic onboarding to advanced internals.

## What this docs site covers

- Intro and product overview
- Scene architecture (Background, World, Overlay, UI)
- Shape Nodes and node-specific API pages
- Advanced sections:
    - Core (interfaces, types, events, enableable, transform, math, camera)
    - Input System (Input + Controllers + custom controller guide)
    - Advanced Nodes deep dives (OBB, AABB, Pivot)
- Support, Changelog, FAQ, Donate, About Flowscape

## Tech stack

- Docusaurus 3
- React 19
- TypeScript
- `@flowscape-ui/core-sdk` (local tarball dependency)

## Local development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run start
```

Build static site:

```bash
npm run build
```

Serve production build locally:

```bash
npm run serve
```

Type-check docs site code/components:

```bash
npm run typecheck
```

## Notes about SDK dependency

The docs currently use a local SDK package:

`@flowscape-ui/core-sdk: file:../../core-sdk/flowscape-ui-core-sdk-2.0.0.tgz`

If you publish a new SDK version, update this dependency in `package.json` and reinstall.

## Content structure

- `docs/` — documentation pages (`.md` and `.mdx`)
- `src/components/` — custom React components used in docs (grids, badges, live scene preview)
- `src/pages/` — landing page
- `src/css/custom.css` — global visual styling
- `static/` — static assets (images, video)

## Authoring guidelines (short)

- Keep naming consistent: **Flowscape**
- Keep docs practical and editor-oriented
- Prefer short sections and clear API tables
- Use live previews where visual behavior matters (nodes, bounds, pivot, input behavior)
