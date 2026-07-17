---
wave: 2
depends_on:
  - PLAN-1.md
---

# Phase 5 Plan 2: Frontend — Gestures, Icon Plumbing, Back-Hold

## Goal
Wire the user-facing layer-flip gesture (dbltap on the overlay-toggle side of the n-1 SplitSurface), long-press the back button to jump to the regular layer's main deck, and render the matched overlay deck's icon on the toggle. After this plan, the user can flip layers from the device with the gestures specified in the CONTEXT, and the n-1 SplitSurface always shows the right icon and reacts to the right gestures.

## Must-Haves
- `computeSystemButtonForSlotN1` returns `core:back` (not `core:overlay-toggle`) when the deck is an overlay, so the SplitSurface renders in BOTH regular and overlay layers.
- `deckConfigMessageSchema` gains `overlayDeckIcon: z.string().nullable().default(null)`; runtime fills it from the active overlay deck's `icon` (or `null` when no overlay is active).
- `useButtonAction` in `Deck.tsx` accepts `dbl-tap` and `hold` for the n-1 SplitSurface; gestures are dispatched with the right composite button id (overlay deck's n-1 gets `core:overlay-toggle` resolved at the runtime).
- `renderSystemButton` accepts an optional `icon` override; the SplitSurface secondary side uses `deck.overlayDeckIcon ?? default` so the matched deck's icon shows up.
- Runtime handles `core:overlay-toggle` + dbl-tap → flip layer (setOverlay or applyOverlay(null)/setOverlay(activeOverlay)).
- Runtime handles `core:back` + hold while overlay is active → setOverlay(null) (jumps to regular layer's main).
- Tests + `pnpm typecheck` pass; pre-existing failures remain pre-existing.

## Task 2.1: Add overlayDeckIcon to the deck-config protocol
- **Files:** `packages/cli/src/api/protocol-internal.ts`, `packages/cli/src/render/protocol.ts` (if it re-exports types)
- **Action:** Add `overlayDeckIcon: z.string().nullable().default(null)` to `deckConfigMessageSchema`. Update the inferred `DeckConfigMessage` type. No other change — emulator/real transports forward the field opaquely.
- **Verify:** Type check passes; existing protocol tests still pass.
- **Done:** [ ]

## Task 2.2: Runtime populates overlayDeckIcon
- **Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/cli/commands/run.ts` (or wherever the deck-config message is constructed for the frontend)
- **Action:** When the runtime computes a `availableOverlayDeckId` or `overlayDeckId`, look up the deck and attach its `icon` to the next emitted `deck-config` message. When no overlay is active, send `null`. Add a runtime test: after a matching snapshot, the next `deck-config` payload includes the right icon string; after dismissal, it's `null`.
- **Verify:** Runtime test asserts the emitted deck-config payload.
- **Done:** [ ]

## Task 2.3: Fix system-back-injection for overlay decks
- **Files:** `packages/cli/src/deck/system-back-injection.ts`, `packages/cli/src/deck/__tests__/system-back-injection.test.ts`
- **Action:** Change `computeSystemButtonForSlotN1` so an `isOverlay` deck returns `core:back` (instead of `core:overlay-toggle`). The SplitSurface in `Deck.tsx` already renders the secondary side as `core:overlay-toggle`; making the slot type `core:back` ensures the `splitAtN1` branch (`Deck.tsx:244`) fires for both regular and overlay decks. Update the test matrix to cover: regular deck with overlay available → back (split fires), overlay deck → back (split fires), main deck → settings-entry (no split).
- **Verify:** Updated selector tests pass; the build-config test for overlay decks still asserts the n-1 is back+overlay-toggle (the `type` field of the injected button becomes `core:back`, the SplitSurface renders the toggle on the secondary side).
- **Done:** [ ]

## Task 2.4: Plumb dbl-tap and hold gestures on the n-1 SplitSurface
- **Files:** `packages/cli/frontend/src/components/Deck.tsx`, `packages/cli/frontend/src/hooks/use-button-action.ts` (or wherever the bridge lives), `packages/cli/src/deck/runtime.ts`
- **Action:** Extend the per-position `useButtonAction` bridge (or the SplitSurface cell) to dispatch `dbl-tap` and `hold` gestures for the n-1 cell. The composite button id: the n-1 cell's logical id is the system button type at that position (`core:back` after Task 2.3). When the deck is an overlay deck, dispatching `dbl-tap` on the n-1 cell hits the overlay-toggle (because the runtime resolves the cell to `core:overlay-toggle` for the secondary side). In the runtime, extend `invokeAction` to handle: button type `core:overlay-toggle` with gesture `dbl-tap` → flip layer (`setOverlay` between current overlay and `null`, or between `null` and the available overlay's id). For now the runtime hard-codes the mapping; no new method.
- **Verify:** Runtime test simulates a `core:overlay-toggle` button with `dbl-tap` gesture; asserts the layer flips. Frontend test renders the n-1 SplitSurface and dispatches a `dbl-tap`; asserts the bridge calls `fire("dbl-tap")`.
- **Done:** [ ]

## Task 2.5: Back-hold jumps to `navStack[0]` when overlay is active
- **Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`
- **Action:** In `invokeAction`, when the button is `core:back`, the gesture is `hold`, AND `overlayDeckId !== null` → call `setOverlay(null)` AND explicitly navigate the regular layer to `navStack[0]` (the isMain deck). `setOverlay(null)` alone restores to `overlayPreviousActiveId`, which is the regular layer's top at activation time — wrong target. The CONTEXT decision is `navStack[0]` (the isMain deck). Implementation: reset `navStack` to `[mainDeck.id]` (or call `navigateToDeck(mainDeck.id, { addToHistory: false })`), then `setOverlay(null)`. Otherwise `hold` on `core:back` in the regular layer keeps current behaviour (no-op, per existing semantics). Tests: hold on back while overlay is active → overlay dismisses and `getActiveDeckId` returns `mainDeck.id`; hold on back in regular layer → no-op; hold on back in overlay when navStack was already at root → still ends on `mainDeck.id` (idempotent).
- **Verify:** Runtime tests pass.
- **Done:** [ ]

## Task 2.6: Render matched icon on the SplitSurface secondary
- **Files:** `packages/cli/frontend/src/components/Deck.tsx`, `packages/cli/src/deck/system-buttons/registry.tsx` (and its frontend twin if it exists)
- **Action:** Pass `deck.overlayDeckIcon` from `Deck.tsx` into the SplitSurface's secondary side via `renderSystemButton`. `renderSystemButton` accepts an optional `icon` prop; when present, it overrides the static registry entry. When absent or no overlay is matched, fall back to `icon://layers`. Add a frontend test: when `deck.overlayDeckIcon === "icon://chrome"`, the secondary slot renders the chrome icon (or the asset path); when `null`, it renders the layers fallback.
- **Verify:** Frontend test asserts the rendered icon source.
- **Done:** [ ]

## Task 2.7: End-to-end smoke
- **Files:** `packages/cli/src/deck/__tests__/runtime.test.ts` (extend), `packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx` (extend)
- **Action:** Add one runtime test that exercises the full chain after this plan: matched snapshot → dbltap on overlay-toggle → layer flips; long-press on back → overlay dismisses and `getActiveDeckId` returns `mainDeck.id` (the isMain deck); toggle back to the same overlay → its previous stack is restored and the deck-config message has the matched icon. Add one frontend test that the SplitSurface n-1 cell renders the icon override and dispatches the right gestures.
- **Verify:** Both tests pass; full `pnpm test` shows only pre-existing failures.
- **Done:** [ ]

## Context
See `CONTEXT.md`, `RESEARCH.md`, and `PLAN-1.md` in this directory. Plan 1 must be merged before this plan runs.
