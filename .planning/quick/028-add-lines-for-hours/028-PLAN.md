# Quick Task 028 Plan

**Task:** add lines for hours

## Tasks

<task id="028-01">
<title>Add hour tick marks to the analog clock dial</title>
<files>
- packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
</files>
<action>
Update the built-in analog clock SVG to render twelve hour tick marks around the dial while preserving the existing live hour and minute hands, the current dial circle, and the current mounted-button contract. Keep the change local to the analog clock component and render the markers as SVG lines positioned by rotation around the dial center.
</action>
<verify>
grep -n "data-sireno-clock-hour-marker" packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
</verify>
<done>
The analog clock component renders a repeated set of hour markers around the dial and the implementation exposes a stable marker selector for regression coverage.
</done>
</task>

<task id="028-02">
<title>Re-sync focused analog clock coverage with the hour markers</title>
<files>
- packages/cli/src/builtin-addons/date-time/index.test.ts
- CHANGELOG.md
</files>
<action>
Update the focused date-time addon analog clock test to assert the rendered analog clock includes the new hour markers without weakening the existing hand-angle checks. Add a 2026-06-02 changelog note describing the new dial markers and what the fix taught us about visual regression coverage.
</action>
<verify>
pnpm exec vitest run src/builtin-addons/date-time/index.test.ts
</verify>
<done>
The focused date-time addon test passes while asserting the analog clock hour markers, and CHANGELOG.md records the visual refinement and learning.
</done>
</task>
