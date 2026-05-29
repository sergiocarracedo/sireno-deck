---
phase: 4
slug: verification-and-contract-cleanup
areas_discussed:
  - Phase 4 scope
  - Invalid markup edge case
  - Historical fixtures
  - Planning truth
created: 2026-05-29
---

# Phase 4: Verification and Contract Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 04-verification-and-contract-cleanup
**Areas discussed:** Phase 4 scope, Invalid markup edge case, Historical fixtures, Planning truth

---

## Phase 4 scope

| Option | Description | Selected |
|--------|-------------|----------|
| Active shipped surfaces | Clean up active tests, live fixtures, current phase docs, README/examples, and verification artifacts that describe the shipped contract; leave archival planning/history alone unless it still drives current workflows. | ✓ |
| Everything mentioning old contract | Sweep active surfaces plus older planning/research/history files that still mention split date/time fields. | |
| Runtime/tests only | Limit cleanup to executable code, fixtures, and tests; avoid documentation/planning truth work. | |

**User's choice:** `Active shipped surfaces`
**Notes:** This keeps `TRF-07` narrow and honest. Phase 4 should clean what still represents the live product, not spend the milestone budget gardening archive prose.

---

## Invalid markup edge case

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 4 | Treat the unmatched-angle-bracket formatter miss as part of contract cleanup because the shipped invalid-markup behavior is incomplete and lacks regression coverage. | ✓ |
| Docs/tests only | Leave runtime behavior as-is and only document the limitation plus narrow test scope. | |
| Separate later bug | Defer the unmatched-angle case to a later bug workflow or quick task. | |

**User's choice:** `Include in Phase 4`
**Notes:** The live review already found this as a real contract miss, so excluding it from Phase 4 would leave the milestone closed on a known bad edge case.

---

## Historical fixtures

| Option | Description | Selected |
|--------|-------------|----------|
| Clean shipped examples only | Update fixtures/examples that are still presented as live references or verification paths; leave clearly archival phase fixtures alone. | ✓ |
| Clean all repo fixtures | Normalize every remaining fixture in the repo to the current single-field contract. | |
| Just mark stale ones | Leave old fixtures unchanged and only document which ones are historical. | |

**User's choice:** `Clean shipped examples only`
**Notes:** If a fixture is still shipped as a current reference, it should tell the truth. If it is purely historical, Phase 4 should not waste time normalizing it for cosmetic consistency.

---

## Planning truth

| Option | Description | Selected |
|--------|-------------|----------|
| Fix current-phase drift | Update Phase 3 verification/state artifacts that are now stale or misleading, but do not do a broad planning-doc rewrite beyond current workflow truth. | ✓ |
| Broad planning cleanup | Normalize stale wording across roadmap/state/verification/history files wherever the milestone story drifted. | |
| Minimal planning edits | Touch planning files only when the workflow strictly requires it. | |

**User's choice:** `Fix current-phase drift`
**Notes:** The important thing is to stop active workflow misdirection now that the Phase 3 rerun and review already happened. Broader archive cleanup can wait.

---

## Agent's Discretion

- Exact file list for active shipped examples versus historical fixtures.
- Exact regression coverage shape for unmatched-angle-bracket fallback behavior.
- Exact minimal planning/state/verification edits needed to remove current workflow drift without broad rewrite churn.

## Deferred Ideas

- Repo-wide archival normalization of every old split date/time reference.
- New formatting features beyond proof/cleanup of the current shipped contract.

---

*Phase: 04-verification-and-contract-cleanup*
*Discussion log generated: 2026-05-29*
