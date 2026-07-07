# Stack

> Mirror of `ARCHITECTURE.md` §11, kept here so this directory is self-contained.

## Language & Runtime

- **TypeScript** ~5.7 (strict mode)
- **Node.js** >=20.x LTS

## Core

| Concern | Tool |
|---|---|
| CLI parsing | yargs ^18.0 |
| Hardware | @elgato-stream-deck/node ^7.6 |
| Rendering | React ^19.x + react-reconciler + sharp ^0.34 |
| Config | js-yaml ^4.1 + zod ^3.x |
| System stats | systeminformation ^5.x |
| Command execution | execa ^9.x |
| Logging | pino ^9.x |

## Tooling

- **Lint** — oxlint
- **Format** — oxfmt
- **Test** — vitest
- **Build** — tsdown
- **Frontend bundler** — Vite (frontend + emulator SPAs)
- **Real-mode capture** — Playwright (headless)

## Device Models

@elgato-stream-deck supports `mk2`, `plus`, `mini`, `xl`. Key count varies; `DEFAULT_KEY_COUNT = 15` in `render/ws-bridge.ts`. Linux udev setup required for USB.

## Workspace Layout

```
sireno-deck/
├── packages/cli/
│   ├── src/                # Node service (TS)
│   │   ├── cli/            # yargs commands + daemon lifecycle
│   │   ├── deck/           # runtime, methods, addon bridge, system-back
│   │   ├── addon/          # addon API + registry
│   │   ├── builtin-addons/ # first-party addons
│   │   ├── action/         # command executor
│   │   ├── core/           # pub-sub, store, gesture-state, pagination
│   │   ├── render/         # WS bridge, protocol, browser renderer
│   │   ├── api/            # protocol schemas (zod)
│   │   ├── system/         # platform providers (active-app, media, …)
│   │   ├── themes/         # loader + CSS builder
│   │   ├── ui/             # shared React surfaces (SplitActionSurface, primitives)
│   │   ├── config/         # loaders + validation
│   │   └── device/         # Stream Deck device + model registry
│   ├── frontend/           # Vite SPA — bundled into dist/, served by daemon
│   ├── emulator/           # Vite SPA — interactive emulator for dev
│   └── package.json
├── addons/                 # user-installed addon folders
├── builtin-addons/         # symlinks / mirrors of packages/cli/src/builtin-addons
├── themes/                 # dark.yml, light.yml
├── ARCHITECTURE.md         # source of truth
└── config.yml
```

## Notable Choices

- **No DOM in addon rendering** — React components use a custom reconciler host config (`packages/cli/src/render/`), not the browser DOM. The frontend Vite SPA *does* use the real DOM, but addon authors don't import from `react-dom`.
- **Two execution modes** — `real` (Playwright screenshots the frontend, blits to device) and `emulator` (Vite spawns frontend + emulator iframe, sends `button-action` WS messages). Both share the same runtime + addon layer.
- **WS protocol is the integration seam** — `packages/cli/src/api/protocol-internal.ts` is the only contract between service and frontend.