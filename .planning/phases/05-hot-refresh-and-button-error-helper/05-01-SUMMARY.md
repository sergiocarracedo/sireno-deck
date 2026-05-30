# Plan 05-01 Summary

**Completed:** 2026-05-30

## What was built
Phase 5's first slice made the in-process reload seam in `start.ts` explicit without widening what the daemon claims to hot-reload. Successful config-owned reloads now flow through one named runtime-apply helper, the merged config-plus-theme watch graph is deduplicated, and focused loader/start tests now prove that config/deck/theme files belong to the in-process seam while addon source edits stay on the external `cli:dev` `tsx watch` restart path.

## Key files
- `packages/cli/src/cli/commands/start.ts`: extracts the successful runtime swap into `applyReloadedRuntime(...)` and deduplicates the in-process reload file graph returned by `loadRuntimeConfig(...)`.
- `packages/cli/src/cli/commands/start.test.ts`: adds regression coverage for the deduplicated config/deck/theme reload graph and explicitly proves addon source edits are not silently claimed by the in-process seam.
- `packages/cli/src/config/loader.test.ts`: adds a focused loader-level proof that `loadConfigWithSources().filePaths` remains scoped to config-owned files rather than addon source paths.

## Decisions made
- Kept the implementation narrow by extracting the existing successful reload/swap path instead of inventing a second reload mechanism or changing the config-validation fallback behavior.
- Treated `loadRuntimeConfig(...)` as the truthful config/deck-plus-theme merge seam while leaving addon raw-source edits on the already-shipped external `cli:dev` restart loop.

## Deviations
- The plan mentioned `packages/cli/src/config/loader.ts`, but the truthful boundary already existed there; execution only needed tests in `loader.test.ts` plus a minimal dedupe in `start.ts` rather than a loader implementation change.
- The plan's example verify command using package-level `pnpm --filter ... test` surfaced unrelated pre-existing failures, so verification used narrower `pnpm exec vitest run ... -t ...` commands for the specific loader/start seams touched by this slice.

## Notes for downstream
- The next wave should preserve the distinction established here: in-process reload owns config/deck/theme graph changes, while raw addon/theme/React source edits remain on the external `tsx watch` full-process restart seam unless the runtime explicitly adopts a narrower owned invalidation path.
- Broad package test runs currently include unrelated pre-existing failures, so downstream Phase 5 tasks should keep using focused `vitest` targets for touched seams until those separate failures are resolved.
