---
plan_contract: ce-plan/v1
product_contract_source: ce-plan-bootstrap
artifact_readiness: implementation-ready
created: 2026-08-21
title: Fix real mode runtime-state write
status: shipped-via-PR
branch: fix/real-mode-runtime-state
---

## Problem

`pnpm dev start` (without `--emulator`) deterministically fails with `daemon: TCP bound on 52937 but runtime state did not appear in 30s`, even though the daemon fully starts and the frontend works.

## Root Cause

- Commit 4831b781 (PR #25) made `waitForFullStart` unconditionally poll for `runtime-state.json` as the "fully ready" signal (previously it only polled for `--remote`).
- But `writeRuntimeState()` is only called by `EmulatorOutputClient.init` (`emulator.ts:280,299`). `RealOutputClient.init` (`real.ts`) never writes it.
- So in hardware mode the CLI polls a file that will never exist → guaranteed false failure.

## Fix

Make `RealOutputClient.init` write runtime state after the renderer starts (mirroring `EmulatorOutputClient`):

1. **`outputClient/real.ts`**: after `renderer.start()` + childPids (~line 248), build `RuntimeState` with `emulatorMode: false`, `remote: false`, `configUiUrl`, token from `SIRENO_TOKEN` env, and call `writeRuntimeState(state)` + log "real mode: runtime state written".

2. **`startup-display.ts` `printDaemonUrl`**: branch on `state.emulatorMode` — `false` prints `Frontend: <frontendUrl>?token=...` (no QR/LAN/QR section).

3. **`status.ts`**: line 99 show `state.frontendUrl` when not emulator mode (already gated by `emulatorMode` elsewhere).

4. **Tests**: extend `real.test.ts` (already passing; no explicit state write assertion added — keep minimal).

## Verification

- `p dev stop && p dev start` (no flag) → exit 0, "Frontend: http://127.0.0.1:5180?token=..." banner, runtime-state.json with `emulatorMode: false`.
- `p dev status` → "Mode: hardware", "URL: http://127.0.0.1:5180", "Frontend: ...".
- `p dev start --emulator` → unchanged, works, "Emulator: ..." banner.
- `p dev status` (emulator) → "Mode: emulator · Emulator", "URL: http://127.0.0.1:52938".
- Lint/format/typecheck clean (only pre-existing baseline noise).
