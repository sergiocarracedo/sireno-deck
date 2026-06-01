---
status: complete
phase: 31-cli-dev-watch-mode-argument-forwarding
source:
  - .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-01-SUMMARY.md
  - .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-02-SUMMARY.md
started: 2026-05-31T10:11:05+02:00
updated: 2026-06-01T11:48:43+02:00
---

## Rerun Session

attempt: 4
reason: |
  Starting a fresh manual rerun after local diagnosis confirmed the current code no
  longer reproduces the preserved shell/runtime blockers from rerun attempt 3.
  `31-03-PLAN.md`, `31-04-PLAN.md`, `31-05-PLAN.md`, and `31-06-PLAN.md` are all
  implemented; this attempt tests the current live seam directly while preserving the
  earlier failed reports below as historical evidence.

## Current Test
number: 3
name: README Matches The Repaired Bare And Forwarded Watch Contract
expected: |
  Open `README.md` and inspect `## Development Refresh`.

  Expected on this fresh rerun: it explicitly documents bare `pnpm run cli:dev` as the full-process
  restart seam with default `start --config config.yml`, and also documents
  `pnpm run cli:dev emulate --port 8912` as the forwarded emulator path while preserving the
  distinction from the narrower in-process config-owned reload seam.
awaiting: complete

## Rerun Results

### 1. Bare cli:dev Now Reaches A Stable Default Start Boundary
result: pass

### 2. Forwarded Emulator Args Now Reach A Stable Emulator Path
result: pass

### 3. README Matches The Repaired Bare And Forwarded Watch Contract
result: pass

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
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Rerun Path

- Shared runtime blocker closure: `31-03-PLAN.md`
- Downstream bare-start cleanup closure: `31-04-PLAN.md`
- Live worktree seam restoration: `31-05-PLAN.md`
- Shell-safe root script closure: `31-06-PLAN.md`

## Closure Status

- `31-03-PLAN.md` is now implemented: theme runtime imports stay on the real source path with `tsx` cache-busting, and the watched emulator seam no longer self-restarts on `.sireno-theme-runtime-*` unlink churn.
- `31-04-PLAN.md` is now implemented: `startDaemon()` cleanup tolerates synchronous `sessionMonitor.stop()` behavior, so the bare default-start seam no longer throws `reading 'catch'` during error cleanup.
- Rerun attempt 3 preserved the last failed manual reports, but the current code no longer reproduces those shell/runtime blockers locally: bare `pnpm run cli:dev` now reaches daemon startup logs, forwarded `pnpm run cli:dev emulate --port 8912` reaches emulator startup, and `pnpm run cli:dev --help` no longer aborts in zsh. The remaining work is a fresh manual rerun against the current seam, not another code-fix slice.

## Gaps

