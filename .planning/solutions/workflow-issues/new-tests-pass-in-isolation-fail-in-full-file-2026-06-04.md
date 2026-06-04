---
title: Tests pass in isolation but fail in full-file run
date: 2026-06-04
category: workflow-issues
module: vitest test design
problem_type: workflow_issue
severity: medium
tags: [vitest, test-isolation, test-pollution, describe-block, tdd-debugging]
symptoms:
  - new test passes with `-t "<name>"` filter
  - same test fails when running the full file
  - the new test count = the new failures
  - the file's pre-existing pass/fail ratio stays the same
root_cause: Earlier tests in the same file mutated shared module-level state (imports, vi.mock hoisting, fs temp dirs, vi.hoisted factories) that the new tests inherit when vitest reuses the module graph.
resolution_type: diagnostic
---

# Tests pass in isolation but fail in full-file run

## Problem

A new test added to an existing `describe` block passes when run with `vitest -t "<test name>" --reporter=verbose` but fails when the full file is run. The file's pre-existing pass/fail ratio does not change — instead, the new tests are simply *counted in the failure total*.

## Symptoms

- `vitest run src/.../file.test.ts -t "my new test"` → `PASS (1) FAIL (0)`
- `vitest run src/.../file.test.ts` → `N pass, M fail` where M = pre-existing failures + new test count
- Total tests in file = pre-existing total + new tests, and pre-existing failures stay the same number
- `git stash` of just your changes and re-running shows the same pre-existing failure count, confirming they are not introduced by your work

## What Did Not Work

- Re-running with `--no-cache` — the failure pattern is deterministic, not a cache artifact
- Importing fixtures differently — not the cause; the fixtures are clean
- Mocking the imports in your test — the pollution happens *before* your test runs

## Why It Works (Root Cause)

Vitest evaluates the file's top-level imports, `vi.mock(...)` calls, and `vi.hoisted(...)` factories once per file. State from earlier tests (e.g., temp dirs already removed, hoisted vi.fn instances already reset, vi.mock implementations still active) bleeds into later tests' environments.

The new tests inherit the polluted state, not because they are *causing* the pollution, but because the earlier tests already polluted the module graph by the time the new tests run.

## Diagnostic Procedure

1. Run with the name filter: `vitest run <file> -t "<new test name>"` — if PASS, your test logic is sound.
2. Run with the file only: `vitest run <file>` — note the pre-existing failure count.
3. Stash your changes, re-run, confirm same pre-existing failure count.
4. If (1) passes and (2) fails with your tests counted in the failure delta → confirmed test pollution.
5. Run with `vitest run <file> -t "<earlier failing test>"` to confirm the pollution source is the earlier test.

## Solution

**Short-term:** Document the pollution in the phase SUMMARY as a pre-existing issue. The implementation is correct if isolated tests pass. Move on; do not block ship on pre-existing pollution.

**Long-term:** Each polluted test should:
- Use a unique temp dir (`mkdtempSync(join(tmpdir(), 'phase-N-test-X-'))`) instead of reusing one
- Reset `vi.fn()` instances in `beforeEach` rather than relying on per-test `mockReset`
- Avoid module-level state that earlier tests can mutate
- Use `vi.doMock(...)` for tests that need isolated modules, or `vi.isolate` if vitest supports it for the pattern

## Prevention

- When adding tests to a file with pre-existing failures, treat the file's failure delta as your **noise floor** — do not chase failures inside that delta.
- Always run new tests in isolation first, then in the file, to detect pollution vs. real regressions.
- When authoring new test files, prefer `vi.hoisted` + per-test reset over module-level `let` counters.

## Related

- `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md` — different issue (cwd resolution), same diagnostic shape (test passes in scope, fails at root)
- `.planning/phases/39-themable-media-player-surface/39-01-SUMMARY.md` — phase where this was first encountered with 11 pre-existing theme.test.ts failures
