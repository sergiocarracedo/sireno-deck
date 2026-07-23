---
title: Overlay deck stays active when its trigger no longer applies
date: 2026-07-17
last_updated: 2026-07-22
category: logic-errors
module: deck/runtime (applyOverlay)
problem_type: logic_error
severity: medium
tags: overlay, applyOverlay, trigger, autoShow, active-app, runtime, deck-config
symptoms:
  - "Chrome overlay auto-applied (autoShow=true); switching active-app to a process matching a different overlay deck (e.g. Spotify, autoShow=false) left the chrome overlay visible"
  - "Layer did not flip back to the regular layer when the original trigger condition no longer matched"
  - "n-1 SplitSurface on the chrome overlay kept rendering chrome's icon even though chrome's trigger no longer applied"
  - "After re-introducing overlay-mode auto-follow (commit f2823e8e), chrome-overlay stayed mounted when switching to a non-autoShow overlay (e.g. warp) instead of falling back to the regular layer (user quote: 'show the regular deck')"
root_cause: "applyOverlay only handled two cases: (1) deckId === lastOverlayDeckId → early-return, (2) deckId !== null → update lastOverlayDeckId and optionally setOverlay. The third case — active-app now matches a different deck than the currently active overlay, with the new match having autoShow=false — never dismissed the previous overlay. The condition `deckId !== null && deckId !== overlayDeckId` updated only the cache variable, not the runtime state. A later iteration (commit f2823e8e) added an auto-switch branch that ignored autoShow — restoring the bug for the non-autoShow case."
resolution_type: code_fix
related:
  - commit f52bccf
  - commit f2823e8e
  - commit eb5f013f
  - .planning/quick/009-overlay-mode-routing/009-SUMMARY-ADDENDUM-2.md
  - .planning/phases/05-overlay-decks/05-CONTEXT.md
---

# Overlay deck stays active when its trigger no longer applies

## Problem

The deck runtime's `applyOverlay` function — invoked on every active-app poll — only dismissed the current overlay when no overlay deck matched the new active-app (`deckId === null`). When active-app switched to a process that matched a *different* overlay deck (especially with `autoShow: false`), the previous overlay's trigger condition was no longer satisfied but the layer stayed on the old overlay. User feedback: *"when the trigger conditions changes we must back to the regular deck if no other overlay deck matches."*

## Symptoms

- Chrome overlay auto-applied via `autoShow: true`. Switching active-app from Chrome to Spotify (which had its own overlay deck with `autoShow: false`) left the chrome overlay rendered. Chrome's trigger no longer matched but the layer did not flip.
- The user's SplitSurface on the chrome overlay kept showing the chrome icon even though chrome's trigger no longer applied.
- Switching to an app that matched no overlay (e.g. Firefox) *did* dismiss correctly — that path was already covered by `applyOverlay(null) → setOverlay(null)`.

## What Didn't Work

The previous `applyOverlay` had three branches:

```ts
if (deckId === lastOverlayDeckId) return                           // (a) same as last poll → noop
if (deckId !== null) { /* update lastOverlayDeckId + maybe setOverlay(autoShow) */ }  // (b)
else { /* deckId === null → setOverlay(null) */ }                  // (c)
```

Branch (b) was the bug. It happily set `lastOverlayDeckId = "spotify-deck"` when chrome was the active overlay, but never called `setOverlay(null)` to dismiss chrome. The new spotify deck's `autoShow === false` meant the function returned early after updating the cache, leaving the chrome overlay mounted.

## Solution

Modified `applyOverlay` in `packages/cli/src/deck/runtime.ts` to first check whether the current overlay's trigger still applies. If not, dismiss it before handling the new match:

