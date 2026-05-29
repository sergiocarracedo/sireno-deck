---
wave: 1
depends_on: []
files_modified:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: false
objective: "Phase 3 planning sources stop contradicting each other by aligning the milestone requirements and roadmap to the already-committed shared Text markup scope, without changing implementation code or widening beyond the user's re-scoped planning decisions."
---

# Plan 021: Align Phase 3 Markup Scope

<objective>
Close the planning contradiction blocking `plan-phase 3`. `03-CONTEXT.md` now truthfully captures a shared `Text` mini markup language consumed by date-time after Day.js expansion, but `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` still describe a bounded widget-local date-time grammar. Update the milestone planning docs so they all describe the same Phase 3 scope and leave implementation for the later planning/execution workflow.
</objective>

## Tasks

<task id="021-01">
<title>Align Phase 3 requirements and roadmap to the committed shared Text markup scope</title>
<files>
- .planning/REQUIREMENTS.md
- .planning/ROADMAP.md
- .planning/STATE.md
</files>
<action>
Update the Phase 3 milestone requirements, sequencing notes, phase traceability notes, roadmap milestone summary, Phase 3 goal, Phase 3 success criteria, and any minimal state wording needed so the planning layer matches the already-committed `03-CONTEXT.md`. Preserve the user’s re-scope exactly: shared `Text` owns a strict-whitelist nested mini markup language, date-time does Day.js first then passes markup through, existing tone tokens and shared size tags are reused, and this is no longer date-time-only. Keep the fix surgical: no code changes, no new implementation promises beyond the re-scoped planning truth, and no attempt to re-run `plan-phase 3` inside this quick task.
</action>
<verify>
node -e "const fs=require('fs'); const req=fs.readFileSync('.planning/REQUIREMENTS.md','utf8'); const road=fs.readFileSync('.planning/ROADMAP.md','utf8'); const state=fs.readFileSync('.planning/STATE.md','utf8'); const checks=[ req.includes('shared `Text`'), !req.includes('widget-local grammar'), road.includes('shared `Text` mini markup language'), !road.includes('The rich formatting grammar stays local to the date-time widget'), state.includes('Run `plan-phase 3` for Rich Date-Time Formatting Surface.') ]; if(checks.every(Boolean)) console.log('OK'); else { console.log('MISMATCH'); process.exit(1); }"
</verify>
<done>
`REQUIREMENTS.md`, `ROADMAP.md`, and the minimal related state wording all describe the same shared-Text Phase 3 scope, and `plan-phase 3` can resume without planning against contradictory source documents.
</done>
</task>
