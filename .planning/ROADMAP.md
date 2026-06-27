---
milestone: v0.1.0
title: Stream Deck CLI + addon system + emulator
phases_total: 11
created: 2026-06-23
---

# Roadmap — v0.1.0

CLI runs, loads `config.yml`, registers addons, drives an emulator or real hardware, manages deck navigation, gestures, overlay decks, and built-in addons/themes.

## Milestone success criteria

- A user can write a `config.yml` with decks, buttons, addons, and a theme and run `sireno run --emulator` to see the deck rendered
- A user with an Elgato Stream Deck can run `sireno run` to drive it with Playwright snapshots
- 3rd-party addon authors can ship a local folder or npm package that registers new button types and decks
- WS bridge v3 handshake works with token in daemon mode
- 69+ tests passing across config + addon + core + emulator + hardware + OS layers

## Phases

| #   | Slug           | Status  | Goal                                                                                                                                               |
| --- | -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | scaffold       | ✅ done | Workspace, TS 7.0 RC, oxlint/oxfmt/vitest, yargs CLI shell, pino, daemon helpers                                                                   |
| 02  | config-addons  | ✅ done | `config.yml` zod schemas, `resolveIconRef`, line-aware YAML loader, `@file.yml` expander, addon loader + registry, hot-reload watcher              |
| 03  | deck-runtime   | 🔜 next | Pub-sub bus, gesture state machine (tap/dbl-tap/hold), store, pagination, deck runtime, core-buttons + internal-settings + session built-in addons |
| 04  | ws-frontend    | pending | WS bridge v3 with token handshake, vite plugin (`./vite`), frontend React app (`./react`), `useAddonChannel` hook, `<Deck>` + `<ButtonFrame>`      |
| 05  | emulator       | ✅ done | Emulator vite shell, side panel, iframe to frontend vite, mouse-to-gesture mapping, `--device-model` grid                                          |
| 06  | hardware       | ✅ done | Device enumeration + interactive prompt, Playwright render → screenshot → sharp crop → device write, Linux udev helper, real-mode CLI integration  |
| 07  | os-providers   | ✅ done | Linux (dbus-next, gnome-shell D-Bus, xdotool/ydotool probe, playerctl), macOS (osascript), Windows (PowerShell + UIA)                              |
| 08  | builtin-themes | ✅ done | `themes/default` + `themes/light` manifests, Tailwind 4 tokens, `ButtonFrame` + surfaces                                                           |
| 09  | builtin-addons | ✅ done | `date-time`, `emoji-selector` (+ emoji deck), `media-player`, `system-status` (pub-sub), `value-display`, `weather`, `brightness`                  |
| 10  | daemon-polish  | ✅ done | `start`/`stop`/`status` real implementation, PID + token files, prod HTTP server (token injection), graceful shutdown, npm addon loader            |
| 11  | release        | pending | README + per-addon docs, `pnpm package` script, v0.1.0 release                                                                                     |
| 12  | addon-frontend | pending | Frontend addon registry: each addon ships a `frontend.tsx` React component; backend adds `addonName` + `frontendEntry` to deck-config buttons; frontend Deck dynamically imports + renders the component inside `<ButtonFrame>`; surfaces subscribe to state channels via `ChannelRegistry`. Goal: emulator/frontend shows real button surfaces (clock, weather widget, system bars) — not just type-name labels. |

## Traceability

| Phase | Requirements                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------- |
| 01    | (infrastructure)                                                                                |
| 02    | R1, R4, R5                                                                                      |
| 03    | R6, R7 (core-buttons + internal-settings + session), R8                                         |
| 04    | R9, R10, R11                                                                                    |
| 05    | R12                                                                                             |
| 06    | R13, R14                                                                                        |
| 07    | R15, R16                                                                                        |
| 08    | R17                                                                                             |
| 09    | R7 (date-time, emoji-selector, media-player, system-status, value-display, weather, brightness) |
| 10    | R18, R19, R20                                                                                   |
| 11  | (release)                                                                                       |
| 12  | R17 (addon frontend registry), R7 (extends builtin addons with frontend components)            |

## Risk register

1. **rolldown maturity** — beta; esbuild fallback defined in PLAN.md §20
2. **TypeScript 7.0 RC** — pin exact version; APIs may shift
3. **WS bridge token injection in prod** — needs care (injected `<script>` before app bundle)
4. **Pure Wayland (no gnome-shell)** — explicitly unsupported in v1
5. **oxlint OOM in dev env** — root-level `oxlint packages` OOMs when scanning large `node_modules`. Workaround: per-package lint works fine
