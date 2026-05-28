# Quick Task 017 Plan

**Task:** Fix the Phase 29 review findings: stop toggle render from mutating persisted store state, remove dead date-time class tokens, and add focused regression coverage

## Tasks

<task id="017-01">
<title>Fix the two Phase 29 implementation defects</title>
<files>
- packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx
- packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx
</files>
<action>
Update the command-driven toggle render path so it derives a local fallback display state without mutating `store.button.snapshot` during `render()`. Keep the existing pending/error/lastKnownState presentation contract intact. In the date-time button, remove the dead `fit-wrap` and `leading-1` class tokens and rely on the existing `Text` component wrap/line-height behavior plus the remaining real utility class.
</action>
<verify>
Read the touched files and confirm the toggle render path no longer assigns to `storeState.displayState`, and the date-time button no longer references `fit-wrap` or `leading-1`.
</verify>
<done>
The toggle render path is read-only with respect to persisted store snapshots, and the date-time button markup no longer contains dead styling tokens.
</done>
</task>

<task id="017-02">
<title>Add focused regression coverage for the review findings</title>
<files>
- packages/cli/src/builtin-addons/core-buttons/index.test.ts
- packages/cli/src/builtin-addons/date-time/index.test.ts
</files>
<action>
Add focused tests that prove command-driven toggle rendering does not mutate the persisted button snapshot when display state is missing, and that the shipped date-time mounted render path no longer emits the dead class tokens while still rendering through the mounted contract.
</action>
<verify>
Run `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/date-time/index.test.ts` from `packages/cli`.
</verify>
<done>
The new regression tests fail without the fixes, pass with them, and keep the focused built-in addon suites green.
</done>
</task>
