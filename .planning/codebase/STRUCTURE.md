# Structure

Repo is a **pnpm workspace** with a single package (`@sireno-deck/cli`) and three Vite projects bundled inside it.

```
sireno-deck/
├── ARCHITECTURE.md              ← full architectural source of truth (620 lines)
├── MIGRATION-NOTES.md           ← legacy decisions index
├── README.md                    ← quick start + CLI reference
├── CHANGELOG.md
├── config.yml                   ← example/dev config (YAML)
├── package.json                 ← workspace root (scripts: dev/build/test/lint/format/typecheck)
├── pnpm-workspace.yaml          ← packages: ["packages/*"]
├── pnpm-lock.yaml
├── tsconfig.base.json           ← strict TS shared config (ES2022, react-jsx, bundler resolution)
├── vitest.config.ts             ← jsdom for frontend/emulator, node elsewhere
├── oxfmt.json / .oxfmtrc.json   ← formatter config
├── .oxlintrc.json               ← import boundary enforcement (no src→frontend/emulator)
├── .npmrc
├── assets/                      ← icons referenced by config.yml
│   └── chrome.svg
├── docs/
│   └── architecture.mmd         ← mermaid diagram of the system
├── packages/
│   └── cli/                     ← the single workspace package
│       ├── package.json         ← name: sirenodeck, bin: sireno, exports: . / ./api / ./react / ./vite / ./cli
│       ├── tsconfig.json
│       ├── README.md
│       ├── bin/                 ← CLI shims
│       │   ├── sirenodeck.js    ← production entry (delegates to src/cli/main.ts via tsx)
│       │   └── dev.js           ← development entry
│       ├── src/                 ← Node service (TypeScript)
│       │   ├── index.ts         ← public API barrel (re-exports for addon consumers)
│       │   ├── version.ts       ← PACKAGE_NAME, PROTOCOL_VERSION, SIRENO_ADDON_API_VERSION
│       │   ├── vite-env.d.ts
│       │   ├── __tests__/       ← top-level integration tests (addon, cli, config, integration)
│       │   ├── action/          ← action executor (execa wrapper with host.* placeholders)
│       │   │   ├── executor.ts
│       │   │   └── __tests__/
│       │   ├── addon/           ← addon API types, registry, loader, spec
│       │   │   ├── api.ts       ← AddonManifestV1, AddonButtonTypeDef, AddonGlobalBackend
│       │   │   ├── api-types.ts
│       │   │   ├── registry.ts  ← namespace-enforced registry
│       │   │   ├── loader.ts    ← npm + local addon discovery
│       │   │   ├── spec.ts      ← addon spec validation
│       │   │   └── __tests__/
│       │   ├── api/             ← protocol schemas + react adapter
│       │   │   ├── protocol-internal.ts  ← Zod schemas for WS messages (PROTOCOL_VERSION=1)
│       │   │   ├── protocol.ts           ← re-export of protocol-internal
│       │   │   ├── addon.ts              ← addon-related API helpers
│       │   │   ├── react/                ← React hooks for addon frontends
│       │   │   │   ├── index.ts          ← barrel: ChannelRegistry, useAddonChannel, useButtonState, useDeck
│       │   │   │   ├── registry.ts       ← ChannelRegistry (pub/sub state store)
│       │   │   │   ├── use-addon-channel.ts
│       │   │   │   ├── use-button-state.tsx
│       │   │   │   ├── use-deck.ts
│       │   │   │   └── __tests__/
│       │   │   └── __tests__/
│       │   ├── assets/          ← embedded images (logo variants)
│       │   ├── builtin-addons/  ← 11 first-party addons + register-builtins.ts
│       │   │   ├── index.ts     ← manifest aggregator
│       │   │   ├── register-builtins.ts  ← registration order
│       │   │   ├── core/        ← action, change-deck, toggle, page-nav, media-sample
│       │   │   │   ├── sirenodeck.json, index.ts, buttons/, __tests__/
│       │   │   ├── internal-settings/  ← about, brightness, theme (internal: true)
│       │   │   │   ├── sirenodeck.json, index.ts, backend.ts, buttons/, decks/, __tests__/
│       │   │   ├── session/     ← info, time (internal: true), locked deck
│       │   │   │   ├── sirenodeck.json, index.ts, buttons/, decks/, __tests__/
│       │   │   ├── date-time/   ← time, date, analog-clock, locked-time-tile, custom
│       │   │   │   ├── sirenodeck.json, index.ts, poller.ts, buttons/, shared/, __tests__/
│       │   │   ├── emoji-selector/  ← launcher, category, emoji, back, page-nav
│       │   │   │   ├── sirenodeck.json, index.ts, index.tsx, support.ts, buttons/, decks/, assets/, __tests__/
│       │   │   ├── media/       ← player, mute, volume:up, volume:down
│       │   │   │   ├── sirenodeck.json, index.ts, backend.ts, state.ts, progress.ts, buttons/, providers/, __tests__/
│       │   │   ├── system-status/  ← status (cpu, memory, fan, uptime)
│       │   │   │   ├── sirenodeck.json, index.ts, poller.ts, buttons/, domain/, __tests__/
│       │   │   ├── value-display/  ← display (generic value tile)
│       │   │   │   ├── sirenodeck.json, index.ts, poller.ts, buttons/, domain/, __tests__/
│       │   │   ├── weather/     ← weather tile
│       │   │   │   ├── sirenodeck.json, index.ts, backend.ts, poller.ts, buttons/, domain/, provider/, __tests__/
│       │   │   ├── brightness/  ← brightness up/down
│       │   │   │   ├── sirenodeck.json, index.ts, poller.ts, buttons/, domain/, providers/, __tests__/
│       │   │   └── test-buildin/  ← test-only addon (no sirenodeck.json)
│       │   │       └── index.ts, index.d.ts, decks/, __tests__/
│       │   ├── cli/             ← yargs command tree
│       │   │   ├── main.ts      ← process entry (uncaught exception guards, yargs parser)
│       │   │   ├── index.ts     ← buildCli() — registers all commands
│       │   │   ├── cwd.ts       ← CWD resolution helpers
│       │   │   ├── http-server.ts  ← static file server for frontend SPA
│       │   │   └── commands/    ← individual command implementations
│       │   │       ├── run.ts         ← foreground, real mode
│       │   │       ├── start.ts       ← daemonize (pidfile + token + HTTP)
│       │   │       ├── stop.ts        ← kill daemon
│       │   │       ├── status.ts      ← report pidfile state
│       │   │       ├── emulator-mode.ts  ← spawn 2 Vite dev servers
│       │   │       ├── addon-decks.ts    ← list addon decks (CLI utility)
│       │   │       ├── addon-registry.ts ← list addon registry (CLI utility)
│       │   │       └── __tests__/
│       │   ├── config/          ← YAML config loading + validation
│       │   │   ├── loader.ts    ← load + validate config.yml
│       │   │   ├── schemas.ts   ← Zod schemas for config structure
│       │   │   ├── validation.ts
│       │   │   ├── discovery.ts ← config file discovery
│       │   │   ├── reference-expander.ts  ← {{ ref }} expansion
│       │   │   ├── icon-resolver.ts
│       │   │   ├── builtin-icons.ts
│       │   │   └── __tests__/
│       │   ├── core/            ← framework primitives (no business logic)
│       │   │   ├── pub-sub.ts         ← in-process named-channel pub/sub
│       │   │   ├── store.ts           ← persistent per-addon KV (file-backed)
│       │   │   ├── pagination.ts      ← flat button array → paged decks
│       │   │   ├── gesture-state.ts   ← state machine (tap/dbl-tap/hold detection)
│       │   │   ├── icon-asset-registry.ts  ← icon asset ID resolution
│       │   │   ├── icon-source.ts     ← icon source abstraction
│       │   │   ├── asset-id.ts        ← asset ID helpers
│       │   │   ├── mime.ts            ← MIME type detection
│       │   │   ├── watcher.ts         ← file-watch for addon subscriptions
│       │   │   └── __tests__/
│       │   ├── deck/            ← runtime + gesture dispatch + system slot logic
│       │   │   ├── runtime.ts              ← DeckRuntime: navStack, overlay, dispatchGesture
│       │   │   ├── addon-handler-bridge.ts ← wires addon backends to runtime
│       │   │   ├── methods.ts              ← namespaced host methods (runCommand, keyMacro, etc.)
│       │   │   ├── deck-config.ts          ← builds per-deck config payloads
│       │   │   ├── paginate-deck.ts        ← deck pagination logic
│       │   │   ├── macro-parse.ts          ← macro:// protocol parser
│       │   │   ├── host-context.ts         ← host info for action templates
│       │   │   ├── system-back-injection.ts ← n-1 slot: back/settings/overlay-toggle
│       │   │   ├── system-buttons/         ← system button registry + types
│       │   │   │   ├── registry.tsx, types.ts
│       │   │   └── __tests__/
│       │   ├── device/          ← Stream Deck connection + per-model handlers
│       │   │   ├── stream-deck.ts  ← device connection lifecycle
│       │   │   ├── registry.ts     ← model registry (picks right handler)
│       │   │   ├── models.ts       ← DEVICE_MODELS, gridForKeyCount, BUTTON_SIZE_PX
│       │   │   ├── linux-udev.ts   ← udev rules setup
│       │   │   └── __tests__/
│       │   ├── outputClient/    ← OutputClient abstraction
│       │   │   ├── types.ts       ← OutputClient interface
│       │   │   ├── real.ts        ← RealOutputClient (Playwright screenshot → device)
│       │   │   ├── emulator.ts    ← EmulatorOutputClient (pass-through to runtime)
│       │   │   └── __tests__/
│       │   ├── render/          ← WS bridge + protocol + state publishing
│       │   │   ├── ws-bridge.ts           ← WebSocket server (127.0.0.1, port 52937)
│       │   │   ├── state-publisher.ts     ← per-channel cache, active-deck gating
│       │   │   ├── browser-renderer.ts    ← Playwright headless screenshot
│       │   │   ├── screenshot-cadence.ts  ← screenshot timing
│       │   │   ├── emulator-server.ts     ← emulator mode HTTP server
│       │   │   ├── vite-server.ts         ← Vite dev server management
│       │   │   ├── icon-source-resolver.ts ← icon resolution for rendering
│       │   │   ├── buffer-hash.ts         ← image diff detection
│       │   │   ├── protocol.ts            ← re-export of protocol schemas
│       │   │   └── __tests__/
│       │   ├── system/          ← per-platform system providers
│       │   │   ├── providers/
│       │   │   │   ├── active-app.ts    ← ActiveAppProvider interface + factory
│       │   │   │   ├── active-app/      ← linux.ts, darwin.ts, windows.ts
│       │   │   │   ├── key-macro.ts     ← KeyMacroProvider interface + factory
│       │   │   │   ├── key-macro/       ← linux.ts, darwin.ts, windows.ts, parser.ts
│       │   │   │   ├── clipboard.ts     ← ClipboardProvider interface + factory
│       │   │   │   ├── clipboard/       ← linux.ts, darwin.ts, windows.ts
│       │   │   │   ├── session.ts       ← SessionMonitorProvider interface + factory
│       │   │   │   ├── session/         ← linux.ts, darwin.ts, windows.ts
│       │   │   │   ├── error.ts         ← provider error helpers
│       │   │   │   └── shared.ts        ← shared provider utilities
│       │   │   ├── device-selection.ts   ← USB device picker
│       │   │   ├── glob-match.ts         ← overlay-deck glob matcher
│       │   │   ├── virtual-stream-deck.ts ← virtual device for emulator
│       │   │   └── __tests__/
│       │   ├── themes/          ← theme loading + CSS generation
│       │   │   ├── loader.ts    ← resolves active theme (built-in/local/npm)
│       │   │   ├── css.ts       ← generates CSS from theme tokens
│       │   │   ├── manifest.ts  ← theme manifest types
│       │   │   ├── index.ts     ← barrel exports
│       │   │   ├── use-resolved-theme.tsx  ← React context for theme
│       │   │   ├── default/     ← built-in default theme
│       │   │   │   ├── sirenodeck.json, components.css, assets/, __tests__/
│       │   │   └── __tests__/
│       │   ├── ui/              ← React component library (theme-driven)
│       │   │   ├── index.ts     ← barrel exports
│       │   │   ├── ButtonFrame.tsx       ← outer button wrapper (size, press state)
│       │   │   ├── theme-presentation.tsx ← ThemeUiPresentationProvider context
│       │   │   ├── primitives/   ← atomic UI components
│       │   │   │   ├── Icon.tsx, Label.tsx, Text.tsx, Chip.tsx
│       │   │   │   ├── TapIndicator.tsx, ProgressBar.tsx
│       │   │   │   ├── index.ts, __tests__/
│       │   │   ├── surfaces/    ← composite button layouts
│       │   │   │   ├── IconLabelSurface.tsx, BarsSurface.tsx
│       │   │   │   ├── LabelValueListSurface.tsx, SplitActionSurface.tsx
│       │   │   │   └── index.ts
│       │   │   ├── contexts/    ← React context providers
│       │   │   │   └── AssetCacheContext.tsx
│       │   │   └── utils/
│       │   │       ├── cn.ts             ← className merge utility
│       │   │       └── negative-color.ts ← color inversion for overlays
│       │   ├── util/            ← misc utilities
│       │   │   ├── logger.ts    ← pino logger factory
│       │   │   ├── errors.ts    ← error types + helpers
│       │   │   ├── daemon.ts    ← pidfile management
│       │   │   ├── cache-paths.ts  ← XDG-style cache directory resolution
│       │   │   ├── device-config.ts ← device config helpers
│       │   │   ├── migrate-paths.ts ← path migration for upgrades
│       │   │   └── __tests__/
│       │   └── vite/            ← Vite plugin for addon virtual modules
│       │       ├── virtual-modules.ts  ← resolves virtual:sireno/* imports
│       │       ├── index.ts
│       │       └── __tests__/
│       ├── frontend/            ← Vite SPA — renders the active deck
│       │   ├── index.html
│       │   ├── vite.config.ts   ← @vitejs/plugin-react + @tailwindcss/vite
│       │   ├── .sireno-deck/    ← build output / state
│       │   └── src/
│       │       ├── main.tsx     ← React root mount
│       │       ├── App.tsx      ← top-level: theme resolve, WS client, <Deck/>
│       │       ├── index.css    ← Tailwind entry
│       │       ├── components/
│       │       │   ├── Deck.tsx         ← visual grid (ButtonFrame × N)
│       │       │   └── ErrorBoundary.tsx ← per-button crash isolation
│       │       ├── bridge/      ← typed WS client
│       │       │   ├── client.ts        ← createWsClient with reconnect backoff
│       │       │   ├── ws-context.tsx   ← React context for WS connection
│       │       │   ├── use-button-action.ts  ← sends button-action messages
│       │       │   └── __tests__/
│       │       ├── __mocks__/   ← virtual module stubs for tests
│       │       │   ├── token.ts, theme.ts, themes-manifest.tsx, addons-registry.ts
│       │       └── __tests__/   ← frontend integration tests
│       │           ├── app-navigation.test.tsx, ws-integration.test.tsx
│       │           ├── deck-render.test.tsx, system-buttons-render.test.tsx
│       └── emulator/            ← Vite SPA — embeds frontend + click overlay
│           ├── index.html
│           ├── vite.config.ts
│           ├── .sireno-deck/
│           └── src/
│               ├── main.tsx     ← React root mount
│               ├── App.tsx      ← wires to WS bridge
│               ├── Shell.tsx    ← outer shell (deck tree + deck frame)
│               ├── DeckFrame.tsx ← iframe embed + clickable overlay
│               ├── SidePanel.tsx ← deck tree sidebar
│               ├── gesture.ts   ← own gesture detector (wraps core constants)
│               ├── bridge.ts    ← emulator-specific WS helpers
│               ├── index.css
│               └── __tests__/
│                   ├── setup.ts, gesture.test.ts
│                   ├── bridge.test.ts, DeckFrame.test.tsx, shell-render.test.tsx
└── .planning/                  ← learnship planning artifacts
    ├── codebase/               ← ARCHITECTURE, STRUCTURE, CONVENTIONS, STACK, etc.
    └── research/               ← phase-specific research docs
```

