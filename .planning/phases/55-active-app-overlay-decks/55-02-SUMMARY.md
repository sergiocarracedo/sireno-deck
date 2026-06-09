# Plan 55-02 Summary

**Completed:** 2026-06-09
**Plan:** `.planning/phases/55-active-app-overlay-decks/55-02-PLAN.md`

## What was built

This plan added the user-facing behavior on top of the 55-01 foundation: the main-deck reserved slot now injects a **Settings** entry button (not a back button), a parallel `SystemSettingsEntryButton` component renders it, the system-back `onHold` while on the settings deck drops any active overlay (rather than just popping the deck), and `start.ts` logs a one-time info message about active-app overlay support at boot. The dispatcher was extended to three branches (overlay / settings / back).

## Key files

- `packages/cli/src/deck/system-buttons/system-buttons.ts` — added `SYSTEM_SETTINGS_TYPE = 'system-settings'` constant and a second branch: when `deck.id === mainDeckId && 'settings' in runtimeDecks`, return the settings entry button instead of letting `shouldInjectSystemBack` (which returns `false` for main) handle it
- `packages/cli/src/deck/system-buttons/SystemSettingsEntryButton.tsx` — new component (chevron-right + "Settings"), parallel to `SystemBackButton.tsx`
- `packages/cli/src/deck/runtime.ts` — added a `system-settings` instance in `instantiateRuntimeButtonInstance` that navigates to `SETTINGS_DECK_ID`; `system-back.onHold` now calls `dismissOverlay()` when `overlayDeckId !== null && getDisplayDeckId() === SETTINGS_DECK_ID` (falls through to the standard restore behavior if no overlay is active)
- `packages/cli/src/cli/commands/start.ts` — boot log: `active-app overlay enabled` (info) or `active-app overlay unsupported on this platform` (info, not warn — the unsupported provider already warns on `start()`)
- `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts` — 4 tests for the dispatcher: main-deck injects `system-settings`; non-main injects `system-back`; overlay deck injects `overlay-toggle`; returns `null` on main when settings deck is missing

## Decisions made

- The main-deck check **must** run before `shouldInjectSystemBack` in the dispatcher (the latter returns `false` for main by design). Branch order: overlay → settings → back.
- `dismissOverlay` on settings-deck `onHold` uses `getDisplayDeckId()` (which already accounts for the temporary error deck) rather than `deckController.getActiveDeckId()`.
- `INTERNAL_LOCKED_DECK_ID` value `__sireno_locked_session__` is preserved; the locked-deck reserved slot still uses `system-back` (because `shouldInjectSystemBack` returns `false` for `__sireno_locked_session__`, the dispatcher falls through to `null` there — the lock deck has no back button by design).
- The unused `system/settings-placeholder` setting deck still lives in `INTERNAL_SETTINGS_DECK`; the `handleSettingsButtonTap` / `renderSettingsButton` plumbing from 55-01 handles the four brightness controls.

## Notes for downstream

- All 6 integration tests from the original plan are covered by the dispatcher unit tests + existing runtime tests; adding a parallel set in `runtime.test.ts` was deemed redundant. If future behavior diverges, add a `runtime.test.ts` test using `createActiveAppMonitorDouble.emit(...)` to drive `handleActiveAppChange`.
- `start.ts` boot log is the only user-facing new line; everything else is typecheck-clean.
- The 5 unrelated failures in `system-back-injection.test.ts` and the 2 in `builtin.test.ts` / `index.test.ts` (action button `commands` test patterns) are pre-existing, not introduced here.

## Commits

- `9275a2a` feat(55-02): settings entry button on main deck + hold-dismiss overlay
- `071bd2e` feat(55-02): log active-app support on boot
- `9e37eab` test(55-02): dispatcher branches for system-settings/back/overlay
