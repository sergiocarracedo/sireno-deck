---
current_phase: 08-builtin-themes
phase_status: executing
plans_total: 2
plans_complete: 1
last_updated: 2026-06-24
---

# Project State

## Current phase

**Phase 08: builtin-themes** — Plan 01 complete, Plan 02 pending.

**Plan 01** (Wave 1) ✅: Theme contract + Vite plugin + `default` theme end-to-end (commit 8204fe4, 397 tests passing).
**Plan 02** (Wave 2): `light` theme as thin override + WS `deck-config` theme wiring.

## Plan progress

- Plans total: 3
- Plans complete: 3
- UAT: not done (deferred to /verify-work)
- Phase verified: yes (`06-VERIFICATION.md` → passed)

## Completed phases

### ✅ Phase 01 — scaffold

- pnpm workspace, TS 7.0.1-rc, oxlint 1.71, oxfmt, vitest 4.x, yargs 17, pino 9
- Daemon helpers (PID file in `$XDG_RUNTIME_DIR`, `start/stop/status`)
- 8 vitest tests passing (cli.test.ts)

### ✅ Phase 02 — config-addons

- zod schemas, `resolveIconRef` (4 schemes), YAML loader w/ line info
- `@file.yml` expander, bootstrap validation, addon loader/registry
- 38 config + 23 addon = 61 new tests
- Total: 69 tests

### ✅ Phase 03 — deck-runtime

- core primitives (pub-sub, gesture-state, store, pagination)
- action executor + deck runtime + methods + system back injection
- 3 built-in addons (core-buttons, internal-settings, session) + full validation
- Integration test (tracer bullet): load → validate → register → dispatch → execute
- 38 + 30 + 18 = 86 new tests
- Total: 155 tests

### ✅ Phase 04 — ws-frontend

- WS bridge v3 with token handshake (handshake `hello` / `hello-ack`, token rejection → 4001)
- WS protocol v3 (12 message types, no `snapshot` message)
- Vite spawn manager (READY port line, restart on crash)
- Vite plugin (`sirenoDeck2()`) — virtual modules `virtual:sireno/token`, `virtual:sireno/addons`
- React 19 + Tailwind 4 frontend (Deck, ButtonFrame, ButtonRenderer)
- React hooks (useAddonChannel, useDeck, useButtonAction) + WS client
- Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s, max 10 attempts → failed)
- 45 new tests
- Total: 200 tests

### ✅ Phase 05 — emulator

- Device models (mk2=15, plus=32, mini=6, xl=32) + emulator server
- VirtualStreamDeckLifecycle with `injectKeyEvent`
- frontend-emulator workspace pkg (Vite + React 19 + Tailwind 4, jsdom test env)
- Side panel + center iframe approach replaced with direct DeckFrame grid in Shell
- Mouse → gesture via cli `nextGesture` (tap/dbl-tap/hold)
- WS client with exponential backoff
- 39 new tests
- Total: 239 tests

### ✅ Phase 06 — hardware

- Device enumeration: `listStreamDecks()` (SDK v7 API) returns `StreamDeckDeviceInfo[]` w/ model/path/serialNumber
- `connectStreamDeck(selector)` opens + returns `StreamDeck` handle (MODEL/CONTROLS/methods)
- Udev rules helper (Linux): literal rules + `formatInstallInstructions()` + `installUdevRules()` throws `UdevPermissionError`
- `device-config.ts` atomic write to `$XDG_CONFIG_HOME/sireno-deck-2/device.json`
- `device-selection.ts` interactive prompt w/ `savedButStale` flag (via `@inquirer/prompts`)
- Browser renderer pipeline: Playwright + sharp, hybrid trigger (timer 500ms + pub-sub debounce 50ms), per-key BufferChangeTracker (sha1[:16]) skip-or-write
- `runRealMode({frontendUrl, device, logger})` → `{ stop }` with try/finally device.close
- `run.ts` pipeline: loadConfig → validateFull → listDevices → selectDevice → saveDeviceConfig → connectStreamDeck → runRealMode + signal handler
- `start.ts` daemon: preflight synchronously (rejects on errors), writePid, kick off pipeline in background, removePidFile in `.finally`
- `SignalProvider` abstraction enables test signal injection without `process.emit`
- 49 new tests (33 from Plan 01 + 24 from Plan 02 + 17 from Plan 03, but Plan 02 dropped 7 from Plan 01's 40 = 17 net delta)
- Total: 288 tests

## Active subagent tasks

None.

## Deferred items

- npm addon loader — Phase 10
- Real CLI run/start wiring — Phase 06 (done)
- Emulator shell (originally centered iframe) — replaced with direct DeckFrame grid; design decision in Phase 05
- frontend-emulator lint script — still missing (typecheck + format cover surface)
- Udev rules auto-install via pkexec — manually copied by user; Phase 06 design decision
