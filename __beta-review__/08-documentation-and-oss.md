# 08 — Documentation & OSS Impression

Scope: README/ARCHITECTURE/AGENTS/MIGRATION-NOTES drift, missing files, OSS-impression lens.

## Missing files (P0 from OSS perspective)

- `LICENSE` — absent at root. Cannot ship without one.
- `CONTRIBUTING.md` — no contribution workflow.
- `CODE_OF_CONDUCT.md` — no conduct guidelines.
- `SECURITY.md` — no disclosure policy.
- `docs/STATE.md` — referenced by `AGENTS.md` but absent.
- `.github/ISSUE_TEMPLATE/` — no issue templates.
- `.github/PULL_REQUEST_TEMPLATE.md` — no PR template.
- `CHANGELOG.md` — no changelog.
- `CODEOWNERS` — no ownership file.

## Findings

### [08-documentation-and-oss #1] [P0] No `LICENSE` at repository root
**Evidence:** File does not exist.
**Impact:** Cannot ship OSS; copyright is unclear; npm/pnpm publish fails.
**Effort:** S
**Fix sketch:** Add MIT (or chosen) LICENSE.
**OSS-impression:** First file an OSS reviewer looks for.

### [08-documentation-and-oss #2] [P0] `README.md` references wrong package name
**Evidence:** `pnpm --filter sireno-deck` is used; actual workspace name is `sirenodeck`.
**Impact:** First command a user runs fails.
**Effort:** S
**Fix sketch:** Sweep; replace `sireno-deck` with `sirenodeck` in all user-facing docs.
**OSS-impression:** Copy-paste from a fork.

### [08-documentation-and-oss #3] [P0] `README.md` button-type examples are obsolete
**Evidence:** README shows `core:time`, `core:date`, `core:weather`, `core:system-status`; actual names are `date-time:time`, `weather:weather`, `system-status:system-status`.
**Impact:** Users copy broken examples.
**Effort:** M
**Fix sketch:** Sweep; align with current namespaces.
**OSS-impression:** First impression: stale docs.

### [08-documentation-and-oss #4] [P0] `README.md` mentions a production build path that doesn't exist
**Evidence:** README refers to bundled CLI; `pnpm build` is a no-op.
**Impact:** User expectation mismatch.
**Effort:** M
**Fix sketch:** Either build the CLI and update README or document `pnpm dev` as the install path.
**OSS-impression:** README is aspirational.

### [08-documentation-and-oss #5] [P0] `README.md` links to non-existent paths
**Evidence:** `packages/cli/src/builtin-addons/media-player/README.md`, `../../os-providers/README.md`.
**Impact:** 404 links.
**Effort:** S
**Fix sketch:** Fix or remove links.
**OSS-impression:** Broken cross-references.

### [08-documentation-and-oss #6] [P1] `ARCHITECTURE.md` references missing §8
**Evidence:** "Read top-to-bottom on first contact. Section 8 is the working plan" — §8 is absent.
**Impact:** Confusing for new contributors.
**Effort:** M
**Fix sketch:** Either add §8 or remove the reference.
**OSS-impression:** Incomplete doc.

### [08-documentation-and-oss #7] [P1] `ARCHITECTURE.md` contradictory gesture constants
**Evidence:** `:175` says 500ms; `:418` says 200ms; source uses 200ms.
**Impact:** Reviewers confused.
**Effort:** S
**Fix sketch:** Pick 200ms; remove the 500ms reference.
**OSS-impression:** Doc drift.

### [08-documentation-and-oss #8] [P1] `ARCHITECTURE.md` says no React Router, but `frontend/App.tsx` uses it
**Evidence:** `packages/cli/frontend/src/App.tsx`; `react-router-dom` installed.
**Impact:** Contradicts code.
**Effort:** S
**Fix sketch:** Update ARCHITECTURE to describe BrowserRouter.
**OSS-impression:** Wrong architecture summary.

### [08-documentation-and-oss #9] [P1] `ARCHITECTURE.md` describes wrong paths
**Evidence:** Says `builtin-addons/` at root, `addons/` at root; actual is `packages/cli/src/builtin-addons/`.
**Impact:** Path references broken.
**Effort:** M
**Fix sketch:** Re-align with current tree.
**OSS-impression:** Out-of-date architecture.

### [08-documentation-and-oss #10] [P1] `ARCHITECTURE.md` says each package has `__mocks__/` — only frontend does
**Evidence:** Mocks only under `frontend/src/__mocks__/`.
**Impact:** Document lies.
**Effort:** S
**Fix sketch:** Update or remove.
**OSS-impression:** Doc drift.

### [08-documentation-and-oss #11] [P1] `AGENTS.md` references missing `docs/STATE.md`
**Evidence:** File doesn't exist.
**Impact:** Cross-reference broken.
**Effort:** S
**Fix sketch:** Either create `docs/STATE.md` (link to `docs/solutions/`) or remove the reference.
**OSS-impression:** Broken cross-reference.

