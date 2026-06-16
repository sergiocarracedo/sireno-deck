---
phase: 70
created: 2026-06-15
workflow: discuss-phase
status: Captured
---

# Phase 70 Discussion Log

Audit trail for `discuss-phase 70`. Captures all options considered
across the 5 gray areas, the user's verbatim choices, and the
recommendations accepted as decisions.

## Carrying forward

- **From Phase 67 (67-02 design correction):** the user rejected the
  n-aware design mid-UAT and demanded fixed positions {0, 1, 2, 4}.
  The shipped code matches the fixed positions, not the original
  D-01..D-08 decisions. This is the root cause of two of the six gaps
  Phase 70 must close (67-CONTEXT.md invalidation, REQUIREMENTS.md
  SETTINGS-06 wording).
- **From Phase 69 (verification sweep):** 70-VERIFICATION.md should
  mirror `69-VERIFICATION.md` 8-section template. Do not invent
  hardware measurements.

---

## Gray Area 1: 61/62/66 VERIFICATION.md shape

**Options considered:**

A. **Three per-phase `*-VERIFICATION.md` files.** Write
   `61-VERIFICATION.md`, `62-VERIFICATION.md`, `66-VERIFICATION.md`
   each ~150 lines. Pro: matches the established per-phase pattern
   (57, 58, 59, 60 all have one). Con: requires fabricating hardware
   evidence for the three phases, which is a maintainability trap
   (the next audit will catch the fabricated numbers).

B. **Single 70-VERIFICATION.md aggregation (Recommended).** One
   `70-VERIFICATION.md` citing the existing 61-01/62-01/66-01/66-02
   SUMMARY files, the 66-UAT 9/9 pass, and the 68-VERIFICATION
   evidence as cross-phase evidence for 66. Pro: matches Phase 69's
   aggregation pattern, no fabrication. Con: future audit
   tooling that expects per-phase VERIFICATION.md will need to know
   about the aggregation doc.

**User choice:** "all clear" → recommendation accepted.
**Decision:** D-01 — single 70-VERIFICATION.md aggregation.

---

## Gray Area 2: Phase 59 missing summaries (59-01, 59-02, 59-GC3)

**Options considered:**

A. **Write the 3 missing SUMMARY files from plan + git history
   (Recommended).** Use `59-01-PLAN.md`, `59-02-PLAN.md`,
   `59-GC3-PLAN.md` and `git log --oneline <range>` to draft
   decisions, key files, notes. Pro: completes the workflow
   contract; the next audit can see a full plan/summary matrix for
   Phase 59. Con: 30 min of writing.

B. **Document the absence in 70-VERIFICATION and accept the
   incomplete.** Pro: faster. Con: locks in the v1.6
   half-finishedness; future audits will keep flagging it.

**User choice:** "all clear" → recommendation accepted.
**Decision:** D-02 — write the 3 missing SUMMARY files.

---

## Gray Area 3: 67-CONTEXT.md D-01..D-08 invalidation

**Options considered:**

A. **Add a "Design correction (67-02)" appendix preserving D-01..D-08
   as historical (Recommended).** Append a `<correction>` section at
   the end of 67-CONTEXT.md that records the user-driven redesign
   verbatim and marks D-01, D-02, D-03, D-08 as **invalidated by
   67-02**. Pro: the original discussion-of-record is preserved for
   audit (downstream agents reading 67-CONTEXT.md will see both the
   original decisions and the correction). Con: a future reader
   could be confused by the contradiction unless the correction
   section is clear.

B. **Rewrite D-01..D-08 to match shipped code.** Pro: clean reading.
   Con: destroys the audit trail of the original discussion; the
   gap-closure pattern (user-driven redesign mid-UAT) becomes
   invisible to future readers.

**User choice:** "all clear" → recommendation accepted.
**Decision:** D-03 — appendix, do not rewrite.

---

## Gray Area 4: REQUIREMENTS.md SETTINGS-06 wording

**Options considered:**

A. **Update to match shipped fixed-position design (Recommended).**
   Change "Position n-1 (the last button) shows the project logo +
   version" to "Position 4 shows the project logo + version,
   rendered with no border or background". Add a "Note: 2026-06-15
   realignment after 67-02 gap closure" comment line preserving the
   original requirement as historical context. Pro: future
   requirements audits read clean. Con: minor risk of losing the
   "why" of the original requirement.

B. **Leave stale + document in 70-VERIFICATION.** Pro: zero
   requirements-text risk. Con: stale reqs are a maintenance trap;
   the next audit will keep flagging the divergence.

**User choice:** "all clear" → recommendation accepted.
**Decision:** D-04 — update, preserve original as historical comment.

---

## Gray Area 5: PROJECT.md + Milestone History

**Options considered:**

A. **Full bump: PROJECT.md v1.5→v1.6, STATE.md v1.5+v1.6 history
   entries, ROADMAP.md Coverage Validation 12 reqs marked
   satisfied (Recommended).** Pro: completes the v1.6 ship; the
   next /complete-milestone run will pass the consistency check.
   Con: three coordinated edits must land together to avoid
   mid-state drift.

B. **Bump only PROJECT.md and leave ROADMAP.md Coverage Validation
   untouched.** Pro: less risk. Con: leaves the audit and reality
   in the same divergent state; future /complete-milestone calls
   will still fail.

**User choice:** "all clear" → recommendation accepted.
**Decision:** D-05 — full bump.

---

## Deferred Ideas

- **v1.7 candidate:** "consistency audit" workflow that compares
  PROJECT.md "Latest Shipped" against STATE.md Milestone History
  and ROADMAP.md Coverage Validation on every phase close. The
  drift that Phase 70 fixes is exactly the bug this would catch.
- **v1.7 candidate / quick task 045:** v1.6 milestone summary in
  CHANGELOG.md ("v1.6.0 — UX Speed & Overlay Extensions, 21
  requirements, 10 phases including 4 gap-closure phases").

Both noted in CONTEXT.md `<deferred>` section.

---

## Agent's Discretion (caller's call)

- Bump "Last updated" date at the bottom of `ROADMAP.md` to
  2026-06-15 (cosmetic).
- Section ordering inside `70-VERIFICATION.md` (mirror
  `69-VERIFICATION.md` or re-order for the multi-phase aggregation
  case).
- v1.5 Milestone History entry: full re-statement vs one-line
  backfill (recommend one-line, since v1.5 was archived before
  Milestone History existed).
