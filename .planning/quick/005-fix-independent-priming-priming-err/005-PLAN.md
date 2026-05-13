---
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Fix Phase 4 activation priming so polled buttons prime independently, rejected priming does not block later updates, and media buttons clear stale metadata when refreshes fail."
---

# Quick Task 005: Fix Independent Priming, Priming Error Handling, And Stale Media Metadata

<objective>
Tighten the Phase 4 activation path without reopening the design. Keep priming concurrent across buttons, make priming failures non-fatal so activation still converges, and ensure media cards clear stale metadata when a later refresh can no longer supply it.
</objective>

## Tasks

<task id="005-01">
<title>Harden activation priming and media refresh state</title>
<files>
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
</files>
<action>
Update deck activation priming so each polled button refresh is kicked off independently during activation instead of waiting for previous buttons to finish. Swallow per-button priming failures so one rejected refresh cannot prevent other buttons from priming or block polling startup. In the media refresh path, treat failed status or metadata fetches as authoritative missing data by clearing stale subtitle and/or detail lines instead of leaving the previous metadata on screen. Add focused regression tests for independent priming, priming rejection handling, and stale media metadata clearing.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts
</verify>
<done>
Activation priming no longer serializes sibling button updates, rejected priming does not break later polling work, and media buttons stop displaying stale metadata after failed refreshes.
</done>
</task>

<task id="005-02">
<title>Record the regression and update quick-task state</title>
<files>
- CHANGELOG.md
- .planning/STATE.md
</files>
<action>
Document the fix in the 2026-05-13 changelog with the root cause and learning, then append quick task 005 to the quick-task table in STATE.md and update the last-activity line to reference this task.
</action>
<verify>
rg "independent priming|stale media metadata|quick task 005" CHANGELOG.md .planning/STATE.md
</verify>
<done>
The changelog and project state both reflect quick task 005 and describe the regression that was fixed.
</done>
</task>
