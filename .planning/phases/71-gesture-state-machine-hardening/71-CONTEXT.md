# Phase 71: Gesture state machine hardening — Context

**Gathered:** 2026-06-17
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the gesture state machine at `packages/cli/src/deck/runtime.ts:1712-1758` to fix two independent bugs:

1. **BUG-01** — System-back button transition (notably from the settings deck) has a perceptible delay on real hardware. The v1.6 PERF-01 measurement covered the back-pop direction in-process (12.35ms avg) but never profiled the settings-deck landing on real hardware. This phase profiles both directions, finds the bottleneck, and brings the transition under an evidence-based target.

2. **BUG-02** — When a button has only `onTap` (no `onDblTap`), a real double-tap gesture fires `onTap` twice. The fix makes the release-dispatch strict: every first press waits `DOUBLE_TAP_DELAY_MS` (350ms); a second press within that window suppresses both. This is the strict interpretation of the bug report; the user explicitly rejected the forgiving single-tap alternative.

The phase **does not** change the public addon API (`SIRENO_ADDON_API_VERSION` stays at 1) and **does not** make `DOUBLE_TAP_DELAY_MS` configurable. Both are v2 candidates per `REQUIREMENTS.md`.

</domain>

<decisions>
## Implementation Decisions

### BUG-02 — Strict semantics, no visual feedback

- **Decision:** First press of a no-`onDblTap` button waits the full `DOUBLE_TAP_DELAY_MS` before firing `onTap`. A second press within that window suppresses both. This applies uniformly to every no-`onDblTap` button — there is no opt-out.
- **Rationale:** The user explicitly chose strict over forgiving during v1.7 planning (see `.planning/research/SUMMARY.md` decision BGFX-02). The 350ms wait is consistent with normal deck navigation timing, which the user already perceives as fine. The 1s back-button delay (BUG-01) is a separate concern, not related to the gesture state machine.
- **No visual pending indicator.** The 350ms wait is not perceivable as laggy in the context of normal deck navigation, so no "waiting" tint, progress ring, or press-decoupled highlight is added. Press highlight stays at press time (immediate haptic feedback); `onTap` fires 350ms later silently.

### BUG-01 — Real-hardware profile, both directions, target from data

- **Real-hardware profile required.** The fix must be measured on the actual Stream Deck device with Playwright browser capture, not in-process simulation. The in-process numbers from v1.6 (12.35ms back-pop) are useful as a sanity check but are not the acceptance measurement.
- **Both transitions measured.** (1) **back-from-settings** — user on settings deck presses back, lands on previous deck (the reported case). (2) **settings-deck-landing** — user in main deck presses settings button, lands on settings deck. Each direction gets a profile trace; the slower one drives the target.
- **Target from data.** Do not commit to a fixed target (200ms vs 300ms) before measuring. Run the profile on real hardware, capture end-to-end latency, set the per-direction target to the slowest measured baseline. If the baseline is already under v1.6's <200ms in-process ceiling, the existing target is fine; if Playwright capture overhead pushes it over 200ms, the new target reflects that with a documented caveat in the SUMMARY.

### State machine refactor — Extract `dispatchGestureEnd` helper

- **Extract a `dispatchGestureEnd(state, callbacks)` helper** that handles all three release cases:
  1. Hold won (`gs.holdTriggered === true` → no tap, no dbltap)
  2. Dbltap configured (`instance.onDblTap` exists → first press schedules `handleTap` in 350ms, second press within window fires `onDblTap`)
  3. Strict-mode no-dbltap (no `onDblTap` → first press schedules `handleTap` in 350ms, second press within window suppresses both)
- Cases 2 and 3 share the same `pendingDblTapTimer` debounce pattern. The helper encapsulates the state-mutation discipline (Phase 56 spread pattern `...gs` preserved on every state update) in one testable function. Replaces the duplicated/copy-pasted logic in the existing `if (instance.onDblTap) { ... } else { ... }` branches at `runtime.ts:1739-1757`.
- The state map (`gestureStates: Map<string, ButtonGestureState>`) and `onKeyEvent` structure stay. The fix is **not** a full class-based refactor — that would be overkill for two related bugs.

