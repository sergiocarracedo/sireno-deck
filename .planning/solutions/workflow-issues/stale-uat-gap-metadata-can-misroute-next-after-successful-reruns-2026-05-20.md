---
title: Stale UAT gap metadata can misroute /next after successful reruns
date: 2026-05-20
category: workflow-issues
module: planning workflow state
problem_type: workflow_issue
severity: medium
tags: [planning-state, uat, next-routing, phase-16, workflow-consistency]
applies_when: A phase UAT file has passing summary totals, but still contains obsolete gap entries from earlier failures.
---

# Stale UAT gap metadata can misroute /next after successful reruns

## Context
Phase 16 had already passed manual UAT, but `/next` still tried to send the workflow back into `plan-phase 16`. The summary state said the phase was complete, while internal gap metadata still said diagnosed blockers existed.

## Guidance
When a phase is reopened for gap closure and later passes on rerun, normalize all workflow artifacts together instead of only updating the top-level pass/fail summary.

For this repo, the fix was:

```md
- remove obsolete diagnosed gaps from `.planning/phases/16-config-reload-wrapper-polish/16-UAT.md`
- mark `.planning/phases/16-config-reload-wrapper-polish/16-VERIFICATION.md` as `status: complete`
- update `.planning/STATE.md` to `review_ready`
- align `AGENTS.md` current-phase status with the completed review gate
```

Treat `16-UAT.md`, `16-VERIFICATION.md`, `.planning/STATE.md`, and `AGENTS.md` as one consistency set. If one still reflects the pre-rerun state, routing can drift even when the implementation is done.

## Why This Matters
Workflow automation reads planning artifacts as source of truth. If the summary says "passed" but stale internal gaps still say "diagnosed," the project can get trapped in fake unfinished work. That wastes time and makes the workflow look flaky when the real issue is inconsistent state, not unfinished engineering.

## When to Apply
- After rerunning manual UAT that previously failed
- After a narrow gap-closure plan fixes a blocker and the phase later passes
- When `/next` or similar routing points back to planning despite completed UAT totals

## Examples
Before:

```yaml
status: complete
passed: 4
issues: 0

## Gaps
- status: diagnosed
  test: 1
- status: diagnosed
  test: 2
```

After:

```yaml
status: complete
passed: 4
issues: 0

## Gaps
None. Historical gaps were closed and verified by the final rerun.
```

## Related
- `.planning/phases/16-config-reload-wrapper-polish/16-UAT.md`
- `.planning/phases/16-config-reload-wrapper-polish/16-VERIFICATION.md`
- `.planning/STATE.md`
- `AGENTS.md`
