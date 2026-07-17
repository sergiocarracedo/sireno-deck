# Phase 5 Research: Overlay Decks

## Don't Hand-Roll

- **Gesture plumbing on system buttons.** Already a `useButtonAction(deckId, position).fire(gesture)` bridge in `Deck.tsx` (line 101, 168). Extend it to accept `dbl-tap` and `hold` — no new bridge, no new IPC. The `runtime:gesture:{buttonId}` pub/sub channel already exists for per-button gestures; reuse it.
- **n-1 button slot.** `computeSystemButtonForSlotN1` in `system-back-injection.ts` is the only selector. The `SplitActionSurface` is already rendered in `Deck.tsx:119-138` when `splitAtN1` is true. To make it also fire on overlay decks, change the selector to return `core:back` for `isOverlay` decks (so the `splitAtN1` branch in `Deck.tsx` matches), and pass the overlay context through `deck-config` to the frontend.
- **Per-deck state isolation.** The runtime already keeps `navStack`, `transientDeckId`, `overlayDeckId`, `overlayPreviousActiveId` as separate slots. A `Map<overlayDeckId, string[]>` slots in next to them — no new state container, no new pub/sub channel needed.
- **PubSub events for layer flips.** `runtime:overlay`, `runtime:activeDeck`, `runtime:deck-inactive` already exist. Reuse them — no new event types.
- **Globs over regex.** `compileDeckMatcher` and `matchesPattern` in `system/glob-match.ts` already support `*`/`?`/`|` and case-insensitive matching for both process name and window title. Just need to AND them per field.

## Common Pitfalls

- **`autoShow` never read.** `RuntimeDeck.autoShow` is declared on the interface (line 34 of `runtime.ts`) but `applyOverlay` (line 394) does not consult it. Currently every matching overlay activates regardless of `autoShow`. The bug: a deck with `autoShow: false` still flips automatically. Fix is one `if` in `applyOverlay` plus a `hasOverlayDeckAvailable` extension that knows the difference between "available" and "active."
- **Shared navStack between layers.** `getActiveDeckId` returns `overlayDeckId ?? transientDeckId ?? navStack[navStack.length-1] ?? mainDeck.id` (line 144). `goBack` only knows about `transientDeckId` and `navStack` (line 173) — overlay history is invisible to it. If you forget the per-overlay stack, every "back" inside the overlay will pop the regular layer's history, which is wrong.
- **Gesture support in the system button bridge.** `useButtonAction` only wires `fire("tap")` in the current `Deck.tsx`. The runtime's `invokeAction` already accepts `GestureKind` (which is `tap | dbl-tap | hold`), so the runtime is ready — only the frontend bridge needs the extra calls. Don't add a second bridge.
- **`hasOverlayDeckAvailable` semantic.** Currently true when `overlayDeckId !== null || pendingOverlayDeckId !== null` — i.e. "is an overlay currently active?" After this phase it must mean "is an overlay AVAILABLE" (matched but possibly awaiting user toggle when `autoShow: false`). Rename or repurpose, and update both the runtime and the `deckConfigMessageSchema` boolean.
- **Per-overlay-deck stack key.** Stack key is the deck id, not the matched snapshot. Two overlay decks can match the same active app at different times; their stacks must remain distinct.
- **Empty-overlay-stack back behaviour.** When `overlayNavStacks.get(activeOverlayId)?.length === 1` (only the root), `goBack` from the overlay must dismiss the overlay instead of being a no-op. Otherwise the user is stuck.
- **Front-end overlay-toggle icon override.** `renderSystemButton("core:overlay-toggle")` reads the static `{ source: "icon://layers", label: "Overlay" }` from `system-buttons/registry.tsx`. Plumb a per-call `icon` override; default to the static entry. Don't replace the registry entry — the rest of the codebase reads it.
- **Frontend `splitAtN1` condition.** `Deck.tsx:244` currently fires when `button.type === "core:back"` at the n-1 slot. When the overlay is active, the n-1 slot is `core:overlay-toggle` (from the system-back-injection selector). The split must render in BOTH cases, otherwise the overlay deck shows just the toggle icon with no back. **Fix:** in the system-back-injection selector, return `core:back` for overlay decks so the SplitSurface fires; the SplitSurface's secondary side already renders the overlay-toggle (per `Deck.tsx:134`).

## Existing Patterns in This Codebase

