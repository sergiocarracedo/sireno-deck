# Quick Task 007 Summary

**Task:** preserve internal toggle state across deck activation and reconnect
**Completed:** 2026-05-13

## What was done
Updated deck activation cleanup so only externally authoritative polled buttons reset before reactivation. Internal toggles without a `status_command` now keep their in-memory state across deck switches and runtime restart/reconnect. Added regression coverage for both deck reactivation and `stop()`/`start()` reconnect behavior.

## Files changed
- `packages/cli/src/deck/runtime.ts`: stopped clearing internal toggle state during activation cleanup.
- `packages/cli/src/deck/runtime.test.ts`: added regression coverage for deck reactivation and reconnect preserving internal toggle state.
- `CHANGELOG.md`: recorded the fix, root cause, and learning.
- `.planning/STATE.md`: tracked the quick task in project state.

## Why It Broke
Activation cleanup was keyed to "supports polled refresh" instead of "has an external authority to refresh from." That lumped internal toggles together with status-polled buttons, so every activation boundary deleted the only source of truth they had and forced them back to the first configured state.

## What We Learned
Reset logic has to follow ownership. If button state lives only inside the runtime, activation and reconnect should preserve it; only externally rehydratable state is safe to clear eagerly.
