---
phase: 06-hardware
verified: 2026-06-23
status: passed
tests_total: 288
---

# 06-VERIFICATION — Hardware

## Phase Goal

Drive real Elgato Stream Deck hardware from the CLI: enumerate devices, prompt if multiple, write button images via Playwright + sharp + `@elgato-stream-deck/node`.

## Must-haves

| Must-have                                                                                   | Status | Evidence                              |
| ------------------------------------------------------------------------------------------- | ------ | ------------------------------------- |
| `src/device/stream-deck.ts` — `connectStreamDeck(selector)`                                 | ✅     | `stream-deck.ts` + 12 tests           |
| `src/device/registry.ts` — `listDevices()` sorted by serial                                 | ✅     | `registry.ts` + 5 tests               |
| `src/device/linux-udev.ts` — udev rules + `installUdevRules()` w/ `UdevPermissionError`     | ✅     | `linux-udev.ts` + 3 tests             |
| `src/util/device-config.ts` — atomic write of selected device                               | ✅     | `device-config.ts` + 4 tests          |
| `src/system/device-selection.ts` — interactive prompt w/ `savedButStale` flag               | ✅     | `device-selection.ts` + 6 tests       |
| `src/render/browser-renderer.ts` — Playwright + sharp hybrid trigger pipeline               | ✅     | `browser-renderer.ts` + 6 tests       |
| `src/render/buffer-hash.ts` — sha1[:16] skip-or-write tracker                               | ✅     | `buffer-hash.ts` + 5 tests            |
| `src/render/screenshot-cadence.ts` — CadenceTimer + EventDebouncer                          | ✅     | `screenshot-cadence.ts` + 6 tests     |
| `src/cli/commands/real-mode.ts` — `runRealMode({...}) → { stop }`                           | ✅     | `real-mode.ts` + 6 tests              |
| `src/cli/commands/run.ts` — full pipeline (load → validate → list → select → connect → run) | ✅     | `run.ts` + 7 tests                    |
| `src/cli/commands/start.ts` — detach + writePid + removePidFile                             | ✅     | `start.ts` + 4 tests                  |
| Total Phase 0+1+2+3+4+5+6 ≥ 280                                                             | ✅     | **288 tests** (cli)                   |
| typecheck clean                                                                             | ✅     | `pnpm --filter sireno-deck typecheck` |
| lint clean (0 warnings)                                                                     | ✅     | `pnpm --filter sireno-deck lint`      |
| format clean                                                                                | ✅     | `pnpm format:check`                   |

## Requirements traceability

- **R13** (Playwright render → screenshot → sharp crop → device write): ✅ `BrowserRenderer` does exactly this with hybrid timer+pub-sub trigger. Skip-or-write via `BufferChangeTracker.update`.
- **R14** (multi-device interactive prompt + selection persisted to device.json): ✅ `selectDevice` prompts via `@inquirer/prompts` when multiple devices or saved-but-stale; `saveDeviceConfig` writes atomically.

## Smoke

```
pnpm exec vitest run
  Test Files: 39 passed
  Tests:       288 passed
  Duration:    ~3s

pnpm --filter sireno-deck typecheck
  cli: clean

pnpm --filter sireno-deck lint
  0 warnings, 0 errors

pnpm format:check
  All matched files use the correct format.
```

## Notes

- SDK API drift discovered in 06-02: `@elgato-stream-deck/node@7.6.3` uses `listStreamDecks()` returning `StreamDeckDeviceInfo[]` (with model/path/serialNumber) and `openStreamDeck(path)` returning `StreamDeck` (handle with MODEL/CONTROLS/methods). The 06-01 code assumed the older combined shape and was refactored to match.
- `keyCount` was removed from `DeviceDescriptor` because `listStreamDecks()` doesn't include `CONTROLS` (only the open handle does). Selection prompts use model/path/serial only.
- `SignalProvider` abstraction in `run.ts` enables test signal injection without touching `process.emit('SIGINT')` (which could disrupt other tests).
- `start.ts` does preflight inline (so config errors reject immediately) then kicks off the lifecycle via `void`. `removePidFile` runs in `.finally` on the background pipeline.
- Udev rules installation is manual (snippet from `formatInstallInstructions()`) — `installUdevRules()` throws `UdevPermissionError` rather than running `pkexec` to avoid surprise elevation.

## Status: PASSED
