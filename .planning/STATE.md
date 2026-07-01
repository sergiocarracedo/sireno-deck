---
current_phase: 15-theme-base-ui
phase_status: done
plans_total: 0
plans_complete: 0
last_updated: 2026-06-28
---

# Project State

## Milestone shipped: v0.1.0

All 13 phases complete. 484 tests passing. Documentation released.

## Phase 12 (addon-frontend-registry) — complete ✓

**3/3 plans executed. Verification passed. 469 tests passing.**

End-to-end pipeline: addon manifests → vite plugin registry → buildDeckConfigMessage adds `addonName` + `frontendEntry` → frontend Deck.tsx renders addon components → `useAddonChannel` subscribes → CLI StatePublisher polls OS state and broadcasts via WS.

**Wire-up complete (commit `8fcb188`):**

- `runEmulatorLifecycle` instantiates StatePublisher via `runEmulatorMode.onBridgeReady`
- 6 builtin addon pollers registered (date-time, weather, system-status, media-player, value-display, brightness)
- Subscribes to `runtime:activeDeck` and starts/stops polling per the visible addon set
- Stops on shutdown

**Known limits:** media-player / weather / value-display / brightness pollers return placeholder values; real OS polling requires wiring to Phase 07 OS providers.

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

## Phase 13 (ui-alignment) — complete ✓

**3/3 plans executed. 484 tests passing (3 pre-existing ButtonFrame test failures unrelated to this phase).**

Legacy visual alignment: theme CSS tokens match v1 exact hex values (#2e3540 bg, #eef2f7 fg, #7dd3fc accent, #53738B frame). IBM Plex Sans/Mono replace Inter/JetBrains Mono via @font-face. All 5 components (Text, Icon, Label, Chip, TapIndicator) and 4 surfaces (IconLabel, Bars, LabelValueList, SplitAction) re-implemented with data-sireno-ui-\* attributes. All 6 built-in addon frontends migrated from raw `<span>` to `<Text>` component.

- **13-01:** Theme CSS tokens + fonts + @font-face (`7b592b3`)
- **13-02:** Components + surfaces (`c2e2c40`)
- **13-03:** Addon frontend migration (`71b3af4`, `1a0bbd3`)

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
- emulator workspace pkg (Vite + React 19 + Tailwind 4, jsdom test env)
- Side panel + center iframe approach replaced with direct DeckFrame grid in Shell
- Mouse → gesture via cli `nextGesture` (tap/dbl-tap/hold)
- WS client with exponential backoff
- 39 new tests
- Total: 239 tests

### ✅ Phase 06 — hardware

- Device enumeration: `listStreamDecks()` (SDK v7 API) returns `StreamDeckDeviceInfo[]` w/ model/path/serialNumber
- `connectStreamDeck(selector)` opens + returns `StreamDeck` handle (MODEL/CONTROLS/methods)
- Udev rules helper (Linux): literal rules + `formatInstallInstructions()` + `installUdevRules()` throws `UdevPermissionError`
- `device-config.ts` atomic write to `$XDG_CONFIG_HOME/sireno-deck/device.json`
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

## Roadmap Evolution

- Phase 14 added: Media player backend — wire poller to OS media provider (playerctl), publish real state, execute transport actions via backend
- Phase 15 added: Theme base UI — migrate legacy `src/ui/` as shareable base layer so themes don't need to reimplement components/surfaces
- Phase 16 added: Migrate weather addon — fix type errors, broken imports, invalid tone values, and manifest type reference in weather addon

## Deferred items

- npm addon loader — Phase 10
- Real CLI run/start wiring — Phase 06 (done)
- Emulator shell (originally centered iframe) — replaced with direct DeckFrame grid; design decision in Phase 05
- emulator lint script — still missing (typecheck + format cover surface)
- Udev rules auto-install via pkexec — manually copied by user; Phase 06 design decision

## Quick Tasks Completed

| #   | Description                                                                | Date       | Commit  | Directory                                               |
| --- | -------------------------------------------------------------------------- | ---------- | ------- | ------------------------------------------------------- |
| 003 | Correct button size (72x72px) + render real buttons                        | 2026-06-27 | 6ab6fe4 | `.planning/quick/003-correct-button-size/`              |
| 004 | Emulator button fixes (cross-button dbl-tap + crystal visuals)             | 2026-06-27 | 3b221c5 | `.planning/quick/004-emulator-button-fixes/`            |
| 005 | Gesture thresholds (500ms) + transparent emulator buttons + clean frontend | 2026-06-27 | 8a5fccf | `.planning/quick/005-gesture-and-cleanup/`              |
| 006 | Frontend forces deck dimensions based on device model                      | 2026-06-27 | 28ec043 | `.planning/quick/006-deck-dimensions/`                  |
| 007 | Share BUTTON_SIZE_PX constant frontend↔emulator                            | 2026-06-27 | 70233d9 | (no quick dir)                                          |
| 008 | Respect button position + add gap + match emulator frame                   | 2026-06-27 | 583d849 | (no quick dir)                                          |
| 009 | Deck grid background is always black                                       | 2026-06-27 | 8f40011 | (no quick dir)                                          |
| 010 | Show button type as label fallback (until addon frontend registry)         | 2026-06-27 | 5a2c40f | (no quick dir)                                          |
| 011 | Add phase 12 (addon-frontend-registry) to roadmap                          | 2026-06-27 | 7de539c | (no quick dir)                                          |
| 012 | Capture frontend/emulator vite stderr in CLI errors                        | 2026-06-29 | 47d9e8f | `.planning/quick/009-capture-frontend-emulator-stderr/` |

Last activity: 2026-06-29 - Completed quick task 012: capture frontend/emulator vite stderr in CLI