```ts
const applyOverlay = (deckId: string | null): void => {
  if (deckId !== null && deckById(deckId) === undefined) {
    logger.warn({ deckId }, "active-app: overlay deck not found")
    return
  }
  if (deckId === null) {
    if (overlayDeckId !== null) {
      setOverlay(null, { source: "autoShow" })
    }
    lastOverlayDeckId = null
    return
  }
  if (overlayDeckId !== null && deckId !== overlayDeckId) {
    const newDeck = deckById(deckId)
    if (newDeck === undefined) return
    if (newDeck.autoShow === true) {
      setOverlay(deckId, { source: "autoShow" })
    } else {
      setOverlay(null, { source: "autoShow" })
    }
    lastOverlayDeckId = deckId
    return
  }
  if (deckId === lastOverlayDeckId) return
  const deck = deckById(deckId)
  if (deck === undefined) return
  if (deck.autoShow !== true) {
    lastOverlayDeckId = deckId
    return
  }
  lastOverlayDeckId = deckId
  setOverlay(deckId, { source: "autoShow" })
}
```

Three branches now decide overlay state from the active-app poll:

1. `deckId === null` — dismiss the current overlay if any; clear `lastOverlayDeckId`.
2. Overlay active AND match changed — auto-switch when the new match is `autoShow: true`; dismiss the current overlay when it is `autoShow: false`. `lastOverlayDeckId` is set so the next poll cycle is a no-op while the active-app stays the same.
3. Overlay NOT active AND match is `autoShow: true` — apply it (existing first-activation path).
4. Overlay NOT active AND match is `autoShow: false` — leave it as "available" only; manual toggle required.

Four observable outcomes per match state:

| Current overlay | New match | Result |
|-----------------|-----------|--------|
| chrome (autoShow) | spotify-deck (autoShow=true) | dismiss chrome, auto-apply spotify |
| chrome (autoShow) | spotify-deck (autoShow=false) | dismiss chrome, stay on regular layer (spotify available for manual toggle) |
| chrome (autoShow) | null (no match, e.g. Firefox) | dismiss chrome, stay on regular layer |
| chrome (autoShow) | chrome-deck (still matches) | noop (early-return) |

## Why This Works

`applyOverlay` is the single chokepoint that turns active-app poll signals into layer state changes. The previous implementation conflated "new deck was selected by the matcher" with "current deck is still valid". The fix separates those concerns: when the matcher returns a deck different from the currently active one, the current one's trigger is by definition no longer satisfied, regardless of the new match's `autoShow`. Dismissing first then re-evaluating the new match keeps the invariant "`overlayDeckId === null || its trigger matches the current active-app`".

The `autoShow` branch in the "match changed while overlay active" path was the second iteration of this fix (commit `eb5f013f`). The first iteration (`f2823e8e`) auto-switched unconditionally — which collapsed two distinct semantics ("overlay mode follows an autoShow match" vs. "overlay mode allows manual activation regardless of autoShow") into one. Splitting on `autoShow` restores both semantics: auto-switch for autoShow matches, manual toggle for the rest.

## Prevention

- Added four regression tests in `packages/cli/src/deck/__tests__/runtime.test.ts`:
  - "dismisses current overlay when trigger no longer applies (active-app switches to different overlay)"
  - "dismisses current overlay when active-app switches to non-matching app"
  - "switches overlay to the new matched overlay when both are autoShow (overlay mode follows the match)"
  - "dismisses current overlay when active-app switches to a non-autoShow overlay match"
- Pattern to remember: when a state machine has an "auto" transition driven by an external poll, the "transition away from current state" condition must be checked against *what the matcher returned*, not just *whether it returned anything*. A null result is not the only signal that the current state is invalid. And when the new match is "available only" (non-autoShow), never activate it from the poll — leave that to manual user action.
- Related: the same poll also drives `availableOverlayDeckId` updates (which the runtime:overlay-available subscriber broadcasts to the frontend). Both signals — "available" and "active" — must be kept consistent with the matcher output.

## Related

- `.planning/phases/05-overlay-decks/05-CONTEXT.md` — locks the AND-across-fields semantics and per-overlay-deck nav stack
- `.planning/solutions/runtime-errors/emoji-paste-hangs-gnome-wayland-2026-07-17.md` — unrelated (Wayland key-injection issue)
- `.planning/solutions/logic-errors/overlay-page-nav-state-survives-toggle-2026-07-22.md` — the second half of quick-009: page-nav state preservation across toggle and across app switches (same architectural theme, different angle)
- Commit `f52bccf` — the original fix
- Commit `f2823e8e` — overlay-mode-follows-match iteration
- Commit `eb5f013f` — autoShow-respecting iteration