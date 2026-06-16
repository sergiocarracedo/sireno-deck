---
title: User redesign mid-UAT: invalidate CONTEXT, gap-closure plan, re-document
date: 2026-06-15
category: workflow-issues
module: planning workflow / mid-flight redesign
problem_type: workflow_issue
severity: medium
tags: [uat, redesign, context-decisions, gap-closure, phase-67, design-correction, source-of-truth]
applies_when:
  - User tests an implementation on real hardware and rejects the design that was confirmed in discuss-phase
  - The implementation matched CONTEXT.md decisions, but the hardware reality contradicts the user's mental model
  - A gap-closure plan needs to invalidate some CONTEXT decisions without invalidating the phase goal
---

# User redesign mid-UAT: invalidate CONTEXT, gap-closure plan, re-document

## Context

Phase 67 (settings deck layout revamp) was discussed in `/discuss-phase 67`, captured in `67-CONTEXT.md` with 8 decisions (D-01..D-08). The agreed design was **n-aware**: `position 0 = logo_version`, `keyCount-3 = brightness_down`, `keyCount-2 = brightness_up`, `keyCount-1 = current_brightness`. The plan (`67-01-PLAN.md`) executed this design exactly. Atomic commits shipped. UAT began.

UAT test 1 (positions correct) passed. UAT test 2 (back button reachable) failed because **the back button has no slot**: the deck fills positions 0, n-3, n-2, n-1, but the system back button is runtime-injected at n-1. The n-aware design collided with the back button.

User instruction: *"use these positions: bright dec: 0, bright inc: 1, bright current: 2, version: 4. position 3 intentionally empty."*

The user rejected the n-aware design mid-UAT and demanded fixed positions {0, 1, 2, 4}, leaving n-1 free for the runtime-injected back button. This invalidated 4 of the 8 CONTEXT.md decisions (D-01, D-02, D-03, D-08) plus Task 5 of `67-01-PLAN.md`.

## What I Did

```bash
# 1. Pause UAT
.planning/phases/67-settings-deck-layout-revamp/67-UAT.md
  paused: 2026-06-15T20:00:00Z
  pause_reason: 67-02 gap closure
  # tests 1, 3, 4, 5, 6, 7 marked invalidated, test 2 marked issue (major)

# 2. Write gap-closure plan
.planning/phases/67-settings-deck-layout-revamp/67-02-PLAN.md
  - 5 tasks: rewrite createInternalSettingsDeck, rewrite matrix test,
    rg-check n-aware refs, append design-correction to summary, test sweep

# 3. Execute-phase 67-02 (4 atomic commits)
c647953  fix(67): fixed-position settings deck (0/1/2/4) — n-1 free for back button
797fdc2  docs(67): record design correction in 67-01 summary
6565006  test(67): fix deck id assertion (settings, not __sireno_internal_settings)
5f2c935  docs(67): execute-phase summary + roadmap/state/agents updates

# 4. Resume UAT against corrected design
.planning/phases/67-settings-deck-layout-revamp/67-UAT.md
  status: testing
  resumed: 2026-06-15T20:30:00Z
  # 9 tests rewritten for fixed-position design, 9/9 pass
```

## Guidance

When the user redesigns mid-UAT, follow this sequence:

### 1. Pause the UAT, don't finish it

Mark the UAT file with `paused:` + `pause_reason:` frontmatter. Mark the offending test as `result: issue` with a severity (major / critical / minor). Mark any tests that depend on the rejected design as `invalidated: redesigned-in-67-02` rather than re-running them. Do not push the UAT to `passed` against the old design.

### 2. Write a gap-closure plan, not a full replan

The gap-closure plan (`{N}-02-PLAN.md`) is narrower than `{N}-01-PLAN.md` — it covers only the changed design. The phase goal does not change; only the implementation approach does. This keeps the gap-closure plan small (5 tasks vs. 7) and the commit log legible.

### 3. Invalidate CONTEXT decisions, don't rewrite them

CONTEXT.md is the **discussion-of-record** — it captures what was decided in `/discuss-phase`. Do not edit it to match the new design. Instead:

- Add a "Design correction" section to `{N}-01-SUMMARY.md` with the new design, the rationale (user's hardware observation), and a list of CONTEXT decisions invalidated (D-01, D-02, D-03, D-08).
- Treat `67-CONTEXT.md` as historical; the shipped code matches the user's corrected layout, not the original CONTEXT.
- If the requirement wording (REQUIREMENTS.md) needs to change to match, defer that to the next metadata-backfill phase, not to the gap-closure plan.

### 4. Re-document, don't apologize

The atomic commits for the gap-closure plan should include a `docs(67): record design correction` commit. The SUMMARY's "Design correction" section should link to the user's UAT feedback and explain the new design, not relitigate the old one. Future readers can follow the trail: CONTEXT.md (original) → UAT.md (issue) → {N}-02-PLAN.md (fix) → {N}-01-SUMMARY.md "Design correction" (reconciliation) → shipped code.

### 5. Resume UAT against the new design, not the old one

When the gap-closure ships, update the UAT file to mark `paused: null` / `resumed:` and rewrite the tests to match the shipped design. The new tests will pass cleanly because they target the new design directly. Do not re-run the invalidated tests; they were testing a design that no longer exists.

## Why This Matters

The alternative paths are all worse:

- **Push back on the user mid-UAT**: "But we agreed in discuss-phase..." — the user has the hardware, you have the plan. Hardware wins. The whole point of UAT is to catch what discuss-phase can't.
- **Ship the n-aware design anyway**: leaves the user with a back button they can't reach. A critical functional regression.
- **Rewrite CONTEXT.md to match the new design**: erases the discussion record. Future readers lose the ability to understand why n-aware was considered and rejected — a useful piece of institutional memory.
- **Start a new phase from scratch**: massive overhead for a 4-position design change. The gap-closure plan is 5 tasks; a full replan would be 7+.

The pattern that works: **pause → gap-closure plan → invalidate-not-rewrite → re-document → resume**. The phase is complete in 8 atomic commits instead of 4, the discussion record is preserved, and the user has a working design.

## When to Apply

- User rejects a design during UAT that was confirmed in discuss-phase
- The rejected design has a real-world reason to fail (hardware constraint, UX friction, accessibility, etc.)
- The fix is local to one or two files (not a phase-level re-scope)
- The CONTEXT decisions being invalidated are clearly numbered (D-01, D-02, ...) and listed

Do NOT use this pattern for:

- Cosmetic design preferences ("I'd prefer the icon at the top") — discuss and update CONTEXT in place
- Full phase re-scope ("actually, let's build a different feature") — start a new phase
- Hardware limitations that block UAT entirely — `/forensics` to diagnose, then plan

## Examples

Phase 67 → 67-02 gap closure (the case above). 9/9 UAT pass after gap closure. Verdict: shippable.

The same pattern was applied earlier in Phase 66 (gap closure for the mega-commit + P0/P1 review fixes), and in Phase 16 (the UAT rerun that produced the consistency-set solution at `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md`).

## Related

- `.planning/phases/67-settings-deck-layout-revamp/67-CONTEXT.md` — original 8 decisions (D-01..D-08)
- `.planning/phases/67-settings-deck-layout-revamp/67-UAT.md` — paused + resumed for fixed-position design
- `.planning/phases/67-settings-deck-layout-revamp/67-02-PLAN.md` — gap-closure plan
- `.planning/phases/67-settings-deck-layout-revamp/67-01-SUMMARY.md` — "Design correction" section
- Atomic commits: `c647953`, `797fdc2`, `6565006`, `5f2c935`
- `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md` — related consistency-set rule