### Test coverage — Minimum 4 + multi-key + real-hardware

- **Minimum 4 scenarios** (all required):
  1. `no-callback-dbltap` — button with no `onDblTap`, two presses within 350ms → `onTap` fires 0 times (strict suppression)
  2. `single-tap-on-no-dbltap` — button with no `onDblTap`, one press → `onTap` fires exactly once after the 350ms wait
  3. `dbltap-on-dbltap` — button with `onDblTap`, two presses within 350ms → `onTap` fires 0 times, `onDblTap` fires exactly once
  4. `hold-during-tap-window` — button with no `onDblTap`, press 1 release, press 2 held past `holdThreshold` → `onTap` fires 0 times, `onHold` fires exactly once
- **Multi-key concurrent.** Button A's dbltap gesture must not interfere with button B's dbltap gesture. Each `stateKey` is isolated, but a regression test asserts it.
- **Real-hardware integration test.** Required for BUG-01 verification. Playwright on actual Stream Deck device, measures both back-from-settings and settings-deck-landing transitions end-to-end. If the device is unplugged at UAT time, fall back to in-process measurement with a documented "hardware-not-available" caveat in the SUMMARY.

### Agent's Discretion

- **Helper file location.** Default: new `deck/gesture-state.ts` module exporting `dispatchGestureEnd(state, callbacks)` + the `ButtonGestureState` type. Keeps `runtime.ts` from absorbing the helper; lets the test file import the helper directly. If the planner finds the helper is <30 lines, inline it in `runtime.ts` instead.
- **Real-hardware test methodology.** Default: Playwright integration test as the primary verification (asserts the target on real device), manual UAT as a secondary sanity check (catches USB transport latency that Playwright may miss).
- **Device unplugged fallback.** Default: in-process measurement using the existing `scripts/profile-browser.ts` mechanism, with a SUMMARY caveat explicitly noting "BUG-01 hardware profile not run: device unplugged at UAT".
- **The exact location of the `else` branch in the existing code.** The current code is `if (instance.onDblTap) { ... } else { ... }`. The refactor replaces the entire `if/else` with a single `dispatchGestureEnd(state, { onTap, onDblTap, onHold })` call. The helper handles all three cases internally.

</decisions>

<specifics>
## Specific Ideas

**User verbatim quote during BUG-02 visual feedback discussion:**

> "Laggy is not related to this thing because for example deck navigation works nice"

**Interpretation:** The user's reference point for "feels fine" is deck navigation (which is on the order of 350ms or more). The 350ms strict-mode wait is therefore consistent with normal system responsiveness and does not need a visual pending indicator. This is a strong signal that the strict-mode UX is acceptable without additional UI feedback.

**Reference transition (v1.6, PERF-01):** back-stack pop was measured at 12.35ms in-process avg, 2.39ms same-html-skip avg. This is the *pop* direction only. The *settings-landing* direction was never profiled — that's the BUG-01 gap.