### [08-documentation-and-oss #12] [P1] `AGENTS.md` says "No `.refine()`" but `.refine()` is used
**Evidence:** `packages/cli/src/config/schemas.ts` and addon config schemas.
**Impact:** Instruction wrong.
**Effort:** S
**Fix sketch:** Remove the rule or align with reality.
**OSS-impression:** Wrong instruction.

### [08-documentation-and-oss #13] [P1] `AGENTS.md` says no default exports but they exist widely
**Evidence:** Addon code, test files, several components.
**Impact:** Inconsistent rule.
**Effort:** S
**Fix sketch:** Either enforce (oxlint rule) or soften the rule.
**OSS-impression:** Rule vs reality.

### [08-documentation-and-oss #14] [P1] `MIGRATION-NOTES.md` is stale and documents failures that don't match current state
**Evidence:** Claims 79 failures in `runtime.test.ts`; current is 15.
**Impact:** Misleading.
**Effort:** S
**Fix sketch:** Update to reflect current state; mark as historical.
**OSS-impression:** Stale document.

### [08-documentation-and-oss #15] [P1] `MIGRATION-NOTES.md` describes React Router as future decision while it's already in use
**Evidence:** `frontend/App.tsx`.
**Impact:** Out of date.
**Effort:** S
**Fix sketch:** Move to ARCHITECTURE.md; mark history.
**OSS-impression:** Document drift.

### [08-documentation-and-oss #16] [P1] `MIGRATION-NOTES.md` contains "do not touch" issues that should be revalidated
**Evidence:** Notes section.
**Impact:** Carried-over constraints may no longer apply.
**Effort:** M
**Fix sketch:** Audit each; resolve or move to docs/solutions.
**OSS-impression:** Untouched concerns.

### [08-documentation-and-oss #17] [P1] `docs/plans/2026-07-24-text-xxs-autofit.md` refers to Vue emulator
**Evidence:** Plan text mentions Vue; project uses React.
**Impact:** Plan references wrong stack.
**Effort:** S
**Fix sketch:** Rewrite or mark superseded.
**OSS-impression:** Plan rot.

### [08-documentation-and-oss #18] [P1] `docs/plans/2026-07-24-extend-system-status-addon-with-missing-metrics.md` has malformed table
**Evidence:** Malformed row around `cpu-voltages`.
**Impact:** Hard to read.
**Effort:** S
**Fix sketch:** Fix the table.
**OSS-impression:** Doc quality.

### [08-documentation-and-oss #19] [P1] Both plans are still `Status: Draft` despite implementation in tree
**Evidence:** `docs/plans/2026-07-24-*.md`.
**Impact:** Reviewers confused about what's done.
**Effort:** S
**Fix sketch:** Mark complete or split into implementation records.
**OSS-impression:** Plan lifecycle.

### [08-documentation-and-oss #20] [P1] `docs/solutions/` lacks an index file
**Evidence:** `docs/solutions/{runtime-errors,conventions}/*.md` but no `README.md`.
**Impact:** Discoverability weak.
**Effort:** S
**Fix sketch:** Add `docs/solutions/README.md` linking each entry.
**OSS-impression:** Index missing.

### [08-documentation-and-oss #21] [P2] No contributor onboarding guide
**Evidence:** No `docs/contributing.md` or similar.
**Impact:** New contributors must read source.
**Effort:** M
**Fix sketch:** Reference AGENTS.md; describe test/lint/typecheck loop.
**OSS-impression:** Missing onboarding.

### [08-documentation-and-oss #22] [P2] No `CODE_OF_CONDUCT.md`
**Evidence:** File absent.
**Impact:** OSS community expectation not met.
**Effort:** S
**Fix sketch:** Adopt Contributor Covenant.
**OSS-impression:** Conduct missing.

### [08-documentation-and-oss #23] [P2] No `SECURITY.md`
**Evidence:** File absent.
**Impact:** No disclosure channel.
**Effort:** S
**Fix sketch:** Add SECURITY.md with supported versions + contact.
**OSS-impression:** Disclosure missing.

### [08-documentation-and-oss #24] [P2] No `.github/ISSUE_TEMPLATE/`
**Evidence:** Directory absent.
**Impact:** Issues filed without structure.
**Effort:** S
**Fix sketch:** Add bug-report.yml, feature-request.yml.
**OSS-impression:** Issue UX.

### [08-documentation-and-oss #25] [P2] No PR template
**Evidence:** `.github/PULL_REQUEST_TEMPLATE.md` absent.
**Impact:** PRs lack context.
**Effort:** S
**Fix sketch:** Add a brief checklist.
**OSS-impression:** PR UX.

