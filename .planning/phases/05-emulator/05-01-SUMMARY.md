---
phase: 05-emulator
plan: 05-01
completed: 2026-06-23
tests_added: 24
tests_total: 224
status: done
---

# 05-01-SUMMARY — Device Models + Virtual Stream Deck + Emulator Server

## What was built

Foundation for Phase 05 — three small modules:

1. **device/models.ts** — Static catalog of supported Stream Deck models (mk2=15, plus=32, mini=6, xl=32) with `keyCount`, `columns`, `rows`. Helpers: `getDeviceModel(id)`, `isKnownDeviceModel(id)`, `resolveKeyCount(id | undefined)`, `gridForKeyCount(keyCount)` (also handles 1/2/3/8 + arbitrary counts via sqrt-based layout).
2. **system/virtual-stream-deck.ts** — EventEmitter-based `VirtualStreamDeckLifecycle` for emulator mode. `injectKey(type, keyIndex)` (range-checked), `injectKeyEvent(event)`, `onKeyEvent(handler)` (returns unsubscribe), `clear()`. Optional `autoTimestamp` flag (default `true`) — auto uses `Date.now()`, manual uses `0` for deterministic testing.
3. **render/emulator-server.ts** — Spawn manager for the emulator Vite dev server. Parses `READY <port>` line from stdout. `closeEmulator` does SIGTERM → 2-second wait → SIGKILL. `parseReadyLine` is exported for direct testing.

## Key files

- `src/device/models.ts` — 45 lines, static catalog + helpers
- `src/device/models.test.ts` — 12 tests
- `src/device/index.ts` — barrel
- `src/system/virtual-stream-deck.ts` — 65 lines
- `src/system/virtual-stream-deck.test.ts` — 7 tests
- `src/render/emulator-server.ts` — 95 lines
- `src/render/emulator-server.test.ts` — 5 tests (parseReadyLine + emulatorServerEntryExists; spawn mocking deferred to integration test in Plan 05-03)

## Decisions made

- **`parseReadyLine` extracted as a pure function** — testable without spawning child processes. Integration test for the actual spawn behavior lands in Plan 05-03 with proper mock WS server.
- **No package.json pre-check** — initial version required `package.json` before spawning; removed to keep tests simple and to avoid tight coupling.
- **Dropped the `__test_internals` export** — unnecessary once we extracted `parseReadyLine`.

## Bugs / adjustments

- Initial test tried to mock `node:child_process` with `vi.mock` and vi.spyOn simultaneously — caused 10-second timeouts. Replaced with direct testing of `parseReadyLine` (the only behavior worth covering in isolation).
- Lint flagged `...(options.env ?? {})` as useless spread fallback — `...options.env` works directly when `env` is optional.

## Notes for downstream

- Plan 05-02 will use `--device-model` flag → `resolveKeyCount(modelId)` → grid dimensions in `DeckFrame`.
- Plan 05-03's integration test will spawn a fake vite child with a controlled `READY <port>` line + mock WS server.
- Virtual stream-deck is currently exported but not wired into the runtime — that's Phase 06 (hardware) or Phase 09 (daemon). For Phase 05, the emulator shell injects key events directly via the bridge (Plan 05-03).

## Smoke

- `pnpm exec vitest run` → 224/224 passing (was 200; added 24)
- `pnpm typecheck` → clean
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 164 files conform
