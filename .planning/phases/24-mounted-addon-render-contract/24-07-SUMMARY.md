# Plan 24-07 Summary

**Completed:** 2026-05-26

## What was built
Closed the last remaining Phase 24 emulator image gap at the actual upstream seam. `packages/cli/src/core/schemas.ts` no longer bakes config-expanded `addon://` / `builtin://` asset references into `file://...` URLs during `validateConfig()`. Instead it still validates that the referenced asset exists, but keeps the original asset reference intact so the eventual render target can rewrite it appropriately.

That made the earlier Wave 5 emulator asset-serving fix actually reachable for config-expanded emoji deck buttons. The browser-facing emulator path can now rewrite those retained asset references to `/__sireno/assets?ref=...`, while the capture path still preserves its existing behavior through the runtime/browser renderer seam.

## Key files
- `packages/cli/src/core/schemas.ts`: validates addon/theme asset existence without converting rewriteable refs to `file://...`.
- `packages/cli/src/config/loader.test.ts`: pins the new truth that bundled emoji deck expansion keeps `addon://...` refs rewriteable.
- `packages/cli/src/cli/commands/start.test.ts`: proves config-expanded emoji deck icons stay rewriteable end to end on the emulator path.

## Decisions made
- Fixed the config-time asset bake instead of layering more emulator-specific rewriting on top of already-lost `file://...` values.
- Preserved early unknown-asset failures by still calling `registry.requireAssetPath(...)` during validation.
- Kept production changes narrow to `core/schemas.ts`; `start.ts` already had the correct browser-side asset rewrite seam from `24-05`.

## Notes for downstream
- The earlier rerun UAT failure was a real upstream config-expansion bug, not a second failure of the emulator asset route itself.
- The broad `start.test.ts` file still contains an unrelated dirty Phase 23 fixture failure in the user worktree, so this slice was verified with focused patterns against the intended Wave 6 surfaces.
