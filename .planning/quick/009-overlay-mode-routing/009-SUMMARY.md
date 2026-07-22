# Quick Task 009 Summary

**Task:** Overlay mode is a routing branch, not a forced deck. Active overlay
should follow the matched overlay when the active app changes (chrome → warp).
Back inside an overlay dismisses the overlay. Page-nav targets stay inside the
page set (the base deck id was a phantom deck).
**Completed:** 2026-07-22
**Code commit:** `f2823e8e`

## What was done

1. **`applyOverlay()` follows the match (Bug A).** When the matched overlay
   deck changes while overlay mode is on, `applyOverlay` now calls
   `setOverlay(newDeckId, { source: "autoShow" })` instead of dismissing.
   The previous overlay's `overlayNavStacks` entry is preserved, so
   re-activating later restores its state. The existing chrome → warp
   `chrome-overlay` → `warp-overlay` switch now happens without a manual
   toggle.

2. **Back inside overlay dismisses the overlay.** `goBack()` was
   previously popping the overlay's nav stack. The user's answer to
   "how should back behave" was explicit: "Back at any page dismisses
   overlay". The branch now calls `setOverlay(null)`. Re-activating
   the overlay returns to its root page (one-element stack).

3. **Page-nav targets stay inside the page set (Bug B).** `paginateDeck`
   was emitting `prevDeckId = baseDeckId` for the first page and
   `nextDeckId = baseDeckId` for the last page. The `baseDeckId` is
   not a runtime deck — only `-p1`, `-p2`, `-p3` exist. The first
   page's prev and last page's next now self-loop (no-op). Entry/exit
   to the overlay is via `core:overlay-toggle` only. The runtime
   itself was already correctly broadcasting page changes (the bug
   was the dead `baseDeckId` reference; navigating to a missing deck
   dropped the publish).

## Key files

- `packages/cli/src/deck/runtime.ts`:
  - `applyOverlay()` — three branches now: (1) `deckId === null` →
    dismiss if overlay was active; (2) overlay active and match moved
    → switch overlay; (3) same match → honor `autoShow` for first
    activation.
  - `goBack()` — when `overlayDeckId !== null`, calls `setOverlay(null)`
    directly instead of popping the overlay nav stack.
- `packages/cli/src/deck/paginate-deck.ts` — `prevDeckId` / `nextDeckId`
  for first/last page now self-loop (no-op).
- `packages/cli/src/deck/__tests__/runtime.test.ts` — 3 tests updated
  to reflect the new "overlay mode is a routing branch" semantics;
  1 test renamed from "dismisses current overlay when trigger no
  longer applies" to "switches overlay to the new matched overlay
  when active-app switches".

## Decisions made

- **autoShow is irrelevant once overlay is on.** Per the user's
  clarification: "Only one overlay can be active, so it changes to
  the new matched overlay". The `deck.autoShow !== true` guard only
  applies to the first activation; once overlay mode is on, any
  match change follows regardless of `autoShow`.
- **Overlay nav stack stays at one element.** Since back dismisses,
  the per-overlay nav stack is never extended beyond the initial
  `[overlayDeckId]` seed. The map is kept so re-activation finds
  the same root page.
- **Page-nav self-loop on edges.** Cleaner than introducing a "back
  to overlay root" affordance inside pagination. The toggle button
  is the single source of overlay entry/exit.

## Deviations

- None from the plan.

## Verification

- `pnpm exec vitest run packages/cli/src/deck/__tests__/runtime.test.ts`
  → 79 tests passed (3 updated, 1 renamed, 75 unchanged).
- `pnpm -C packages/cli typecheck` → no new errors (249 errors total,
  same as baseline; all pre-existing).
- `pnpm -C packages/cli lint` → no new errors in the edited files.

## Notes for downstream

- The smoke test `runtime.test.ts:1197-1283` (autoShow → navigate page →
  toggle off → reactivate preserves stack) still passes — Task 1's
  match-follow branch keeps the same overlay's stack untouched; only
  switching to a different overlay creates a new stack entry.
- `setOverlay` continues to publish `runtime:overlay` with
  `source: "autoShow"`. Frontend handlers that distinguish manual vs
  auto activation are unaffected.
- `addon-decks.test.ts` (pagination tests at lines 423, 445, 469, 559,
  572) still pass — `paginateDeck`'s outer signature is unchanged.
- Per the user's clarification, the OVERLAY concept is now a routing
  branch, not a forced deck. Future overlay work should treat it as
  a mode whose active deck is `availableOverlayDeckId` once on,
  with the per-overlay nav stack as a hint for restoring state on
  re-activation.

## Files changed

- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/paginate-deck.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`

## Commits

- `f2823e8e` feat(quick-009): overlay mode follows matched overlay; back dismisses; page-nav stays in page set
