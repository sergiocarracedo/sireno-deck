---
phase: 5
phase_name: Addon System
extracted: 2026-05-13
plan_count: 8
summary_count: 8
missing_artifacts:
  - 05-SECURITY.md
---

# Phase 5: Addon System — Learnings

## Decisions

### D1: Make the core a generic addon host
**What:** Phase 5 moved button behavior behind addon-owned stateful instances and made the runtime/config path registry-driven instead of feature-specific.
**Why:** This let bundled and external addons share one contract for schemas, rendering, scheduling, navigation, and lifecycle without keeping special-case button logic in core.
**Source:** `.planning/phases/05-addon-system/05-01-PLAN.md`, `.planning/phases/05-addon-system/05-01-SUMMARY.md`, `.planning/STATE.md`

### D2: Treat addon `apiVersion` mismatch as fatal, but broken addons as warnings
**What:** The loader/startup contract rejects incompatible addon API versions outright while isolating broken manifests/imports as warning-only failures.
**Why:** Version mismatches invalidate the core/addon contract itself, while a broken sibling addon should not take down healthy addons or the rest of startup.
**Source:** `.planning/phases/05-addon-system/05-02-PLAN.md`, `.planning/phases/05-addon-system/05-02-SUMMARY.md`

### D3: Keep asset and deck registration in the same addon path as buttons
**What:** Assets and custom deck types were added to the same addon registry/loader flow rather than inventing a separate extension mechanism.
**Why:** One registry-backed path keeps config validation, asset resolution, deck expansion, and runtime hosting aligned instead of splitting the extension model across multiple subsystems.
**Source:** `.planning/phases/05-addon-system/05-03-PLAN.md`, `.planning/phases/05-addon-system/05-03-SUMMARY.md`

### D4: Prefer truthful examples over fake demos in shipped config
**What:** The shipped local/npm addon examples were changed to disabled illustrative declarations, and later the repo gained committed Phase 5 verification fixtures under `packages/cli/fixtures/phase-5/`.
**Why:** A sample config is part of the product surface. If examples claim working addons that do not exist, UAT fails for the wrong reason and teaches the wrong contract.
**Source:** `.planning/phases/05-addon-system/05-04-SUMMARY.md`, `.planning/phases/05-addon-system/05-06-SUMMARY.md`, `.planning/STATE.md`, `.planning/phases/05-addon-system/05-VERIFICATION.md`

### D5: Restore image-backed emoji tiles instead of normalizing to text aliases
**What:** The temporary deterministic ASCII-safe emoji strategy was replaced with bundled per-emoji SVG assets for the shipped emoji set, while keeping an explicit text fallback only for unsupported values.
**Why:** The text alias strategy was testable, but it changed the product contract from “emoji visuals” to “labels/codepoints.” Hardware UAT made it clear that the right product decision was image-backed emoji tiles.
**Source:** `.planning/phases/05-addon-system/05-05-SUMMARY.md`, `.planning/phases/05-addon-system/05-08-SUMMARY.md`, `.planning/phases/05-addon-system/05-UAT.md`

## Lessons

### L1: Green tests do not beat hardware truth
**What happened:** The first gap-closure pass had passing tests, but hardware UAT still found missing icons and unacceptable emoji visuals.
**Why it matters:** Rendering work that targets a physical device needs verification against the real output, not just unit-level buffer differences. “Looks testable” is not the same as “looks correct on-device.”
**Source:** `.planning/phases/05-addon-system/05-UAT.md`, `.planning/phases/05-addon-system/05-VERIFICATION.md`

### L2: Stronger tests often expose the real missing fix
**What happened:** When the renderer test was tightened to inspect icon-region pixels instead of whole-buffer drift, it exposed that `text-image.ts` still needed an SVG composition fix in addition to asset redraws.
**Why it matters:** Weak tests let the code satisfy the letter of a change while missing the visual behavior users actually care about. Better assertions can reveal the true root cause mid-execution.
**Source:** `.planning/phases/05-addon-system/05-07-SUMMARY.md`

