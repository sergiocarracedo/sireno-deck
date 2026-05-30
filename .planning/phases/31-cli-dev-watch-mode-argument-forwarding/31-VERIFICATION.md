---
phase: 31
status: passed
verified: 2026-05-30
---

# Phase 31 Verification

## Goal

Make `pnpm cli:dev ...` start the real CLI watch mode and honor forwarded command arguments such as `emulate --port 8912`.

## Must-Have Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| Bare `pnpm run cli:dev` resolves to the truthful default `start --config config.yml` path before entering the watched CLI seam | PASS | `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts`, `31-01-SUMMARY.md` |
| Forwarded args such as `pnpm run cli:dev emulate --port 8912` pass through untouched to the real CLI entrypoint | PASS | `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts`, `packages/cli/src/cli/commands/start.test.ts` |
| The workspace-root `cli:dev` script still uses the external `tsx watch` raw-source restart seam with the existing include graph | PASS | `package.json`, `packages/cli/src/cli/commands/start.test.ts`, grep proof below |
| The repaired seam does not widen into a new watch workflow or claim the `tsdown --watch` bundle loop | PASS | `packages/cli/src/cli/commands/start.test.ts`, `README.md` |
| The shipped regression seam and README now describe the same repaired launcher contract for both bare and forwarded invocations | PASS | `packages/cli/src/cli/commands/start.test.ts`, `README.md`, `31-02-SUMMARY.md` |

## Requirement Coverage

Phase 31 is a post-milestone follow-on after the v1.3 `TRF-*` requirements were already complete. It introduces no new `TRF-*` ids here; coverage traces to the Phase 31 roadmap goal, `31-CONTEXT.md`, and the `31-01` / `31-02` plan `must_haves`.

## Integration Checks

| Integration | Status | Evidence |
|-------------|--------|----------|
| Root script -> launcher -> real CLI argv path | PASS | `package.json`, `packages/cli/src/cli/dev-watch.ts`, `packages/cli/src/cli/dev-watch.test.ts` |
| Root-script regression seam pins the repaired launcher contract | PASS | `packages/cli/src/cli/commands/start.test.ts` |
| README preserves the distinction between external full-process restart and narrower in-process config reload | PASS | `README.md` |

## Verification Commands

```bash
pnpm --filter sireno-deck-cli exec vitest run src/cli/dev-watch.test.ts
pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "documents the workspace-root cli:dev script as the full-process raw-source restart seam"
rtk grep -n 'cli:dev|dev-watch.ts|start --config config.yml|emulate --port 8912|full-process restart seam|in-process config-owned reload seam' package.json packages/cli/src/cli/dev-watch.ts README.md
```

## Summary

Score: 5/5 must-haves verified.

Phase 31 goal is achieved: the workspace-root `cli:dev` watch seam once again has a truthful default `start --config config.yml` path, forwarded args such as `emulate --port 8912` reach the real CLI entrypoint unchanged, and the shipped regression/docs surfaces now match that repaired contract.
