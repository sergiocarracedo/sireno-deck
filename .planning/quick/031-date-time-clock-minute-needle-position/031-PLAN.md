# Quick Task 031 Plan

---
description: date-time clock button minutes needle position is not correct. it's 23:47 and the neddle is arroud pass quartr position
created: 2026-06-02
must_haves:
  truths:
    - The bundled analog clock renders the minute hand from the clock center toward 12 o'clock so the computed minute angle matches the visible hand position.
    - The analog clock regression test proves a 1:30 render still produces the expected hour and minute rotations after the hand geometry fix.
  artifacts:
    - packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
    - packages/cli/src/builtin-addons/date-time/index.test.ts
  key_links:
    - packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
    - packages/cli/src/builtin-addons/date-time/index.test.ts
---

## Task 1

<files>
- packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
- packages/cli/src/builtin-addons/date-time/index.test.ts
</files>

<action>
Update the bundled analog clock SVG so the minute hand line extends from the center toward the top of the face, matching the same 12 o'clock base orientation already used by the hour hand. Keep the existing angle calculations intact. Then tighten the analog clock render test so it still proves the 1:30 fixture renders the expected hour and minute rotations and also asserts the minute-hand line coordinates point upward from the center.
</action>

<verify>
Run `pnpm exec vitest run src/builtin-addons/date-time/index.test.ts` from `packages/cli` and confirm the date-time addon test file passes.
</verify>

<done>
The analog clock shows the minute hand at the correct visible position for real times such as 23:47, and the focused date-time addon regression test locks the corrected hand geometry in place.
</done>
