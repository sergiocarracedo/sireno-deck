---
status: complete
phase: 05-hot-refresh-and-button-error-helper
source:
  - .planning/phases/05-hot-refresh-and-button-error-helper/05-01-SUMMARY.md
  - .planning/phases/05-hot-refresh-and-button-error-helper/05-02-SUMMARY.md
  - .planning/phases/05-hot-refresh-and-button-error-helper/05-03-SUMMARY.md
started: 2026-05-30T11:40:30+02:00
updated: 2026-05-30T15:11:25+02:00
---

## Current Test
number: complete
name: UAT rerun complete
expected: |
  All Phase 5 rerun checks have been completed. Historical issue evidence is preserved below, and both closure plans have now been revalidated through the rerun session.
awaiting: none

## Tests

### 1. Workflow Truth Review
expected: Read `README.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, and `AGENTS.md`. They should all agree that `cli:dev` is the full-process raw-source restart seam, `sireno start --config ...` is the narrower in-process config-owned reload seam, Phase 5 is complete, and the repo now routes to `verify-work 5` / next-phase-TBD truth instead of stale planning or execution language.
result: pass

### 2. Local Addon Startup And Warning Isolation Review
expected: From `packages/cli`, use the Phase 5 fixtures in `fixtures/phase-5/`. Start with `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-5/config.local-addon.yml --port 0` and confirm the emulator boots with the healthy `local-clock-addon` buttons visible. Then run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-5/config.warning-isolation.yml --port 0` and confirm startup warns about the broken local addon once while the healthy local addon still renders instead of the whole deck collapsing.
result: issue
reported: "1 step renders the error component in button that is correct? Anyway the triangle must be bigger and have an exclamation indide, you can use an icon"
severity: major

### 3. Config Error Deck Versus Button Error Helper Review
expected: Using the Phase 5 verification fixtures plus the delivered runtime helper behavior, confirm the two error surfaces stay separate. `fixtures/phase-5/config.api-version-mismatch.yml` is expected to exit during startup with a clear addon `apiVersion` / config-level error before any runtime or button-local helper can render. Separately, a button-scoped runtime failure should surface as the compact warning icon plus four-digit code on the affected button with deck/button-aware diagnostics in logs, not as the full-deck config error surface.
result: issue
reported: "the error led to exit"
severity: major

## Summary

```yaml
total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
```

## Gaps

- truth: "From `packages/cli`, use the Phase 5 fixtures in `fixtures/phase-5/`. Start with `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-5/config.local-addon.yml --port 0` and confirm the emulator boots with the healthy `local-clock-addon` buttons visible. Then run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-5/config.warning-isolation.yml --port 0` and confirm startup warns about the broken local addon once while the healthy local addon still renders instead of the whole deck collapsing."
  status: failed
  reason: "User reported: 1 step renders the error component in button that is correct? Anyway the triangle must be bigger and have an exclamation indide, you can use an icon"
  severity: major
  test: 2
  rerun_plan: "05-04-PLAN.md"
  rerun_result: "pass"
  root_cause: "The warning-isolation startup path is working, but the shipped button-scoped error helper in `packages/cli/src/deck/runtime.ts` renders only a plain danger-text `▲` plus code via `createRuntimeButtonErrorContent(...)`. That minimal text treatment does not satisfy the UAT expectation for a clear warning icon treatment, so the observed problem is the helper's visual contract rather than startup isolation itself."
  affected_files: ["packages/cli/src/deck/runtime.ts", "packages/cli/src/ui/Icon.tsx"]
- truth: "Using the Phase 5 verification fixtures plus the delivered runtime helper behavior, confirm the two error surfaces stay separate. `fixtures/phase-5/config.api-version-mismatch.yml` is expected to exit during startup with a clear addon `apiVersion` / config-level error before any runtime or button-local helper can render. Separately, a button-scoped runtime failure should surface as the compact warning icon plus four-digit code on the affected button with deck/button-aware diagnostics in logs, not as the full-deck config error surface."
  status: failed
  reason: "User reported: the error led to exit"
  severity: major
  test: 3
  rerun_plan: "05-05-PLAN.md"
  rerun_result: "pass"
  root_cause: "The product behavior is correct: `packages/cli/src/cli/commands/start.ts` intentionally treats addon `apiVersion` mismatches as startup/config-level failures, logs `Addon apiVersion error: ...`, sets `process.exitCode = 1`, and returns before any runtime/button helper can render. The gap is that this UAT step did not state clearly enough that process exit is the expected success condition for this fixture, so the issue is a verification-script wording mismatch rather than a runtime bug."
  affected_files: [".planning/phases/05-hot-refresh-and-button-error-helper/05-UAT.md", "packages/cli/fixtures/phase-5/README.md"]

## Investigation

