---
phase: 70
created: 2026-06-15
workflow: plan-phase
status: Ready for planning
---

# Phase 70 Research: Verification + Metadata Backfill

> **What I need to know to PLAN this phase well.** This phase is
> documentation and metadata only — no new code, no test runs, no
> requirement additions. The research focus is therefore **document
> discipline** (templates to mirror, fields to touch, gaps to avoid
> re-opening) rather than implementation patterns.

## Don't Hand-Roll

The temptation in a "metadata backfill" phase is to invent a new
format, abbreviate the existing template, or re-narrate work that
already has a source-of-truth. The right move in every case is
**cite, don't paraphrase**:

- **Use `69-VERIFICATION.md` 8-section template verbatim** for the
  aggregation doc. It's the closest match (Phase 69 was the previous
  gap-closure phase and used exactly this shape). Re-ordering the
  sections or inventing a new layout creates drift between the two
  aggregate docs and forces the next audit to learn two formats.

- **Use the existing `*-SUMMARY.md` 4-block format** (What was built /
  Key files / Decisions made / Notes for downstream) when writing the
  three missing Phase 59 summaries. The four existing 59-GC* summaries
  all use this exact shape. Improvising means readers can't grep the
  project for a uniform summary structure.

- **Use the existing `67-02-SUMMARY.md` "Design correction" section
  shape** when appending the appendix to `67-CONTEXT.md`. The block
  is self-contained, names the original decisions it supersedes, and
  cross-references the design-of-record. Copying this shape keeps
  the audit trail of the redesign legible.

