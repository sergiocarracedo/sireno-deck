# Plan 16-02 Summary

**Completed:** 2026-05-19

## What was built
The daemon startup path now knows which files participated in the active config graph and watches exactly those files with a narrow debounced reload manager. Successful reloads rebuild runtime state from scratch, then restore the strongest valid user context: full stack first, active deck second, and `main_deck` only as the final fallback.

## Key files
- `packages/cli/src/config/loader.ts`: exposes config source metadata through `loadConfigWithSources()`.
- `packages/cli/src/cli/commands/start.ts`: adds config-file watching, debounced reload orchestration, and post-reload navigation restoration.
- `packages/cli/src/deck/runtime.ts`: exposes stack snapshot and stack restore as explicit runtime seams.
- `packages/cli/src/deck/runtime.test.ts`: proves rebuilt runtimes can restore saved navigation stacks.
- `packages/cli/src/cli/commands/start.test.ts`: proves config-graph watching and reload navigation fallback behavior.

## Decisions made
- Rebuilt runtimes completely on valid reload instead of trying to migrate button instance or scheduler state across config snapshots.
- Watched only the root config plus loaded referenced deck files instead of watching directories or broader config trees.

## Deviations
- Used Node's built-in `fs.watch` with a narrow debounce instead of adding a new watcher dependency in this phase.

## Notes for downstream
- Reload callbacks must bind to the runtime-local theme snapshot; using a mutable outer theme variable caused a real stale-theme regression that was fixed during execution.
- Invalid reload behavior is intentionally separate from this happy-path slice and is handled by the runtime-owned error deck in `16-03`.
