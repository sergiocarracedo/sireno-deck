# Phase 27 Verification

**Date:** 2026-05-27
**Status:** passed_after_27-03_gap_closure

## Verification Summary

Phase 27 now passes verification after closure plan `27-03-PLAN.md`. The original UAT correctly found one upstream blocker on the exact repo-root raw-source CLI seam: `pnpm exec tsx packages/cli/src/cli/index.ts ...` was still missing the package JSX policy, so startup crashed in `renderDomDeck(...)` before the legacy-YAML rejection check could be observed honestly. That blocker is now closed by a minimal workspace-root TSX policy anchor plus an exact-seam startup regression, and the blocked YAML-theme check reruns cleanly to the intended explicit manifest-backed package guidance.

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

### 27-03
- Passed: the exact repo-root raw-source CLI startup seam `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0` now reaches healthy emulator startup without `React is not defined`.
- Passed: `tsconfig.json` at the workspace root provides the minimal JSX/runtime policy anchor needed so repo-root `tsx` launches inherit the same React JSX behavior as the package runtime.
- Passed: `packages/cli/src/cli/commands/start.test.ts` now proves the exact repo-root startup seam instead of only a neighboring package-root runtime proof.
- Passed: rerunning the blocked legacy YAML theme check now fails fast with explicit guidance (`Theme './themes/light.yml' could not be resolved` plus built-in/package suggestion) instead of silently accepting YAML themes or crashing earlier in the renderer.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/render/dom-host.test.tsx`
  - `23 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/cli/commands/start.test.ts`
  - `43 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/addon/loader.test.ts src/render/dom-host.test.tsx src/cli/commands/start.test.ts`
  - `4 passed` test files, `61 passed` tests
  - note: mocked `capture failed` stderr still appears during the expected failure-path startup test while the suite passes
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts`
  - `28 passed`
- `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`
  - repo-root raw-source emulator startup now reaches `browser deck emulator started` without `React is not defined`
- `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config /tmp/opencode/phase27-legacy-theme.yml --port 0`
  - fails fast with `ConfigValidationError: Theme './themes/light.yml' could not be resolved`
  - suggestion: `Use a built-in theme name like 'dark' or 'light', or point theme at an existing package directory.`
- `rg -n "legacy_yaml|yaml file|buttonFrame as defaultButtonFrame|PACKAGE_TSCONFIG_PATH|resolveThemeRuntimeImportPath" packages/cli/src/config/theme.ts packages/cli/src/render/dom-host.tsx packages/cli/src/addon/loader.ts`
  - confirms the legacy YAML branch is gone, fallback frame ownership points at the built-in default theme package, and raw loader seams now use the package tsconfig path
- `rg -n "emulatorMode|currentChildren|staleChild|packages/cli/src/cli/index.ts|React is not defined|tsx" packages/cli/src/cli/commands/start.ts packages/cli/src/cli/commands/start.test.ts packages/cli/src/render/dom-host.test.tsx tsconfig.json`
  - confirms emulator-only shell intent threading, full direct-child reconciliation in the emulator patcher, the exact repo-root startup regression seam, and the workspace-root TSX policy anchor

## Residual Notes

- Phase 27 is post-roadmap follow-on work and does not add a new v1.2 requirement ID; `REQUIREMENTS.md` remains milestone-scoped.
- Original blocker evidence is preserved in `.planning/phases/27-theme-fallback-and-emulator-shell/27-UAT.md`; closure work and rerun path are tracked explicitly through `27-03-PLAN.md` instead of rewriting the failed UAT history.
- Two unrelated dirty theme visual changes were explicitly preserved and are still outside the Phase 27 commits: `packages/cli/src/themes/default/ButtonFrame.tsx` has a debug `'#0f0'` background and `packages/cli/src/themes/default/manifest.yml` has a debug `'#f00'` background.
- The next learnship workflow step is `/review`, then `/ship`, and `/compound`.
