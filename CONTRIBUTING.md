# Contributing to Flowscape

Thank you for your interest in contributing to Flowscape.

Flowscape is an open-source 2D engine for building infinite canvas applications, design tools, visual builders, whiteboards, diagram editors, and other graphical products.

Contributions of all kinds are welcome, including bug fixes, performance improvements, documentation updates, tests, new features, and architectural discussions.

---

## Getting Started

Flowscape is developed as a monorepo using:

- [Bun](https://bun.sh/)
- [Turborepo](https://turborepo.com/)
- TypeScript
- tsdown

Clone the repository:

```bash
git clone https://github.com/Flowscape-UI/core-sdk.git
cd core-sdk
```

Install dependencies:

```bash
bun install
```

---

## Repository Structure

The repository is organized as a monorepo:

```text
flowscape/
├── apps/
│   ├── docs/
│   └── playground/
│
├── packages/
│   └── engine/
│
├── package.json
├── turbo.json
└── bun.lock
```

### `apps/playground`

The interactive development environment for Flowscape.

The Playground should consume the engine through its public package API:

```ts
import {
  Scene,
  NodeRect,
} from '@flowscape-ui/core-sdk';
```

It should not import directly from internal engine source files.

### `apps/docs`

The documentation application for Flowscape.

Documentation for public APIs, concepts, and usage examples belongs here.

### `packages/engine`

The main Flowscape engine.

This package is published as:

```text
@flowscape-ui/core-sdk
```

Core engine logic, scene architecture, nodes, renderers, input systems, and other engine-level functionality live here.

---

## Development

### Run the Playground

```bash
bun run dev:playground
```

Use the Playground when developing or testing engine functionality.

Changes to the engine should be tested through the public package API whenever possible.

---

### Run the Documentation

```bash
bun run dev:docs
```

---

### Run All Development Tasks

```bash
bun run dev
```

This runs the available `dev` tasks across the monorepo through Turborepo.

---

## Building

Build the entire monorepo:

```bash
bun run build
```

Build only the Playground:

```bash
bun run build:playground
```

Build only the documentation:

```bash
bun run build:docs
```

Turborepo automatically resolves dependencies between workspace packages and runs required build tasks in the correct order.

---

## Type Checking

Run TypeScript checks across the repository:

```bash
bun run typecheck
```

All TypeScript errors should be resolved before submitting a pull request.

---

## Linting

Run lint checks:

```bash
bun run lint
```

Please avoid introducing new lint errors or warnings.

---

## Formatting

Format the repository with Prettier:

```bash
bun run format
```

Check formatting without modifying files:

```bash
bun run format:check
```

---

## Testing

Run the test suite:

```bash
bun run test
```

Changes that affect engine behavior should include tests when practical.

Bug fixes should preferably include a regression test that demonstrates the issue being fixed.

---

## Public API

Flowscape has a clearly defined public API.

Consumers should import from:

```ts
import {
  Scene,
  NodeRect,
} from '@flowscape-ui/core-sdk';
```

Do not rely on internal paths such as:

```ts
import { Scene } from '@flowscape-ui/core-sdk/src/scene';
```

Internal modules may change without notice.

When adding functionality intended for Flowscape users, make sure it is exported through the public entry point:

```text
packages/engine/src/index.ts
```

Before introducing or changing a public API, consider:

- Is the API necessary?
- Is the naming consistent with existing Flowscape APIs?
- Can the functionality be extended later without breaking users?
- Does the change introduce a breaking change?
- Should the behavior be documented?

Public API stability is important for Flowscape.

Avoid breaking existing APIs unless the change is intentional and appropriate for a major release.

---

## Engine Architecture

Flowscape separates scene state, rendering, and interaction systems.

At a high level:

```text
Scene
├── Background Layer
├── World Layer
│   └── Nodes
├── Overlay Layer
│   └── Handles / Selection / Transformations
└── UI Layer
```

When contributing to the engine, try to preserve architectural boundaries.

For example:

- Scene logic should not depend unnecessarily on a specific rendering backend.
- Renderer implementations should remain separate from core node state.
- Input logic should remain separated from rendering where practical.
- Applications such as the Playground should not access engine internals directly.
- New functionality should have a clear ownership area within the engine.

Large architectural changes should preferably be discussed before implementation.

---

## Adding Dependencies

Dependencies should be added to the workspace that actually uses them.

For example, a dependency used only by the engine belongs in:

```text
packages/engine/package.json
```

A dependency used only by the Playground belongs in:

```text
apps/playground/package.json
```

Avoid adding package-specific dependencies to the root `package.json`.

The root package should primarily contain tooling used to manage the monorepo itself.

---

## Commit Guidelines

Keep commits focused and descriptive.

Examples:

```text
fix: correct ellipse hit testing
feat: add renderer abstraction for gradients
refactor: simplify overlay interaction ownership
docs: update Scene API documentation
test: add NodePath resize regression test
```

A single commit should ideally represent one logical change.

Avoid mixing unrelated refactoring, formatting, and feature work into the same commit when possible.

---

## Pull Requests

Before opening a pull request:

1. Make sure the project builds successfully.
2. Run type checking.
3. Run linting.
4. Run tests.
5. Test relevant changes in the Playground.
6. Update documentation if the public API or behavior changed.
7. Update the changelog when appropriate.

Recommended checks:

```bash
bun run build
bun run typecheck
bun run lint
bun run test
```

A pull request should clearly explain:

- What changed
- Why the change was necessary
- How the change was tested
- Whether the public API changed
- Whether the change is backward compatible

Screenshots or recordings are encouraged for visual or interaction-related changes.

---

## Reporting Bugs

When reporting a bug, please include as much relevant information as possible:

- Flowscape version
- Browser and operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Minimal reproduction when possible
- Screenshots or recordings for visual issues

For rendering or interaction bugs, a small reproduction in the Playground is especially useful.

---

## Feature Requests

Feature requests are welcome.

Please describe:

- The problem you are trying to solve
- The proposed behavior
- Why the feature belongs in the engine rather than application-level code
- Possible alternatives
- Any expected impact on the public API

Flowscape is intended to remain a flexible engine rather than a collection of application-specific features.

New features should generally provide reusable foundations that can benefit multiple types of graphical applications.

---

## Breaking Changes

Breaking changes require extra care.

Before introducing one, consider whether the same goal can be achieved through:

- a new API
- deprecation
- an adapter
- backward-compatible behavior

When a breaking change is necessary, it should be clearly documented and included in the appropriate release notes and changelog.

---

## Changelog

Notable user-facing changes should be documented in:

```text
CHANGELOG.md
```

During development, changes may be added under:

```md
## [Unreleased]
```

Examples of changes worth documenting:

- New public APIs
- New engine capabilities
- Breaking changes
- Significant architecture changes
- Important bug fixes
- Performance improvements

Internal refactoring with no observable impact usually does not require a changelog entry.

---

## Documentation

Public features should be documented.

Documentation should explain:

- What the feature does
- Why it exists
- How to use it
- Important limitations
- Relevant examples

Simple examples are preferred over unnecessarily complex ones.

The README should remain focused on project introduction and quick start.

Detailed engine documentation belongs in:

```text
apps/docs
```

---

## Code Philosophy

Flowscape aims to be:

- predictable
- extensible
- framework-agnostic
- renderer-independent where possible
- strongly typed
- suitable for large editor applications

Prefer clear architecture over clever abstractions.

Prefer APIs that remain understandable without knowledge of internal implementation details.

Avoid introducing abstractions before they solve a real problem.

---

## Questions and Discussions

For larger architectural proposals or significant changes, opening an issue or discussion before implementing the full solution is encouraged.

This helps ensure that the proposed direction fits the long-term architecture of Flowscape.

---

## License

By contributing to Flowscape, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

Thank you for helping improve Flowscape.