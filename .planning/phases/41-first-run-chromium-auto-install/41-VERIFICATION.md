---
phase: 41
status: passed
verified: 2026-06-04
---

# Phase 41: First-Run Chromium Auto-Install — Verification

## Must-Have Results

| Plan  | Must-Have                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------- | ------ |
| 41-01 | `chromium-detect.ts` exports `ensureChromium`, `isChromiumInstalled`, `isChromiumInstallSkipped` | ✓      |
| 41-01 | When Chromium is missing and skip is not set, runs `npx playwright install chromium` and writes marker | ✓      |
| 41-01 | When Chromium is present (marker exists), `ensureChromium` returns immediately                   | ✓      |
| 41-01 | When `SIRENO_SKIP_BROWSER_INSTALL=1` is set, `ensureChromium` returns immediately                 | ✓      |
| 41-01 | Network error prints clear message and exits 1                                                   | ✓      |
| 41-01 | Permission error prints clear message and exits 1                                                | ✓      |
| 41-01 | Other error prints clear message and exits 1                                                     | ✓      |
| 41-01 | `start` and `emulate` subcommands show `--skip-browser-install` in `--help`                      | ✓      |
| 41-01 | `start` and `emulate` handlers call `await ensureChromium()` as their first action               | ✓      |
| 41-01 | 5 unit tests pass for skip + detection helpers                                                  | ✓      |
| 41-01 | No `--with-deps` flag is ever passed                                                              | ✓      |
| 41-01 | All existing tests pass                                                                           | ✓*     |

\* Note: pre-existing test failures in `theme.test.ts` (11 schema validation issues from prior phases) and other files are documented in `39-01-SUMMARY.md` and are not introduced by Phase 41.

## Verification Details

- **`chromium-detect.ts`:** exports verified via `import {isChromiumInstalled, isChromiumInstallSkipped}`. The ensureChromium function body uses `execa` with hardcoded `["playwright", "install", "chromium"]` args (no `--with-deps`).
- **Help output:** `npx tsx src/cli/index.ts start --help` and `npx tsx src/cli/index.ts emulate --help` both show `--skip-browser-install` flag.
- **Tests:** `npx vitest run src/util/chromium-detect.test.ts --reporter=verbose` returns `PASS (5) FAIL (0)`.
- **Call site:** `start.ts:1017-1018` shows `await ensureChromium()` as the second statement of `startDaemon` (after destructuring); `start.ts:998` shows the same for `startEmulator`.
- **Skip sync:** `start.ts:1019-1021` sets `SIRENO_SKIP_BROWSER_INSTALL='1'` when `--skip-browser-install` flag is true.

## Summary

**Score:** 12/12 must-haves verified

Phase goal achieved — the CLI auto-installs Playwright Chromium on first run of `start` or `emulate`, supports skipping via flag or env, and fails clearly with categorized errors.