**Hold-threshold relationship:** `holdThreshold` is separate from `DOUBLE_TAP_DELAY_MS`. The release handler at `runtime.ts:1732` short-circuits on `gs.holdTriggered` first, so a press that reaches `holdThreshold` will fire `onHold` and skip both the tap and dbltap branches. Strict mode does not change this. No question needed for hold interaction.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `packages/cli/src/deck/runtime.ts:1712-1758` — `onKeyEvent` handler, the BUG-02 site (lines 1755-1757)
- `packages/cli/src/deck/runtime.ts:1592-1700` — `handlePress` and `handleRelease`, the gesture-state spread discipline
- `packages/cli/src/deck/runtime.ts:1325-1352` — `activateDeckSurface`, the BUG-01 candidate bottleneck
- `packages/cli/src/deck/runtime.ts:423-426` — `ButtonGestureState` type and `gestureStates` map
- `.planning/REQUIREMENTS.md` BUG-01 and BUG-02 — canonical requirements for the phase
- `.planning/research/ARCHITECTURE.md:74-114` — the BUG-01 ("we measured the wrong transition") and BUG-02 (the inverted dispatch) analysis
- `.planning/research/FEATURES.md` BUG-01 and BUG-02 — feature specs with file:line citations
- `.planning/research/PITFALLS.md` FX-01 + FX-02 — the L×I-scored risk cards
- `.planning/solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md` — Phase 56 regression lesson (the `...gs` spread discipline)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`gestureStates: Map<string, ButtonGestureState>`** (`runtime.ts:426`) — the per-key state container. Keyed by `stateKey = `${deckId}:${keyIndex}`` (verify in code; not in grep output). Each entry holds `holdTimer`, `holdTriggered`, `pendingDblTapTimer`.
- **`DOUBLE_TAP_DELAY_MS`** (`runtime.ts:7`) — imported constant. Currently 400ms per the test comment at `runtime.test.ts:4765` (verify exact value; the comment is a strong signal).
- **`useButtonActionCommand`** (`packages/cli/src/addon/api.ts:127-168`) — not directly touched by this phase, but the planner should verify the helper does not need to grow a "strict tap" variant.

### Established Patterns

- **Phase 56 spread discipline.** Every `gestureStates.set(stateKey, { ...gs, ... })` call preserves the previous state object. The fix for BUG-02 must follow the same pattern — never replace, always spread. The new `dispatchGestureEnd` helper enforces this by construction.
- **`useButtonActionCommand` reuse.** Addon buttons that have only `onTap` go through this helper, which already routes tap/dbltap/hold commands. The strict-mode change is a runtime-internal behavior, not a helper-API change — addon authors are unaffected.
- **Profile-then-fix.** Phase 58 established the pattern: profile first, identify the bottleneck, fix surgically. BUG-01 follows the same pattern but on real hardware (not in-process).

### Integration Points

- **`onKeyEvent` after hold check.** The new `dispatchGestureEnd(state, callbacks)` is called from `onKeyEvent` at the point where the current `if (instance.onDblTap) { ... } else { ... }` block lives (lines 1739-1757). The helper takes the `stateKey`, the `instance.onTap`/`onDblTap`/`onHold` callbacks, and the `keyIndex` (for `handleTap(keyIndex)`).
- **`activateDeckSurface` in `runtime.ts:1325-1352`.** BUG-01 fix may add a `same-html-skip` short-circuit here. The planner should read the existing `if (previousDeckId !== activeDeckId)` check at `runtime.ts:1334` and decide whether to extend it or add a new branch.
- **Profile script.** A new `packages/cli/scripts/profile-settings-transition.ts` mirroring `scripts/profile-browser.ts` outputs per-direction latency traces. The Playwright integration test invokes this script on real hardware.

</code_context>

<deferred>
## Deferred Ideas

- **Configurable `DOUBLE_TAP_DELAY_MS`.** v2 candidate. The user may want different timing per addon or per theme. Out of scope for v1.7.
- **Visual feedback for strict mode (waiting tint, progress ring).** The user explicitly rejected. May be revisited if a future addon needs to communicate the wait.
- **Tap-then-hold gesture.** A user might press-release-press-and-hold to mean "secondary hold". Not in scope. Current behavior: second press is treated as a dbltap-press (the 350ms wait window starts, then `onHold` fires if the press is held past `holdThreshold`). No new behavior needed.
- **Class-based state machine refactor.** Considered and rejected in Area 3. The `dispatchGestureEnd` helper is the middle ground.
- **Per-button strict mode toggle.** Strict mode is global. A button-level opt-out would add API surface and complicate the `dispatchGestureEnd` helper. Out of scope.

</deferred>

---

*Phase: 71-gesture-state-machine-hardening*
*Context gathered: 2026-06-17*
