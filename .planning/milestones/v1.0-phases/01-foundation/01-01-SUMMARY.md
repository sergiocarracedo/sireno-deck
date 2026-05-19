# Plan 01-01 Summary

**Completed:** 2026-05-12
**Phase:** 1 — Foundation

## What was built
Set up the pnpm workspace, the `sireno-deck` package, and the initial CLI binary. Added strict zod-backed config validation, YAML config discovery/loading, colored config error formatting, and shared pino logging so the CLI can load a config and fail with readable diagnostics.

## Key files
- `package.json`: Root pnpm workspace scripts and tooling entrypoints.
- `packages/sireno-deck/package.json`: CLI package manifest and binary mapping.
- `packages/sireno-deck/tsdown.config.ts`: Build output configuration for the CLI binary.
- `packages/sireno-deck/src/core/schemas.ts`: Strict config schemas and typed config validation error model.
- `packages/sireno-deck/src/config/loader.ts`: Config discovery, YAML parsing, and validation pipeline.
- `packages/sireno-deck/src/util/errors.ts`: Colored config error formatter with suggestion support.
- `packages/sireno-deck/src/util/logger.ts`: Shared pino logger factory.
- `packages/sireno-deck/src/cli/index.ts`: CLI entrypoint with real config-aware startup wiring.

## Decisions made
- Extended `ConfigValidationError` to carry suggestion and path metadata so loader and formatter can preserve useful context.
- Resolved XDG config discovery through `XDG_CONFIG_HOME` when present to keep tests deterministic.
- Switched tsdown entry naming so build output matches the planned `dist/cli.js` binary path.

## Deviations from plan
- Fixed `@types/yargs` from a non-existent `^18.0.0` version to `^17.0.35` after `pnpm install` exposed the manifest bug.
- Tightened loader/error propagation beyond the original task text so invalid config errors actually include file path, line number, and suggestion end-to-end.

## Notes for downstream
- Phase 2 can assume CLI startup, config loading, and logger creation are already centralized.
- The config loader now supports test-safe XDG overrides, which should be reused for future filesystem-dependent tests.
