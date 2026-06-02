# Plan 34-03 Summary

**Completed:** 2026-06-02

## What was built
Regular bundled `date-time` buttons now expose the shared optional nested `commands` contract across the full non-locked family: `date-time`, `time`, `analog-clock`, `clock`, and `calendar-sheet`. The rollout stays on the shared `useButtonActionCommand(...)` hook, keeps locked time tiles on their separate schema/behavior seam, and avoids widening command policy into `deck/runtime.ts`.

The schema cut landed first, then the mounted definitions were wired to the shared hook and the addon registration now includes the shipped `clock` alias. Focused addon verification was done against the task-only patch in an isolated worktree so the workflow gate stayed honest even with unrelated in-flight date-time edits in the main checkout.

## Key files
- `packages/cli/src/builtin-addons/date-time/schemas.ts`: adds optional shared `commands` support to the regular date-time button family while leaving `LockedTimeTileButtonSchema` untouched.
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: composes the shared hook into both `date-time` and `time` mounted definitions without changing render behavior.
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`: composes the shared hook into the shared `analog-clock` / `clock` mounted definition seam.
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`: adds shared command handling to the regular calendar-sheet button without changing its visual layout.
- `packages/cli/src/builtin-addons/date-time/index.ts`: registers the shipped `clock` alias at the bundled addon seam.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: proves nested command parsing and gesture handling on the regular family while keeping locked time tiles outside the rollout boundary.

## Verification
- `grep -n "commands\|LockedTimeTileButtonSchema\|BuiltinDateTimeButtonSchema\|BuiltinAnalogClockButtonSchema\|BuiltinCalendarSheetButtonSchema" packages/cli/src/builtin-addons/date-time/schemas.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/date-time/index.test.ts -t "date-time|time|clock|calendar|command|locked"`

## Commits
- `fe39ab7` `feat(34-03): add date-time command schema`
- `c2b9869` `feat(34-03): wire date-time command handlers`

## Notes
- Locked time tiles deliberately remain outside the shared command-action rollout in both schema and mounted handler seams.
- The Phase 34 date-time verify gate was run in an isolated temporary worktree so the tested patch matched the intended task-only slice instead of unrelated dirty worktree state.
