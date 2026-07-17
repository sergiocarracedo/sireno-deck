---
wave: 1
depends_on: []
---

# Phase 5 Plan 1: Backend — Trigger Semantics, autoShow, Per-Overlay Nav Stack

## Goal
Make the runtime correctly identify overlay-deck candidates (AND-semantics across `process_name` and `window_name`, both optional), gate layer activation on `autoShow`, and maintain an isolated nav stack per overlay deck (session-lifetime persistence). After this plan, the runtime picks the right overlay, decides when to flip the layer, and tracks each overlay's own history — but the user can't yet trigger the flip from the device (that lands in Plan 2).

## Must-Haves
- `compileDeckMatcher` accepts `{ processNames?, windowNames? }` and ANDs the two field groups (OR within each group; an empty group passes).
- `computeOverlayFor` selects the most-specific match (both-field > single-field) with first-declared-wins tie-break.
- `applyOverlay` does NOT change the active layer when the matched deck has `autoShow: false`; the deck is still surfaced as "available" (tracked via a new `availableOverlayDeckId` slot).
- `hasOverlayDeckAvailable()` returns true when the active app currently matches an overlay-deck trigger (regardless of `autoShow`).
- A new `overlayNavStacks: Map<overlayDeckId, string[]>` slot maintains a per-deck stack; `getActiveDeckId` reads from the active overlay's stack when an overlay is active.
- `navigateToDeck` pushes onto the appropriate stack (regular `navStack` or the active overlay's stack).
- `goBack` from the active overlay pops the overlay's stack; when that stack is empty (only the root), it dismisses the overlay.
- Stacks persist across dismiss/re-activate (cleared only on session end).
- `pnpm typecheck` and new tests pass; pre-existing test failures remain pre-existing.

## Task 1.1: Reshape glob matcher to AND across fields
- **Files:** `packages/cli/src/system/glob-match.ts`, `packages/cli/src/system/__tests__/glob-match.test.ts`
- **Action:** Change `compileDeckMatcher` signature from `ReadonlyArray<string>` to `{ processNames?: ReadonlyArray<string>; windowNames?: ReadonlyArray<string> }`. Implement AND across field groups, OR within each. An empty group is treated as pass. Update existing callers in `runtime.ts` (`overlayDecks`, `computeOverlayFor`) to pass the new shape. Add tests: only process matches, only window matches, both match, neither matches, two-field specificity beats single-field, first-declared wins on equal specificity.
- **Verify:** All new matcher tests pass; existing `glob-match.test.ts` tests continue to pass or are updated to the new API.
- **Done:** [ ]

## Task 1.2: autoShow gate + available/active split
- **Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`
- **Action:** Add `availableOverlayDeckId: string | null` runtime slot, distinct from `overlayDeckId`. `computeOverlayFor` writes the matched deck id into `availableOverlayDeckId`. `applyOverlay` reads `availableOverlayDeckId` and, if the matched deck's `autoShow === true`, calls `setOverlay(deckId)`; otherwise leaves `overlayDeckId` untouched (overlay stays "available only"). Update `hasOverlayDeckAvailable()` to return true when `availableOverlayDeckId !== null` (or a pending match exists). Update `setOverlay`'s pub/sub events so the frontend can tell autoShow flip from manual toggle. Tests: autoShow=true flips automatically, autoShow=false does not flip, both states surface the deck as available.
- **Verify:** Runtime tests cover autoShow on/off with mocked active-app snapshots.
- **Done:** [ ]

## Task 1.3: Per-overlay-deck nav stack
- **Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`
- **Action:** Add `overlayNavStacks: Map<string, string[]>` to the runtime closure. When an overlay is first activated, initialize its stack with `[overlayRootDeckId]`. Update `getActiveDeckId` to return `overlayNavStacks.get(overlayDeckId)?.at(-1)` when `overlayDeckId !== null`; otherwise the current `navStack.at(-1) ?? mainDeck.id` logic. Update `navigateToDeck` so when the target is the active overlay (or a sub-deck of it), the push goes onto the overlay's stack; otherwise onto `navStack`. Update `goBack`: when `overlayDeckId !== null` and `overlayNavStacks.get(overlayDeckId)!.length > 1`, pop the overlay's stack; when length === 1, dismiss the overlay (setOverlay(null)) instead of popping. Tests: per-overlay isolation, persistence across dismiss/reactivate, empty-stack dismissal.
- **Verify:** All new runtime tests pass; pre-existing navStack tests continue to pass.
- **Done:** [ ]

## Task 1.4: Smoke test — runtime layer flip with full chain
- **Files:** `packages/cli/src/deck/__tests__/runtime.test.ts`
- **Action:** Add an end-to-end test: feed a fake active-app snapshot → matcher picks the right deck → autoShow=true flips the layer → `getActiveDeckId` returns the overlay root → navigate to a sub-deck → toggle off → re-activate same overlay → sub-deck position is still on top of the restored stack.
- **Verify:** Single test runs the full chain and asserts the expected active-deck id at each step.
- **Done:** [ ]

## Context
See `CONTEXT.md` (decisions on AND semantics, autoShow, per-overlay stack persistence) and `RESEARCH.md` (existing patterns and pitfalls) in this directory.
