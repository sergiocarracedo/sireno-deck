# Phase 69 — v1.6 verification sweep — Research

[VERIFIED: source] = evidence inspected directly in this repo.
[ASSUMED] = reasonable inference from context, not yet inspected.
[CITED: url] = external source (none used in this phase — pure aggregation).

## Don't Hand-Roll

A verification document is a record, not an essay. The repo already has 4 well-formed VERIFICATION.md examples to model from:

- [VERIFIED] **`56-VERIFICATION.md`** (Phase 56, v1.5 verification sweep) — direct precedent. Same shape as Phase 69: aggregates evidence from N earlier phases into a single doc that traces every ROADMAP success criterion to a test or artifact. Two-table layout (ROADMAP criteria table + sub-requirement table), plus Test Results, plus a Summary score.
- [VERIFIED] **`58-VERIFICATION.md`** (Phase 58, performance) — narrative + table hybrid. Includes a "Hardware caveat" section that explicitly documents where in-process measurements under-count real-world latency. Phase 69 needs the same caveat shape for PERF-01 (back button <200ms).
- [VERIFIED] **`59-VERIFICATION.md`** (Phase 59, emoji) — 88 lines, requirements traceability table at top, plan must-haves in middle, verification commands at bottom. This is the per-phase format we aggregate *from*, not the format Phase 69 itself uses.
- [VERIFIED] **`68-VERIFICATION.md`** (Phase 68, chrome deck) — 57 lines, must_haves check + artifact check + requirement traceability + Verdict. Compact and modern.

The aggregation pattern is established (Phase 56). The per-phase format that we're aggregating *from* is well-formed (57, 58, 59, 60, 68 all have VERIFICATION.md). The work is: read the in-scope phase artifacts, build one Phase-56-style evidence table per ROADMAP success criterion, write the document.

**Don't** build new evidence (run new tests, re-profile, re-UAT) — that's the phase that owns the work's job, not the verification phase's job. Phase 69 only cites what's already on disk.

**Don't** hand-write a narrative essay. The 8 ROADMAP success criteria each become a table section. Tables are auditable; narrative is not.

**Don't** fabricate a real-hardware back-button number. The in-process number from Phase 58 is honest about its scope; the verification doc should cite it with a documented caveat, not chase a benchmark that doesn't exist.

## Common Pitfalls

- **P1. Treating VERIFICATION.md as the source of truth, not the UAT file.** The 67-UAT and 68-UAT files are the user-observable proof; the VERIFICATION.md cites them. If the UAT passes but the VERIFICATION.md is missing, /next may misroute. (See `solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md` — applies to Phase 70's backfill scope, not Phase 69's aggregation scope, but the lesson is: UAT + VERIFICATION + STATE + AGENTS are one consistency set.)
- **P2. Citing non-existent VERIFICATION.md files.** 61 (icon updates) and 62 (overlay autoShow) shipped without a `*-VERIFICATION.md`. For these phases, cite the `*-SUMMARY.md` (which exists) and the UAT record (if any) as evidence. Flag the missing VERIFICATION.md as a known gap that Phase 70 backfills.
- **P3. Re-running the full test suite to "verify" Phase 69.** Phase 69 is documentation; running tests doesn't make the doc truer. Run only the targeted suites that prove the in-scope phases still pass on `main` (e.g., `cd packages/cli && pnpm vitest run src/builtin-addons/internal-settings/ src/config/loader.test.ts src/builtin-addons/emoji-selector/`). Cite the pre-existing 47-failure baseline and 982-TS-error baseline explicitly so a reader doesn't mistake them for regressions.
- **P4. Mixing "verification" with "review."** Phase 69 verifies that v1.6 features work. It does NOT review code quality, propose refactors, or gate the ship. Those are `/review` and `/secure-phase` workflows, separate from this phase. If the verification doc finds a code issue, capture it in the "Open Gaps" section and link to where the gap-closure phase handles it (Phase 70), not in the verification table.
- **P5. Forgetting to update STATE.md and AGENTS.md.** Per the stale-uat-gap solution, all 4 artifacts (UAT, VERIFICATION, STATE, AGENTS) need to land in the same commit set. If 69-VERIFICATION.md lands without STATE.md saying "Phase 69 executed," /next will misroute to plan-phase 69.
- **P6. Claiming "back button <200ms on hardware" without a real-hardware measurement.** Phase 58 measured in-process only. The in-process number (12.35ms avg, 2.39ms same-html-skip) is well under 200ms; on real hardware you'd add 30-100ms IPC + <50ms USB write. Even with that overhead, the fix path (skip-when-unchanged) eliminates the screenshot call entirely for the common case, putting it well under target. Phase 69 cites the in-process number with explicit caveat, not as a "hardware-verified" claim.

