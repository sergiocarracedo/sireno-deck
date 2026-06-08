# Phase 52 CONTEXT — Lock deck navigation refinement

**Phase:** 52 — Lock deck navigation refinement
**Discussed:** 2026-06-08
**Status:** locked — proceed to plan-phase 52

## Domain

The lock deck is the deck rendered when the user's session is locked (a "while you're away" screen). v1.4 established two facts:
- A configurable `session.locked_deck` in `config.yml` names the lock deck.
- The core-owned system-reserved back button is suppressed on the lock deck regardless of session state (the `shouldInjectSystemBack` function returns `false` when `config.session.locked_deck === deck.id`).

v1.4 quick 038 also ships: when the user is on the lock deck while the session is locked, neither the home (logo+version) button nor the back button is shown — the lock deck is a "clean canvas".

Phase 52 closes two gaps in this contract:
- **LOCK-01** — Users can navigate to the lock deck from the main deck even when the session is not locked (so the lock deck can be pre-warmed and visually inspected before locking the computer).
- **LOCK-02** — The back-button suppression is bound to the **session state**, not to the deck identity alone. When the session is `unlocked`, the lock deck behaves like any other subdeck (back button present, navigable). When the session is `locked`, the back button is suppressed as today.

## Locked decisions

### LOCK-02 — Add session state to the back-button gate

The current `shouldInjectSystemBack(deck: DeckConfig, config: SirenoConfig): boolean` is a pure function that checks `config.session?.locked_deck === deck.id` to suppress on the lock deck. We change the gate to also check the session state:

- New function signature: `shouldInjectSystemBack(deck: DeckConfig, config: SirenoConfig, sessionState: SessionState): boolean`
- The runtime reads `hostContext.session.state` at the call site and passes it in. `hostContext` is already plumbed into the deck render path.
- The gate is `sessionState === 'locked' && config.session?.locked_deck === deck.id` — both conditions must hold for the back button to be suppressed.
- When `sessionState !== 'locked'` (any of `unlocked`, `unknown`, `unsupported`, `init`), the lock deck gets the back button like any other subdeck. The user can navigate to the lock deck, see it rendered (logo+version tile or whatever they configured), and tap the back button to return to the previous deck.

**Rationale for permissive semantics:** the "pre-warm" use case is the whole point of LOCK-01. If we suppress the back button on the lock deck when the session is `unknown` or `unsupported`, the user can't easily return to the main deck on systems where session detection doesn't work (currently macOS and Windows — see session-monitor.ts). A stuck back button is more disruptive than a missing one.

### LOCK-01 — No new built-in lock button; users add a `change-deck` button

LOCK-01 is satisfied by the existing navigation model: any deck (including the lock deck) can be the target of a `change-deck` button on any other deck. Users add a `change-deck` button on the main deck pointing at the configured lock deck.

We do **not** introduce a new built-in lock button on the main deck's reserved slot. The v1.4 quick 037 main-deck logo+version tile stays. The reserved slot remains the home/logo on the main deck.

**Rationale:** adding a built-in lock button would be a breaking change (the reserved slot is currently logo+version; making it a lock button when a lock deck is configured would change the main-deck UX for every user). A user-added change-deck button is the additive, no-breaking-change way to satisfy LOCK-01.

**Documentation:** we document the affordance in the README / config schema comments so users know to add a `change-deck` button pointing at the lock deck.

### SessionState type import

The `SessionState` type lives in `packages/cli/src/system/host-context.ts` (already exported as part of `HostContext`). We import it from there. No new types.

## Specifics

### shouldInjectSystemBack signature change

**Before** (`packages/cli/src/deck/system-back-injection.ts`):

```ts
export function shouldInjectSystemBack(
  deck: DeckConfig,
  config: SirenoConfig,
): boolean {
  if (config.allow_reserved_slot_override) return false
  if (deck.allow_reserved_slot_override) return false
  if (config.session?.locked_deck === deck.id) return false
  if (
    deck.buttons?.some((b: { position?: number }) =>
      b.position === deck.keyCount - 1,
    )
  ) {
    return false
  }
  return true
}
```

**After**:

```ts
import type { SessionState } from '@/system/host-context'

export function shouldInjectSystemBack(
  deck: DeckConfig,
  config: SirenoConfig,
  sessionState: SessionState,
): boolean {
  if (config.allow_reserved_slot_override) return false
  if (deck.allow_reserved_slot_override) return false
  if (config.session?.locked_deck === deck.id && sessionState === 'locked') return false
  if (
    deck.buttons?.some((b: { position?: number }) =>
      b.position === deck.keyCount - 1,
    )
  ) {
    return false
  }
  return true
}
```

### Call site change

