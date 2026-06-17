---
phase: 71-gesture-state-machine-hardening
plan: 71-01
wave: 2
depends_on: [71-02]
status: executed
---

# 71-01-SUMMARY

## What was built

BUG-01 fix shipped: the system back button no longer carries an unconditional `onDblTap`, which removes the 400 ms pre-tap debounce that was firing on every back press when no overlay was active. The fix gates `onDblTap` on actual overlay context — `overlayDeckId !== null || lastDismissedOverlayDeckId !== null` — so the dispatcher at `runtime.ts:1739-1757` (now `dispatchGestureEnd` from Wave 1) sees `onDblTap: undefined` on the system back when there is no overlay to dismiss or restore. Result: single tap on system back with no overlay context fires `onTap` immediately, removing the 350–400 ms perception of lag the user reported on the settings deck.

A profile-instrumentation helper was added at `packages/cli/src/util/profile.ts`, gated on `SIRENO_PROFILE === "1" && SIRENO_PROFILE_BACK_TRANSITIONS === "1"` (mirroring the established `SIRENO_PROFILE` pattern at `browser-renderer.ts:76`). It exposes two functions:

- `profileBackTransition(label, marker)` — `marker` is `"start"` or `"end"`; emits one JSON-line per call so two parallel directions (settings-deck-landing + back-from-settings) can be captured without colliding timestamps.
- `hop(name)` — emits a JSON-line tagged with the active trace label so individual hops within a transition (onTap-fired → navigateToDeck-invoke → activateDeckSurface-return → screen-flush-done) can be measured independently.

All output goes to stdout as one JSON object per line, using `process.hrtime.bigint()` for nanosecond precision. Zero overhead when the gate is off (single `if`).

The instrumentation hooks were wired into `createSystemBackHandlers.onTap` (both branches: settings-deck-landing and back-from-settings), `activateDeckSurface` (entry / stale / return), and `onKeyEvent` (release). They emit nothing when the gate is off and never change behaviour.

## Key files

- `packages/cli/src/deck/runtime.ts` — `createSystemBackHandlers` rewritten: `onDblTap` now conditional on overlay context; both branches of `onTap` wrapped with `profileBackTransition(start/end)` + `hop(name)`; `activateDeckSurface` gained three hops.
- `packages/cli/src/util/profile.ts` (NEW) — `profileBackTransition(label, marker)` + `hop(name)` + `resetTraces()`; closed-over `activeTrace` state; module-level gate combining `SIRENO_PROFILE` and `SIRENO_PROFILE_BACK_TRANSITIONS`.
- `packages/cli/src/deck/gesture-state.ts` (UNCHANGED in Wave 2) — Wave 1's `dispatchGestureEnd` is the consumer of the new conditional `onDblTap`.
- `.planning/phases/71-gesture-state-machine-hardening/71-01-SUMMARY.md` — this file.

## Decisions made

1. **Used only `overlayDeckId` + `lastDismissedOverlayDeckId` for the overlay-context check.** An initial implementation also checked `pendingOverlayDeck !== null` — this referenced a closure variable that does NOT exist in `createSystemBackHandlers`'s scope (it is a parameter inside the helper that drives `getLastPositionSystemButton`, not a module-scope variable like the other two). Caught by running the runtime test suite (`ReferenceError: pendingOverlayDeck is not defined`). Lesson: before adding a new variable to a closure, verify it is actually in scope — research files can misattribute scope.

2. **Exposed `profileBackTransition(label, marker)` with a 2-arg shape rather than separate `startTrace(label)` / `endTrace()` functions.** Keeps the call sites self-documenting and prevents accidental `start` without `end` (the JSON-line shape makes the trace unambiguous). Matches the example in the plan (`profileBackTransition('back-from-settings', 'start')`).