- **Protocol evolution.** New fields on `deckConfigMessageSchema` (`protocol-internal.ts:37`) are additive; the receiving side already ignores unknown keys. Add `overlayDeckIcon: z.string().nullable().default(null)` and the frontend can pick it up without backend coordination.
- **System buttons are data, not code.** Adding a new system button means: add type to `SYSTEM_BUTTON_TYPES`, add a registry entry in `system-buttons/registry.tsx`, render in `Deck.tsx`. The dispatch path is `useButtonAction().fire(gesture)` → `runtime.dispatchGesture(buttonId, gesture)` → `invokeAction`. Don't introduce a parallel dispatch path.
- **Test seams for active-app polling.** `runtime.ts` already has tests for the polling loop (`__tests__/runtime.test.ts:414-512`). New tests for AND-semantics matcher, per-overlay-deck stack, `autoShow` gating, and back-hold go in the same file. Use a `FakeActiveAppProvider` with controllable snapshots — same fixture pattern as the existing tests.
- **`deck-config` is the canonical frontend snapshot.** Anything the frontend needs to render the n-1 SplitSurface with the right icon, the right indicator, the right click target — push it through `deckConfigMessageSchema`. The emulator and real output clients both forward `deck-config` as opaque; no per-transport changes.
- **Gesture source = `useButtonAction` hook.** No per-button event listeners in the runtime; everything funnels through `dispatchGesture`. Extending the hook to support `dbl-tap` and `hold` is the only place that needs frontend-side plumbing.

## Recommended Approach

### Plan A: AND-semantics matcher + autoShow gating (backend)

- Reshape `compileDeckMatcher` to take `{ processNames?: string[]; windowNames?: string[] }` and AND them.
- In `applyOverlay`, gate the actual layer flip on `deck.autoShow === true`. Track `availableOverlayDeckId` separately from `overlayDeckId` so `hasOverlayDeckAvailable` reflects availability, not just activation.
- Multi-overlay priority: sort candidates by specificity score (both fields set > one field set), tie-break by config declaration order. Pick the first matching deck.
- Tests: AND-semantics (process + window both required, only process, only window), autoShow gate, priority ordering.

### Plan B: Per-overlay-deck nav stack + back semantics (runtime)

- Add `overlayNavStacks: Map<overlayDeckId, string[]>`.
- Update `getActiveDeckId` to read from the active overlay's stack when `overlayDeckId !== null`.
- Update `goBack` to: (1) when in overlay, pop the active overlay's stack; (2) when that stack is empty, dismiss the overlay.
- Update `navigateToDeck` to push onto the appropriate stack based on whether the target is the active overlay.
- Tests: per-overlay stack isolation, persistence across toggle off/on, empty stack → dismiss.

### Plan C: Gesture wiring + system-back-injection + icon plumbing (cross-cutting)

- Change `computeSystemButtonForSlotN1`: when `isOverlay` is true, return `core:back` (so SplitSurface renders) instead of `core:overlay-toggle`.
- Plumb `overlayDeckIcon` through `deckConfigMessageSchema`; runtime fills it from the active overlay deck's `icon` field, or `null` when no overlay is active.
- Extend `useButtonAction` in `Deck.tsx` to accept `dbl-tap` and `hold` for the n-1 SplitSurface; pass those to `runtime.dispatchGesture` with the right `buttonId` (the SplitSurface has a `data-button-type` and a position — derive a composite id).
- Wire runtime dispatch: when `core:overlay-toggle` + dbl-tap → flip layer (setOverlay or applyOverlay(null)); when `core:back` + hold while overlay is active → setOverlay(null).
- Update `renderSystemButton` to accept an `icon` override prop; the SplitSurface secondary side uses it.
- Tests: protocol field, system-back-injection for both regular and overlay decks, runtime handles dbl-tap and hold gestures, frontend renders the matched icon.

## Files to Change

- `packages/cli/src/system/glob-match.ts` — reshape matcher (Plan A).
- `packages/cli/src/deck/runtime.ts` — `autoShow` gate, per-overlay-deck stack, gesture handling (Plans A, B, C).
- `packages/cli/src/deck/system-back-injection.ts` — selector change (Plan C).
- `packages/cli/src/api/protocol-internal.ts` — `overlayDeckIcon` field (Plan C).
- `packages/cli/frontend/src/components/Deck.tsx` — `useButtonAction` extension, icon override pass-through (Plan C).
- `packages/cli/src/deck/system-buttons/registry.tsx` — accept icon override (Plan C, low-risk).
- Tests: `__tests__/glob-match.test.ts`, `__tests__/runtime.test.ts`, `__tests__/system-back-injection.test.ts`, frontend `__tests__/system-buttons-render.test.tsx` or new test for the dbl-tap path.

## Risks

- **Multi-overlay priority ambiguity** when two decks' AND-semantics triggers both evaluate true on the same snapshot. The most-specific-wins rule handles the common case; an explicit test of "two single-field decks" will pin the behaviour.
- **Stale `pendingOverlayDeckId`** when the active app changes during the 200ms debounce. Already handled in the current loop, but `autoShow` gating must check both the active and the pending value.
- **Real device path** is unaffected by Phase 5 (all changes are runtime + protocol + frontend). The real output client forwards `deck-config` opaquely, so no per-transport regression.
- **Empty overlay root = main deck of the overlay, not the regular layer's main.** The stack init must push the overlay's own root deck id (`overlayRootDeckId`) onto the new stack when the overlay is first activated. Otherwise `goBack` from the root is undefined.
