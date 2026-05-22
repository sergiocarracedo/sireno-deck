---
phase: 18
phase_name: React DOM-Based Renderer With HTML/CSS Surface Support
extracted: 2026-05-22
plan_count: 4
summary_count: 4
missing_artifacts: 18-SECURITY.md
---

# Phase 18: React DOM-Based Renderer With HTML/CSS Surface Support — Learnings

## Decisions

### D1: Keep runtime ownership and isolate browser responsibilities
**What:** The phase kept navigation, invalidation, polling, activation, and key writes inside `runtime.ts` and the daemon start path, while the browser renderer only owned HTML capture, screenshot coalescing, and per-key cropping.
**Why:** That preserved the existing runtime model instead of smearing state ownership across runtime and browser code, which made the hard renderer switch smaller and easier to verify.
**Source:** `18-01-PLAN.md`, `18-01-SUMMARY.md`, `18-03-PLAN.md`, `18-03-SUMMARY.md`

### D2: Keep the old SVG-era seam as explicit legacy fallback instead of deleting it immediately
**What:** Phase 18 demoted `DeckButtonProps` / reconciler types to a legacy compatibility seam rather than ripping them out during the DOM rollout.
**Why:** Mixed decks and unmigrated surfaces still existed, so removing the seam early would have forced a fake “all migrated” story and broken the shipped compatibility path.
**Source:** `18-02-PLAN.md`, `18-02-SUMMARY.md`, `18-VERIFICATION.md`

### D3: Make `buttonFrame` the default DOM contract, with `full_surface` as the narrow opt-out
**What:** DOM-authored buttons are wrapped by a shared React `buttonFrame` unless they explicitly set `full_surface: true`.
**Why:** That created one clear default visual contract for migrated buttons while still preserving an honest escape hatch for bespoke full-surface rendering.
**Source:** `18-01-PLAN.md`, `18-01-SUMMARY.md`, `18-VERIFICATION.md`

### D4: Treat sampled media as bounded recapture, not continuous playback
**What:** Wave 4 added `sample_interval_ms` and browser recapture throttling for sampled media buttons instead of claiming GIF/video playback.
**Why:** That matched what the runtime/browser pipeline could actually guarantee on-device and kept the phase promise honest.
**Source:** `18-04-PLAN.md`, `18-04-SUMMARY.md`, `18-VERIFICATION.md`

## Lessons

### L1: Hard architectural switches still need an explicit fallback contract
**What happened:** The review surfaced that DOM-authored buttons broke mixed/legacy and browser-unavailable paths until fallback metadata and lazy browser startup were added during the ship cycle.
**Why it matters:** If a new primary render path ships before the fallback contract is made explicit, “compatibility” becomes wishful thinking and breaks at integration time rather than design time.
**Source:** `18-01-SUMMARY.md`, `18-02-SUMMARY.md`, `18-VERIFICATION.md`, shipped review fixes in `packages/cli/src/cli/commands/start.ts` and `packages/cli/src/addon/api.ts`

### L2: Workflow artifact drift is a real delivery risk, not just docs debt
**What happened:** `verify-work` initially failed even though the implementation was green because `ROADMAP.md`, `STATE.md`, and Phase 18 verification/UAT artifacts were stale or internally inconsistent.
**Why it matters:** In learnship, stale planning state can block workflow progression just as effectively as a broken test. Closing the code without closing the artifacts is not enough.
**Source:** `18-04-SUMMARY.md`, `18-UAT.md`, `18-VERIFICATION.md`, `.planning/STATE.md`

### L3: Real-device UAT was necessary to close the phase honestly
**What happened:** Automated tests covered the code path well, but Phase 18 still required manual device proof for browser-backed navigation, live invalidation, and sampled media before verification could pass.
**Why it matters:** Renderer work can look correct in unit tests while still failing the actual hardware/user experience path. The device path needs first-class closure artifacts.
**Source:** `18-UAT.md`, `18-VERIFICATION.md`

### L4: Broader repo regressions can surface late during ship even when phase-local tests are green
**What happened:** `/ship` exposed unrelated workspace test failures caused by stale fixture/import paths in older tests after the Phase 18 work was otherwise ready.
**Why it matters:** The full workspace suite remains the final truth. Phase-local verification is necessary but not sufficient for shipping safely.
**Source:** `.planning/STATE.md`, shipped fixes in `packages/cli/src/config/loader.test.ts`, `packages/cli/src/deck/runtime.test.ts`, `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`, `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`

## Patterns

### P1: Browser-backed renderer as a deck-level seam, not a per-button subsystem
**When to use:** When you want richer HTML/CSS rendering but the existing runtime already owns scheduling, navigation, and device writes. Keep the browser responsible for one active deck page, screenshot capture, and per-key cropping only.
**Source:** `18-01-SUMMARY.md`, `18-03-SUMMARY.md`

### P2: Full-deck rerender on live DOM invalidation to avoid mixed-generation surfaces
**When to use:** When a browser-backed surface is rendered as one composed deck image and individual buttons can change independently. Re-render the full DOM deck after invalidation instead of trying to patch only one key.
**Source:** `18-03-PLAN.md`, `18-03-SUMMARY.md`, `18-VERIFICATION.md`

### P3: Introduce a narrow fallback payload when migrating authoring contracts
**When to use:** When new runtime output cannot be consumed by the legacy pipeline directly, but the system still needs graceful fallback for mixed or degraded environments. Carry a minimal explicit fallback shape in the new contract.
**Source:** shipped Phase 18 review fixes in `packages/cli/src/addon/api.ts`, `packages/cli/src/cli/commands/start.ts`, `.planning/solutions/integration-issues/dom-renderer-fallback-must-stay-compatible-with-legacy-and-browserless-paths-2026-05-22.md`

### P4: Phase UAT docs should include per-fixture result fields, not just instructions
**When to use:** For any phase where manual UAT gates verification. Include fixture, result, observed notes, and summary counts so reruns update one durable artifact instead of relying on chat history.
**Source:** `18-UAT.md`

## Surprises

### S1: The fallback path broke exactly where the phase thought it was being cautious
**What was surprising:** The decision to keep the legacy path alive did not automatically preserve compatibility. DOM-authored buttons still needed explicit fallback metadata, and browser startup had to become optional.
**Impact:** Review found multiple P1 issues late in the cycle, and Phase 18 required a follow-on fix pass before shipping.
**Source:** `18-01-SUMMARY.md`, `18-02-SUMMARY.md`, shipped review fixes

### S2: Planning metadata drift was severe enough to fail verification after the code was done
**What was surprising:** The code and tests passed, but Phase 18 still failed `verify-work` because planning files still said “not started”, “executing”, or “draft/pending”.
**Impact:** The closeout workflow had to include a second documentation-alignment pass before verification could pass.
**Source:** `18-VERIFICATION.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`

### S3: Full-suite ship failures came from older fixture/import assumptions, not the new renderer logic itself
**What was surprising:** The first `/ship` abort was caused by stale test paths and import expectations in other areas of the repo rather than a direct Phase 18 runtime failure.
**Impact:** Shipping required a broader repair pass and reinforced that workspace-level validation can expose hidden repo drift after a successful phase-local execution.
**Source:** shipped fixes in `packages/cli/src/config/loader.test.ts`, `packages/cli/src/deck/runtime.test.ts`, `packages/cli/src/render/reconciler.test.tsx`, `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`

---

*Extracted from Phase 18 artifacts on 2026-05-22*
