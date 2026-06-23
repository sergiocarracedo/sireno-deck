---
current_phase: 05-emulator
phase_status: complete
plans_total: 3
plans_complete: 3
last_updated: 2026-06-23
---

# Project State

## Current phase

**Phase 05: emulator** — complete. All 3 plans executed, 239 tests passing (224 cli + 15 frontend-emulator), verification passed.

Next phase: **06-hardware** (real device enumeration, Playwright headless render, sharp crop, `@elgato-stream-deck/node` write, Linux udev helper).

## Plan progress

- Plans total: 3
- Plans complete: 3
- UAT: not done (deferred to /verify-work)
- Phase verified: yes (`05-VERIFICATION.md` → passed)

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
- 39 new tests (24 from Plan 01 + 15 from Plan 03; Plan 02 used existing shell-render tests)
- Total: 239 tests

## Active subagent tasks

None.

## Deferred items

- npm addon loader — Phase 10
- Per-button `configSchema` validation against registry — Phase 03 (done)
- Reject `internal: true` buttons in user config — Phase 03 (done)
- Real CLI run/start wiring — Phase 09
- Emulator shell (originally centered iframe) — replaced with direct DeckFrame grid; design decision in Phase 05
- frontend-emulator lint script — still missing (typecheck + format cover surface)
