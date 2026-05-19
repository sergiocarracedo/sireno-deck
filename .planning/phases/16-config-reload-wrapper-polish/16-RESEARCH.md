# Phase 16 Research — Config Reload + Wrapper Polish

**Date:** 2026-05-19
**Requirement:** Post-roadmap scope for Phase 16

## Don't Hand-Roll

- [VERIFIED: codebase] Do not invent a second config-loading pipeline for referenced deck files. `packages/cli/src/config/loader.ts` already owns file discovery, YAML parsing, host-context interpolation, and line-aware `ConfigValidationError` remapping, so deck references should expand through that same seam instead of creating a runtime-only include path that would lose diagnostics.
- [CITED: https://github.com/paulmillr/chokidar] Do not hand-roll cross-platform file watching on top of raw `fs.watch` if live reload becomes flaky. Chokidar exists specifically to normalize duplicate/rename-style events, handle atomic writes, and support recursive watch sets with lower surprise than raw watchers.
- [CITED: https://nodejs.org/api/fs.html#fswatchfilename-options-listener] Do not assume raw `fs.watch` is stable enough by itself for precise config-reload semantics. Node documents caveats around watcher availability, inode behavior, and filename reliability, so a reload manager should either accept those caveats explicitly or use a normalization layer.
- [VERIFIED: codebase] Do not widen the shared wrapper cleanup into a broader styling system. Phase 13 already locked the project into narrow explicit wrapper/style contracts, and `packages/cli/src/render/text-image.ts` still has one shared/default branch that can absorb the footer removal and accent override without inventing new render primitives.

## Common Pitfalls

- [VERIFIED: codebase] Resolving `@path` after schema validation will break the current `main_deck`, `deck.id`, and path-aware error guarantees. The bootstrap schema currently expects `decks` to already be concrete deck objects, so include expansion must happen before or during bootstrap parsing, not after `validateBootstrapConfig()` has already made assumptions about shape.
- [CITED: https://github.com/nodeca/js-yaml] `js-yaml` does not provide a built-in general include mechanism for this use case. If Phase 16 wants deck-file references, it needs an explicit pre-validation expansion step; pretending YAML itself will resolve `@path` would be wrong.
- [CITED: https://github.com/paulmillr/chokidar] Watching too much of the filesystem wastes resources and increases noisy reloads. Chokidar explicitly warns that it recursively watches everything in scope, so the watch list should be the root config plus actually loaded referenced files, not an entire config directory tree.
- [VERIFIED: codebase] Preserving only the active deck id but not the full stack would be weaker than the continuity standard already shipped in Phase 11 lock/unlock restore. `packages/cli/src/deck/controller.ts` already exposes `getStackSnapshot()` and `restoreStack()`, so reload continuity should reuse that full-stack seam.
- [VERIFIED: codebase] Trying to migrate live button instance state across reloads will create fragile heuristics around instance identity, config equality, and scheduler reuse. `packages/cli/src/deck/runtime.ts` currently treats runtime instances as in-memory products of one config snapshot; rebuilding them on reload is much safer and matches the user's authoritative-config decision.
- [VERIFIED: codebase] A config-authored error deck would be circular during invalid reloads. The fallback surface must be runtime-owned because the new config may be precisely what is broken.

## Existing Patterns in This Codebase

- [VERIFIED: codebase] `packages/cli/src/config/loader.ts` already parses one root YAML file, interpolates host placeholders, and remaps schema failures to source line numbers.
- [VERIFIED: codebase] `packages/cli/src/config/loader.test.ts` already covers config discovery, strict unknown-key failures, lock-deck references, addon-backed expansion, primitive refs, and host-context interpolation. Phase 16 should follow that focused loader-test style instead of proving the loader only indirectly.
- [VERIFIED: codebase] `packages/cli/src/cli/commands/start.ts` is the startup orchestration seam that currently wires loader output, theme resolution, device lifecycle, and runtime creation together. A reload manager likely belongs here or immediately adjacent to it.
- [VERIFIED: codebase] `packages/cli/src/deck/runtime.ts` already owns button instance lifecycle, deck activation, render callbacks, and stack preservation semantics for lock mode. It is the right place to expose or reuse state snapshots needed for successful reload restore.
- [VERIFIED: codebase] `packages/cli/src/render/text-image.ts` still renders the theme-name footer in the shared/default branch, making that file the direct seam for the wrapper cleanup and accent override behavior.
- [VERIFIED: codebase] Built-in wrapper/style defaults currently come from `builtin-addons/core-buttons/src/index.ts`, where the shared wrapper and `accent` style are already registered through the same primitive path external addons use.
- [VERIFIED: .planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md] Prior project guidance explicitly favors narrow render-surface extensions over broader renderer redesign when one explicit seam can carry the feature.

## Recommended Approach

- [HIGH][VERIFIED: codebase] Add an explicit deck-reference expansion step inside `packages/cli/src/config/loader.ts` that runs before bootstrap validation. Restrict it to `decks.<id>` values, require full deck objects in referenced files, allow absolute paths, resolve relative paths from the owning file, and feed the expanded object back into the existing bootstrap/full validation pipeline.
- [HIGH][VERIFIED: codebase] Make loader output track the set of files that participated in the final config. Phase 16 needs that metadata so startup/reload code can watch exactly the root config plus loaded refs and refresh the watch set after each successful reload.
- [HIGH][CITED: https://github.com/paulmillr/chokidar][CITED: https://nodejs.org/api/fs.html#fswatchfilename-options-listener] Prefer a watcher abstraction that tolerates editor atomic writes and duplicate low-level events. Given the repo already targets Node 20+ and has no existing watcher dependency, planning should explicitly compare a minimal `fs.watch` wrapper against adding chokidar, but it should not pretend raw events are already normalized.
- [HIGH][VERIFIED: codebase] Treat successful reload as a full runtime rebuild with state restoration, not an in-place mutation of the existing runtime. Capture the current navigation stack, load the new config, rebuild runtime/lifecycle wiring from the new config snapshot, then restore the full stack if valid, otherwise the active deck if valid, otherwise `main_deck`.
- [HIGH][VERIFIED: codebase] Treat invalid reload as a runtime-owned error state. The smallest honest implementation is a built-in temporary error deck rendered through the existing deck-button/render-text-image path, showing a short config error summary and automatically disappearing on the next successful reload.
- [MEDIUM][VERIFIED: codebase] Keep shared-wrapper polish narrow: remove the footer from the shared/default SVG branch and add one explicit per-button accent override field carried through config schema, render types, reconciler transport, and `renderTextImage()` color resolution. Explicit button props and existing wrapper/style ids should remain authoritative.
- [MEDIUM][VERIFIED: codebase] Split planning into tracer bullets, not one giant “reload and polish” plan. Deck-file references, valid reload continuity, invalid reload fallback, and wrapper polish each have demoable end-to-end behavior and cleaner verification boundaries when planned separately.
