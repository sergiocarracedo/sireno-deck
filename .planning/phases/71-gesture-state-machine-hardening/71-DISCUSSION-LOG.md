# Phase 71: Gesture state machine hardening — Discussion Log

**Gathered:** 2026-06-17
**Mode:** standard

## Areas Discussed

The user selected all 4 candidate gray areas:

1. BUG-02 strict-mode UX
2. BUG-01 profile scope + target
3. Gesture state machine refactor
4. Test coverage scope

---

### Area 1: BUG-02 strict-mode UX

**Question:** Should the button show a visual 'pending' state during the 350ms wait window so the user understands the system is deciding tap vs dbltap?

**Options considered:**

| Option | Description |
|--------|-------------|
| Subtle 'waiting' tint (Recommended) | Press highlight stays immediate; subtle dim/border during 350ms wait window |
| No extra indicator | Keep current press highlight only. onTap fires 350ms later silently |
| Explicit progress ring | Timed animation around the button during the 350ms wait |
| Brief invert on press 1 | Brief invert/dim on the first release, no indicator on second press |

**User's choice:** Custom answer — **"Laggy is not related to this thing because for example deck navigation works nice"**

**Verbatim quote:** > "Laggy is not related to this thing because for example deck navigation works nice"

**Rationale:** The 350ms wait is consistent with normal deck navigation timing, which the user already perceives as fine. The 1s back-button delay (BUG-01) is a separate concern, not related to the gesture state machine. No visual pending indicator is needed — strict mode without feedback is acceptable.

**Decision captured:** No visual pending indicator. Strict mode is acceptable without feedback. See CONTEXT.md "BUG-02 — Strict semantics, no visual feedback".

---

### Area 2: BUG-01 profile scope + target

**Question:** BUG-01 profile scope + target. The v1.6 PERF-01 measurement was the back-pop direction. The user observation is the settings-page direction. Which transitions to profile, and what's the target?

**Options considered:**

| Option | Description |
|--------|-------------|
| Both directions, target from data (Recommended) | Profile back-from-settings AND settings-deck-landing; set target from real-hardware measurement |
| Only back-from-settings, keep 200ms | Profile only the reported case; keep v1.6 <200ms target |
| Both directions, fixed 300ms target | Profile both with <300ms target (allows for Playwright capture overhead) |
| Only settings-landing, keep 200ms | Profile only the settings-landing direction; tighter scope but ignores reported case |

**User's choice:** Both directions, target from data (Recommended)

**Rationale:** Don't commit to a fixed target before measuring. Capture real-hardware data first, then set the per-direction target to the slowest measured baseline. If the baseline is already under v1.6's <200ms in-process ceiling, the existing target is fine; if Playwright capture overhead pushes it over 200ms, the new target reflects that with a documented caveat in the SUMMARY.

**Decision captured:** Real-hardware profile required, both directions, target from data. See CONTEXT.md "BUG-01 — Real-hardware profile, both directions, target from data".

---

### Area 3: Gesture state machine refactor

**Question:** Gesture state machine refactor. BUG-02 fix needs to restructure the key-release branch. What's the scope?

**Options considered:**

| Option | Description |
|--------|-------------|
| Extract `dispatchGestureEnd` helper (Recommended) | Helper handles all 3 cases (hold, dbltap, strict no-dbltap). Minimal blast radius, testable |
| Surgical edits only | Add the strict-mode logic in the existing `else` branch. No new helpers |
| Full class-based refactor | Proper class with `onPress()`/`onRelease()`/`onHold()` methods. Cleanest, biggest blast radius |
| Extract, but also cleanup phase 56 spread | Move state machine into its own module. Phase 56 spread discipline enforced by module boundary |

**User's choice:** Extract `dispatchGestureEnd` helper (Recommended)

**Rationale:** Encapsulates the state-mutation discipline (Phase 56 spread pattern `...gs`) in one testable function. Replaces the duplicated/copy-pasted logic in the existing `if/else` branches. Not a full class-based refactor — that would be overkill for two related bugs.

**Decision captured:** Extract `dispatchGestureEnd(state, callbacks)` helper. See CONTEXT.md "State machine refactor — Extract `dispatchGestureEnd` helper".

**Agent's discretion items:**
- Helper file location: default new `deck/gesture-state.ts` module; inline if helper is <30 lines.
- Real-hardware test methodology: default Playwright integration test (primary) + manual UAT (secondary).
- Device unplugged fallback: default in-process + SUMMARY caveat.
- Exact location of the `else` branch: helper replaces the entire `if/else`.

---

### Area 4: Test coverage scope

**Question:** Which scenarios must the regression test cover?

**Options considered:**

| Option | Description |
|--------|-------------|
| Minimum + multi-key + real-hardware (Recommended) | 4 minimum scenarios + multi-key concurrent + real-hardware integration test |
| Minimum only | Just the 4 minimum scenarios. No multi-key or real-hardware |
| Minimum + multi-key + property-based | Add property-based testing (random gesture sequences against invariant) |
| Minimum + multi-key + state-machine replay | Add state-machine replay tests (record real gesture traces, replay) |

**User's choice:** Minimum + multi-key + real-hardware (Recommended)

**Rationale:** The 4 minimum scenarios are non-negotiable (each tests a distinct gesture state branch). Multi-key concurrent is a cheap regression guard. Real-hardware integration test is required by the BUG-01 "real-hardware profile" decision. Property-based and state-machine replay are overkill for this fix.

**Decision captured:** Test coverage = 4 minimum + multi-key + real-hardware. See CONTEXT.md "Test coverage — Minimum 4 + multi-key + real-hardware".

**Specific 4 minimum scenarios:**
1. `no-callback-dbltap` — no `onDblTap`, two presses within 350ms → `onTap` fires 0 times
2. `single-tap-on-no-dbltap` — no `onDblTap`, one press → `onTap` fires exactly once after 350ms wait
3. `dbltap-on-dbltap` — `onDblTap` configured, two presses within 350ms → `onTap` fires 0 times, `onDblTap` fires exactly once
4. `hold-during-tap-window` — no `onDblTap`, press 1 release, press 2 held past `holdThreshold` → `onTap` fires 0 times, `onHold` fires exactly once

---

## Areas Delegated to Agent's Discretion

- Helper file location (default: new `deck/gesture-state.ts`)
- Real-hardware test methodology (default: Playwright integration + manual UAT)
- Device unplugged fallback (default: in-process + SUMMARY caveat)
- Exact location of the `else` branch in the existing code (default: helper replaces entire `if/else`)

## Deferred Ideas

- Configurable `DOUBLE_TAP_DELAY_MS` — v2 candidate
- Visual feedback for strict mode — user explicitly rejected
- Tap-then-hold gesture — out of scope, current behavior is correct
- Class-based state machine refactor — considered, rejected
- Per-button strict mode toggle — out of scope, would add API surface

---

*Phase: 71-gesture-state-machine-hardening*
*Discussion logged: 2026-06-17*
