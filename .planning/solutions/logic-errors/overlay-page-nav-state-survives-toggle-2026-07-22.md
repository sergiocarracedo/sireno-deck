---
title: Overlay page-nav state survives toggle off/on and app switches
date: 2026-07-22
category: logic-errors
module: deck/runtime (navigateToDeck / setOverlay / getActiveDeckId)
problem_type: logic_error
severity: medium
tags: overlay, page-nav, transient, overlayNavStacks, setOverlay, getActiveDeckId, runtime, deck-config
symptoms:
  - "Inside an overlay (e.g. chrome-overlay), tapping a core:page-nav button did not advance the visible page (broadcast fires for -p2 but the runtime keeps reporting -p1)"
  - "After tapping next-page inside chrome-overlay, dismissing the overlay then re-toggling it brought the user back to the overlay ROOT (-p1) instead of the page they were on (-p2)"
  - "After paginating inside chrome-overlay, switching active-app to a non-autoShow overlay (e.g. warp) kept chrome-overlay p2 mounted instead of falling back to the regular layer"
root_cause: "Three coupled bugs in the runtime: (1) getActiveDeckId ignored transientDeckId while an overlay was active, so the page set by page-nav was invisible to every 'what is the current deck' query. (2) setOverlay(deckId) broadcast { deckId } (the overlay root) instead of the page the user was actually viewing, even when overlayNavStacks had nav history beyond the root. (3) navigateToDeck with addToHistory:false set transientDeckId even while overlay mode was on, so page-nav state leaked out via transient instead of living inside the overlay's nav stack."
resolution_type: code_fix
related:
  - commit 0b2539de
  - commit eb5f013f
  - .planning/quick/009-overlay-mode-routing/009-PLAN.md
  - .planning/quick/009-overlay-mode-routing/009-SUMMARY-ADDENDUM.md
  - .planning/quick/009-overlay-mode-routing/009-SUMMARY-ADDENDUM-2.md
  - .planning/solutions/logic-errors/overlay-trigger-changes-dismiss-previous-2026-07-17.md
---

# Overlay page-nav state survives toggle off/on and app switches

## Problem

Quick-009 reframed the overlay as a routing branch (not a forced deck). The
follow-up fixes in `runtime.ts` ensured that **each overlay root deck
generates its own navigation history** — including paginated pages — and
that **the page the user was on survives toggle off → toggle on**. Three
coupled bugs broke that contract.

## Symptoms

- Inside `chrome-overlay` (a paginated, autoShow overlay), tapping the
  `core:page-nav` next button did not visually advance the page.
- After paginating to `-p2` and dismissing the overlay (dbl-tap the
  toggle), re-toggling the overlay re-mounted at `-p1` (the root)
  instead of restoring `-p2`.
- After paginating to `-p2` and switching active-app to a non-autoShow
  overlay (e.g. `warp`), `chrome-overlay:shortcuts-p2` stayed mounted
  instead of the regular layer taking over.

## What Didn't Work

The original routing treated page-nav as **transient**: it set
`transientDeckId` and let `getActiveDeckId` fall through to the overlay
root unless explicitly overridden. That worked for change-deck within an
overlay (which pushed onto `overlayNavStacks`) but had three blind spots:

1. `getActiveDeckId` while overlay mode was on only checked the
   `overlayNavStacks` top — `transientDeckId` was silently dropped.
2. `setOverlay(deckId)` published `activeDeck { deckId }` (the overlay
   root) without consulting `overlayNavStacks[deckId]`, so even when the
   nav stack had the user's history, the broadcast said "you're at the
   root now".
3. `navigateToDeck(..., { addToHistory: false })` inside an overlay set
   `transientDeckId` instead of pushing to the overlay's stack, so
   page-nav state lived in the wrong place.

## Solution

Three coordinated changes in `packages/cli/src/deck/runtime.ts`:

### 1. `navigateToDeck` — push to overlay stack when overlay is on

Both `addToHistory: true` and `addToHistory: false` now push onto the
overlay's nav stack when overlay mode is on. Page-nav used to set
`transientDeckId`; now it lives inside `overlayNavStacks`. The check
`if (current[current.length - 1] !== id)` keeps consecutive repeats
from growing the stack.

