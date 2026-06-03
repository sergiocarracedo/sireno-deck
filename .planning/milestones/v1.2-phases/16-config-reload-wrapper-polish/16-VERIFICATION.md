---
phase: 16
status: complete
verified: 2026-05-20
---

# Phase 16: Config Reload + Wrapper Polish — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 16-01 | `decks.<id>: @path/to/deck.yml` loads when the referenced file contains a full deck object whose `id` matches the map key. | ✓ |
| 16-01 | Relative deck refs resolve from the YAML file that contains them, while absolute paths continue to work. | ✓ |
| 16-01 | Deck refs remain scoped to `decks` entries only; arbitrary `@file` includes elsewhere in config are still rejected or ignored by design. | ✓ |
| 16-01 | Validation failures from referenced deck files still surface as `ConfigValidationError` with actionable path/line information. | ✓ |
| 16-01 | `pnpm --filter sireno-deck-cli test -- src/config/loader.test.ts` passes with focused deck-ref coverage. | ✓ |
| 16-02 | The running daemon can detect config changes from the root config and loaded deck-ref files without restarting the process. | ✓ |
| 16-02 | A successful reload rebuilds runtime instances from the new config rather than mutating old instances in place. | ✓ |
| 16-02 | If the prior navigation stack is still valid after reload, it is restored exactly. | ✓ |
| 16-02 | If the stack is no longer valid but the active deck still exists, reload keeps that active deck. | ✓ |
| 16-02 | If neither stack nor active deck survive, reload falls back to `main_deck`. | ✓ |
| 16-02 | Focused runtime/startup tests prove reload continuity behavior. | ✓ |
| 16-04 | The shared/default wrapper no longer renders the current theme-name footer. | ✓ |
| 16-04 | A button can opt into a shared-wrapper accent override through one explicit config field without widening config into a broad styling object. | ✓ |
| 16-04 | The override accepts theme tokens and raw color values with deterministic validation. | ✓ |
| 16-04 | Explicit button props and existing wrapper/style ids remain authoritative over shared/default render behavior. | ✓ |
| 16-04 | Focused loader/reconciler/render tests prove the footer removal and accent override are visually observable. | ✓ |
| 16-03 | Invalid live reloads do not stop the daemon. | ✓ |
| 16-03 | Invalid live reloads do not silently keep the old surface; they switch to a built-in temporary error deck. | ✓ |
| 16-03 | The error deck renders through the real runtime/device render path and shows the latest config error summary in a constrained readable format. | ✓ |
| 16-03 | A later valid config change exits the temporary error deck automatically and restores the normal runtime flow. | ✓ |
| 16-03 | Focused tests cover invalid-reload entry and valid-reload recovery. | ✓ |
| 16-05 | Starting `pnpm exec tsx src/cli/index.ts start --config /tmp/sireno-phase16-uat/config.yml` from `packages/cli` succeeds when the config uses the built-in `dark` theme and a referenced deck file. | ✓ |
| 16-05 | Built-in theme names resolve independently of the process launch directory, and relative custom theme paths resolve from the owning config file directory. | ✓ |
| 16-05 | The watched config source graph includes the root config file plus loaded deck-ref files without injecting `undefined` entries into `fs.watch()`. | ✓ |
| 16-05 | Focused tests cover both the theme-resolution regression and the watched-file-path regression on the startup path. | ✓ |
| 16-05 | The Phase 16 UAT record links both diagnosed gaps to this closure plan and notes that Tests 1-4 must be rerun on the real fixture path. | ✓ |
| 16-06 | On the shared/default wrapper path, changing a button `accent` override from a theme token to a raw hex color produces a visibly different rendered card without restarting the daemon. | ✓ |
| 16-06 | The fix stays narrow to the existing shared/default accent path and does not widen Phase 16 into a broader styling system. | ✓ |
| 16-06 | Focused render-path tests prove the visible difference between token-based and raw-color accent output for the same shared-wrapper card content. | ✓ |
| 16-06 | The Phase 16 UAT record links the shared-card accent-visibility gap to this closure plan and notes that Test 4 must be rerun on the real `/tmp/sireno-phase16-uat` fixture path. | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| Post-roadmap follow-on polish | Deck-only external deck references, watched config reload, shared-wrapper footer removal, narrow accent override, and runtime-owned invalid-reload fallback are implemented and covered by focused verification. | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/cli/commands/start.ts` → `../../config/theme.js` (`resolveTheme`) | `packages/cli/src/config/theme.ts` exports `resolveTheme` with config-owned base-directory support. | ✓ |
| `packages/cli/src/cli/commands/start.ts` → `../../config/loader.js` (`loadConfigWithSources`) | `packages/cli/src/config/loader.ts` exports `loadConfigWithSources` with config source graph metadata. | ✓ |
| `packages/cli/src/cli/commands/start.ts` runtime watcher path | `packages/cli/src/config/loader.ts` returns root + referenced file paths as concrete strings. | ✓ |

## Summary

**Score:** 30/30 must-haves verified

All automated checks passed, and manual UAT is complete:
- `16-UAT.md` records `passed: 4`, `issues: 0`, `pending: 0`, and `skipped: 0` on the real `/tmp/sireno-phase16-uat` fixture path.
- Phase 16 is verification-complete and ready for `/review`.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/config/loader.test.ts src/cli/commands/start.test.ts`
- `pnpm exec tsx src/cli/index.ts start --config /tmp/sireno-phase16-uat/config.yml` (run from `packages/cli`; startup reached a running daemon and rendered key `0`)
- `pnpm --filter sireno-deck-cli exec vitest run src/render/text-image.test.ts`

## Notes

- The repo-level `tsc --noEmit` `TS2209` project-root ambiguity remains a pre-existing issue unrelated to Phase 16.
- This verification now includes the completed manual `verify-work 16` gate captured in `16-UAT.md`.
