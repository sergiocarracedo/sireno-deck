# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-27

The first public release of sireno-deck-2. A complete rewrite of the legacy `sireno-deck` on TypeScript 7 RC + React 19 + Tailwind 4, with a unified Vite frontend that renders in the emulator, on real Stream Deck hardware, or behind a built-in HTTP server.

### Added

- **Workspace + tooling**: pnpm monorepo, TS 7.0 RC, oxlint + oxfmt, vitest (node + jsdom), yargs CLI, pino logger, daemon helpers (PID file in `$XDG_RUNTIME_DIR`).
- **Config system** (`packages/cli/src/config/`): zod-validated `config.yml` with line-aware errors, `@file.yml` inline references, addon entry resolution, hot-reload watcher.
- **Addon API v3**: local-folder and npm addons; lifecycle hooks `onTap`/`onDblTap`/`onHold`; manifest schema with `sirenoAddonApiVersion`; pub-sub state channels for state updates.
- **Deck runtime** (`packages/cli/src/deck/`): pub-sub bus, gesture state machine (`tap` / `dbl-tap` / `hold` with configurable thresholds), store, deck navigation (push/replace), pagination, method handlers.
- **3 core built-in addons**: `core-buttons` (action, change-deck, toggle, media-sample), `internal-settings` (overlay deck), `session` (locked-session overlay).
- **WS bridge v3** (`packages/cli/src/render/ws-bridge.ts`): `hello`/`hello-ack` handshake with optional token; 12 message types; `button-action` carries gesture.
- **Vite plugin** (`packages/cli/src/vite/virtual-modules.ts`, `sirenoDeck2()`): exposes `virtual:sireno/token`, `virtual:sireno/themes/manifest`; writes theme CSS to disk for Tailwind v4 `@source` scanning.
- **React 19 + Tailwind 4 frontend** (`packages/cli/frontend/`): `<Deck>`, `<ButtonFrame>`, `<ButtonRenderer>`, hooks (`useAddonChannel`, `useDeck`, `useButtonAction`); WS client with exponential backoff.
- **Emulator shell** (`packages/cli/frontend-emulator/`): device models (mk2=15 keys, plus=32, mini=6, xl=32), mouse-to-gesture state machine, side panel + iframe to the frontend vite dev server.
- **Hardware mode** (`packages/cli/src/render/`): device enumeration + interactive prompt, Playwright `page.screenshot()` + sharp crop + `@elgato-stream-deck/node` write; udev rules helper for Linux.
- **OS providers** (`packages/cli/src/os-providers/`): Linux (dbus-next, gnome-shell D-Bus, xdotool/ydotool probe, playerctl), macOS (osascript), Windows (PowerShell + UIA).
- **Built-in themes** (`packages/cli/src/themes/`): `default` + `light`; Tailwind 4 `@theme` directive; ButtonFrame primitive; 4 surfaces (IconLabel, Bars, LabelValueList, SplitAction).
- **7 built-in addons** (`packages/cli/src/builtin-addons/`):
  - `date-time` — `core:time`, `core:date`, `core:clock`, `core:analog-clock`, `core:date-time`, `core:locked-time-tile`
  - `emoji-selector` — paginated emoji deck generator (8 categories, 32 emojis per page)
  - `media-player` — `core:media-player` (split action: prev/play-pause/next + volume)
  - `system-status` — `core:system-status` (CPU, RAM, swap, fan, uptime, battery, load avg)
  - `value-display` — `core:value-display` (run shell commands, show output)
  - `weather` — `core:weather` (Open-Meteo, no API key)
  - `brightness` — `core:brightness` (OS-native screen brightness control)
- **Daemon lifecycle**: `start` writes PID + token + children files to `$XDG_RUNTIME_DIR/sireno-deck-2/`; `stop` sends SIGTERM to each tracked child with 5s timeout then SIGKILL; concurrent-start conflict resolved via `@inquirer/prompts` ("Stop and restart" / "Cancel"); token file mode 0600 (32 random bytes base64url).
- **Production HTTP server** (`packages/cli/src/cli/http-server.ts`): Node `http` static server; serves `frontend/dist/`; per-request WS token injection (`<script>window.__SIRENO_TOKEN__ = "..."</script>`); `/health` endpoint; `start` runs the daemon + HTTP server in one process.
- **npm addon loader** (`packages/cli/src/addon/loader.ts`): detects npm specifiers (bare + scoped + `@version`); auto-installs to `~/.cache/sireno-deck-2/node_modules/` via `npm install --prefix`; matches the opencode.ai plugin pattern.
- **Documentation**: repo-root [README](../README.md), per-addon [READMEs](../packages/cli/src/builtin-addons/) for all 10 built-in addons.

### Changed

- Migrated from the legacy `sireno-deck`'s server-side HTML renderer (Playwright + React 18 + Tailwind 3) to a unified Vite frontend that serves all three run modes (emulator / real hardware / dev HMR).
- Replaced the legacy `vue-sirendeck`-style `core:settings-entry` deck-n-1 override flag with a strict reserved slot (the runtime always injects the back/settings/overlay icon; no override allowed).
- Replaced the legacy `snapshot` WS message type with `button-action` carrying `gesture: "tap" | "dbl-tap" | "hold"`.

### Fixed

- Cross-button double-tap state machine bug: the gesture state machine now correctly resets to `down` when the second tap arrives on a different button (rather than firing `dbl-tap` across buttons).
- Emulator gesture thresholds tuned to 500ms (hold) and 500ms (double-tap window) — match real hardware behavior.
- Frontend emulator button overlay buttons are now transparent (opacity-0) so the real frontend buttons show through; the overlay only adds hover/press feedback (opacity 20/30).
- Frontend reads device model from `?device=<id>` query param or `window.__SIRENO_DEVICE_MODEL__` so the same `vite build` output serves any device size.
- Emulator shell deck-frame dimensions now match the frontend deck dimensions exactly (5×96 + 4×8 + 32 = 544×336 for mk2); no scrollbars.
- Cross-button double-tap in the runtime gesture state machine: `await-second` now verifies `event.keyIndex === state.keyIndex` before transitioning to `second-down`.

### Removed

- The legacy `onPress` / `onRelease` / `onActivate` / `onDeactivate` / `poll` / `refresh` lifecycle hooks. Use pub-sub channels + the gesture state machine instead.
- The legacy `vue-sirendeck` `sirendeck-deck-config` message type. Use `deck-config` (the new v3 message).
- The legacy `npm` registry code path was never wired into the v2 CLI; it ships in v0.1.0 via the new `~/.cache/sireno-deck-2/` loader.
