# Plan 25-02 Summary

**Completed:** 2026-05-26

## What was built
Extended the same truthful TSX theme contract to custom manifest-backed filesystem themes. `packages/cli/src/config/theme.ts` now enforces that theme runtime relative imports stay inside the theme package root, and it validates that rule before runtime import so users get an explicit theme error instead of an incidental Node import failure.

This slice also added committed Phase 25 fixtures that exercise the real public contract: one happy-path custom `.tsx` theme with an in-root sibling import, and one failure fixture whose runtime graph escapes the theme root. Focused resolver coverage proves both cases through `resolveTheme(...)`.

## Key files
- `packages/cli/src/config/theme.ts`: added explicit theme-root boundary enforcement and moved runtime file-graph validation ahead of runtime import.
- `packages/cli/src/config/theme.test.ts`: added committed custom-theme happy-path and out-of-root failure coverage using file-relative fixture paths.
- `packages/cli/fixtures/phase-25/custom-tsx-theme/`: happy-path custom `.tsx` theme fixture proving tolerant export handling and in-root sibling imports.
- `packages/cli/fixtures/phase-25/out-of-root-theme/` and `packages/cli/fixtures/phase-25/shared/`: failure fixture proving explicit escape rejection.

## Decisions made
- Made the graph walker the single source of truth for allowed theme runtime imports, then reordered `resolveTheme()` so that validation runs before import.
- Kept the built-in/custom contract unified instead of adding custom-theme-only logic.
- Wrote the committed fixture frames with `createElement(...)` rather than bare JSX because the runtime seam intentionally uses `tsImport(..., { tsconfig: false })` and should not depend on ambient tsconfig JSX transforms.

## Notes for downstream
- Theme TSX support now has one honest boundary: relative imports inside the theme root are allowed, escapes are not.
- The fixture paths are source-file-relative, so this coverage should stay stable from both package-local and workspace-root test runs.
