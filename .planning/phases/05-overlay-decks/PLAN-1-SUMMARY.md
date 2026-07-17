# Plan 1 Summary

**Completed:** 2026-07-17

## What was built

Backend runtime foundation for overlay decks. The runtime now identifies overlay-deck candidates with AND-semantics across `process_name` and `window_name` globs (both optional, OR within each field), picks the most-specific match with first-declared-wins tie-break, gates layer activation on the matched deck's `autoShow` flag (default `false` = "available only", `true` = instant flip), and maintains a per-overlay-deck nav stack that persists across dismiss/reactivate within the session. End-to-end smoke test exercises the full chain: poll → match → flip → navigate sub-deck → toggle off → re-activate → restored stack.

## Key files

- `packages/cli/src/system/glob-match.ts` — `compileDeckMatcher(fields: { processNames?, windowNames? })` reshaped to AND across field groups, OR within each, empty group passes. Exports specificity count for caller-side priority.
- `packages/cli/src/deck/runtime.ts` — added `availableOverlayDeckId` slot, `overlayNavStacks: Map<string, string[]>`, `setOverlay(deckId, opts?)` source option, `applyOverlay` autoShow gate, `runtime:overlay-available` pub/sub event.
- `packages/cli/src/system/__tests__/glob-match.test.ts` — 14 tests covering AND across fields, single-field, both-field, neither, specificity ordering, first-declared wins.
- `packages/cli/src/deck/__tests__/runtime.test.ts` — 55 tests total: 48 runtime + 7 per-overlay-deck nav stack + 1 full-chain smoke. Updated existing active-app tests to declare `autoShow: true`.

## Commits

- `d60ee02` feat(05-1): glob matcher AND across process_name + window_name with specificity
- `63135eb` feat(05-1): autoShow gate + available/active overlay split
- `0a7aa34` feat(05-1): per-overlay nav stack + full-chain smoke test

## Decisions made

- Specificity is a count of non-empty field groups (1 for single-field, 2 for both-field). Most-specific wins; tie-break by config declaration order (first match in `decks[]`).
- `availableOverlayDeckId` is set inside `computeOverlayFor` and published via `runtime:overlay-available` only when the value actually changes. This decouples "deck is available" from "deck is the active overlay" — Plan 2's SplitSurface renders whenever available is non-null.
- `overlayNavStacks` is lazy-initialized in `setOverlay` on first activation (`[overlayRootDeckId]`). Stacks are NOT cleared on dismiss — only at session end (e.g. process restart).
- `setOverlay(null)` from `goBack` at overlay root is the dismissal path; `goBack` does not pop into the regular `navStack`.
- Source flag on `runtime:overlay` event distinguishes `autoShow` flips from manual `setOverlay` toggles — frontend can react differently (no flash vs. flash, etc.).

## Notes for downstream

- Plan 2 introduces the SplitSurface fix in `system-back-injection.ts`: the `isOverlay` branch must return `core:back` (not `core:overlay-toggle`) so the SplitSurface renders on overlay decks too. Without this, the back gesture is unreachable on overlay decks.
- The `setOverlay(null)` path overwrites `overlayPreviousActiveId` with the top of the overlay stack (e.g. "chrome-page") instead of preserving the regular layer position captured at activation. This affects the `runtime:activeDeck` event payload during dismissal but not `getActiveDeckId()` (which reads from the now-untouched `navStack`). Cosmetic event-payload bug; flagged for verification but not in scope here.
- `core:overlay-toggle` dbl-tap and `core:back` hold gestures are NOT yet wired — they land in Plan 2.
- `overlayDeckIcon` protocol field NOT yet added — Plan 2 task T2.1.