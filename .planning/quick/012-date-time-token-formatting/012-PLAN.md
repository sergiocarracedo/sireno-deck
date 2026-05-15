---
files_modified:
  - builtin-addons/date-time/src/index.ts
  - builtin-addons/date-time/src/index.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Make the bundled date-time addon actually honor its existing token-based format strings without pulling in an external date library."
---

# Quick Task 012: Honor Token-Based Formatting In The Bundled Date-Time Addon

<objective>
Fix the dead-config bug in the bundled date-time addon by making `date_format` and `time_format` drive the rendered label for the existing `date`, `time`, and `date-time` variants.
</objective>

## Tasks

<task id="012-01">
<title>Replace locale-short formatting with the shipped token contract</title>
<files>
- builtin-addons/date-time/src/index.ts
</files>
<action>
Implement the smallest possible formatter that supports the tokens already exposed by the addon schema: `YYYY`, `MM`, `DD`, `HH`, `mm`, and `ss`. Use it directly for date-only, time-only, and combined date-time variants.
</action>
<verify>
pnpm vitest run builtin-addons/date-time/src/index.test.ts
</verify>
<done>
The addon label changes when config format strings change, instead of always following locale-short output.
</done>
</task>

<task id="012-02">
<title>Pin the contract in focused tests and project records</title>
<files>
- builtin-addons/date-time/src/index.test.ts
- CHANGELOG.md
- .planning/STATE.md
</files>
<action>
Rewrite the focused addon test to assert exact token-formatted strings for the supported variants, then record the fix in changelog and quick-task state.
</action>
<verify>
pnpm vitest run builtin-addons/date-time/src/index.test.ts
</verify>
<done>
The user-facing formatting contract is tested and the quick task is tracked in repo planning artifacts.
</done>
</task>