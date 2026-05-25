---
status: resolved
opened: 2026-05-24T15:33:00+02:00
description: missing phase-11 fixture paths and vi is not defined in date-time addon tests
---

# Debug: missing phase-11 fixture paths and vi is not defined in date-time addon tests

## Session Log

## Triage

**Symptom:** `pnpm lint` should not fail, but the ship workflow is blocked by test failures caused by missing Phase 11 fixture paths and `vi is not defined` in the date-time addon tests.
**Expected:** The workspace test/lint commands should pass so `/ship` can continue.
**Frequency:** always
**Regression:** always been broken
**Already tried:** nothing

## Investigation

### Hypothesis 1: Phase 11 fixture tests still point at a stale repo-root fixture path
**Files checked:** `packages/cli/src/config/loader.test.ts`, `packages/cli/src/deck/runtime.test.ts`
**Finding:** The failing tests build fixture paths from `process.cwd()` / `originalCwd`, so they depend on how Vitest was invoked. They pass when the package cwd is `packages/cli`, but fail from the workspace root. The committed fixture files live under `packages/cli/fixtures/phase-11/...`, so the path construction must be source-file-relative instead of cwd-relative.
**Root cause:** `packages/cli/src/config/loader.test.ts:879`, `packages/cli/src/deck/runtime.test.ts:501`, and `packages/cli/src/deck/runtime.test.ts:1484` derive fixture paths from the working directory, making the tests nondeterministic across `pnpm --filter ...` and workspace-root `pnpm test` execution.
**Confidence:** high

### Hypothesis 2: The locked time tile test uses `vi` without importing it from Vitest
**Files checked:** `packages/cli/src/builtin-addons/date-time/index.test.ts`
**Finding:** The file imports `describe`, `expect`, and `it` from `vitest`, but later calls `vi.useFakeTimers()` and `vi.setSystemTime(...)`.
**Root cause:** `packages/cli/src/builtin-addons/date-time/index.test.ts:1` omits `vi` from the Vitest import, so the test throws `ReferenceError: vi is not defined` before any addon logic runs.
**Confidence:** high

## Root Cause

**Location:** `packages/cli/src/config/loader.test.ts:879`, `packages/cli/src/deck/runtime.test.ts:501`, `packages/cli/src/deck/runtime.test.ts:1484`, `packages/cli/src/builtin-addons/date-time/index.test.ts:1`
**Cause:** A few tests drifted from stable, source-relative fixture discovery and Vitest API usage: the Phase 11 fixture tests resolve paths from the current working directory instead of the test file location, and the date-time test uses Vitest's `vi` helper without importing it.
**Why it produces the symptom:** The test suite behaves differently depending on how it is invoked. Under the workspace-root ship run, cwd-relative fixture paths point at nonexistent files, and the missing `vi` import throws immediately when the locked-time test executes.
**Confidence:** high

## Resolution

**Fix applied:** Updated the Phase 11 fixture tests to resolve fixture files relative to the test source files instead of `process.cwd()`, and imported `vi` in the date-time addon test.
**Commit:** not committed in this debug session
**Verified:** targeted suite `pnpm --filter sireno-deck-cli exec vitest run src/config/loader.test.ts src/deck/runtime.test.ts src/builtin-addons/date-time/index.test.ts` passed; workspace test run `vitest run` now passes with `PASS (185) FAIL (0)`; repo lint command `pnpm run lint` completes and returns only warnings.
**Status:** resolved

**Note:** The earlier `[warn] Linter process terminated abnormally (possibly out of memory)` came from the `rtk lint` wrapper path, not from the repo's actual `pnpm run lint` script.
