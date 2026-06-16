---
title: Aggregation-only verification sweep for milestone closes
date: 2026-06-15
category: best-practices
module: planning workflow / milestone verification
problem_type: best_practice
severity: low
tags: [verification, milestone-sweep, aggregation, evidence, phase-69, verify-02]
applies_when:
  - A milestone has many phases and the final verification doc would otherwise re-narrate the whole arc
  - Per-phase VERIFICATION.md files already exist for most or all phases
  - You need a single source of truth for "did the milestone close" without writing new narrative
---

# Aggregation-only verification sweep for milestone closes

## Context

The v1.6 milestone closed with 7 executed phases (57, 58, 59, 60, 61, 62, 66) plus 3 gap-closure phases (67, 68, 69) and a planned 70 for metadata backfill. Hand-writing a milestone-level verification would have meant re-narrating each phase's work in a single doc, duplicating the per-phase evidence, and inviting drift between the aggregate and the per-phase sources of truth.

Phase 69 was scoped as **aggregation only** — it does not add new code, does not run new tests, does not perform new UAT. It collects the existing per-phase VERIFICATION.md + UAT.md + SUMMARY.md files, cross-references them against ROADMAP success criteria and REQUIREMENTS.md, and produces a single doc the user reads to decide "ship / don't ship / fix gaps."

## Guidance

When closing a milestone with `VERIFY-02` (or equivalent) as a requirement, do this:

### 1. The aggregation doc has 8 sections, no more

```md
# [MILESTONE] VERIFICATION

## ROADMAP criteria coverage
| # | Criterion (from ROADMAP phase N) | Met? | Evidence |
|---|--------------------------------|------|----------|

## [REQUIREMENT-ID] sub-criteria
| Sub-req | Met? | Evidence |

## All [milestone] requirements status
| Req ID | Title | Status | Phase | Evidence |

## Test results
(pass/fail counts, broken down by suite; pre-existing baseline called out)

## Hardware caveat
(what was measured in-process vs. real hardware, with the in-process number + pointer to where the hardware measurement would go)

## Open gaps
(per-item, with follow-up: gap-closure phase N or "deferred to v[N+1]")

## Pre-existing baseline
(noise: pre-existing test failures, TS errors, lint warnings — not caused by this milestone)

## Summary
(verdict: passed | gaps-found | failed; recommend next workflow)
```

### 2. Cite, don't paraphrase

Every row in the tables points at a specific file + phase + line range, e.g.:

```
| EMO-15 | Emoji picker paginates by category | satisfied | 59 | 59-VERIFICATION.md §1 |
| PERF-02 | <200ms back button response | unverified (in-process) | 58 | 58-VERIFICATION.md §3 + hardware caveat |
```

The aggregation doc is a **map** to the evidence, not the evidence itself. The reader can follow any row to a file that has the full context.

### 3. Hardware caveat is non-optional

If you cannot measure on real hardware (no deck, no time, no fixtures), say so explicitly. The pattern is:

```md
## Hardware caveat
PERF-02 (back button <200ms): measured in-process at 12-18ms (see 58-VERIFICATION.md §3).
Real-hardware measurement is documented as a v1.7 follow-up; the in-process number
includes the IPC hop from the device driver but excludes USB transport + display
refresh (~30-100ms range per 58-VERIFICATION.md hardware-caveat table).
```

Do not claim "passed" for hardware requirements you only measured in-process. The verdict is `passed` for the milestone overall, but the row is `unverified (in-process)`.

### 4. Pre-existing baseline is mandatory

Pre-existing failures (e.g. `runtime.test.ts` 47 failures from missing `options.addonRegistry` plumbing, 982 pre-existing TS errors, 18 oxlint warnings) will pollute the test results. Capture them once in the doc and exclude them from the verdict:

```md
## Pre-existing baseline
- runtime.test.ts: 47 failures (options.addonRegistry undefined; predates this milestone)
- tsc: 982 pre-existing errors
- oxlint: 18 pre-existing warnings
```

The reader can subtract the baseline from the totals and see the milestone's net contribution.

### 5. Verdict + recommended next workflow

End the doc with one of three verdicts and a recommended next workflow:

- `passed` → `/ship [milestone]`
- `gaps-found` → `/plan-milestone-gaps` (groups gaps into fix phases)
- `failed` → `/forensics` + a `plan-milestone-gaps` cycle

## Why This Matters

Aggregation-only verification:

- **Avoids drift** — there is no second narrative to keep in sync with the per-phase docs. Tables are the only artifact; cells point at truth.
- **Is fast to write** — the aggregation doc is mostly grep + table assembly. No new tests, no new UAT, no new code review.
- **Scales linearly** — a 7-phase milestone takes the same time as a 3-phase milestone. The doc length grows by rows, not by narrative complexity.
- **Is honest** — the gap between "what we claim" and "what we measured" is visible in the table cells. Hardware claims are caveated. Open gaps are explicit.

The opposite — hand-written milestone narrative — invites drift, hides hardware gaps behind prose, and tends to get out of date as the milestone evolves.

## When to Apply

- Milestone close where `VERIFY-02` (or any "verify the whole milestone" requirement) is on the plan
- When per-phase VERIFICATION.md files exist for the majority of phases
- When the goal is "decide ship / don't ship" not "write the definitive record"

Do NOT use this pattern for:

- A single-phase "verify this phase" workflow (use the per-phase VERIFICATION.md directly)
- A phase that has no per-phase docs (write the per-phase doc first, then aggregate)
- Documentation gaps that the aggregation itself needs to fix (write a separate docs-gap plan)

## Examples

Phase 69 produced `.planning/phases/69-v16-verification-sweep/69-VERIFICATION.md` (200 lines) with 8 sections, citing 10 evidence files across phases 58/59/60/61/62/66/67/68. Verdict: `passed`. Open gaps: 6 items (3 deferred to Phase 70 metadata backfill, 3 deferred to v1.7). Pre-existing baseline: 47/982/18 captured.

## Related

- `.planning/phases/69-v16-verification-sweep/69-VERIFICATION.md` — the canonical example
- `.planning/phases/56-*/56-VERIFICATION.md` — Phase 56 v1.5 sweep template (the prior art that Phase 69 modeled itself on)
- `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md` — the consistency set rule (UAT + VERIFICATION + STATE + AGENTS must align)
- `REQUIREMENTS.md` VERIFY-02 — the requirement this phase closes
