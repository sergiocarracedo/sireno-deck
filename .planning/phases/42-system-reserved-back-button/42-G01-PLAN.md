---
wave: 1
depends_on: []
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/system-back-injection.ts
  - packages/cli/src/deck/system-back-injection.test.ts
autonomous: true
single_layer_justified: false
gap_closure: true
objective: "Wire the existing SystemBackButton component into the deck runtime so that the reserved key slot renders a Home indicator on the main deck and a back button (tap → goBack, hold ≥600ms → restoreStack([mainDeckId])) on subdecks. Lock-session deck and decks with allow_reserved_slot_override: true skip the injection. The reservedBackKeyIndex infrastructure (runtime.ts:277) already exists — this plan adds the renderer and gesture wiring."
---

## Tasks

### 42-G01: Add system-back injection helper

- **file**: `packages/cli/src/deck/system-back-injection.ts`
- **action**: |
  Create a helper that decides whether to inject the system back button for a given deck, and produces the synthetic button instance.

  ```ts
  import type { ButtonInstance, DeckConfig, SirenoConfig } from '../core/schemas.js'
  import type { ThemeMediaPlayerSurface } from '../config/theme/schemas.js'

  export const SYSTEM_BACK_TYPE = 'system-back' as const

  export function shouldInjectSystemBack(
    deck: DeckConfig,
    config: SirenoConfig,
  ): boolean {
    if (config.allow_reserved_slot_override) return false
    if (deck.allow_reserved_slot_override) return false
    if (config.session?.locked_deck === deck.id) return false
    if (deck.buttons?.some((b) => b.position === deck.keyCount - 1)) return false
    return true
  }

  export function getSystemBackButtonInstance(
    deck: DeckConfig,
    keyIndex: number,
  ): ButtonInstance {
    return {
      position: keyIndex,
      type: SYSTEM_BACK_TYPE,
      // synthetic id for log/debug only
      id: 'system-back',
    } as unknown as ButtonInstance
  }
  ```

  The synthetic ButtonInstance uses a type that the addon registry will reject — the runtime will need to special-case it before calling `renderRuntimeButton` (task 02).
- **verify**: `cd packages/cli && npx tsx -e "import {shouldInjectSystemBack, getSystemBackButtonInstance} from './src/deck/system-back-injection.ts'; console.log(typeof shouldInjectSystemBack)"`
- **done**: Helper exports the two functions and the type constant.

### 42-G02: Render SystemBackButton at the reserved slot in renderMountedDeckButtons

- **file**: `packages/cli/src/deck/runtime.ts`
- **action**: |
  In `renderMountedDeckButtons` (line 662), modify the loop to append a synthetic system back button at `reservedBackKeyIndex` when `shouldInjectSystemBack` returns true. The synthetic button is rendered by calling `SystemBackButton` directly via `getOrCreateMountedDeckHost` (skipping the `renderRuntimeButton` path which expects a registered addon type).

  Pattern to add at the end of the function, after the user-defined buttons are processed:
  ```ts
  const deck = getDeckById(deckId)
  const config = /* current SirenoConfig reference */
  if (shouldInjectSystemBack(deck, config)) {
    const reservedKeyIndex = reservedBackKeyIndex // already computed
    const isMain = deckId === config.main_deck
    const backInstance = getSystemBackButtonInstance(deck, reservedKeyIndex)
    // Render SystemBackButton via the host, similar to the existing user-button path
    // but with onTap/onHold bound to:
    //   onTap: () => { deckController.goBack(); ... }
    //   onHold: () => { deckController.restoreStack([config.main_deck]); ... }
  }
  ```

  Get the current `config` from the runtime's captured closure. If it's not directly available, expose it through the runtime options.

  Important: keep the existing `renderMountedHostedButtons` path — the system back button should go through the same `getOrCreateMountedDeckHost` rendering so it produces an HTML snapshot, NOT through `renderRuntimeButton` (which expects a registered addon type).
- **verify**: Read the modified runtime.ts and confirm the injection logic exists at the right point. Run the existing runtime tests; they should not regress.
- **done**: SystemBackButton HTML is rendered for the reserved slot on the right decks.

### 42-G03: Wire tap and hold gestures

- **file**: `packages/cli/src/deck/runtime.ts`
- **action**: |
  When the system back button is rendered, wire its `onTap` and `onHold` props to the existing navigation methods:

  - `onTap` → `deckController.goBack()` followed by a re-render of the deck
  - `onHold` → `deckController.restoreStack([config.main_deck])` followed by a re-render

  The runtime already has `deckController` and `activateDeckSurface` available in the closure. Reuse them.

  The exact wiring depends on how the synthetic button is rendered. If rendered through the same host-based path as user buttons, the `onTap`/`onHold` callbacks need to be stored somewhere the rendered HTML can dispatch to. One approach: store the callbacks in a `Map<keyIndex, {onTap, onHold}>` and expose a `dispatchSystemBack(keyIndex, gesture)` method on the runtime that the host's onPointerDown/onPointerUp look up.
- **verify**: The runtime's `getReservedBackKeyIndex` already exists (line 1219). After this task, calling the gesture dispatch on a key with the system back button should trigger the navigation. Existing runtime tests still pass.
- **done**: Tap and hold gestures route to `goBack` and `restoreStack([mainDeckId])` respectively.

### 42-G04: Add tests for the injection logic

- **file**: `packages/cli/src/deck/system-back-injection.test.ts`
- **action**: |
  Unit tests for `shouldInjectSystemBack` covering the matrix:
  - Returns `true` for a normal subdeck without override
  - Returns `false` when root `allow_reserved_slot_override: true`
  - Returns `false` when deck-level `allow_reserved_slot_override: true`
  - Returns `false` for the lock-session deck
  - Returns `false` when a user button already claims the reserved slot (defensive)
  - Returns `true` for the main deck (so the home indicator renders)

  These are pure-function tests, no runtime setup needed.
- **verify**: `cd packages/cli && npx vitest run src/deck/system-back-injection.test.ts --reporter=verbose` returns `PASS (6) FAIL (0)`
- **done**: All 6 cases pass.

### 42-G05: End-to-end verification

- **file**: existing test files (no new file)
- **action**: |
  Run the full Phase 42 test suite plus the runtime tests to confirm no regression:
  ```bash
  cd packages/cli && npx vitest run \
    src/core/schemas.test.ts \
    src/deck/system-back-button.test.tsx \
    src/deck/system-back-injection.test.ts \
    src/deck/runtime.test.ts \
    --reporter=verbose
  ```
  Confirm all 4 test files pass; pre-existing tests in other files (theme.test.ts, etc.) still fail in the same way they did before this plan.
- **verify**: All 4 test files pass.
- **done**: End-to-end behavior verified.

## Must Haves

- [ ] `shouldInjectSystemBack` returns `true` for a normal subdeck without override
- [ ] `shouldInjectSystemBack` returns `false` when root `allow_reserved_slot_override: true`
- [ ] `shouldInjectSystemBack` returns `false` when deck-level `allow_reserved_slot_override: true`
- [ ] `shouldInjectSystemBack` returns `false` for the lock-session deck
- [ ] Main deck renders a "Home" indicator at the reserved slot via SystemBackButton
- [ ] Subdecks render a back chevron + "Back" label at the reserved slot via SystemBackButton
- [ ] Back button tap triggers `deckController.goBack()`
- [ ] Back button hold (≥600ms) triggers `deckController.restoreStack([mainDeckId])`
- [ ] 6 unit tests for the injection logic pass
- [ ] All existing tests still pass (modulo pre-existing failures documented in 39-01-SUMMARY.md)
