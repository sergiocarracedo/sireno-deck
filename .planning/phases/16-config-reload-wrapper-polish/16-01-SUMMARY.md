# Plan 16-01 Summary

**Completed:** 2026-05-19

## What was built
Phase 16 now supports deck-only file references through `decks.<id>: @path/to/deck.yml`, with relative paths resolved from the owning YAML file and absolute paths still accepted. Referenced deck files flow through the same bootstrap and full-schema validation path as inline decks, so strict `deck.id`, `main_deck`, button validation, and path-aware `ConfigValidationError` reporting remain intact instead of degrading into a second-class include path.

## Key files
- `packages/cli/src/config/loader.ts`: expands deck references before validation, tracks referenced deck sources, and remaps validation failures back to the correct source file and line.
- `packages/cli/src/config/loader.test.ts`: covers relative and absolute deck refs plus missing-file, wrong-shape, `deck.id` mismatch, and nested validation failures.
- `packages/cli/src/core/schemas.ts`: continues enforcing the existing strict config contract on the expanded config object.

## Decisions made
- Kept deck references intentionally narrow to `decks.<id>` only and did not widen the feature into a generic YAML include system.
- Preferred YAML path-based line lookup over coarse schema metadata when reporting nested errors from referenced deck files.

## Deviations
- None.

## Notes for downstream
- Loader output now knows the config file graph, which made the later hot-reload work possible without watching whole directories.
- Several stale tests in the repo still assumed the old bundled `display-text` button type and were realigned to the current `action` contract during execution.
