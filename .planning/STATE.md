---
current_phase: 10-daemon-polish
phase_status: plans-ready
plans_total: 2
plans_complete: 0
last_updated: 2026-06-27
---

# Project State

## Current phase

**Phase 10: daemon-polish** — context + research + 2 plans ready. Phase 09 (builtin-addons) complete.

Phase 09 verification (`09-VERIFICATION.md`): passed. All 7 builtin addons registered, `config.yml` validates, emulator shows buttons in correct grid positions, 409/409 tests pass. Real button surfaces (clock, weather widget) are explicit scope of phase 12.

**Phase 10 plans ready:**
- `10-01-PLAN.md` (Wave 1): daemon lifecycle + prod HTTP server with token injection (R10 prod, R18, R20)
- `10-02-PLAN.md` (Wave 2): npm addon loader via `~/.cache/sireno-deck-2/node_modules/` (R19)

**Next:** `/execute-phase 10` — start with plan 10-01 (daemon + HTTP server), then plan 10-02 (npm loader).

## Plan progress

- Phase 09 plans total: 2
- Phase 09 plans complete: 2 (09-01, 09-02)
- Phase 09 UAT: not done formally; verification passed (`09-VERIFICATION.md`)

## Phase 12 — addon-frontend-registry (planned, not started)

Captured 2026-06-27 after quick task 010 ("show button type as label fallback").

**Goal:** each addon ships a React `frontend.tsx` that renders the button surface. The frontend dynamically imports it and renders the real surface (clock face, weather widget, system bars) instead of a type-name label.

**Why now:** phase 09 shipped builtin addons with `render` functions for the CLI host (hardware key images), but the emulator/frontend has no way to call them. Buttons show `CORE:TIME` text instead of a live clock.

**Scope (see `.planning/phases/12-addon-frontend-registry/12-PHASE.md`):**

1. Extend `AddonManifest.frontend` to be a real path consumed by the vite plugin.
2. Ship `frontend.tsx` for 6 builtin addons (date-time, weather, system-status, value-display, media-player, brightness).
3. Vite plugin emits `virtual:sireno/addons/registry` for dynamic imports.
4. Backend `buildDeckConfigMessage` includes `addonName` + `frontendEntry` per button.
5. Frontend Deck does `import(frontendEntry)` and renders the component inside `<ButtonFrame>`.
6. Components subscribe to state channels via `useAddonChannel` / `ChannelRegistry`.

**Depends on:** 08 (themes — needs surface primitives), 09 (builtin addons — needs addon types).

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

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 003 | Correct button size (72x72px) + render real buttons | 2026-06-27 | 6ab6fe4 | `.planning/quick/003-correct-button-size/` |
| 004 | Emulator button fixes (cross-button dbl-tap + crystal visuals) | 2026-06-27 | 3b221c5 | `.planning/quick/004-emulator-button-fixes/` |
| 005 | Gesture thresholds (500ms) + transparent emulator buttons + clean frontend | 2026-06-27 | 8a5fccf | `.planning/quick/005-gesture-and-cleanup/` |
| 006 | Frontend forces deck dimensions based on device model | 2026-06-27 | 28ec043 | `.planning/quick/006-deck-dimensions/` |
| 007 | Share BUTTON_SIZE_PX constant frontend↔emulator | 2026-06-27 | 70233d9 | (no quick dir) |
| 008 | Respect button position + add gap + match emulator frame | 2026-06-27 | 583d849 | (no quick dir) |
| 009 | Deck grid background is always black | 2026-06-27 | 8f40011 | (no quick dir) |
| 010 | Show button type as label fallback (until addon frontend registry) | 2026-06-27 | 5a2c40f | (no quick dir) |
| 011 | Add phase 12 (addon-frontend-registry) to roadmap | 2026-06-27 | 7de539c | (no quick dir) |

Last activity: 2026-06-27 - Phase 09 executed and verified; phase 12 added to roadmap; quick tasks 007-011 committed (emulator polish + roadmap plan)
