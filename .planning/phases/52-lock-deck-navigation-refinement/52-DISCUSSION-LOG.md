# Phase 52 Discussion Log — Lock deck navigation refinement

**Phase:** 52
**Discussed:** 2026-06-08
**Mode:** discuss (standard, not deep)

## Areas explored

### LOCK-02: back-button gate on session state (selected)

**Question:** `shouldInjectSystemBack` currently skips the back button injection whenever the deck is the configured lock deck, regardless of session state. The phase 52 contract is: when the session is `unlocked`, the lock deck should behave like any other subdeck (back button present). Where does the session-state check live?

**Options presented:**
1. **Pass session state as a new argument** (recommended) — `shouldInjectSystemBack(deck, config, sessionState)`. Runtime reads `hostContext.session.state` at the call site. Pure function, no hidden dependencies.
2. **Read host context inside the function** — make the function a closure that captures hostContext. More "context-y" but introduces a hidden dependency.
3. **Two-step check** — split the function into a deck check and a runtime check that the caller composes. More flexible but more boilerplate.

**User chose:** **Pass session state as a new argument** (recommended). Confirmed.

**Reasoning captured:** The function stays pure; the testability is the same; the runtime change is one call site. The codebase already plumbs `hostContext` into the deck render path, so the runtime has the value to pass.

---

**Question:** Which session states count as "locked" for the gate?

**Options presented:**
1. **Skip only on `'locked'`** (recommended) — only the definitive `locked` state suppresses the back button. Other states (including `unknown`, `unsupported`, `init`) all get the back button.
2. **Skip on `'locked'` OR `'unsupported'`** — conservative. On systems that don't tell us (currently macOS / Windows), suppress the back button so the user is never stuck.
3. **Skip on `'locked'` OR `'unknown'`** — also conservative, but for systems that haven't yet reported a state.

**User chose:** **Skip only on `'locked'`** (recommended). Confirmed.

**Reasoning captured:** The "pre-warm" use case is the whole point of LOCK-01. If a user pre-warms the lock deck on macOS (where session detection is `unsupported`), a stuck back button would prevent them from returning to the main deck without restarting the daemon. Better to be permissive and show the back button on any state that's not definitively `locked`.

---

### LOCK-01: how to access the lock deck from main when unlocked (selected)

**Question:** Users can currently navigate to the lock deck only via a user-configured `change-deck` button. With LOCK-01, the lock deck should be reachable from the main deck when unlocked. Should we add a new built-in lock button on the main deck, or rely on the user adding a `change-deck` button?

**Options presented:**
1. **User adds a `change-deck` button** (recommended) — no new built-in button. LOCK-01 is satisfied because navigation is technically possible. Document the affordance in the README.
2. **Add a built-in lock button on the main deck** — replace the logo+version main-deck reserved slot (quick 037) with a `lock` button. Logo+version moves elsewhere. Breaking change.
3. **Add lock button as an OPTIONAL addon** — only show the built-in lock button when `config.session.locked_deck` is set AND the user hasn't overridden the reserved slot. Additive.

**User chose:** **User adds a `change-deck` button** (recommended). Confirmed.

**Reasoning captured:** No breaking change. The v1.4 quick 037 logo+version main-deck reserved slot is preserved. The affordance exists today; the phase just removes the gating that prevents it from working.

---

### Visual indicator on the lock deck when pre-warmed (NOT selected)

The user did not select this area for discussion. The discovery question is left open in the deferred ideas section of CONTEXT.md. The default assumption is: no visual indicator (the lock deck looks like any other subdeck when pre-warmed).

### Session state transitions during navigation (NOT selected)

The user did not select this area for discussion. The existing v1.4 behavior (the deck controller restores the stack when the session locks) is preserved. Captured in CONTEXT.md deferred ideas.

## Wrap-up

User confirmed the 3 decisions above. CONTEXT.md generated. Ready for `plan-phase 52`.