### [08-documentation-and-oss #26] [P2] No `CODEOWNERS`
**Evidence:** File absent.
**Impact:** No automatic reviewers.
**Effort:** S
**Fix sketch:** Add per-area ownership.
**OSS-impression:** Ownership missing.

### [08-documentation-and-oss #27] [P2] `STRATEGY.md` lacks beta acceptance criteria
**Evidence:** `STRATEGY.md` describes strategy but no go/no-go for beta.
**Impact:** No definition of "ready."
**Effort:** M
**Fix sketch:** Add "Beta acceptance criteria" section.
**OSS-impression:** No definition of done.

### [08-documentation-and-oss #28] [P2] `STRATEGY.md` lacks supported OS matrix
**Evidence:** Strategy mentions Windows but service-manager doesn't support it.
**Impact:** Conflicting claims.
**Effort:** S
**Fix sketch:** Add "Supported OS" section; align with reality.
**OSS-impression:** Unsupported claim.

### [08-documentation-and-oss #29] [P2] `STRATEGY.md` lacks security model
**Evidence:** Strategy doesn't describe the local-trust model.
**Impact:** Reviewers will ask.
**Effort:** M
**Fix sketch:** Add "Security model" section referencing 04-security.
**OSS-impression:** Trust model missing.

### [08-documentation-and-oss #30] [P2] `STRATEGY.md` lacks release packaging story
**Evidence:** Strategy doesn't address binary distribution.
**Impact:** No install story.
**Effort:** M
**Fix sketch:** Document distribution channel.
**OSS-impression:** Install story missing.

### [08-documentation-and-oss #31] [P2] No public addon authoring guide
**Evidence:** No `docs/addon-authoring.md`.
**Impact:** External addon authors start from source.
**Effort:** M
**Fix sketch:** Write a guide referencing builtins as templates.
**OSS-impression:** Authoring missing.

### [08-documentation-and-oss #32] [P3] Commit hygiene not standardized
**Evidence:** Recent commits use varied message styles.
**Impact:** Hard to scan history.
**Effort:** M
**Fix sketch:** Adopt Conventional Commits; enforce via commitlint.
**OSS-impression:** History hygiene.

### [08-documentation-and-oss #33] [P3] No `.editorconfig`
**Evidence:** File absent.
**Impact:** Editor drift.
**Effort:** S
**Fix sketch:** Add standard config.
**OSS-impression:** Editor drift.

### [08-documentation-and-oss #34] [P3] No `.gitattributes`
**Evidence:** File absent.
**Impact:** Line endings, diff hygiene ungoverned.
**Effort:** S
**Fix sketch:** Add `* text=auto eol=lf`.
**OSS-impression:** Diff hygiene.

### [08-documentation-and-oss #35] [P3] No documented commit message format
**Evidence:** `AGENTS.md` doesn't describe commit conventions.
**Impact:** History noisy.
**Effort:** S
**Fix sketch:** Add a sentence; link to Conventional Commits.
**OSS-impression:** Convention missing.

### [08-documentation-and-oss #36] [P3] No "How to verify a beta build" doc
**Evidence:** Verification flow documented across AGENTS + this folder; no single canonical doc.
**Impact:** Reviewers must hunt.
**Effort:** M
**Fix sketch:** Write `docs/beta-verification.md` linking to AGENTS + checklist.
**OSS-impression:** Verification missing.

### [08-documentation-and-oss #37] [P3] No release notes template
**Evidence:** Repo lacks release notes format.
**Impact:** Releases ad-hoc.
**Effort:** S
**Fix sketch:** Adopt `release-please` config.
**OSS-impression:** Release process.

### [08-documentation-and-oss #38] [P4] Several doc typos
**Evidence:** `pannels`, `teh`, `recieve`, etc.
**Impact:** Minor.
**Effort:** S
**Fix sketch:** Run a spell-check pass.
**OSS-impression:** Polish.

### [08-documentation-and-oss #39] [P4] `MIGRATION-NOTES.md` has inconsistent dates
**Evidence:** 2026-07-13 header; updated mentions elsewhere.
**Impact:** Minor.
**Effort:** S
**Fix sketch:** Update or annotate as historical.
**OSS-impression:** Doc lifecycle.

### [08-documentation-and-oss #40] [P4] Mixed `snake_case` and `camelCase` in YAML examples across docs
**Evidence:** Most addon READMEs.
**Impact:** Confusing.
**Effort:** S
**Fix sketch:** Sweep.
**OSS-impression:** Convention drift.

### [08-documentation-and-oss #41] [P4] README missing quick-start for emulator mode
**Evidence:** `pnpm --emulator` flow under-documented.
**Impact:** Reviewers must read CLI source.
**Effort:** S
**Fix sketch:** Add quick-start.
**OSS-impression:** First-run UX.