3. **Kept the `hop()` early-return-if-no-active-trace behaviour.** Means the same instrumentation hooks in `activateDeckSurface` are safe to call from any code path (e.g. deck-to-deck navigation that is not a back transition) — they will emit nothing without a `profileBackTransition(start)` to anchor them. The downside is that the wire-up is single-trace-at-a-time; if a future use case needs nested or concurrent traces, this will need to be a stack rather than a single variable.

4. **Integration test + fixture deferred (Task 6 of 71-01-PLAN.md).** No Stream Deck device available in this environment (Linux dev box, no USB hardware). Plan explicitly allows `device-unplugged fallback: skip with clear message`. Manual UAT on real hardware is the verification path; flagged in this SUMMARY as the outstanding acceptance criterion.

5. **Real-hardware profile capture deferred (Tasks 3, 5 of 71-01-PLAN.md).** Same reason as Task 6 — without a real device, there is no transition to measure. Infrastructure is ready and can be exercised by setting `SIRENO_PROFILE=1 SIRENO_PROFILE_BACK_TRANSITIONS=1` and redirecting stdout to a file. The fallback baseline number from Phase 58 in-process measurement (12.35 ms back-pop) is the only signal available without hardware; the fix is verified by code-path analysis (conditional `onDblTap` removes the unconditional `setTimeout(DOUBLE_TAP_DELAY_MS)` from `dispatchGestureEnd`'s strict-case path).

## Notes for downstream

- **Verify on real hardware before shipping.** The fix is a behavioural change on a code path exercised only by the device driver. The conditional `onDblTap` logic is correct by code-path analysis, but the `restoreLastDismissedOverlay()` branch (`onDblTap` default body when `lastDismissedOverlayDeckId !== null` but `overlayDeckId === null`) was not exercised by automated tests — manual UAT of "double-tap system back after overlay was just dismissed" is required.
- **Active trace state is module-scope global.** If two back transitions overlap (extremely unlikely on a 15-key device with single-threaded event loop, but possible if the runtime grows to multi-key async), the second `profileBackTransition(start)` will overwrite the first. Acceptable for v1.7; document if it becomes a problem.
- **`packages/cli/.tailwind.browser.contract.generated.css` is unrelated leftover** from a previous session (visible in `git status`). Not part of this commit.
- **Pre-existing runtime test baseline remains at 79 failed / 29 passed** in `runtime.test.ts` (108 total). This phase contributes 0 new failures; all 79 are the Phase 42/67 system-back-injection issue documented as out-of-scope for Phase 71. Future `/forensics` work.
- **Wave 2 wiring changes that depend on Wave 1's `dispatchGestureEnd`:** This plan could not have shipped before `71-02` (which extracted the dispatcher). The `depends_on: [71-02]` ordering in `71-01-PLAN.md` frontmatter was load-bearing.

## Verification

- `pnpm --filter sireno-deck-cli test gesture-state` → **6/6 PASS** (594 ms). Wave 1 invariant preserved.
- `pnpm --filter sireno-deck-cli test runtime` → **79 failed / 29 passed** (108 total). **Identical to v1.6 + Phase 67 baseline.** Zero new failures introduced by Task 4 fix.
- Targeted regression test for Task 4 fix (the initial `pendingOverlayDeck` bug): `pnpm --filter sireno-deck-cli test runtime -- -t "routes the split-action"` reproduces the bug if reverted to the broken implementation, confirms green after the closure-scope fix.
- Profile infrastructure smoke: `node --import tsx/esm --eval "..."` can exercise the trace gate; manual UAT with the env vars set is the planned verification path.
- BUG-01 requirement satisfaction: code path now bypasses `setTimeout(DOUBLE_TAP_DELAY_MS)` for system-back taps when no overlay context. Hard target verification (<200 ms on real hardware) deferred to manual UAT as documented above.

**Outstanding acceptance criterion:** real-hardware measurement of <200 ms settings-deck → previous-deck transition. Not measurable in this environment; documented as the manual UAT gate.
