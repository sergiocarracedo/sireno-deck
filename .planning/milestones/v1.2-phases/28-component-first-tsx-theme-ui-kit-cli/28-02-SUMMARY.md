# Plan 28-02 Summary

**Completed:** 2026-05-27

## What was built
Moved the repo's primary built-in interaction path off the helper-factory presentation seam and onto the new component-first TSX kit. The shipped core buttons (`action`, `change-deck`, `toggle`, and `media-sample`) now render through `Icon`, `Text`, normal TSX composition, and `ButtonSurface` where needed, while keeping their existing tap/refresh/runtime behavior intact.

This slice also moved the runtime-owned temporary reload error deck onto the same component-first surface instead of leaving fallback UI behind on `createDomStack(...)` and `createDomTextLabel(...)`. The result is that both shipped built-ins and runtime fallback rendering now prove the same TSX kit on the real runtime/start seams without introducing a compatibility wrapper around the old helpers.

## Key files
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`: replaced helper-built stacked markup with `Icon` + `Text` composition while preserving the existing frame classes and balanced centered label output the DOM-path tests already lock.
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts`: migrated the navigation button render tree from `createDomIcon`/`createDomTextLabel`/`createDomStack` to the new TSX kit without changing navigation behavior.
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`: kept all toggle state, command, and invalidation semantics authoritative in runtime code while replacing helper-built primary/secondary label rendering with `Text` and `Icon`.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.ts`: preserved sampled full-surface metadata and overlay behavior while switching the caption off `createDomTextLabel` and onto `Text`.
- `packages/cli/src/deck/runtime.ts`: migrated the runtime-owned temporary reload error deck from helper factories to `ButtonSurface` + `Text` composition so fallback UI follows the same component-first surface as shipped buttons.

## Decisions made
- Kept the migration surgical: presentation trees changed, but command execution, navigation, invalidation, sampled-surface metadata, and temporary-error ownership stayed where they already belonged.
- Preserved the existing observable DOM contract where tests already locked it, especially the `action` button frame classes and text styling assertions.
- Did not touch remaining helper usage outside this plan surface (`date-time`, `emoji-selector`, public helper exports, and helper-focused tests), because those belong to later Phase 28 waves.

## Notes for downstream
- `28-02` proves the new TSX kit on the main built-in/runtime path, but helper exports and helper-backed addon families still exist elsewhere. The hard cut is not complete until `28-03` removes the remaining shipped/helper-facing surfaces.
- The runtime temporary error deck now shares the same component-first rendering model as shipped built-ins. Future fallback UI work should stay on this surface instead of reintroducing ad hoc helper-built trees.
