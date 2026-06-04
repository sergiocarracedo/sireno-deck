# Plan 41-01 Summary

**Completed:** 2026-06-04

## What was built

First-Run Chromium Auto-Install for the `start` and `emulate` commands. When the user runs either command, the CLI checks for an existing Playwright Chromium install. If missing and the user hasn't opted out via `--skip-browser-install` or `SIRENO_SKIP_BROWSER_INSTALL=1`, it prints a notice, auto-installs Chromium via `npx playwright install chromium` (no `--with-deps`), and writes a marker file at `~/.cache/sireno-deck/chromium-installed`. On install failure (network, permission, or other), the CLI prints a categorized error message and exits 1.

## Key files

- `packages/cli/src/util/chromium-detect.ts` — `ensureChromium()`, `isChromiumInstalled()`, `isChromiumInstallSkipped()`. Uses `execa` for streaming install output.
- `packages/cli/src/util/chromium-detect.test.ts` — 5 unit tests for skip + detection helpers (mocks `node:fs` and `node:os`).
- `packages/cli/src/cli/index.ts` — `--skip-browser-install` flag added to both `start` and `emulate` yargs command builders.
- `packages/cli/src/cli/commands/start.ts` — `startDaemon` and `startEmulator` import `ensureChromium` and call it as their first action. `skipBrowserInstall` option added to `StartOptions`; when true, sets the env var before the check.

## Decisions made

- Used `execa` (already a dep) for streaming install output rather than `execSync` so users see progress
- `startDaemon` and `startEmulator` both call `await ensureChromium()` BEFORE any other work (no logging, no PID check, no config load) — this matches the CONTEXT decision that detection happens at the very start
- The `skipBrowserInstall` CLI flag is also reflected into the `SIRENO_SKIP_BROWSER_INSTALL` env var inside the function, so the env var check inside `chromium-detect.ts` works regardless of whether the user used the flag or the env var

## Notes for downstream

- 5 unit tests pass; the `ensureChromium` happy path is not unit-tested (requires real Playwright + network) — it's covered by the integration smoke (Phase 47 CI matrix) and Phase 48 docs
- The `start` command path adds a small env-var sync from CLI flag to env var; this is the only piece of state coupling between yargs and the detection helper
- Future enhancement (v1.5): SIRENO_BROWSER_PATH for users with pre-installed Chromium
