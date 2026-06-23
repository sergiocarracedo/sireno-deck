---
phase: 06-hardware
plan: 06-03
wave: 2
depends_on: [06-01-PLAN, 06-02-PLAN]
files_created:
  - packages/cli/src/cli/commands/real-mode.ts
  - packages/cli/src/cli/commands/real-mode.test.ts
  - packages/cli/src/cli/commands/run.test.ts
  - packages/cli/src/cli/commands/start.test.ts
files_modified:
  - packages/cli/src/cli/commands/run.ts
  - packages/cli/src/cli/commands/start.ts
autonomous: true
---

# Phase 06 Plan 03 — Real-mode CLI Integration

## What was built

- `cli/commands/real-mode.ts` — `runRealMode({ frontendUrl, device, logger, intervalMs?, pubSub? })` constructs a `BrowserRenderer`, calls `start()`, returns `{ stop }`. `stop()` calls `renderer.stop()` then `device.close()` in order; `device.close()` runs even if `renderer.stop()` throws (try/finally).
- `cli/commands/run.ts` — extracted `preflight(options)` (loadConfig → registerBuiltins → validateFull → listDevices → selectDevice → saveDeviceConfig → connectStreamDeck) and `runRealModePipeline(options)` (preflight + signal handler + runRealMode + cleanup). Added `SignalProvider` interface so tests can inject a fake signal source. Default provider traps real SIGINT/SIGTERM via `process.once`.
- `cli/commands/start.ts` — runs `preflight()` synchronously (so config/device errors reject `start()`), then `writePid(process.pid)`, then kicks off `runRealModePipeline()` in the background via `void`. `.finally(removePidFile)` ensures PID cleanup.

## Tests added (17)

- `real-mode.test.ts` (6): constructs renderer with right options; forwards intervalMs/pubSub; calls start once; stop calls renderer.stop() then device.close() in order; propagates errors from start without calling device.close; device.close called even when renderer.stop throws.
- `run.test.ts` (7): full pipeline end-to-end with single device; prompts via selectDevice when multiple + no saved config; uses saved device.json when present + matches connected; saves new selection after picking; SIGINT during runRealMode triggers stop via signals provider; rejects on validation failure; rejects with friendly error when no device found.
- `start.test.ts` (4): calls writePid with current pid; resolves immediately without blocking runRealMode pipeline; removes pid file when background pipeline completes (via signal); rejects with clear error if preflight fails before pipeline starts.

## Must-haves status

- [x] `real-mode.ts` exports `runRealMode` with mockable start/stop lifecycle
- [x] `run.ts` orchestrates: load → validate → list → select → connect → runRealMode
- [x] `start.ts` runs in background + writes/cleans PID
- [x] SIGINT triggers graceful shutdown
- [x] All 17 new tests pass; total 288 (was 271)
- [x] typecheck clean, lint clean (0 warnings), format clean

## Notes

- `SignalProvider` abstraction was added for testability — production uses `defaultSignals` (real SIGINT/SIGTERM), tests use a fake with `trigger()`. `process.off` cleanup is in `defaultSignals.onSignal` return value.
- `preflight()` is exported separately so `start.ts` can run it synchronously (rejecting on errors) before detaching. The full pipeline (`runRealModePipeline`) is what `start.ts` runs in background.
- `runRealMode` returns `{ stop }` rather than awaiting forever. The caller (`runRealModePipeline`) owns signal handling and lifecycle. This separation keeps `real-mode.ts` testable in isolation.
- `start.ts` does NOT await `runRealModePipeline` — it kicks it off via `void` and resolves immediately. This matches the daemon contract (start = detach; stop = SIGTERM).
- The `.finally(removePidFile)` on the start pipeline runs whenever the pipeline settles — whether by signal, by error, or by `done` resolution.

## Deviations from plan

- Plan referenced `ResolvedConfig`; actual API uses `RawConfig` (Phase 02 left it raw — the runtime layer resolves it lazily). No semantic impact.
- Plan said "vitePort passed via options" — implemented as `frontendUrl?` (full URL) since vite spawn lifecycle lives elsewhere (Phase 04 vite-server). `port` defaults to 5173 if neither provided.
