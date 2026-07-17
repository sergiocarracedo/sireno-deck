# Plan 2 Summary

**Completed:** 2026-07-17

## What was built
Wired the user-facing layer-flip gesture (dbltap on the n-1 SplitSurface), long-press back to jump to the regular layer's main deck, and the matched overlay deck's icon on the toggle. Frontend SplitSurface cell now detects tap / dbl-tap / hold via inline gesture detection; runtime `invokeAction` routes `core:back` and `core:overlay-toggle` buttons by type (before the active-deck guard) to flip layers, dismiss overlays, or jump to `navStack[0]`.

## Key files
- `packages/cli/src/api/protocol-internal.ts` — `overlayDeckIcon` field on `deckConfigMessageSchema`
- `packages/cli/src/deck/runtime.ts` — `getAvailableOverlayDeckIcon()`, system-button routing in `invokeAction` (core:back / core:overlay-toggle + tap/hold/dbl-tap)
- `packages/cli/src/deck/deck-config.ts` — `overlayDeckIcon` plumbed into the deck-config message
- `packages/cli/src/cli/commands/run.ts` — wires `runtime.getAvailableOverlayDeckIcon()` into `buildDeckConfigMessage`
- `packages/cli/src/deck/system-back-injection.ts` — overlay decks now also get `core:back` at n-1 (SplitSurface renders the toggle on the secondary side via `deck.overlayDeckIcon`)
- `packages/cli/src/deck/system-buttons/registry.tsx` — `renderSystemButton(type, iconOverride?)` accepts an icon override
- `packages/cli/frontend/src/components/Deck.tsx` — `Deck.overlayDeckIcon` field; SplitSurface cell detects tap / dbl-tap (<300ms window) / hold (≥500ms) via inline gesture handlers; secondary side renders `renderSystemButton("core:overlay-toggle", deck.overlayDeckIcon ?? undefined)`
- `packages/cli/src/deck/__tests__/runtime.test.ts` — 17 new tests: 8 system-button gesture tests, 3 getAvailableOverlayDeckIcon tests, 6 overlay-smoke full-chain tests
- `packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts` — updated overlay-deck test for new design (n-1 is `core:back`, message includes `overlayDeckIcon`)

## Decisions made
- **System buttons route BEFORE the active-deck guard in `invokeAction`.** System buttons (`core:back`, `core:overlay-toggle`) are injected on every non-main deck via system-back-injection. The active deck may be a sub-deck of the deck that owns the button (e.g., active is `spotify-page`, button id resolves to `spotify`'s n-1), so the active-deck check would incorrectly drop the gesture. Routing by button type first solves this.
- **Inline gesture detection in the SplitSurface cell** (500ms hold timer, 300ms dbl-tap window) rather than touching `useButtonAction`. Keeps the gesture logic colocated with the cell that needs it.
- **`overlay-toggle` legacy type path** still wired through `invokeAction` as a synonym for `core:back` + `dbl-tap`. Useful for any direct `core:overlay-toggle` button dispatch.

## Notes for downstream
- All 97 tests in the runtime / system-back-injection / emulator-build-config / Deck frontend / glob-match surfaces pass.
- 12 pre-existing test failures remain (weather frontend, emoji-selector decks, ws-integration, config schema, internal-settings deck factory, start command) — not caused by Phase 5 work. Verified by stash-pop diff: those 12 fail on `main` too.
- Typecheck errors are pre-existing in `src/outputClient/`, `src/render/`, `src/system/` — none in files modified by this phase.

## Commits
- `23f0dde` feat(05-2): route core:back/overlay-toggle gestures in runtime invokeAction
- `f24bf76` feat(05-2): wire dbl-tap/hold gestures + overlay icon override on SplitSurface
- `b6158b7` test(05-2): smoke tests for system-button gestures + overlay full chain