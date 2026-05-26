# Phase 25 Verification

**Date:** 2026-05-26
**Status:** passed

## Verification Summary

Phase 25 passed verification. Manifest-backed themes now load `buttonFrame` runtime entries authored in `.js`, `.jsx`, `.ts`, or `.tsx` through one fixed-policy resolver seam, the shipped default theme is an honest built-in proof of that contract, fresh reload behavior remains intact, and custom manifest-backed themes get the same TSX support with explicit rejection when their runtime graph escapes the theme package root.

## Must-Have Checks

### 25-01
- Passed: `packages/cli/src/config/theme.ts` now uses `tsx/esm/api` for raw `.jsx/.ts/.tsx` theme runtime entries while preserving tolerant `buttonFrame` export lookup and `manifest.main` as the only entrypoint.
- Passed: resolving the built-in default theme now returns the real `themes/default/index.ts` and `themes/default/ButtonFrame.tsx` runtime graph in `filePaths`.
- Passed: `packages/cli/src/config/theme.test.ts` still proves a second theme resolution sees updated runtime exports, so the snapshot-based fresh-reload contract survived the loader change.
- Passed: focused theme/startup tests pin the built-in TypeScript proof path without regressing JS-authored theme loading.

### 25-02
- Passed: custom filesystem themes can resolve a `buttonFrame` from a `.tsx` `manifest.main` through the same resolver contract used by built-in themes.
- Passed: `packages/cli/src/config/theme.ts` explicitly rejects theme runtime relative imports that escape the theme package root.
- Passed: the loader preserves tolerant export lookup and does not add a second runtime entrypoint or tsconfig-aware path-alias behavior.
- Passed: focused custom-theme tests prove both the happy path and the out-of-root failure path through the real resolver API.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts`
  - `10 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts --testNamePattern "passes disabled illustrative addons through without logging startup warnings|logs warnings for recoverable addon load failures and keeps loading config|warns once when session lock monitoring is unsupported on the current host|loads a local raw .tsx addon fixture through the normal startup config path|loads the shipped Phase 23 sample config with the fixture's real registered button type"`
  - `5 passed | 20 skipped`
- `rg -n "tsx/esm/api|buttonFrame|ButtonFrame|manifest.main|theme package root" packages/cli/src/config/theme.ts`
  - fixed-policy TSX import seam, tolerant export lookup, and explicit theme-root boundary markers present in the single resolver module
- `rg -n "phase25FixtureRoot|themes/default/index.ts|themes/default/ButtonFrame.tsx|runtime imports must stay inside the theme package root" packages/cli/src/config/theme.test.ts`
  - focused built-in proof-path assertions and custom-theme fixture/error coverage present in the resolver tests
- `ls packages/cli/fixtures/phase-25/custom-tsx-theme packages/cli/fixtures/phase-25/out-of-root-theme packages/cli/fixtures/phase-25/shared`
  - committed happy-path and failure-path custom theme fixtures exist on disk

## Residual Notes

- Phase 25 is post-roadmap follow-on work and does not add a new v1.2 requirement ID; `REQUIREMENTS.md` remains milestone-scoped.
- This verification is automated only. The next workflow step is `verify-work 25` for manual UAT, then `/review`, `/ship`, and `/compound`.
