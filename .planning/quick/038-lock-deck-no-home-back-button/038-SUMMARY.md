# Quick Task 038 Summary

**Task:** Lock deck should not show home or back button
**Completed:** 2026-06-06

## What was done
Fixed a bug where the implicit locked deck (used when no `session.locked_deck` is configured) incorrectly received a system-back navigation button. The root cause was that `getDeckButtons()` only set `session.locked_deck` in the synthetic config when an explicit `lockedDeckId` was provided — the implicit fallback was missed.

## Files changed
- `packages/cli/src/deck/runtime.ts`: Modified `getDeckButtons()` to always include `session.locked_deck` in the synthetic config, using `IMPLICIT_LOCKED_DECK_ID` as fallback when no explicit locked deck is configured
- `packages/cli/src/deck/runtime.test.ts`: Added test verifying the implicit locked deck has no system-back button

## Commit
a967147