- truth: "Bare `pnpm run cli:dev` enters the watched raw-source CLI seam and behaves like the real default `start --config config.yml` path instead of doing nothing."
  status: failed
  reason: "User reported (rerun attempt 1): nothing, still the same as before"
  severity: major
  root_cause: "`cli:dev` does enter the repaired launcher, but the watched process immediately loads the theme runtime through `resolveTheme()`, which snapshots the theme into a temp directory under `/tmp` and then deletes that snapshot in `importThemeRuntime(...)`. `tsx watch` treats those imported temp files as watched dependencies, sees the cleanup `unlink` events, and reruns in a tight loop while clearing the terminal, so the user perceives an idle no-op instead of a stable default `start --config config.yml` run. The bare path also throws a separate cleanup bug in `startDaemon()` because it chains `.catch(...)` on `sessionMonitor?.stop()` even when `stop()` returns `undefined`, but that is downstream noise after the restart-loop trigger, not the primary watch-mode cause."
  affected_files: ["packages/cli/src/config/theme.ts", "packages/cli/src/cli/commands/start.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md first, then 31-04-PLAN.md for the downstream bare-start cleanup seam."
  closure: "Shared watch-loop blocker closed by 31-03; downstream bare cleanup defect closed by 31-04. Manual UAT rerun still pending."
  test: 1
- truth: "Bare `pnpm run cli:dev` enters the watched raw-source CLI seam and reaches a stable default-start boundary after the 31-03 and 31-04 runtime fixes."
  status: failed
  reason: "User reported on rerun: nothing, still the same as before"
  severity: major
  root_cause: "This rerun is no longer exercising the committed Phase 31 contract. The live worktree has uncommitted drift in the exact Phase 31 seam files: root `package.json` no longer matches the verified `cli:dev` script contract, `packages/cli/src/cli/dev-watch.ts` has local debugging/behavior edits, and `packages/cli/src/cli/commands/start.test.ts` is also locally modified. Because the user reran UAT against that dirty state, the remaining bare-path failure reflects current worktree drift, not the already-verified 31-03/31-04 committed runtime seam."
  affected_files: ["package.json", "packages/cli/src/cli/dev-watch.ts", "packages/cli/src/cli/commands/start.test.ts"]
  rerun_plan: "31-05-PLAN.md"
  closure: "31-05 restores the live worktree root script and launcher seam back to the verified Phase 31 contract. Manual UAT rerun is still required after that restoration."
  test: 1
- truth: "Forwarded args such as `pnpm run cli:dev emulate --port 8912` reach the real emulator CLI path instead of being swallowed or doing nothing."
  status: failed
  reason: "User reported: same las before, no logs, nothing"
  severity: major
  root_cause: "The forwarded args are reaching the real emulator path correctly outside watch mode, but `startEmulatorSession()` shares the same `loadRuntimeConfig() -> resolveTheme() -> importThemeRuntime()` seam as the bare path. Under `tsx watch`, the temp theme-runtime snapshot is imported and then removed, generating watched `unlink` events under `/tmp/.sireno-theme-runtime-*` that force immediate restarts before the emulator can settle or show stable logs. The observed no-op is therefore the same watch-loop bug, not broken argv forwarding in the launcher."
  affected_files: ["packages/cli/src/config/theme.ts", "packages/cli/src/cli/commands/start.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md"
  closure: "Closed by 31-03. Manual UAT rerun passed on attempt 2."
  test: 2
- truth: "README `## Development Refresh` matches the repaired bare-plus-forwarded `cli:dev` contract the user can actually observe in practice."
  status: failed
  reason: "User reported: same as other UATs"
  severity: major
  root_cause: "The README and shipped regression both describe the repaired launcher contract truthfully, but the runtime behavior no longer matches those docs because the watch loop is destabilized by temp theme-runtime snapshot cleanup. The docs gap is therefore not stale wording; it is that the live `tsx watch` seam is still being invalidated by files the theme loader generates and deletes during startup, so the documented behavior cannot be observed in practice until that runtime seam is fixed."
  affected_files: ["README.md", "packages/cli/src/config/theme.ts", "packages/cli/src/cli/dev-watch.ts", "package.json"]
  rerun_plan: "31-03-PLAN.md closes the shared watch-loop blocker; 31-04-PLAN.md re-syncs final UAT/verification truth after the bare cleanup fix."
  closure: "README remained truthful; manual UAT rerun passed on attempt 2."
  test: 3
- truth: "Bare `pnpm run cli:dev` reaches the restored live default-start watch seam instead of failing at the shell before the CLI starts."
  status: failed
  reason: "User reported: zsh: no matches found: ./themes/**/*"
  severity: major
  root_cause: "This preserved rerun-attempt-3 report is stale relative to the current code. `31-06` has already shell-proofed `package.json#scripts.cli:dev`, and fresh local reproduction now shows `pnpm run cli:dev --help` reaches the CLI help instead of failing in zsh while `timeout 8s pnpm run cli:dev` reaches daemon startup logs. The remaining gap is therefore not a newly open code defect; it is preserved manual evidence that now needs a fresh rerun against the current seam."
  affected_files: ["package.json", ".planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md"]
  rerun_plan: "No new code plan - rerun manual UAT against the current Phase 31 seam."
  closure: "31-06 is implemented and local reproduction now reaches the bare startup seam. Fresh manual UAT rerun is still required."
  test: 1
- truth: "Forwarded `pnpm run cli:dev emulate --port 8912` reaches the restored live emulator watch seam instead of failing at the shell before the CLI starts."
  status: failed
  reason: "User reported: zsh: no matches found: ./themes/**/*"
  severity: major
  root_cause: "This preserved rerun-attempt-3 shell failure also no longer reproduces on the current code. After `31-06`, the quoted root script reaches the real forwarded seam locally: `timeout 8s pnpm run cli:dev emulate --port 8912` now prints the emulator startup logs instead of failing in zsh. So the remaining forwarded-path gap is stale pre-closure evidence, not a new launcher/runtime regression."
  affected_files: ["package.json", ".planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md"]
  rerun_plan: "No new code plan - rerun manual UAT against the current Phase 31 seam."
  closure: "31-06 is implemented and local reproduction now reaches the forwarded emulator seam. Fresh manual UAT rerun is still required."
  test: 2
