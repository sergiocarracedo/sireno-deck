---
title: Cwd-relative fixture tests break workspace-root runs
date: 2026-05-24
category: test-failures
module: packages/cli tests
problem_type: test_failure
severity: medium
tags: [fixtures, vitest, cwd, workspace-root, test-harness]
symptoms:
  - workspace-root vitest runs fail with ENOENT for committed fixture files
  - package-scoped vitest runs pass while workspace-root runs fail
  - a locked-time addon test throws `vi is not defined`
root_cause: Tests resolved fixtures from the current working directory instead of the test file location, and one Vitest helper was used without being imported.
resolution_type: test_fix
---

# Cwd-relative fixture tests break workspace-root runs

## Problem
The ship pipeline was blocked because the workspace test run failed even though package-scoped test runs passed. The failures came from committed Phase 11 fixture files being resolved from the wrong base path and one test using Vitest's `vi` helper without importing it.

## Symptoms
- `vitest run` from the workspace root fails with `ENOENT` for `config.host-context.yml` and `config.locked-session.yml`
- `pnpm --filter sireno-deck-cli exec vitest ...` can still pass, hiding the bug
- `packages/cli/src/builtin-addons/date-time/index.test.ts` throws `ReferenceError: vi is not defined`

## What Didn't Work
- Interpreting the fixture-path bug as a simple repo-root vs package-root mismatch was incomplete.
- That first fix made package-scoped runs pass but still failed from the workspace root because the real issue was cwd dependence, not one hardcoded path string.

## Solution
Anchor committed fixture references to the test file location instead of `process.cwd()` or a saved cwd value.

```ts
import { fileURLToPath } from "node:url"
import { join } from "node:path"

const FIXTURES_DIRECTORY = fileURLToPath(new URL("../../fixtures", import.meta.url))

const fixturePath = join(FIXTURES_DIRECTORY, "phase-11/config.host-context.yml")
```

Also import `vi` anywhere the test uses fake timers or system-time helpers:

```ts
import { describe, expect, it, vi } from "vitest"
```

## Why This Works
`import.meta.url` is stable regardless of how Vitest is invoked, so fixture discovery no longer changes between package-scoped and workspace-root runs. Importing `vi` restores the missing test harness symbol, which prevents the locked-time test from failing before addon behavior is even exercised.

## Prevention
- Resolve committed fixtures relative to the test source file, never relative to the current working directory.
- If a test uses `vi.*`, import `vi` explicitly from `vitest` in the same file.
- Verify at least one workspace-root test run when a repo supports both package-scoped and workspace-level commands.

## Related
- `.planning/debug/resolved/20260524-1533-missing-phase-11-fixture-paths-and-vi-is-not-defined-in-date-time-addon-tests.md`
- `AGENTS.md` regression entry for 2026-05-24
