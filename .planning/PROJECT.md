---
project: sireno-deck-2
type: greenfield-tooling
milestone: v0.1.0 — CLI + addon system + emulator
status: active
created: 2026-06-23
---

# sireno-deck-2

A small ecosystem to manage Elgato Stream Deck devices. The first deliverable is a CLI that loads a `config.yml`, registers addons, runs a Vite frontend, exposes a WS bridge, and either drives real hardware or renders an emulator.

## What this is

A TypeScript monorepo (`pnpm` workspace, single `packages/cli`) that builds a CLI named `sireno`. The CLI:

1. Loads `config.yml` (with line-aware errors and `@file.yml` inline references)
2. Discovers, loads, and validates addons (local folders or npm packages)
3. Spins up a Vite dev server (HMR) for the React 19 + Tailwind 4 frontend
4. Exposes a WS bridge (protocol v3, optional token handshake) for the frontend and emulator
5. Either renders snapshots to real hardware (`@elgato-stream-deck/node`) or runs an emulator shell (iframe to the frontend + side panel)
6. Targets Linux, macOS, and Windows with OS-specific providers for session lock, active app, key macro, and media player

## Why this exists

Legacy `/works/opensource/sireno-deck` does most of this, but is React 18 + Tailwind 3 with a server-side HTML renderer for hardware. sireno-deck-2 unifies the render path: the same Vite frontend is rendered in real mode (Playwright), in emulator mode (iframe), and in dev mode (HMR).

## Core requirements

| ID  | Requirement                                                                                                                                                               | Phase   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------- | --- |
| R1  | Single `config.yml` drives decks, buttons, themes, addons                                                                                                                 | 02      |
| R2  | `decks.main` is required and is the main deck (no `main_deck` property)                                                                                                   | 02      |
| R3  | Reserved slot `n-1` (back / settings / overlay icon) is always injected; no override flag                                                                                 | 02      |
| R4  | Addons registered via string-or-`{ source, enabled? }`; name/id from manifest                                                                                             | 02      |
| R5  | Icon refs resolve through one function: relative path, `icon://`, `builtin://`, `addon://`                                                                                | 02      |
| R6  | Decks can be defined programmatically by addons via `createDecks({ config, deck })`                                                                                       | 03      |
| R7  | Built-in addons: `core-buttons`, `internal-settings`, `session`, `date-time`, `emoji-selector`, `media-player`, `system-status`, `value-display`, `weather`, `brightness` | 03, 09  |
| R8  | Gesture state machine outputs only `tap                                                                                                                                   | dbl-tap | hold`(no`press-then-release`) | 03  |
| R9  | WS bridge v3 with handshake (`hello` / `hello-ack`), `button-action` carrying `gesture`, no `snapshot` message                                                            | 04      |
| R10 | WS token generated on `start`, not on `run`; injected via `SIRENO_TOKEN` env + `virtual:sireno/token` module (dev) or `<script>` injection (prod)                         | 04, 10  |
| R11 | Vite plugin (`sireno-deck-2/vite`) registers addon/theme folders                                                                                                          | 04      |
| R12 | Emulator renders the frontend vite in an iframe; mouse events become gestures via shell gesture state machine                                                             | 05      |
| R13 | Real hardware mode uses Playwright `page.screenshot()` + `sharp` crop + `@elgato-stream-deck/node`                                                                        | 06      |
| R14 | Multi-device interactive prompt with arrow keys; selection persisted to `$XDG_CONFIG_HOME/sireno-deck-2/device.json`                                                      | 06      |
| R15 | Linux active-app via gnome-shell D-Bus + Wayland gnome variant; Linux media via `playerctl`                                                                               | 07      |
| R16 | macOS via osascript; Windows via PowerShell + UIA                                                                                                                         | 07      |
| R17 | Tailwind 4 themes via CSS variables + `@theme` directive; two built-ins (`default`, `light`)                                                                              | 08      |
| R18 | Daemon: `start`/`stop`/`status` write/read PID + token to `$XDG_RUNTIME_DIR`; graceful shutdown                                                                           | 10      |
| R19 | npm addon loader via `require.resolve`                                                                                                                                    | 10      |
| R20 | Production HTTP server injects `window.__SIRENO_TOKEN__` into `dist/frontend/index.html`                                                                                  | 10      |

## Non-goals (v0.1)

- No persistence of state across runs (ephemeral in-memory only)
- No service-manager integration (no systemd / launchd / Windows Service in v1)
- No multi-device parallel (one device at a time)
- No pure-Wayland support (gnome-shell or X11 only)
- No web/desktop app (only CLI + emulator)

## Stack

- **Language:** TypeScript 7.0 RC (ES2022 + DOM lib)
- **Bundler:** rolldown (CLI + frontend); esbuild fallback
- **Dev HMR:** vite for frontend, `tsx --watch` for CLI
- **Test:** vitest (node + jsdom projects)
- **Lint / format:** oxlint + oxfmt
- **UI:** React 19 + Tailwind 4
- **WS:** `ws`
- **Config:** `yaml` (eemeli) + `zod` v4
- **Logger:** `pino`
- **CLI:** `yargs`
- **Shell exec:** `execa`
- **Screenshots:** `playwright` + `sharp`
- **Hardware:** `@elgato-stream-deck/node`
- **OS providers:** Linux: `dbus-next`, `systeminformation`, `playerctl`; macOS: `osascript`; Windows: PowerShell + UIA
- **Hot-reload:** `chokidar` v5

## Repo shape

```
sireno-deck-2/
├── package.json          # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── oxlint.json
├── oxfmt.json
├── vitest.config.ts
├── .planning/
│   ├── config.json
│   ├── PLAN.md
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── AGENTS.md
│   └── phases/
└── packages/cli/
    ├── package.json
    ├── bin/sireno.js
    └── src/
        ├── version.ts
        ├── cli/
        ├── config/
        ├── addon/
        ├── core/
        ├── util/
        ├── builtin-addons/   # Phase 03+
        ├── themes/            # Phase 08
        ├── deck/              # Phase 03+
        ├── device/            # Phase 06
        ├── render/            # Phase 04+
        ├── system/            # Phase 07
        ├── action/            # Phase 03
        ├── icons/             # Phase 02 (CLI-builtin icons)
        ├── api/               # Phase 04
        ├── react/             # Phase 04
        ├── vite/              # Phase 04
        └── frontend/          # Phase 04
```

## References

- Canonical plan: `.planning/PLAN.md`
- Legacy reference: `/works/opensource/sireno-deck` (for behavior only, not code)