### L3: UAT confusion can come from contract ambiguity, not runtime bugs
**What happened:** The “broken addon warning isolation” failure came from testing disabled addon entries and expecting enabled-addon warning behavior.
**Why it matters:** Sometimes the right fix is not code behavior but making the contract obvious in docs/examples/tests so humans stop testing the wrong thing.
**Source:** `.planning/phases/05-addon-system/05-UAT.md`, `.planning/phases/05-addon-system/05-06-SUMMARY.md`

### L4: Phased tracer bullets worked, but visual gap closure needed a second loop
**What happened:** The initial three Phase 5 plans got the addon architecture shipped quickly, but rendering gaps only became obvious after real hardware UAT.
**Why it matters:** Tracer bullets are good for landing architecture early, but UI/visual behavior often needs a deliberate second pass once the end-to-end path is real.
**Source:** `.planning/phases/05-addon-system/05-01-SUMMARY.md`, `.planning/phases/05-addon-system/05-03-SUMMARY.md`, `.planning/phases/05-addon-system/05-UAT.md`

## Patterns

### P1: Bootstrap-first validation for extensible config
**When to use:** Use a bootstrap parse before full schema validation whenever config needs to discover plugins/addons that define part of the final schema.
**Source:** `.planning/phases/05-addon-system/05-01-SUMMARY.md`, `.planning/phases/05-addon-system/05-02-SUMMARY.md`

### P2: One registry path for bundled and external extensions
**When to use:** Use one registration/lookup path for built-ins and third-party extensions whenever you want tests, runtime behavior, and docs to converge on the same contract.
**Source:** `.planning/phases/05-addon-system/05-02-SUMMARY.md`, `.planning/phases/05-addon-system/05-03-SUMMARY.md`

### P3: Truthful shipped examples plus dedicated verification fixtures
**When to use:** Keep default examples conservative and documentation-oriented, then add explicit fixtures for manual verification scenarios that need broken/healthy/fatal setups.
**Source:** `.planning/phases/05-addon-system/05-04-SUMMARY.md`, `.planning/phases/05-addon-system/05-06-SUMMARY.md`, `.planning/STATE.md`

### P4: Assert the visual region, not just buffer inequality
**When to use:** For rendering tests, compare the specific pixel region that should change instead of relying on the whole image buffer being different.
**Source:** `.planning/phases/05-addon-system/05-07-SUMMARY.md`

### P5: Use explicit fallback paths for unsupported extension data
**When to use:** When supporting a known built-in asset set but allowing user-configured values outside that set, keep one intentional fallback path rather than failing generation or pretending full support exists.
**Source:** `.planning/phases/05-addon-system/05-08-SUMMARY.md`

## Surprises

### S1: The first “fix” for emoji rendering solved testability but broke product intent
**What was surprising:** The deterministic ASCII-safe emoji strategy was technically clean and testable, yet it still counted as a regression because the user expectation was image-backed emoji tiles, not readable aliases.
**Impact:** Phase 5 needed an additional plan to restore real emoji visuals and treat text as fallback only.
**Source:** `.planning/phases/05-addon-system/05-05-SUMMARY.md`, `.planning/phases/05-addon-system/05-UAT.md`, `.planning/phases/05-addon-system/05-08-SUMMARY.md`

### S2: Bundled SVG assets and renderer assumptions drifted independently
**What was surprising:** The code path for `addon://` assets worked, but the shipped asset files were authored like full cards while the renderer expected compact glyph icons.
**Impact:** The system could be “correct” by type/path resolution and still fail visually, which forced a contract realignment across assets, renderer, and tests.
**Source:** `.planning/phases/05-addon-system/05-UAT.md`, `.planning/phases/05-addon-system/05-07-SUMMARY.md`

### S3: Verification support itself became part of the deliverable
**What was surprising:** Manual verification was hard enough that the repo needed a committed `packages/cli/fixtures/phase-5/` fixture set to make re-verification reliable.
**Impact:** Phase completion ended up depending not just on code fixes, but on codifying reproducible verification setups inside the repository.
**Source:** `.planning/STATE.md`, `.planning/phases/05-addon-system/05-VERIFICATION.md`

---

*Extracted from Phase 5 artifacts on 2026-05-13*
