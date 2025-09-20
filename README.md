[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Donate-Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/flowscape)

# @flowscape-ui/core-sdk

Universal canvas core built on Konva. Framework-agnostic and designed to be wrapped by provider adapters (Svelte / Angular / Vue / React).

## Features

- Canvas abstraction powered by Konva
- Framework-agnostic core with clean API
- TypeScript-first with typed public API
- ESM + CJS builds with type declarations
- Dev playground powered by Vite
- Strict ESLint 9 setup and tsconfig
- CI on dev/main/release; manual publish workflow

## Getting Started (Development)

Install deps (choose one):

- npm (recommended, deterministic): `npm ci`
- Bun (supported): `bun install`

Run scripts:

- Dev playground: `npm run dev` or `bun run dev`
- Build library: `npm run build` or `bun run build`
- Lint: `npm run lint` or `bun run lint`
- Typecheck: `npm run typecheck` or `bun run typecheck`

The playground imports from `src/` directly for rapid iteration.

Dev server is pinned to `http://localhost:5173/` via `playground/vite.config.ts`.

## Branching strategy

- `dev`: active development branch
- `main`: protected, merges from `dev`, no auto-publish
- `release`: dedicated branch for releases

Publishing to npm is only possible via the GitHub Actions manual workflow `Publish to npm` with a valid `NPM_TOKEN`. Local `npm publish` is blocked.

## Publishing

Run the GitHub Action: Actions -> Publish to npm -> Run workflow.
Optionally select a version bump (patch/minor/major). The workflow will build and publish to npm.

Ensure:

- You are on `release` branch or using a release tag.
- `NPM_TOKEN` secret is configured in the repository.

## License

Apache-2.0 © Flowscape UI Team
