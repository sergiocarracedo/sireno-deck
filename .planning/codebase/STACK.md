# Stack

## Overview

- Workspace package manager: `pnpm@10.0.0` in `package.json`
- Primary runtime: Node.js 20 target via `packages/cli/tsdown.config.ts`
- Language: TypeScript with strict mode in `packages/cli/tsconfig.json`
- Module format: ESM across the workspace (`type: module` in root and package manifests)
- Main app package: `packages/cli/package.json`
- Built-in addon packages: `builtin-addons/core-buttons`, `builtin-addons/emoji-selector`, `builtin-addons/date-time`

## Core Libraries

- CLI parsing: `yargs` in `packages/cli/package.json`
- Validation: `zod` in `packages/cli/package.json`
- YAML parsing: `js-yaml` in `packages/cli/package.json`
- Rendering model: `react` + `react-reconciler` in `packages/cli/package.json`
- Image generation: `sharp` in `packages/cli/package.json`
- Hardware integration: `@elgato-stream-deck/node` in `packages/cli/package.json`
- System metrics: `systeminformation` in `packages/cli/package.json`
- Command execution: `execa` in `packages/cli/package.json`
- Logging: `pino` + `pino-pretty`

## Tooling

- Build: `tsdown` via `packages/cli/tsdown.config.ts`
- Tests: `vitest` via root `package.json` and `packages/cli/vitest.config.ts`
- Linting: `oxlint` from root `package.json`
- Formatting: `oxfmt` from root `package.json`

## Package Boundaries

- Root workspace scripts fan out recursively: `build`, `dev`, `test` in `package.json`
- CLI entrypoint is `packages/cli/src/cli/index.ts`
- Built-in addons are versioned as workspace-local addon packages with `sirenoAddon` metadata in each `builtin-addons/*/package.json`

## Notable Version/State Notes

- The CLI package version is still `0.1.0` in `packages/cli/package.json`
- The roadmap/planning artifacts indicate Phase 5 shipped and v1.1 milestone setup has started in `.planning/STATE.md`
- The codebase is mid-evolution: `builtin-addons/date-time/` now exists as a package boundary, but the date/time feature work is not yet fully planned/executed for the new milestone
