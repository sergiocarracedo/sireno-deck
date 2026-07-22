# Quick Task 009 Summary (addendum)

**Task:** Follow-up to quick-009 — pagination inside overlay mode (page-nav
buttons on chrome-overlay's paginated pages) was invisible to the runtime.
After tapping next-page the broadcast said `p2` but `getActiveDeckId()`
returned `p1` (the overlay root), so dismissing overlay restored the
regular layer with stale state.
**Completed:** 2026-07-22
**Code commit:** `0b2539de`

## Root cause

`getActiveDeckId()` in `packages/cli/src/deck/runtime.ts` ignored
`transientDeckId` when an overlay was active:

```ts
if (overlayDeckId !== null) {
  const stack = overlayNavStacks.get(overlayDeckId)
  if (stack !== undefined && stack.length > 0) {
    return stack[stack.length - 1] ?? overlayDeckId
  }
  return overlayDeckId
}
```

Page-nav uses `transientDeckId` (via `navigateToDeck(..., { addToHistory:
false })`), which is the runtime's way to say "the user navigated
temporarily without touching history". When overlay mode is on, the
runtime ignored this signal and kept reporting the overlay root as
active — so the broadcast fired for the page, but every subsequent
query of "what's the current deck" returned the overlay root.

## Fix

Three small changes in `runtime.ts`:

1. `getActiveDeckId()` now checks `transientDeckId` first when an
   overlay is active. Falls back to the overlay nav stack top, then
   `overlayDeckId` itself (existing behavior preserved).
2. `setOverlay(null)` clears `transientDeckId`. Otherwise a dismissed
   overlay leaves a stale page on the regular layer.
3. `setOverlay(null)` publishes `runtime:deck-inactive` for the
   actually-deactivated deck (`previousActiveId`, e.g. `-p2`) instead
   of the overlay root (`previousOverlayId`, e.g. `-p1`). Subscribers
   see the right deck going dark.

## Tests

Two new regression tests in `runtime.test.ts`:

- `paginated overlay page (transientDeckId) is the active deck while
  overlay is on`
- `dismissing overlay after a paginated page-nav restores the regular
  deck (not the page)`

All 81 runtime tests pass. The pre-existing order-dependent
`lock-deck.test.ts` failure when running the whole `deck/` folder is
unchanged (verified isolated → green).

## Files changed

- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`

## Commits

- `0b2539de` fix(runtime): overlay mode honors transient page-nav; clear transient on dismiss
