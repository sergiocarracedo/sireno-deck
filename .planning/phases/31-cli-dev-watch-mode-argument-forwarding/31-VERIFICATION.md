---
phase: 31
status: passed
verified: 2026-06-01
---

# Phase 31 Verification

## Goal

Make `pnpm cli:dev ...` start the real CLI watch mode and honor forwarded command arguments such as `emulate --port 8912`.

## Must-Have Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| Bare `pnpm run cli:dev` resolves to the truthful default `start --config config.yml` path before entering the watched CLI seam | PASS | `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts`, `31-01-SUMMARY.md` |
| Forwarded args such as `pnpm run cli:dev emulate --port 8912` pass through untouched to the real CLI entrypoint | PASS | `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts`, `31-01-SUMMARY.md` |
| The workspace-root `cli:dev` script still uses the external `tsx watch` raw-source restart seam with the existing include graph | PASS | `package.json`, `packages/cli/src/cli/commands/start.test.ts`, grep proof below |
| The watched `cli:dev` seam no longer self-restarts on `.sireno-theme-runtime-*` temp snapshot churn during theme runtime loading | PASS | `packages/cli/src/config/theme.ts`, `packages/cli/src/config/theme.test.ts`, `packages/cli/src/cli/commands/start.test.ts`, `31-03-SUMMARY.md` |
| The bare default-start cleanup path now tolerates synchronous `sessionMonitor.stop()` behavior instead of throwing `reading 'catch'` | PASS | `packages/cli/src/cli/commands/start.ts`, `packages/cli/src/cli/commands/start.test.ts`, `31-04-PLAN.md` |
| README and the shipped regression seam still describe the same repaired bare-plus-forwarded contract users can now observe in practice | PASS | `packages/cli/src/cli/commands/start.test.ts`, `README.md`, `31-02-SUMMARY.md`, `31-UAT.md` |
| The live worktree `cli:dev` seam is re-pinned to the previously verified Phase 31 contract after rerun-specific drift in the root script and launcher | PASS | `package.json`, `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts`, `31-05-SUMMARY.md` |

## Requirement Coverage

Phase 31 is a post-milestone follow-on after the v1.3 `TRF-*` requirements were already complete. It introduces no new `TRF-*` ids here; coverage traces to the Phase 31 roadmap goal, `31-CONTEXT.md`, the `31-01` through `31-05` plan `must_haves`, and the preserved failed-manual-UAT evidence in `31-UAT.md`.

## Integration Checks

| Integration | Status | Evidence |
|-------------|--------|----------|
| Root script -> launcher -> real CLI argv path | PASS | `package.json`, `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts` |
| Watched emulator seam stays on one stable process without `.sireno-theme-runtime-*` restart-loop logs | PASS | `packages/cli/src/cli/commands/start.test.ts`, repo-root `tsx watch` smoke run recorded below |
| Bare startup cleanup honors the `SessionMonitor.stop(): Promise<void> | void` contract | PASS | `packages/cli/src/cli/commands/start.ts`, `packages/cli/src/system/session-monitor.ts`, `packages/cli/src/cli/commands/start.test.ts` |
| README preserves the distinction between external full-process restart and narrower in-process config reload | PASS | `README.md` |
| Live worktree root script and launcher still match the committed Phase 31 contract after rerun drift repair | PASS | `package.json`, `packages/cli/src/cli/dev-watch.ts`, `31-05-SUMMARY.md` |

## Verification Commands

```bash
pnpm --filter sireno-deck-cli exec vitest run src/cli/dev-watch.test.ts
pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "documents the workspace-root cli:dev script as the full-process raw-source restart seam"
pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "documents the workspace-root cli:dev script as the full-process raw-source restart seam|synchronous session monitor stop"
pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "keeps the watched cli:dev emulator seam on one stable process instead of temp theme-runtime reruns"
pnpm exec tsx watch packages/cli/src/cli/dev-watch.ts emulate --port 0
rtk grep -n 'cli:dev|dev-watch.ts|start --config config.yml|emulate --port 8912|full-process restart seam|in-process config-owned reload seam' package.json packages/cli/src/cli/dev-watch.ts README.md
rtk grep -n 'pnpm exec tsx watch|--include ./themes/\*\*/*|--include ./addons/\*\*/*|--include ./builtin-addons/\*\*/*|packages/cli/src/cli/dev-watch.ts' package.json
rtk grep -n '31-03-PLAN.md|31-04-PLAN.md|theme runtime|sessionMonitor|reading '\''catch'\''|cli:dev' .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-VERIFICATION.md README.md
```

## Residual Notes

- The broad `src/config/theme.test.ts` suite still contains stale custom-theme fixture drift that now fails early on missing required manifest fields. That drift predates this watch-loop closure and is outside the Phase 31 runtime contract repaired here.
- `31-UAT.md` intentionally preserves the original failed manual reports. The runtime defects behind those reports are now closed by `31-03-PLAN.md` and `31-04-PLAN.md`, and the live worktree seam drift found during rerun attempt 2 is now re-pinned by `31-05-PLAN.md`, but a fresh manual rerun is still the correct next workflow step.

## Summary

Score: 7/7 must-haves verified.

Phase 31 goal is achieved: the workspace-root `cli:dev` watch seam once again has a truthful default `start --config config.yml` path, forwarded args such as `emulate --port 8912` reach the real CLI entrypoint unchanged, the watched theme runtime no longer self-invalidates on temp snapshot churn, the bare cleanup path now honors the real `SessionMonitor.stop()` contract, and the live worktree root script plus launcher are re-pinned to that verified contract after the rerun-specific drift.
