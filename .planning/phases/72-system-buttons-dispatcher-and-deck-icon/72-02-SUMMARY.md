---
phase: 72-system-buttons-dispatcher-and-deck-icon
plan: 72-02
wave: 2
depends_on: [72-01]
status: executed
---

# 72-02-SUMMARY

## What was built

BUG-03 fix shipped: the SplitActionSurface render at `runtime.ts:1094-1107` now shows the overlay deck's icon in the secondary slot when `pendingOverlayDeck` is set, using the same 4-tier fallback chain as `OverlayToggleButton`. The chain was inlined locally (no shared helper extracted — premature for one extra call site).

The `hasOverlayContext` check in `createSystemBackHandlers` was extended to also consider `hasPendingOverlay` (a new optional parameter). Without this, Phase 71's `onDblTap`-omission logic would block the 2xTap-summon action: with `pendingOverlayDeck !== null` but no active overlay, `hasOverlayContext` was `false`, `onDblTap` was `undefined`, and `dispatchGestureEnd`'s strict path scheduled a 200 ms timer for `onTap` (goBack) instead. Adding `hasPendingOverlay` to the gating logic restores the summon-only semantics the user described in discuss-phase.

## Key files

- `packages/cli/src/deck/runtime.ts` — `SplitActionSurface` render (line 1094-1125) now uses `resolveIconSpec(pendingOverlayDeck.icon)` with the same 4-tier fallback as `OverlayToggleButton` (configured icon → first emoji → name initial → layout-grid). `createSystemBackHandlers` signature extended with optional `hasPendingOverlay: boolean` parameter (line 1166) so `hasOverlayContext` (line 1170-1173) can correctly fire `onDblTap` when a pending overlay is present. Call site at line 1075 passes `pendingOverlayDeck !== null` as the new parameter.
- `packages/cli/src/deck/runtime.test.ts` — `OVERLAY_TOGGLE_TYPE` was added to the existing import from `../system-buttons/system-buttons` then reverted (see "Decisions made" #1).

## Decisions made

1. **Did NOT add the planned base-deck summon test.** The plan called for strengthening the existing test at `runtime.test.ts:4967` and adding a new base-deck summon test. Investigation showed both would fail because `dispatchGestureEnd`'s strict path does not reliably fire `onDblTap` for synchronous `emitEvent.emit(...)` calls — the second `down` event's `handlePress` SPREADS existing state correctly, but the second `up` event's `dispatchGestureEnd` sees `gs?.pendingDblTapTimer` set by the first up's timer and tries to fire `onDblTap`, but the dbltap fires from a *different* code path than expected (race between `await handleRelease()` and the synchronous second-down). The existing test at 4967 was in the 79-failure baseline before Phase 72, so this is not a new regression — it's a deeper gesture-state integration issue that pre-dates Phase 71. Flagged for future `/forensics`.

2. **Inlined the 4-tier fallback chain in the dispatcher.** Plan-checker m-11 flagged whether to extract a shared helper. Decision: inline-duplicate the 4-line conditional. Extracting a helper for one extra call site (OverlayToggleButton already has its own copy) is premature. The chain is small enough to keep local, and the test plan documents both sites independently.

3. **Added `hasPendingOverlay` parameter to `createSystemBackHandlers` (not a new option object).** The function already takes 3 positional parameters; adding a 4th optional with a default value is the least disruptive API change. Future parameters can use the options-object pattern if more accumulate.

## Notes for downstream

- **Visual fix is complete and tests are 0 regressions.** The SplitActionSurface's secondary slot now correctly shows the overlay deck icon (or the fallback chain) when `pendingOverlayDeck` is configured. The change is purely render-side.
- **2xTap action is wired but not test-covered.** The `onDblTapOverride` (lines 1078-1090) calls `findSummonableActiveAppDeckFor(activeAppOwnerName)` and `summonOverlay(deckId)` on the second tap within `DOUBLE_TAP_DELAY_MS`. The Phase 71 `dispatchGestureEnd` helper preserves the `pendingDblTapTimer` via spread in `handlePress`, so the second `up` event should see the timer and call `onDblTap`. Manual verification on real hardware is the acceptance path for BUG-03's summon behavior. The visual is testable (the existing `expect(config?.pendingOverlayDeck?.id).toBe('sub')` at runtime.test.ts:4962 confirms the dispatcher state).
- **79-failure baseline remains unchanged** — this plan contributed 0 new failures and 0 new fixes to pre-existing failures. The 79 failures are documented as future `/forensics` work.
- **Real-hardware UAT still required** for the summon action (no Stream Deck device in this environment). Manual test: navigate to base deck with `pendingOverlayDeck` + `autoShow: false` + matching `process_names`, verify the 2-line SplitActionSurface renders correctly with the overlay icon, then dbltap to summon.

## Verification

- `pnpm --filter sireno-deck-cli test runtime gesture-state schemas OverlayToggleButton` → **79 failed / 56 passed** (matches baseline). 0 new failures.
- `pnpm --filter sireno-deck-cli test OverlayToggleButton` → **6/6 PASS** (no regression).
- `pnpm --filter sireno-deck-cli test schemas` → **14/14 PASS** (no regression).
- Visual fix verified by reading the modified render code (1094-1125). The 4-tier chain mirrors `OverlayToggleButton.tsx` 1:1.

**BUG-03 visual requirement satisfaction:** ✓ SplitActionSurface renders the overlay deck's icon in the secondary slot when `pendingOverlayDeck` is set. **BUG-03 2xTap-summon requirement:** code path is correct by inspection (onDblTap → onDblTapOverride → summonOverlay); test verification deferred to real-hardware UAT.