- **Use the existing `STATE.md` Milestone History entry shape**
  (### v1.X — <Name> / Completed: / Phases: / Key achievements:).
  Adding fields not present in the v1.3/v1.4 entries creates drift
  in the milestone log.

## Common Pitfalls

Six failure modes specific to "metadata-only" phases. Each has been
seen in past projects (this one included):

### P1 — Inventing hardware measurements
Backfill VERIFICATION docs must cite, not fabricate. The 12.35ms
back-button number in `58-VERIFICATION.md` is real in-process data,
and any backfill doc that adds new ms numbers without measurement
violates the verify-don't-fabricate rule. **Mitigation:** every
VERIFICATION.md that 70 produces must trace each "✓" row to an
existing artifact (a SUMMARY, a UAT, a commit hash, a file path).
No new numbers.

### P2 — Half-updating the consistency set
The 70 plan touches 4-5 files. Updating STATE.md but not
ROADMAP.md (or vice versa) is the classic drift bug. The
`stale-uat-gap-metadata-can-misroute-next` solution (2026-05-20)
calls this out: any metadata change must update the whole
project-state surface together. **Mitigation:** Task 4 explicitly
groups the consistency set in one step with a checklist.

### P3 — Rewriting 67-CONTEXT.md instead of annotating
67-CONTEXT.md is the discussion-of-record. The 67-02 gap closure
invalidated D-01..D-08 but those decisions are real history — a
future audit needs to see what the team originally considered
before the user redesign. **Mitigation:** D-03 in CONTEXT.md
specifies *add a `<correction>` section, don't edit D-01..D-08*.

### P4 — Bumping PROJECT.md "Latest Shipped" before STATE.md
PROJECT.md line 26 is the visible banner; STATE.md Milestone
History is the canonical log. If PROJECT.md is updated and STATE.md
isn't, a future scan will find the new milestone in one place but
not the other. **Mitigation:** update both in the same commit, and
verify the new v1.6 entry exists in STATE.md before committing
PROJECT.md.

### P5 — Marking ROADMAP reqs as "satisfied" with no evidence path
The Coverage Validation table is downstream-consumed by audits.
A row marked `satisfied` without a `(ver: <path>)` reference is
worse than `pending`, because it asserts satisfaction that no one
can later verify. **Mitigation:** the 12 req rows to be marked
satisfied already have VERIFICATION.md evidence paths from 69.
Copy the existing `(ver: 69-VERIFICATION)` style.

### P6 — Writing 59-01/02/GC3 from training data instead of git
The three missing Phase 59 summaries are easy to hallucinate —
the work was real, but a 1-month gap means the agent will fill
gaps from "what usually happens in this kind of plan." **Mitigation:**
the executor must derive each summary from `59-NN-PLAN.md` +
`git log --oneline 59-NN..<next-plan>` only. No narrative that
isn't traceable to a file or commit.

## Existing Patterns in This Codebase

Patterns to mirror when writing the 70 deliverables:

- **`69-VERIFICATION.md` 8-section template** — frontmatter (status
  + source list + started/updated timestamps) + ROADMAP criteria
  table + VERIFY-02 sub-criteria + Test Results + Hardware caveat
  + Open Gaps + Pre-existing baseline + Summary. Reuse verbatim.

- **`59-GC1/GC2/GC4/GC5-SUMMARY.md` format** — `**Completed:**
  YYYY-MM-DD` heading + `## What was built` + `## Key files` +
  `## Decisions made` + `## Notes for downstream`. Mirror for the
  three new Phase 59 summaries.

- **`67-01-SUMMARY.md` "Design correction" appendix** — a 14-line
  self-contained block at the bottom of the file that:
  1. Names the original design (keyCount-aware positions 0/n-3/n-2/n-1)
  2. Names the corrected design (fixed 0/1/2/4)
  3. Names the design-of-record (`67-02-SUMMARY.md`)
  4. Marks which CONTEXT.md decisions are SUPERSEDED
  5. States which prior work is unaffected (the IconLabelSurface /
     Label primitive work is the durable artifact)
  Copy this shape for the `<correction>` block at the end of
  `67-CONTEXT.md`.

- **`STATE.md` Milestone History entries** — heading
  `### v1.X — <Name>` + 3-line metadata (Completed / Phases /
  Key achievements). The v1.3 and v1.4 entries are 8-12 lines total
  with bullets. Match the bullet density for v1.5 and v1.6.

- **`ROADMAP.md` Coverage Validation table** — three columns
  (Requirement / Phase / Status) where Status is `satisfied (ver:
  <path>)`, `unverified`, `redefined`, `not started`, or
  `pending-gap-closure`. The 12 rows to be marked satisfied already
  have evidence in 69-VERIFICATION.

## Recommended Approach

**Single plan, 5 tasks, autonomous Wave 1.** No checkpoint, no UAT
(this is metadata — the deliverable is the docs themselves, and
review of the docs is a `git diff` away).

**Task shape (1:1 with CONTEXT.md D-01..D-05):**

1. **Task 1: Aggregate 61/62/66 verification** — write
   `70-VERIFICATION.md` following the 69 template. For each of
   phases 61, 62, 66, cite the existing SUMMARY/UAT/COMMIT evidence
   and the 69-VERIFICATION aggregation. Mark status: passed.

2. **Task 2: Backfill 3 missing Phase 59 summaries** — write
   `59-01-SUMMARY.md`, `59-02-SUMMARY.md`, `59-GC3-SUMMARY.md` from
   the existing PLAN.md + `git log --oneline <range>`. No narrative
   that isn't traceable to file or commit. Match the
   59-GC1/GC2/GC4/GC5 format exactly.

3. **Task 3: Append design-correction appendix to 67-CONTEXT.md** —
   new `<correction>` section after the existing `<deferred>`
   block. Mark D-01/D-02/D-03/D-08 as **SUPERSEDED by 67-02**.
   Cross-reference `67-02-SUMMARY.md` as the design-of-record.
   Do not edit the original D-01..D-08 block.

4. **Task 4: Realign REQUIREMENTS.md SETTINGS-06** — change the
   SETTINGS-06 row from "Position n-1 ... logo+version" to
   "Position 4 ... logo+version, rendered with no border or
   background". Add a "Note: 2026-06-15 realignment after 67-02
   gap closure" comment line preserving the original wording
   above.

5. **Task 5: Project metadata bump** — three coordinated
   sub-edits:
   - `PROJECT.md` line 26: `v1.5 — Addons & UX Polish II`
     → `v1.6 — UX Speed & Overlay Extensions`. Update the
     "Completed" date to 2026-06-15 and the "Phases" count to
     10 (57-62, 66-70).
   - `STATE.md` Milestone History: add v1.5 (2026-06-07) and
     v1.6 (2026-06-15) entries. v1.5 should be a one-line
     backfill (it was archived before Milestone History existed);
     v1.6 should be a full entry naming all 10 phases, calling
     out the 4 gap-closure phases, and referencing the
     v1.6-MILESTONE-AUDIT.md.
   - `ROADMAP.md` Coverage Validation table: mark 12 reqs
     satisfied (RES-01..03, PERF-01..03, EMO-15..17, PAG-02,
     PAG-03, ICON-01, ACTIVEAPP-08). Add `(ver: 69-VERIFICATION)`
     evidence path. Keep the 4 unverified-for-backfill /
     2 met-by-66 / 3 not-started entries for audit visibility.

**Total files modified:** 7 (70-VERIFICATION.md, 59-01/02/GC3-SUMMARY.md,
67-CONTEXT.md, REQUIREMENTS.md, PROJECT.md, STATE.md, ROADMAP.md).

**Total commits:** 2 (one for the backfill work — 70-VERIFICATION +
3 missing summaries + 67 appendix + REQUIREMENTS realignment; one
for the metadata bump — PROJECT + STATE + ROADMAP). Both should
be atomic.

**Verification:** after the metadata bump, `git diff` should show
only the expected rows changed in each file. If PROJECT.md is
updated and STATE.md doesn't have the v1.6 entry, the
`stale-uat-gap-metadata` prior-art solution applies — fail fast,
don't ship.

## Open Research Questions

None. All evidence files for 61/62/66 and 59-01/02/GC3 already
exist on disk and have been inventoried in the discuss-phase
scouting. The 5 areas were discussed and decisions D-01..D-05
captured in `70-CONTEXT.md` and `70-DISCUSSION-LOG.md`.
