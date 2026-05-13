---
files_modified:
  - .planning/phases/04-advanced-buttons/04-03-SUMMARY.md
  - .planning/phases/04-advanced-buttons/04-VERIFICATION.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Align the Phase 4 review language with the shipped v1 fan contract and mark the review step complete without reopening implementation."
---

# Quick Task 009: Align Fan Review Contract And Finalize Phase 4 Review

<objective>
Close the remaining Phase 4 review drift in project artifacts only. Keep it narrow: document the actual v1 fan contract already implemented in code, make clear that broader fan-ranking heuristics are future scope, and advance project state from review-pending to review-finalized.
</objective>

## Tasks

<task id="009-01">
<title>Document the shipped v1 fan contract in Phase 4 artifacts</title>
<files>
- .planning/phases/04-advanced-buttons/04-03-SUMMARY.md
- .planning/phases/04-advanced-buttons/04-VERIFICATION.md
</files>
<action>
Update the Phase 4 plan summary and verification notes so they describe the implemented fan behavior precisely: use the first readable graphics-controller fan sensor, keep `0 RPM` as valid telemetry, and show the configured unavailable fallback only when no readable sensor exists. Call out that no broader heuristic shipped in v1.
</action>
<verify>
grep -n "first readable graphics-controller\|0 RPM\|Review closure" .planning/phases/04-advanced-buttons/04-03-SUMMARY.md .planning/phases/04-advanced-buttons/04-VERIFICATION.md
</verify>
<done>
Phase 4 review artifacts now match the runtime contract instead of implying unshipped fan-selection behavior.
</done>
</task>

<task id="009-02">
<title>Advance project state past review</title>
<files>
- .planning/STATE.md
</files>
<action>
Update the project state so Phase 4 is no longer marked as ready for review. Record this quick task and point session continuity at `/ship` after manual UAT.
</action>
<verify>
grep -n "review finalized\|/ship\|009" .planning/STATE.md
</verify>
<done>
The repo state reflects that Phase 4 review is finished and the next workflow is shipping, not more review.
</done>
</task>