### Hypothesis 1: Warning isolation is broken and the broken addon collapses the runtime
**Status:** denied
**Files checked:** `packages/cli/fixtures/phase-5/config.warning-isolation.yml`, `packages/cli/fixtures/phase-5/README.md`, `packages/cli/fixtures/phase-5/broken-local-addon/src/index.js`, `packages/cli/src/deck/runtime.ts`
**Finding:** The fixture really does enable one healthy local addon and one broken-import addon, and the reported symptom is about the rendered warning helper appearance, not total startup collapse.
**Code path:** `config.warning-isolation.yml` -> broken addon import failure -> `packages/cli/src/deck/runtime.ts:createRuntimeButtonErrorContent(...)`
**Why denied:** The user reported seeing the error component in the button, which means the warning-isolation seam remained alive enough to render the helper.

### Hypothesis 2: The button helper visual contract is too weak for the intended warning state
**Status:** confirmed
**Files checked:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/ui/Icon.tsx`
**Finding:** `createRuntimeButtonErrorContent(...)` currently renders only two danger-tone `Text` nodes: literal `▲` and the four-digit code. There is no warning icon with an exclamation or larger visual emphasis.
**Code path:** `packages/cli/src/deck/runtime.ts:createRuntimeButtonErrorContent(...)` -> button render cache error state -> device/emulator button surface
**Root cause:** `packages/cli/src/deck/runtime.ts:195` hard-codes a plain text triangle instead of a stronger warning-icon treatment, so the helper technically exists but misses the intended visual clarity.
**Evidence:** The helper implementation at lines 195-210 contains `createElement(Text, { tone: 'danger' }, '▲')` and no `Icon` usage.
**Confidence:** high

### Hypothesis 3: apiVersion mismatch exiting means the runtime/helper boundary is broken
**Status:** denied
**Files checked:** `packages/cli/fixtures/phase-5/config.api-version-mismatch.yml`, `packages/cli/fixtures/phase-5/README.md`, `packages/cli/src/cli/commands/start.ts`
**Finding:** The fixture README explicitly says this config should fail with an addon apiVersion error, and `start.ts` intentionally exits on `AddonManifestError` with `code === "api_version_mismatch"`.
**Code path:** `config.api-version-mismatch.yml` -> addon manifest load -> `packages/cli/src/cli/commands/start.ts` startup catch -> `process.exitCode = 1`
**Why denied:** Exit is the expected success condition for this startup/config-level failure path; no button helper should appear before runtime startup succeeds.

### Hypothesis 4: The UAT wording for the apiVersion mismatch fixture did not make the expected exit explicit enough
**Status:** confirmed
**Files checked:** `.planning/phases/05-hot-refresh-and-button-error-helper/05-UAT.md`, `packages/cli/fixtures/phase-5/README.md`, `packages/cli/src/cli/commands/start.ts`, `.planning/milestones/v1.0-phases/05-addon-system/05-UAT.md`
**Finding:** The current UAT step says the fixture should fail startup with an addon apiVersion/config-level error rather than showing the button helper, but it does not explicitly call process exit the expected outcome. Prior art and fixture docs do.
**Code path:** `05-UAT.md` test wording -> user executes mismatch fixture -> startup exits by design in `start.ts`
**Root cause:** `.planning/phases/05-hot-refresh-and-button-error-helper/05-UAT.md:37` describes the negative helper expectation but omits the positive statement that process exit is expected, which makes the correct behavior easy to misread as a failure.
**Evidence:** `packages/cli/fixtures/phase-5/README.md` line 7 says `startup should fail with an addon apiVersion error`, and `start.ts` lines 969-972 implement exactly that.
**Confidence:** high

## Root Cause

**Location:** `packages/cli/src/deck/runtime.ts:195` and `.planning/phases/05-hot-refresh-and-button-error-helper/05-UAT.md:37`
**Cause:** One real gap is visual: the button helper ships as plain text `▲` plus code instead of a stronger warning icon treatment. The other reported issue comes from ambiguous UAT wording: the apiVersion mismatch fixture is supposed to exit during startup, but the test wording did not make that success condition explicit.
**Why it produces the symptom:** The runtime helper looks underdesigned even when isolation works, and the mismatch fixture appears "wrong" during UAT because the session text under-specifies the intended startup-exit contract.
**Confidence:** high

## Proposed Fix

**Approach:** Close the real product gap by upgrading the button helper visual treatment using the existing UI icon system, then close the verification-script gap by rewriting the Phase 5 UAT mismatch check so it explicitly treats startup exit with the addon apiVersion error as the expected result.
**Files to change:**
- `packages/cli/src/deck/runtime.ts`: replace the plain text warning glyph in `createRuntimeButtonErrorContent(...)` with a clearer warning-icon treatment while preserving the compact code helper.
- `packages/cli/src/ui/Icon.tsx`: add the minimal warning icon needed if the existing generic icon registry does not already provide one.
- `.planning/phases/05-hot-refresh-and-button-error-helper/05-UAT.md`: rewrite the mismatch-fixture expectation so the expected startup exit is explicit on rerun.

**Risk:** Low. The runtime fix is localized to helper presentation, but icon sizing/composition should be checked on the real button surface so the error code remains legible.
