# Plan 56-01 Summary

**Completed:** 2026-06-10
**Phase:** 56 — v1.5 verification sweep

## What was built
Added 3 overlay lifecycle integration tests to the runtime test suite (closing the biggest verification gap from Phase 55), plus 3 runtime bug fixes uncovered while debugging the double-tap test. All 8 overlay lifecycle tests now pass.

## Key files
- `packages/cli/src/deck/__tests__/runtime.test.ts`: 3 new integration tests (226 lines): `isolates overlay navigation from main deck history`, `double-tap back dismisses overlay`, `single-tap back does not dismiss overlay`
- `packages/cli/src/deck/runtime.ts`: 3 bug fixes

## Decisions made
- **Overlay-toggle button needs `onDblTap`**: The system-back button (not shown during overlay) already had `onDblTap` that dismisses the overlay. The overlay-toggle button (shown instead) only had `onTap`. Added `onDblTap` with same behavior so double-tap on the reserved slot also dismisses the overlay.
- **`getButtonPositionFromLast()` must default keyCount to 15**: Without this fallback, tests that don't configure `keyCount` get `position: NaN` for the injected system button, causing the overlay-toggle button to be unresolvable by gesture handlers.
- **`handlePress()` must preserve existing gesture state**: The original code `{ holdTimer, holdTriggered: false }` overwrote the entire gesture state, destroying any `pendingDblTapTimer` set by a prior `up` event handler. Fixed with `{ ...gs, holdTimer, holdTriggered: false }`.

## Deviations from plan
- Task 4 (overlay pagination + toggle-on-every-page tests in `system-buttons-dispatcher.test.ts`) was already covered by pre-existing tests (`injects overlay-toggle on paginated overlay page decks` and `does not inject overlay-toggle on non-overlay decks`). No changes needed.

## Notes for downstream
- 49 pre-existing test failures in `createDeckRuntime` block (`Cannot read properties of undefined (reading 'listButtons')`) are unrelated to these changes — confirmed by reverting and running tests on the original code.
- The runtime fixes here are foundational for any future gesture/tap work: the `pendingDblTapTimer` preservation fix in particular could affect all buttons that mix hold and double-tap behaviors.
