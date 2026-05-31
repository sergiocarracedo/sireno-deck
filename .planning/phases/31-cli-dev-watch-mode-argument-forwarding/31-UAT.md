---
status: complete
phase: 31-cli-dev-watch-mode-argument-forwarding
source:
  - .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-01-SUMMARY.md
  - .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-02-SUMMARY.md
started: 2026-05-31T10:11:05+02:00
updated: 2026-05-31T10:26:07+02:00
---

## Current Test
number: 3
name: README Matches The Repaired Bare And Forwarded Watch Contract
expected: |
  Open `README.md` and inspect `## Development Refresh`.

  Expected: it explicitly says bare `pnpm run cli:dev` uses the full-process restart seam
  and defaults to `start --config config.yml`, and it also documents the forwarded example
  `pnpm run cli:dev emulate --port 8912` while keeping the distinction from the narrower
  in-process config-owned reload seam.
awaiting: diagnosis

## Tests

### 1. Bare cli:dev Falls Back To The Real Start Command Instead Of Doing Nothing
expected: From the repo root, stop any running Sireno daemon/emulator first. Then run `pnpm run cli:dev`. Expected: the command enters the watched raw-source CLI seam and behaves like the real default `start --config config.yml` path, rather than exiting immediately, printing a missing-subcommand yargs error, or doing nothing. On your setup it should show the same kind of startup behavior you would expect from the normal start command path.
result: issue
reported: "❯ pnpm cli:dev\n\n> sireno-deck-workspace@ cli:dev /works/opensource/sireno-deck\n> pnpm exec tsx watch --include ./packages/cli/src/**/* --include ./config.yml --include ./themes/**/* --include ./addons/**/* --include ./builtin-addons/**/* packages/cli/src/cli/dev-watch.ts\n\nNo more output or action"
severity: major

### 2. Forwarded Emulator Args Reach The Real CLI Unchanged
expected: From the repo root, stop any earlier `cli:dev` process, then run `pnpm run cli:dev emulate --port 8912`. Expected: the same watch seam stays active, but it now starts the real emulator command instead of the default start path. You should see the normal emulator startup output and be able to open the emulator on port `8912`, rather than seeing the args swallowed or the command doing nothing.
result: issue
reported: "same las before, no logs, nothing"
severity: major

### 3. README Matches The Repaired Bare And Forwarded Watch Contract
expected: Open `README.md` and inspect `## Development Refresh`. Expected: it explicitly says bare `pnpm run cli:dev` uses the full-process restart seam and defaults to `start --config config.yml`, and it also documents the forwarded example `pnpm run cli:dev emulate --port 8912` while keeping the distinction from the narrower in-process config-owned reload seam.
result: issue
reported: "same as other UATs"
severity: major

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0

## Rerun Path

- Shared runtime blocker closure: `31-03-PLAN.md`
- Downstream bare-start cleanup closure: `31-04-PLAN.md`

## Gaps

- truth: "Bare `pnpm run cli:dev` enters the watched raw-source CLI seam and behaves like the real default `start --config config.yml` path instead of doing nothing."
  status: failed
  reason: "User reported: ❯ pnpm cli:dev\n\n> sireno-deck-workspace@ cli:dev /works/opensource/sireno-deck\n> pnpm exec tsx watch --include ./packages/cli/src/**/* --include ./config.yml --include ./themes/**/* --include ./addons/**/* --include ./builtin-addons/**/* packages/cli/src/cli/dev-watch.ts\n\nNo more output or action"
  severity: major
  root_cause: "`cli:dev` does enter the repaired launcher, but the watched process immediately loads the theme runtime through `resolveTheme()`, which snapshots the theme into a temp directory under `/tmp` and then deletes that snapshot in `importThemeRuntime(...)`. `tsx watch` treats those imported temp files as watched dependencies, sees the cleanup `unlink` events, and reruns in a tight loop while clearing the terminal, so the user perceives an idle no-op instead of a stable default `start --config config.yml` run. The bare path also throws a separate cleanup bug in `startDaemon()` because it chains `.catch(...)` on `sessionMonitor?.stop()` even when `stop()` returns `undefined`, but that is downstream noise after the restart-loop trigger, not the primary watch-mode cause."
  affected_files: ["packages/cli/src/config/theme.ts", "packages/cli/src/cli/commands/start.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md first, then 31-04-PLAN.md for the downstream bare-start cleanup seam."
  test: 1
- truth: "Forwarded args such as `pnpm run cli:dev emulate --port 8912` reach the real emulator CLI path instead of being swallowed or doing nothing."
  status: failed
  reason: "User reported: same las before, no logs, nothing"
  severity: major
  root_cause: "The forwarded args are reaching the real emulator path correctly outside watch mode, but `startEmulatorSession()` shares the same `loadRuntimeConfig() -> resolveTheme() -> importThemeRuntime()` seam as the bare path. Under `tsx watch`, the temp theme-runtime snapshot is imported and then removed, generating watched `unlink` events under `/tmp/.sireno-theme-runtime-*` that force immediate restarts before the emulator can settle or show stable logs. The observed no-op is therefore the same watch-loop bug, not broken argv forwarding in the launcher."
  affected_files: ["packages/cli/src/config/theme.ts", "packages/cli/src/cli/commands/start.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md"
  test: 2
- truth: "README `## Development Refresh` matches the repaired bare-plus-forwarded `cli:dev` contract the user can actually observe in practice."
  status: failed
  reason: "User reported: same as other UATs"
  severity: major
  root_cause: "The README and shipped regression both describe the repaired launcher contract truthfully, but the runtime behavior no longer matches those docs because the watch loop is destabilized by temp theme-runtime snapshot cleanup. The docs gap is therefore not stale wording; it is that the live `tsx watch` seam is still being invalidated by files the theme loader generates and deletes during startup, so the documented behavior cannot be observed in practice until that runtime seam is fixed."
  affected_files: ["README.md", "packages/cli/src/config/theme.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md closes the shared watch-loop blocker; 31-04-PLAN.md re-syncs final UAT/verification truth after the bare cleanup fix."
  test: 3
