# Phase 52 Research — Lock deck navigation refinement

**Phase:** 52 — Lock deck navigation refinement
**Researched:** 2026-06-08
**Confidence:** HIGH (small, well-scoped seam change; no new external dependencies; the gate logic is a one-line refactor)

## Don't Hand-Roll

- **Pure-function refactor with explicit arguments.** The existing `shouldInjectSystemBack` is a pure function that takes a deck and a config. Adding a `sessionState` argument preserves purity — no closure capture, no hidden dependencies. The runtime reads `hostContext.session.state` at the call site and passes it in. This is the codebase's standard pattern for "config + host-context-derived value" function signatures (see `getCanonicalSystemMetrics(config.metricIds)`).
- **No new runtime state.** The session state already flows through `hostContext` (the runtime already has it). We just need to thread it into the existing call. No new stores, no new observers.
- **Test the unit, not the integration.** The gate logic is 5 lines. The unit tests in `system-back-injection.test.ts` cover all 5 cases cleanly. One integration test in `runtime.test.ts` proves the runtime reads `hostContext.session.state` correctly.

## Common Pitfalls

- **Treating `unknown` and `unsupported` as "locked".** macOS and Windows return `unsupported` for session detection (per `session-monitor.ts`); the boot-up state is `unknown` until the DBus poller returns a value. If we suppress the back button on these states, users on those platforms can never return from a pre-warmed lock deck. **Mitigation:** the 52-CONTEXT decision is to only suppress on the explicit `locked` state. The runtime reads `hostContext.session.state` literally; the contract is that `state === 'locked'` is the only "is locked" signal.
- **Forgetting to update the existing tests.** All 5 existing `system-back-injection.test.ts` tests call `shouldInjectSystemBack(deck, config)` (2 args). Adding the third arg breaks the call signatures. The existing tests need to be updated to pass an explicit `sessionState` (the test at line 49–57 currently passes `state: "locked"` in the config, so it should continue to pass `state: "locked"` at the call site after the change).
- **Forgetting the runtime call site.** The function signature change ripples to `runtime.ts:396`. The runtime must read `hostContext.session.state` and pass it. If the runtime doesn't have host context, that's a separate plumbing change — but the runtime definitely has it (the deck controller is wired with host context, per the existing tests in `runtime.test.ts`).
- **Breaking the locked-deck v1.4 behavior.** The v1.4 contract is: when the user is on the lock deck and the session is `locked`, no back button is injected. The new gate `config.session?.locked_deck === deck.id && sessionState === 'locked'` preserves this. Tests must cover BOTH the new "unlocked" case AND the preserved "locked" case.
- **Treating `IMPLICIT_LOCKED_DECK_ID` differently.** The runtime uses `IMPLICIT_LOCKED_DECK_ID` as a default when the user doesn't configure a lock deck (per `runtime.ts:393`). The synthetic config always has a `locked_deck` field. The function still works correctly for users without an explicit lock deck (the check `config.session?.locked_deck === deck.id` won't match).

## Existing Patterns in This Codebase

- **Config + host-context signature pattern.** See `getCanonicalSystemMetrics` in `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts` and similar pure-function consumers of host-context-derived values. The new signature fits the pattern.
- **`@/system/host-context` is the canonical source for `SessionState`.** The type is exported from `host-context.ts`. The runtime already imports from there for the deck controller.
- **`runtime.test.ts:1815` already references `lockedDeckId`.** This is a precedent for testing the locked-deck behavior. We add a sibling test for the unlocked case.
- **Test fixtures in `system-back-injection.test.ts`** use the `makeDeck` / `makeConfig` helper pattern. The new tests should follow the same pattern.
- **No `mix-blend-mode` or pixel-sampling in this phase.** This is a backend/deck-render phase, not a UI/visual phase. The impeccable frontend-design standards don't apply (no `.tsx` files in scope).

## Recommended Approach

### File-level changes

