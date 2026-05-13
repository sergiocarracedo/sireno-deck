# Quick Task 008 Summary

**Task:** guard async deck activation after render and prevent stop from being undone
**Completed:** 2026-05-13

## What was done
Added a second activation ownership check immediately after the async deck render completes, before polling startup and priming begin. Added regression coverage for the two failure modes: stopping during a slow render no longer restarts polling, and restarting while an older render is still in flight no longer lets that stale activation tear down the newer schedulers.

## Files changed
- `packages/cli/src/deck/runtime.ts`: guarded the post-render continuation of deck activation.
- `packages/cli/src/deck/runtime.test.ts`: added regressions for late render completion after `stop()` and after restart.
- `CHANGELOG.md`: recorded the fix, root cause, and learning.
- `.planning/STATE.md`: tracked the quick task in project state.

## Why It Broke
Activation ownership was only validated before awaiting `onRenderDeck`. If that render finished after `stop()` or after a newer activation had already taken ownership, the stale continuation still ran `startActiveDeckPolling()` and priming, which could silently bring the runtime back to life or stop the new schedulers.

## What We Learned
Any async activation sequence that mutates ownership-sensitive runtime state needs a guard after each awaited boundary, not just at entry. Otherwise shutdown and restart semantics become vulnerable to late continuations.
