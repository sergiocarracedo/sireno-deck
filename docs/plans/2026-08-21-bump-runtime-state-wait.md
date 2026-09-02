---
plan_contract: ce-plan/v1
product_contract_source: ce-plan-bootstrap
artifact_readiness: implementation-ready
created: 2026-08-21
title: Bump runtime-state wait from 10s to 30s
status: shipped-via-PR
branch: fix/runtime-state-wait-bump
---

## Problem

`pnpm dev start --emulator` intermittently fails with `daemon: TCP bound on 52937 but runtime state did not appear in 10s`, even though the daemon eventually comes up correctly.

## Root Cause

The CLI waits 10s for `runtime-state.json` to appear (post-#36 bump from 5s). The daemon's `outputClient.init` calls `spawnFrontendVite` + `spawnConfigUiVite`, each gated by `readyTimeoutMs: 30_000` plus the supervisor retry budget `[2_000, 5_000, 15_000, 30_000, 60_000]` (worst case ~2 min). On first run after dependency cache invalidation, Tailwind/vite dep optimization alone is ~10-15s. So the CLI wait window (10s) is shorter than a realistic slow-path boot (~30s). When the daemon is just slow, the CLI bails with exit code 1 even though the daemon eventually succeeds.

## Fix

Bump the runtime-state wait from 10s to 30s. The TCP wait stays at 30s — alignment makes reasoning easier.

## Diff

- `packages/cli/src/cli/startup-display.ts:60` — `RUNTIME_STATE_TIMEOUT_MS = 30_000`
- `packages/cli/src/cli/index.ts:155` — pass `runtimeTimeoutMs: 30_000` to `waitForFullStart`
- `packages/cli/src/cli/index.ts:179` — update error string to "30s"

4 lines changed across 2 files.