Locate the call site of `shouldInjectSystemBack` in `packages/cli/src/deck/runtime.ts` (the deck render runtime, per the existing test in `runtime.test.ts`). Read `hostContext.session.state` and pass it as the third argument. The host context is already plumbed into the deck render loop.

### Existing tests

`system-back-injection.test.ts` has tests for the current gate. We update each test to pass a `sessionState` argument. The existing test cases (reserved-slot override, lock-deck identification, last-slot button present) continue to pass with appropriate `sessionState` values. We add new test cases for:
- `shouldInjectSystemBack` on the lock deck with `sessionState: 'unlocked'` → returns `true` (the LOCK-02 behavior)
- `shouldInjectSystemBack` on the lock deck with `sessionState: 'locked'` → returns `false` (the v1.4 behavior, preserved)
- `shouldInjectSystemBack` on a non-lock deck with `sessionState: 'locked'` → returns `true` (the gate does not affect other decks)

### Runtime test

`runtime.test.ts` has integration tests that exercise the deck render. We add or update at least one test that simulates a host context with `session.state: 'unlocked'`, navigates to the lock deck, and asserts the rendered HTML contains the back button (the v1.5 LOCK-02 unlocked case). Another test with `session.state: 'locked'` asserts the back button is suppressed (the v1.4 preserved case).

## Canonical refs

- `packages/cli/src/deck/system-back-injection.ts` — the function to update (35 lines).
- `packages/cli/src/deck/system-back-injection.test.ts` — the tests to update.
- `packages/cli/src/deck/system-back-button.tsx` — the back button component. Unchanged in this phase.
- `packages/cli/src/deck/runtime.ts` — the call site. Read `hostContext.session.state` and pass it.
- `packages/cli/src/system/host-context.ts` — `SessionState` type source.
- `packages/cli/src/system/session-monitor.ts` — already returns `unknown` / `unsupported` for macOS / Windows. The permissive semantics in this phase are deliberate: those states count as "not locked".
- `packages/cli/src/core/schemas.ts` — `SirenoConfig` has the optional `session.locked_deck` field already.

## Existing code insights

### Reusable assets

- `SessionState` type: already exported from `@/system/host-context`. No new types.
- `hostContext` plumbing: already threaded into the deck render runtime. The new `sessionState` argument piggybacks on the existing seam.
- The `shouldInjectSystemBack` function is a small, pure function — easy to test.

### Established patterns

- The codebase has many examples of pure functions taking config + a host-context-derived value as separate arguments (see `getCanonicalSystemMetrics(config.metricIds)`). The new signature fits the pattern.
- The 5 existing `runtime.test.ts` cases for the lock deck / back button integration are the right place to add the new "unlocked lock deck shows back" case.

### Integration points

- The single integration point is `runtime.ts` (or wherever `shouldInjectSystemBack` is called). One call site, one new argument.
- The user-facing config is unchanged. No schema changes.

## Verification anchors

- A `shouldInjectSystemBack` test on the lock deck with `sessionState: 'unlocked'` returns `true` (the back button is injected).
- A `shouldInjectSystemBack` test on the lock deck with `sessionState: 'locked'` returns `false` (the v1.4 behavior).
- A `shouldInjectSystemBack` test on a non-lock deck with `sessionState: 'locked'` returns `true` (other decks are unaffected).
- A runtime test navigating to the lock deck with an `unlocked` host context shows the back button in the rendered HTML.
- A runtime test navigating to the lock deck with a `locked` host context does NOT show the back button in the rendered HTML.
- Documentation comment in `schemas.ts` near `session.locked_deck` notes that users add a `change-deck` button to navigate to the lock deck.

## Deferred ideas

- **Auto-snap to the lock deck when the session locks.** The v1.4 behavior is that the deck controller restores the stack when the session locks. This phase does not change that. If the user wants to tweak the snap-to-lock-deck behavior (e.g. always snap regardless of where they were, or never snap), it's a follow-up.
- **Built-in lock button on the main deck reserved slot.** A future phase could make the main deck's reserved slot configurable (logo+version OR lock-deck-button OR user-overridden). This is a UX change with breaking-change implications and is its own phase.
- **A "preview" badge on the lock deck when pre-warmed.** A small visual hint that the lock deck is being shown but the session is unlocked. Not in scope; not requested.
- **Session state `unknown` / `unsupported` semantics for the lock deck.** Current decision: treat them as "not locked" (back button present). A future phase could revisit if a user complains about the lock-deck behavior on macOS / Windows.
- **Documentation pass for the `change-deck`-to-lock-deck affordance.** The READMEs and config schema comments are updated in this phase. A separate docs sweep is a different phase.

---

*CONTEXT locked: 2026-06-08*
*Next: plan-phase 52*
