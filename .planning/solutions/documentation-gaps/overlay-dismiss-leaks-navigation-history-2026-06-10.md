---
title: Overlay dismiss does not clean deck controller navigation history
date: 2026-06-10
category: documentation-gaps
module: deck/runtime
problem_type: documentation_gap
severity: low
tags:
  - overlay
  - navigation-history
  - dismiss
  - deck-controller
  - add-to-history
  - side-effect
applies_when:
  - Overlay deck dismiss is triggered and the overlay deck's navigation used `addToHistory: true`
  - The deck controller stack is shared between base and overlay decks
---

# Overlay dismiss does not clean deck controller navigation history

## Context

The `dismissOverlay()` function in the deck runtime (`runtime.ts:1454-1461`) only sets `overlayDeckId = null` and re-renders. It does **not** clear the deck controller's navigation history stack. The deck controller maintains a shared navigation history for the entire runtime — there is no separate stack for overlay vs. base decks.

This means: if an overlay deck navigates internally with `addToHistory: true`, those history entries persist after the overlay is dismissed. When the base deck later navigates back, the stale overlay entries in the stack can cause unexpected behavior.

```typescript
// Current dismiss — overlayDeckId only, no history cleanup
function dismissOverlay(): void {
  if (overlayDeckId === null) return
  lastDismissedOverlayDeckId = overlayDeckId
  overlayDeckId = null
  void renderDeckSurface(getDisplayDeckId(), activeActivationVersion)
}
```

## Guidance

This is **not fixed** in this phase because no current code path uses overlay navigation with `addToHistory: true`. All existing overlay nav buttons use `addToHistory: false`. However, it is a landmine for future development:

### Options for a fix:

1. **Inject a clearHistory call on overlay dismiss** — Before setting `overlayDeckId = null`, call `deckController.clearHistory()` or similar. This is the safest but broadest: it clears even legitimate base-deck history.

2. **Tag history entries with a deck scope** — Each entry in the navigation stack could include the deck ID it was navigated *from*, allowing selective cleanup of overlay-scoped entries on dismiss.

3. **Dismiss-time history rollback** — Record the stack depth when an overlay is first shown, then truncate to that depth on dismiss.

4. **Use `addToHistory: false` for all overlay navigation** (current approach) — Works but is a fragile convention that must be enforced.

### Current safeguard:

The existing test for overlay behavior uses `addToHistory: false`, which sidesteps the concern entirely. If a future feature adds overlay-internal navigation with history tracking, this gap must be addressed.

## Why This Matters

A leaking navigation stack manifests as confusing "back" behavior — the user presses back expecting to go to the previous base deck, but instead cycles through stale overlay pages (or lands on a broken state because the overlay deck is no longer active). These are hard to diagnose because the stack is opaque and the correlation to overlay dismiss is not obvious.

## When to Apply

- When adding any navigation call inside an overlay deck: use `addToHistory: false` unless there is an explicit design for history scoping.
- Before implementing overlay-internal `change-deck` buttons that navigate relative to the overlay (e.g., sub-menus within an overlay): design a history isolation strategy first.

## Related

- `packages/cli/src/deck/runtime.ts` — `dismissOverlay()` at line 1454, `overlayDeckId` at line 423
- `packages/cli/src/deck/system-buttons/system-buttons.ts` — `isOverlayOrPageOf()` used to determine overlay deck membership