## Existing Patterns in This Codebase

- [VERIFIED] **Phase 56 ROADMAP criteria table** is the direct template. Section title: "## ROADMAP.md Success Criteria" with a 4-column table (Criterion | Status | Evidence | Plan). Then a "## VERIFY-01 Requirement Coverage" sub-criterion table with the same shape but 4-column (Sub-criterion | Status | Evidence | Coverage Plan). Then "## Test Results" with per-plan outcomes. Then "## Summary" with a score.
- [VERIFIED] **Phase 58 hardware caveat** is the template for the back-button <200ms section. Section title: "## Hardware caveat" — explicitly documents where in-process numbers under-count real-world latency. Cite the in-process number, then explain the IPC + USB gap, then state the conservative conclusion.
- [VERIFIED] **Per-phase SUMMARY.md files** are the primary evidence source. 67-01-SUMMARY + 67-02-SUMMARY + 68-01-SUMMARY each capture decisions, key files, and notes for downstream — that's the unit of evidence Phase 69 aggregates from.
- [VERIFIED] **UAT.md files** capture real-hardware evidence with status: passed verdict. 67-UAT and 68-UAT are the user-observable proof that v1.6 features actually work on the device.
- [VERIFIED] **Pre-existing baseline** (47 runtime.test.ts failures, 982 TS errors, 18 oxlint warnings) is part of the verification record. Cite it in a "Pre-existing baseline" section so a reader doesn't flag it as a regression.
- [VERIFIED] **Solutions prior art** at `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md` — relevant for the consistency set. Phase 69's 4 artifacts (VERIFICATION, STATE, AGENTS, plus per-phase UAT files) need to land together.

## Recommended Approach

**Plan shape:** Single plan (`69-01-PLAN.md`), ~5 tasks, autonomous, Wave 1. No new code. Pure documentation aggregation.

**Tasks (recommended):**
1. Read all 7 in-scope phase artifacts (58-VERIFICATION, 59-VERIFICATION, 60-VERIFICATION, 61-01-SUMMARY, 62-01-SUMMARY, 67-01-SUMMARY + 67-02-SUMMARY, 68-01-SUMMARY, 67-UAT, 68-UAT).
2. Run the targeted test sweep that proves in-scope phase tests still pass on `main` (`cd packages/cli && pnpm vitest run src/builtin-addons/internal-settings/ src/config/loader.test.ts src/builtin-addons/emoji-selector/ src/deck/__tests__/internal-settings-deck.test.ts`).
3. Write `69-VERIFICATION.md` using Phase 56's two-table structure (ROADMAP criteria + sub-requirement) with Phase 58's hardware caveat shape for the back-button section.
4. Update `STATE.md` (Phase 69 EXECUTED → VERIFIED), `ROADMAP.md` (Phase 69 status: ✓ Verified, success criteria checked), `AGENTS.md` (current phase block).
5. Targeted test sweep + lint to confirm no new regressions in the doc changes.

**Format decisions (locked from CONTEXT.md D-02):**
- Phase 56-style table format (one table per ROADMAP success criterion).
- Frontmatter with `status: passed`, `verified: <date>`, `phase: 69`, `source:` list.
- Sections: ROADMAP criteria, requirement coverage, test results, hardware caveats, pre-existing baseline, summary score.
- "Open Gaps" section captures the 3 missing per-phase VERIFICATION.md files (61, 62, 67) — deferred to Phase 70.

**What NOT to do:**
- Don't write a `69-RESEARCH.md` section in the VERIFICATION doc — research is in this file, the doc is the verification record.
- Don't include the 3 missing 59 SUMMARY files (59-01, 59-02, 59-GC3) as a gap — those are summary files, not VERIFICATION files, and they're a different concern (Phase 70 territory, not VERIFY-02).
- Don't run the full test suite. Targeted suites are enough; the full suite is dominated by pre-existing baseline noise.
- Don't propose code refactors. The doc verifies, it doesn't review.