```ts
if (overlayDeckId !== null) {
  const stack = overlayNavStacks.get(overlayDeckId)
  if (stack === undefined) {
    overlayNavStacks.set(overlayDeckId, [overlayDeckId])
  }
  const current = overlayNavStacks.get(overlayDeckId)!
  if (current[current.length - 1] !== id) {
    current.push(id)
  }
  transientDeckId = null
}
```

For non-overlay decks the existing branches are preserved — page-nav on
a regular deck still uses `transientDeckId`.

### 2. `setOverlay(deckId)` — publish the stack top

When the overlay already has nav history (stack top ≠ `deckId`),
publish `activeDeck { stackTop }` instead of `{ deckId }`. Re-toggling
the overlay then broadcasts the page the user was on, matching what
`getActiveDeckId` reports.

```ts
const stack = overlayNavStacks.get(deckId)
const targetDeck =
  stack !== undefined && stack.length > 0
    ? (stack[stack.length - 1] ?? deckId)
    : deckId
pubSub.publish("runtime:activeDeck", { deckId: targetDeck })
```

`setOverlay(null)` also publishes `runtime:deck-inactive` for the
*actual* deck being deactivated (`previousActiveId`, which can be a
paginated page) rather than the overlay root.

### 3. `getActiveDeckId` — honor `transientDeckId` while overlay is on

While overlay mode is on, `transientDeckId` (used by `setOverlay(null)`
to publish the dismissed deck) and the overlay nav stack top take
precedence, in that order:

```ts
if (overlayDeckId !== null) {
  if (transientDeckId !== null) return transientDeckId
  const stack = overlayNavStacks.get(overlayDeckId)
  if (stack !== undefined && stack.length > 0) {
    return stack[stack.length - 1] ?? overlayDeckId
  }
  return overlayDeckId
}
return transientDeckId ?? navStack[navStack.length - 1] ?? mainDeck.id
```

## Why This Works

The three changes form an invariant: **inside overlay mode, the active
deck is always the most recent thing the user navigated to, regardless
of whether they used change-deck, page-nav, or a manual toggle.** The
overlay nav stack is the single source of truth for in-overlay
navigation history, and it survives dismiss/reactivate cycles because
`setOverlay` deliberately preserves it.

The "Bug A" symptom (overlay stayed mounted when switching to a
non-autoShow match) is fixed at the `applyOverlay` layer by
auto-switching only when the new match is `autoShow: true` — see
`solutions/logic-errors/overlay-trigger-changes-dismiss-previous-2026-07-17.md`.

## Prevention

- Added three regression tests in
  `packages/cli/src/deck/__tests__/runtime.test.ts`:
  - "paginated overlay page (page-nav) is the active deck while overlay is on"
  - "dismissing overlay after a paginated page-nav restores the regular deck"
  - "re-toggling an overlay after a paginated page-nav restores the page (overlay keeps its nav history)"
- Pattern to remember: when a piece of runtime state has both
  "transient" and "stack" representations, the broadcast publisher
  must consult the stack before publishing the root, and the active-deck
  query must consult the transient before falling through to the
  root. Three places (publisher, query, navigation) had drifted apart;
  they need to move together.
- Pattern: if you find yourself writing a comment that says "this
  overlay's nav history is in `overlayNavStacks`" — make sure the
  actual broadcasts and queries also read it. Otherwise the invariant
  lives only in comments.

## Related

- `.planning/quick/009-overlay-mode-routing/009-PLAN.md` — the original
  quick-009 plan that introduced the routing-mode reframing.
- `.planning/quick/009-overlay-mode-routing/009-SUMMARY-ADDENDUM.md` —
  the `getActiveDeckId` transient fix.
- `.planning/quick/009-overlay-mode-routing/009-SUMMARY-ADDENDUM-2.md` —
  the page-nav stack + setOverlay stack-top fix.
- `.planning/solutions/logic-errors/overlay-trigger-changes-dismiss-previous-2026-07-17.md` —
  the companion doc on `applyOverlay`'s autoShow handling.
- Commits `0b2539de` (transient in `getActiveDeckId`) and `eb5f013f`
  (page-nav stack + setOverlay stack top + applyOverlay autoShow).