1. **`packages/cli/src/deck/system-back-injection.ts` (MODIFY)**
   - Add `SessionState` import from `@/system/host-context`
   - Change signature: `shouldInjectSystemBack(deck, config, sessionState: SessionState)`
   - Change the lock-deck check from `if (config.session?.locked_deck === deck.id) return false` to `if (config.session?.locked_deck === deck.id && sessionState === 'locked') return false`

2. **`packages/cli/src/deck/system-back-injection.test.ts` (MODIFY)**
   - Update the 5 existing tests to pass `sessionState` as the third argument. The "lock-session deck" test (line 49) should pass `sessionState: 'locked'` (preserves the existing assertion). The other 4 tests should pass `sessionState: 'unlocked'` (the new permissive default for tests that don't care about the lock).
   - Add new tests:
     - `shouldInjectSystemBack` on the lock deck with `sessionState: 'unlocked'` → returns `true`
     - `shouldInjectSystemBack` on the lock deck with `sessionState: 'unknown'` → returns `true` (permissive)
     - `shouldInjectSystemBack` on the lock deck with `sessionState: 'unsupported'` → returns `true` (permissive)
     - `shouldInjectSystemBack` on a non-lock deck with `sessionState: 'locked'` → returns `true` (other decks are unaffected by the session state)

3. **`packages/cli/src/deck/runtime.ts` (MODIFY)**
   - The `getDeckButtons` function (line 386) needs access to `hostContext.session.state`. Check the runtime's `hostContext` plumbing — if it's available in the function's scope, pass it through; if not, thread it.
   - Pass `sessionState: hostContext.session.state` to `shouldInjectSystemBack`.

4. **`packages/cli/src/deck/runtime.test.ts` (MODIFY or ADD)**
   - Add a new test that simulates a host context with `session.state: 'unlocked'`, navigates to the lock deck, and asserts the back button IS in the rendered buttons.
   - Add a sibling test with `session.state: 'locked'` asserting the back button is NOT in the rendered buttons (preserves v1.4 behavior).

5. **`packages/cli/src/core/schemas.ts` (MODIFY — comment only)**
   - Add a JSDoc comment to the `session.locked_deck` field in the config schema noting that users add a `change-deck` button to navigate to the lock deck. No schema change — just documentation.

### Wave plan (single plan)

- **Plan 52-01 (wave 1):** All of the above. Tracer bullet: a unit test of `shouldInjectSystemBack` with the new `sessionState` argument demonstrates the gate depends on session state; a runtime test with an unlocked host context shows the back button on the lock deck.

### Vertical slice integrity

- 52-01 is a single vertical slice: the function change + the call site change + the tests. The slice is demoable via the unit tests (the function change) and the runtime tests (the integration).

### Build order

1. Update the function signature and the gate logic.
2. Update the existing unit tests to pass the new argument.
3. Add new unit tests for the LOCK-02 cases.
4. Update the runtime call site to pass `hostContext.session.state`.
5. Add a runtime integration test.
6. Add the documentation comment in `schemas.ts`.

## Open Considerations (not blocking, capture in plan)

- **`@/system/host-context` is already imported elsewhere in the runtime.** Verify the runtime already has `hostContext` in scope at the `getDeckButtons` call site. If it doesn't, that's a small plumbing change.
- **The runtime's session state may come from a different source than `hostContext.session.state`.** The runtime uses a `SessionMonitor` instance internally (per `session-monitor.ts`); the host context is the public seam. We use `hostContext.session.state` (the public contract) to keep the function pure.

## References

- 52-CONTEXT.md — locked decisions
- v1.4 audit (`.planning/v1.4-MILESTONE-AUDIT.md`) — confirms v1.4 lock-deck behavior (SRB-03 etc.)
- `packages/cli/src/deck/system-back-injection.ts` (35 lines) — the function to update
- `packages/cli/src/deck/runtime.ts:386-403` — the call site
- `packages/cli/src/system/host-context.ts` — `SessionState` type source
- `packages/cli/src/system/session-monitor.ts` — session state machine

---

*Research complete: 2026-06-08*
*Next: plan-phase 52*