## Naming conventions

- **Files:** lowercase, kebab-case for multi-word (`addon-handler-bridge.ts`).
- **Classes/types:** PascalCase.
- **Functions/vars:** camelCase.
- **Constants:** SCREAMING_SNAKE (`HOLD_ACTION_DELAY_MS`, `PROTOCOL_VERSION`).
- **Addon manifests:** `${addonName}:` namespace prefix (enforced by registry).
- **YAML config:** `snake_case` keys.
- **Test files:** `*.test.ts` / `*.test.tsx` in co-located `__tests__/` dirs.
- **Addon discovery:** `sirenodeck.json` in each addon root.
- **Platform files:** `{provider-name}/{platform}.ts` (e.g. `key-macro/linux.ts`).

## Where to find things

- **"What does a button type look like?"** → `packages/cli/src/builtin-addons/core/buttons/{action,change-deck,...}/`
- **"How does the runtime navigate?"** → `packages/cli/src/deck/runtime.ts`
- **"What's the WS protocol?"** → `packages/cli/src/api/protocol-internal.ts` + `render/protocol.ts`
- **"Where does gesture detection live?"** → `packages/cli/src/core/gesture-state.ts` (shared) + `packages/cli/emulator/src/gesture.ts` (emulator only)
- **"How do I write a 3rd-party addon?"** → `ARCHITECTURE.md §3.5` + `packages/cli/src/addon/api.ts` + any builtin's README
- **"What system providers exist?"** → `packages/cli/src/system/providers/` — interface file + per-platform dirs
- **"How are themes loaded?"** → `packages/cli/src/themes/loader.ts` (resolve) → `css.ts` (generate) → `virtual:sireno/themes/manifest` (inject)
- **"How does the frontend subscribe to state?"** → `packages/cli/src/api/react/use-addon-channel.ts` + `frontend/src/bridge/client.ts`
- **"What's exported for addon consumers?"** → `packages/cli/src/index.ts` (public barrel: gesture, UI, theme, device types)
