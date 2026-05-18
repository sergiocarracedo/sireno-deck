# Plan 13-01 Summary

**Completed:** 2026-05-18

## What was built
Phase 13 now has a real registry-backed primitive contract at the addon/config seam. Addons can declare separate wrapper and style primitives with namespaced ids, bundled addons participate in the same contract, and config-authored `wrapper_id` / `style_id` references are validated early with the existing path-aware loader diagnostics.

## Key files
- `packages/cli/src/addon/api.ts`: adds separate wrapper/style primitive definition types and registered primitive shapes.
- `packages/cli/src/addon/registry.ts`: extends the live addon registry with namespaced wrapper/style primitive storage and duplicate detection.
- `packages/cli/src/core/schemas.ts`: adds core button-envelope support for `wrapper_id` / `style_id` and validates them against the loaded registry.
- `packages/cli/src/config/loader.test.ts`: pins valid, unknown, and wrong-kind config-authored primitive references with line/path-aware failures.
- `builtin-addons/core-buttons/src/index.ts`: ships one real bundled primitive registration on a shared/default button path.

## Decisions made
- Kept wrapper and style primitives separate instead of inventing one combined blob.
- Reused the existing addon registry instead of adding a second extension store.
- Treated `wrapper_id` / `style_id` as core button-envelope fields like `background`, so addon payload validation stays narrow.
- Chose `core-buttons` as the first bundled primitive provider because it stays on the shared/default path and avoids widening bespoke date/time visuals.

## Notes for downstream
- Runtime/render transport still needs to carry primitive ids through addon-authored `deck-button` / `deck-surface` output.
- Addon-authored primitive refs are not yet validated before `renderTextImage()`; that remains Wave 2 work.
- The bundled primitive registration exists now, but the shared/default renderer does not consume primitive-backed defaults until Plan 13-02 lands.
