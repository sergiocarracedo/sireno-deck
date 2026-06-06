# Plan 46-04 Summary

**Completed:** 2026-06-06

## What was built

Wired the pre-existing system-back injection helpers into the deck runtime so subdecks actually get a core-owned back button at the reserved slot (SRB-03). The helpers (`shouldInjectSystemBack`, `getSystemBackButtonInstance`, `SystemBackButton`) shipped in Phase 42 but were never imported by `runtime.ts` — only by their own unit tests — which left the reserved slot empty on every subdeck.

The runtime now:
- Calls `shouldInjectSystemBack(deck, config)` inside `getDeckButtons` and, when it returns true, appends a `system-back` instance at `keyCount - 1` to the deck's button list. The injection respects all four guard rules in the helper (no `allow_reserved_slot_override`, no `locked_deck === deck.id`, no pre-existing button at the reserved slot, no config-level reserved-slot override).
- Plumbs `config` into `DeckRuntimeOptions` (it was already optional there) and synthesises a `SirenoConfig` view from `options.config` + `options.lockedDeckId` so `shouldInjectSystemBack` can read `session.locked_deck`.
- Adds a `system-back` branch in `instantiateRuntimeButtonInstance` that renders the existing `SystemBackButton` component, wires `onPress`/`onTap` to `deckController.goBack()` (with a guard for the main deck), and wires `onHold` to `restoreStack([])` so a 600ms hold resets to the main deck.

## Key files

- `packages/cli/src/deck/runtime.ts` — Imported `SystemBackButton`, `getSystemBackButtonInstance`, `shouldInjectSystemBack`; updated `getDeckButtons` to inject at the reserved slot when the helper allows it; added `system-back` case in `instantiateRuntimeButtonInstance` that renders the component and routes tap/hold through `deckController.goBack()` / `restoreStack([])`.
- `packages/cli/src/deck/runtime.test.ts` — Two new tests: (1) a subdeck with no button at position 14 has a `system-back` button there after `createDeckRuntime` + `start`; (2) a deck whose `lockedDeckId` equals its own id does NOT have a system-back at the reserved slot. Added a `createEmptyAddonRegistry` helper using the existing `createAddonRegistry` factory from the addon registry module so the new tests can satisfy the `addonRegistry` option that `runtime.start()` reads.

## Decisions made

- Built the synthetic `SirenoConfig` view inside `getDeckButtons` rather than plumbing the resolved config through every internal call site, keeping the change scoped to one function. The view is rebuilt on each `getDeckButtons` call but is cheap (a small object spread).
- `onTap` checks `previousDeckId === options.deck.id` and short-circuits — pressing the back slot on the main deck is a no-op, matching the existing `SystemBackButton` component's `isMainDeck` rendering branch (which shows a dimmed "Home" label rather than a back arrow).
- The `onTap` passed into the `SystemBackButton` component is a no-op in the runtime-driven path because the real navigation is handled by the runtime's own `onPress`/`onTap` handlers. This avoids a double-navigation race when the component is rendered in the browser emulator (which also fires its own pointer handlers).
- The 43 pre-existing runtime-test failures (`Cannot read properties of undefined (reading 'listButtons')`) are unchanged — they originate in the test setup before Phase 46. The new 2 tests pass on top of the same pre-existing pattern by supplying a real `createAddonRegistry()` instance.

## Notes for downstream

- The runtime now owns the `system-back` button type end-to-end. The validation half from Phase 42 (rejecting addon-claimed reserved slots) plus this injection half now close SRB-03.
- `options.config` was already part of `DeckRuntimeOptions`; nothing in the public surface changed. The new `lockedDeckId`-derived `session.locked_deck` injection is internal to `getDeckButtons` and does not affect callers.
- The two new tests are the first in the file to provide `addonRegistry`. If other test failures in this file get fixed by adding the same `createEmptyAddonRegistry` mock, that's a clean follow-up.
