# Plan 06-03 Summary

**Completed:** 2026-07-17

## What was built

Overlay auto-resume on unlock + nav stack restore. When the OS unlocks, the runtime restores the user's pre-lock context in two paths:

1. **Overlay auto-resume** — if a window-triggered overlay was active at lock time and its trigger still matches the current active app, `setOverlay(preLockOverlayDeckId, { source: "autoShow" })` re-applies it. Overlay's nav stack is preserved (Phase 5 design).
2. **Regular restoration** — otherwise the overlay is dismissed and the regular-layer deck (not the overlay's top stack) is restored via `navigateToDeck(preLockActiveDeckId, { addToHistory: false })`.

The regular-layer deck snapshot uses `overlayPreviousActiveId` (set by Phase 5's `setOverlay` when an overlay activates) — falling back to `transientDeckId`, `navStack[navStack.length - 1]`, then `mainDeck.id`. This ensures the snapshot captures the deck *behind* the overlay, not the overlay itself.

## Key files

- `packages/cli/src/deck/runtime.ts`:
  - New closure-local `latestActiveAppSnapshot` updated by the active-app poll loop (was previously discarded after overlay matching).
  - `snapshotRegularActiveDeckId()` helper captures the regular-layer deck for the lock-entry snapshot.
  - Session `unlocked` branch restructured: if `computeOverlayFor(latestActiveAppSnapshot) === preLockOverlayDeckId`, resume the overlay; otherwise dismiss and restore the regular deck.
- `packages/cli/src/deck/__tests__/overlay-lock-resume.test.ts` — new test file (5 tests): regular-only restore, overlay auto-resume on trigger match, overlay dismiss + regular restore on trigger mismatch, escape-stickiness, snapshot refresh on consecutive lock events.

## Decisions made

- **Snapshot the regular-layer deck, not the overlay top** (was the bug the second test caught). `getActiveDeckId()` returns the overlay's top stack when overlay is active — but the user expects "media" to be restored, not the overlay deck. Using `overlayPreviousActiveId` (Phase 5's existing snapshot) gives the right answer without coupling Phase 6 to overlay internals.
- **`latestActiveAppSnapshot` is shared state for both overlay matching AND lock-resume trigger checking**. The poll loop already had `latestActiveAppSnapshot` only used implicitly; now it's retained in closure for both purposes. Minimal addition — the snapshot was being computed anyway.
- **Escape-stickiness verified**: folder-escape clears `lockActive` without going through the unlock handler's snapshot restore. OS unlock after escape is a no-op (the `lockActive` guard in the handler skips the restore path). The user stays on the folder deck until the next OS lock event.

## Notes for downstream

- The `runtime:lock-mode` pubsub event now fires on session-locked, session-unlocked, AND escape. Frontend code (future phase) can subscribe for visual feedback.
- The poll-loop now retains `latestActiveAppSnapshot`. Future phases can use this for any UI that needs the current active app snapshot (e.g. process-name badge, window-title surface).
- The overlay resume path uses `setOverlay(..., { source: "autoShow" })`. This means it will NOT trigger a `runtime:overlay` event with `source: "manual"` — consistent with Phase 5 semantics.

## Commits

- `fa2e4e8` T3.1+T3.2+T3.3 — overlay auto-resume + nav stack restore + snapshot tests