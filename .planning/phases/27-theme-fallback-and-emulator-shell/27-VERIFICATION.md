# Phase 27 Verification

**Date:** 2026-05-27
**Status:** passed

## Verification Summary

Phase 27 passed verification. Manifest-backed theme packages are now the only supported theme contract, fallback frame ownership moved onto the built-in default theme package runtime, built-in theme runtime files stay inside the truthful watched reload graph, emulator-specific deck shell chrome only appears when render intent is explicitly marked as emulator output, and the real TSX runtime seams for raw theme/addon sources now use the package `tsconfig.json` instead of ambient React-import crutches.

## Must-Have Checks

### 27-01
- Passed: `packages/cli/src/config/theme.ts` no longer supports `legacy_yaml`; unresolved theme guidance now points only at built-in theme names or manifest-backed package directories.
- Passed: `packages/cli/src/render/dom-host.tsx` falls back to `buttonFrame` from `packages/cli/src/themes/default/index.ts`, and the deleted core seam `packages/cli/src/render/button-frame.tsx` no longer participates in runtime code.
- Passed: built-in theme watched file paths still include authored runtime source such as `themes/default/ButtonFrame.tsx` even when the runtime import graph uses explicit `.js` specifiers.
- Passed: focused tests prove the manifest-only failure path and the built-in default theme fallback ownership directly.

### 27-02
- Passed: `packages/cli/src/render/dom-host.tsx` keeps one shared `renderDomDeck(...)` seam while rendering shell chrome only when `emulatorMode` is true.
- Passed: `packages/cli/src/cli/commands/start.ts` threads explicit emulator intent only through emulator-served HTML paths and keeps browser capture on the flatter non-emulator shell.
- Passed: raw theme and addon runtime imports now pass the package `tsconfig.json` to `tsx/esm/api`, so touched runtime TSX modules no longer depend on manual default React imports for this seam.
- Passed: the committed emulator deck patcher now reconciles full direct-child lists so stale non-key siblings such as inline warnings do not survive deck HTML updates.
- Passed: focused tests prove emulator-only shell chrome and the real TypeScript runtime execution path via `node --import tsx/esm --eval` without `React is not defined`.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/render/dom-host.test.tsx`
  - `23 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/cli/commands/start.test.ts`
  - `43 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/addon/loader.test.ts src/render/dom-host.test.tsx src/cli/commands/start.test.ts`
  - `4 passed` test files, `61 passed` tests
  - note: mocked `capture failed` stderr still appears during the expected failure-path startup test while the suite passes
- `rg -n "legacy_yaml|yaml file|buttonFrame as defaultButtonFrame|PACKAGE_TSCONFIG_PATH|resolveThemeRuntimeImportPath" packages/cli/src/config/theme.ts packages/cli/src/render/dom-host.tsx packages/cli/src/addon/loader.ts`
  - confirms the legacy YAML branch is gone, fallback frame ownership points at the built-in default theme package, and raw loader seams now use the package tsconfig path
- `rg -n "emulatorMode|currentChildren|staleChild|node --import|tsx/esm" packages/cli/src/cli/commands/start.ts packages/cli/src/cli/commands/start.test.ts packages/cli/src/render/dom-host.test.tsx`
  - confirms emulator-only shell intent threading, full direct-child reconciliation in the emulator patcher, and the real runtime subprocess proof seam

## Residual Notes

- Phase 27 is post-roadmap follow-on work and does not add a new v1.2 requirement ID; `REQUIREMENTS.md` remains milestone-scoped.
- Two unrelated dirty theme visual changes were explicitly preserved and are still outside the Phase 27 commits: `packages/cli/src/themes/default/ButtonFrame.tsx` has a debug `'#0f0'` background and `packages/cli/src/themes/default/manifest.yml` has a debug `'#f00'` background.
- The next learnship workflow step is `verify-work 27`, then `/review`, `/ship`, and `/compound`.
