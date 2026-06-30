# sireno-deck — Canonical Plan

> Single source of truth for the project. All decisions in this document are locked.
> Reference legacy: `/works/opensource/sireno-deck` (used only for behavior reference, not as code base).

---

## 1. Goal

A small ecosystem — **CLI** (primary), website (later), desktop app (later) — to manage Elgato Stream Deck devices. A single `config.yml` drives decks, buttons, themes, and addons. Three execution modes share one frontend bundle:

- **Hardware mode** — Playwright runs the frontend vite, snapshots each key, writes to the device via `@elgato-stream-deck/node`. Gestures (tap / dbl-tap / hold) are inferred locally from raw down/up and sent to the WS bridge.
- **Emulator mode** — second vite serves an iframe shell + side panel; the same frontend vite is rendered inside an iframe; mouse events on the shell are converted to gestures and sent to the WS bridge.
- **Dev mode** — frontend HMR via vite; CLI runs via `tsx --watch`.

---

## 2. Stack

| Concern       | Choice                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Language      | TypeScript 7.0 RC (ES2022, ES2023 lib + DOM)                                                        |
| Bundler       | rolldown (CLI + frontend); esbuild as fallback                                                      |
| Dev HMR       | vite for frontend, `tsx --watch` for CLI                                                            |
| Test          | vitest                                                                                              |
| Lint / format | oxlint + oxfmt                                                                                      |
| UI            | React 19 + Tailwind 4 (CSS variables, `@theme` directive)                                           |
| WS            | `ws` server + client                                                                                |
| Config        | `js-yaml` + `zod`                                                                                   |
| Logger        | `pino`                                                                                              |
| Shell exec    | `execa`                                                                                             |
| Screenshots   | `playwright` + `sharp`                                                                              |
| Hardware      | `@elgato-stream-deck/node`                                                                          |
| OS providers  | Linux: `dbus-next`, `systeminformation`, `playerctl`; macOS: `osascript`; Windows: PowerShell + UIA |
| Daemon        | PID file in `$XDG_RUNTIME_DIR`; `@inquirer/prompts` for interactive selection                       |
| Packaging     | pnpm workspaces, single `packages/cli`                                                              |
| Hot-reload    | `chokidar` v5                                                                                       |
| YAML parsing  | `yaml` (eemeli) — line-number aware                                                                 |

---

## 3. Repo Layout

```
sireno-deck/
├── package.json                  # root workspace
├── pnpm-workspace.yaml           # packages: ['packages/*']
├── tsconfig.base.json
├── oxlint.json
├── oxfmt.json
├── vitest.config.ts              # alias @ → packages/cli/src
├── .planning/
│   ├── config.json               # learnship settings
│   └── PLAN.md                   # this file
└── packages/
    └── cli/
        ├── package.json          # name: sireno-deck, bin: sireno
        ├── tsconfig.json
        ├── bin/sireno.js         # spawns tsx + cli/main.ts
        └── src/
            ├── version.ts        # constants
            ├── index.ts          # public exports
            ├── cli/              # yargs CLI surface + commands
            ├── config/           # schemas, loader, icon-resolver, validation, discovery
            ├── addon/            # api, manifest, loader, registry
            ├── core/             # watcher (chokidar)
            ├── util/             # logger, daemon
            ├── builtin-addons/   # bundled addons (Phase 2+)
            ├── themes/default/   # Phase 7+
            ├── deck/             # Phase 2+
            ├── device/           # Phase 5+
            ├── render/           # Phase 3+
            ├── system/           # Phase 6+
            ├── action/           # Phase 2+
            ├── icons/            # CLI-builtin icons (icon://)
            └── __tests__/        # vitest tests
```

All cross-package code lives in `packages/cli`. Sub-path exports from CLI:

- `sireno-deck` — main
- `sireno-deck/api` — types + addon contract (Phase 3)
- `sireno-deck/react` — react hooks/components for addons (Phase 3)
- `sireno-deck/vite` — vite plugin for addon/theme injection (Phase 3)

---

## 4. Architecture

```
┌─────────────────────────── CLI process ────────────────────────────┐
│                                                                    │
│   ┌────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│   │ Config     │───▶│ Addon        │───▶│ Deck runtime         │   │
│   │ loader     │    │ registry     │    │ - nav stack          │   │
│   └────────────┘    └──────────────┘    │ - overlay state      │   │
│                                          │ - gesture machine    │   │
│                                          └──────────┬───────────┘   │
│   ┌────────────┐    ┌──────────────┐               │               │
│   │ Action     │───▶│ Pub-sub bus  │◀──────────────┤               │
│   │ executor   │    │ (channels)   │               │               │
│   └────────────┘    └──────────────┘               │               │
│                                          ┌──────────▼───────────┐   │
│                                          │ WS bridge           │◀──┼─── addons publish channels
│                                          │ ws://127.0.0.1:port │   │
│                                          │ + token handshake   │   │
│                                          └──────────┬───────────┘   │
│                                                     │               │
│   ┌──────────────────────┐    ┌──────────────────┐  │               │
│   │ Hardware controller  │    │ Spawn manager    │  │               │
│   │ - device I/O         │    │ - vite (frontend)│  │               │
│   │ - gesture inference  │    │ - vite (emulator)│  │               │
│   │ - keyCount supply    │    │ - playwright     │  │               │
│   └──────────┬───────────┘    └────────┬─────────┘  │               │
│              │                         │            │               │
└──────────────┼─────────────────────────┼────────────┼───────────────┘
               │                         │            │
   ┌───────────▼──────────┐    ┌──────────▼─────────┐  │
   │ Hardware stream deck │    │ Playwright         │  │
   │ (real device)        │    │ (real mode render) │  │
   └──────────────────────┘    └────────────────────┘  │
                                                    │
                                            ┌───────▼────────┐
                                            │ Frontend vite  │
                                            │ (shared)       │
                                            └───────┬────────┘
                                                    │
                                  ┌─────────────────┴────────────────┐
                                  │                                  │
                          ┌───────▼─────────┐               ┌────────▼────────┐
                          │ Emulator shell  │               │ Iframe in shell │
                          │ (own vite)      │               │ (frontend vite) │
                          └─────────────────┘               └─────────────────┘
```

---

## 5. CLI Surface

```bash
sireno run [--emulator] [--dev] [--config <path>] [--device-model <m>] \
           [--port <N>] [--log-level <level>] [--verbose]
sireno start [--emulator] [--config <path>] [--device-model <m>] [--port <N>] [--log-level <level>]
sireno stop
sireno status
sireno --version
```

- `run` = foreground dev (no daemon, no token, vite HMR, `tsx --watch` for CLI).
- `start` = detached daemon (writes PID + token to `$XDG_RUNTIME_DIR`).
- `stop` = kills daemon via PID file.
- `status` = reads PID file, prints state.
- `--emulator` = don't talk to real hardware; use virtual stream deck.
- `--device-model` = affects **emulator only** (mk2=15, plus=32, mini=6, xl=32). Real mode reads keyCount from device.
- Ports default to OS-assigned free ports (passed via env to vite/plugin).

---

## 6. Config (`config.yml`)

```yaml
theme: default # string (resolved from themes/)
logging:
  level: info
decks:
  main:
    name: Home
    background: ./bg/main.png # relative to config file
    buttons:
      - position: 0
        type: 'core:change-deck'
        config:
          deck: media
          icon: icon://play # resolved by resolveIconRef()
      # ...
  media:
    name: Media
    paginated: true # optional (default false); chunks by keyCount-2
    buttons:
      - type: 'core:media-play-pause'
      - type: 'core:media-next'
      # ...
  spotify-overlay:
    icon: icon://spotify
    autoShow: true
    trigger:
      process_name: [spotify] # or window_name:
    buttons:
      - position: 0
        type: 'core:media-play-pause'
addons:
  - ./addons/local-clock # string → local
  - core-buttons # string → npm
  - '@me/extra@1.2.0' # string → npm pinned
  - source: ./addons/special # object → local, optional enabled
    enabled: false
session:
  locked_deck: session:locked # lock deck supplied by session built-in addon
```

### Resolved rules

| Item                           | Rule                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `decks.main`                   | **required**, always the main deck. No `main_deck` property.                                                                                                             |
| `keyCount`                     | NOT in config. From hardware (or emulator via `--device-model`).                                                                                                         |
| `paginated`                    | Optional per deck (default `false`). CLI chunks list into pages of `keyCount-2`.                                                                                         |
| Slot `n-1`                     | Reserved system button: `main` deck → settings entry; regular → back; overlay → deck icon.                                                                               |
| Slot `n-2`                     | In paginated decks only → next-page system button.                                                                                                                       |
| `addons[]` entry               | string-or-`{ source, enabled? }`. No `name` in config. Detection: starts with `.`, `/`, `~`, or contains path separator → local; else npm (npm-version spec if present). |
| `@file.yml`                    | Inline import of another deck buttons file.                                                                                                                              |
| `background` / `icon`          | Path relative to config file's directory. Also `icon://<id>`, `builtin://<addon>/<path>`, `addon://<addon>/<path>`. Resolved by `resolveIconRef(ref, ctx)`.              |
| `paste` block                  | REMOVED. CLI auto-detects OS keystroke capability; `pasteText` method uses OS provider.                                                                                  |
| `allow_reserved_slot_override` | REMOVED. Slot `n-1` always reserved.                                                                                                                                     |

### Validation

1. Two-phase: bootstrap (deck shape, `main` exists, reserved slot collisions) → full (expand addon `deckType`, parse per-button `configSchema`).
2. Line-number-aware error reporting (`yaml` package keeps source tokens).
3. Addon `internal: true` buttons rejected if used directly in user config.

### Icon resolver

```ts
resolveIconRef(ref: string, ctx: { configDir: string; builtinIconIds: string[] }): IconSource
// IconSource = { kind: 'path', value: string }
//            | { kind: 'cli-builtin', id: string }
//            | { kind: 'builtin-addon', addon: string, path: string }
//            | { kind: 'addon', addon: string, path: string }
//
// - relative path → resolved against ctx.configDir (./ ../ ~/ or contains / \)
// - 'icon://<id>'      → CLI builtin icon (validated against ctx.builtinIconIds)
// - 'builtin://<addon>/<path>'  → resolve through builtin addon manifest
// - 'addon://<addon>/<path>'    → resolve through third-party addon manifest
```

45 CLI-builtin icon ids (stable library shipped with sireno-deck core): `play, pause, stop, next, prev, settings, back, home, menu, wifi, bluetooth, volume-up, volume-down, volume-mute, battery-full, battery-half, battery-low, battery-charging, cpu, memory, clock, calendar, spotify, chrome, firefox, discord, slack, terminal, code, file, folder, download, upload, link, refresh, search, plus, minus, check, x, info, warning, error, help, more`.

### Config discovery order

`--config` flag → `$SIRENO_CONFIG` env → `<cwd>/config.yml` → `$XDG_CONFIG_HOME/sireno-deck/config.yml` → null.

---

## 7. Decks

| Type          | Where defined                                                                                                                           | Reserved slots                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `main`        | User config (required: `decks.main`)                                                                                                    | `n-1`: settings entry                                       |
| Regular       | User config                                                                                                                             | `n-1`: back                                                 |
| Paginated     | User config with `paginated: true`                                                                                                      | `n-1`: back; `n-2`: next-page                               |
| Overlay       | User config with `trigger` + `icon`                                                                                                     | `n-1`: deck's own icon (toggle)                             |
| Programmatic  | Addon (incl. core built-ins) via `createDecks({ config, deck })` returning config-shape objects (with `internal: true` buttons allowed) | Per deck type rules above                                   |
| Lock deck     | `session` built-in addon via `createDecks`                                                                                              | Renders current time on multiple buttons (no reserved slot) |
| Settings deck | `internal-settings` built-in addon via `createDecks`                                                                                    | Standard slot `n-1`: back                                   |
| Emoji deck    | `emoji-selector` built-in addon via `createDecks`                                                                                       | Standard slot `n-1`: back                                   |

`createDecks` shape:

```ts
defineAddonDeck({
  type: 'session-locked',
  configSchema: z.object({ timeFormat: z.string().default('HH:mm') }),
  createDecks: ({ config }) => ({
    'session:locked': {
      name: 'Locked',
      buttons: [
        /* internal-typed buttons */
      ],
    },
  }),
})
```

---

## 8. Buttons

```ts
defineAddonButton({
  type: 'core:change-deck',
  internal: false,
  configSchema: z.object({ deck: z.string(), addToHistory: z.boolean().default(true) }),
  render: ({ config }) => /* React component */,
  onTap: async ({ config, methods, hostContext }) => methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory }),
  onDblTap: async () => {},
  onHold: async () => {},
  defaultRenderIntervalMs: 1000,
  dispose: async () => {},
});
```

**Lifecycle hooks (only):** `onTap`, `onDblTap`, `onHold`, `dispose`. Removed: `onPress`, `onRelease`, `onActivate`, `onDeactivate`, `poll`, `refresh` (use pub-sub).

**Gesture state machine outputs only:** `tap | dbl-tap | hold`. No `press-then-release`. Raw down/up are inferred into gestures by the hardware manager (real mode) or emulator shell (emulator mode). The frontend never sees raw down/up.

**System buttons** (`internal: true`):

- `core:back` — previous deck in nav stack
- `core:settings-entry` — only on main deck
- `core:overlay-toggle` — only on overlay decks (renders deck's own icon)
- `core:next-page` — only on paginated decks
- `core:temporary-error` — transient errors from addon loading/render

---

## 9. Themes

Folder structure:

```
themes/default/
  manifest.yml
  theme.css
  index.tsx
  ButtonFrame.tsx
  components/Icon.tsx
  components/Label.tsx
```

`manifest.yml`:

```yaml
name: default
colorTokens:
  bg: '#0a0a0a'
  fg: '#ffffff'
  accent: '#3b82f6'
  # ... 8 tokens
typography:
  label: 'Inter, system-ui, sans-serif'
  # ... 3 roles
main: index.tsx
buttonFrame: ButtonFrame.tsx
surfaces:
  splitAction: ./surfaces/SplitAction.tsx
ui:
  icon: ./components/Icon.tsx
  label: ./components/Label.tsx
  text: ./components/Text.tsx
  tapIndicator: ./components/TapIndicator.tsx
assets:
  styles: [./theme.css]
tailwind:
  safelist: []
```

- Theme applied **globally** (no per-deck override).
- Theme may replace `ButtonFrame`, surfaces, and UI primitives.
- Tailwind 4: tokens are CSS variables; theme emits `@theme { --color-bg: …; }` block.
- `resolveTheme(name)` loads from cwd → `themes/` → npm addons.

---

## 10. Addons

### Distribution modes

- **Local**: folder path (`./addons/my-addon` or `/abs/path`). Reads `package.json` + `sirenoAddon` manifest.
- **npm**: package name (with optional `@version`). Loader uses `require.resolve` (deferred — Phase 9).

### Manifest (in `package.json`)

```json
{
  "name": "@me/my-addon",
  "version": "1.2.3",
  "sirenoAddon": {
    "apiVersion": 3,
    "main": "./dist/index.js",
    "frontend": "./dist/frontend.js",
    "peerDep": "sireno-deck ^1.0.0"
  }
}
```

### Contract (`sireno-deck/api`)

```ts
export const SIRENO_ADDON_API_VERSION = 3

export interface SirenoAddon {
  apiVersion: 3
  name: string // from manifest
  buttons: AddonButtonTypeDefinition[]
  decks?: AddonDeckDefinition[]
  assets?: { styles?: string[] }
  frontend?: { main: string; styles?: string[] }
}

export interface AddonButtonTypeDefinition {
  type: string // namespaced, e.g. 'core:change-deck'
  internal?: boolean // true = not usable in user config
  configSchema: z.ZodTypeAny
  render: (ctx: ButtonRenderCtx) => React.ReactNode
  onTap?: (ctx: ButtonActionCtx) => void | Promise<void>
  onDblTap?: (ctx: ButtonActionCtx) => void | Promise<void>
  onHold?: (ctx: ButtonActionCtx) => void | Promise<void>
  defaultRenderIntervalMs?: number
  dispose?: () => void | Promise<void>
  full?: boolean // opt out of ButtonFrame
}

export interface AddonDeckDefinition {
  type: string
  configSchema?: z.ZodTypeAny
  createDecks: (ctx: {
    config: ResolvedConfig
    deck?: AddonDeckInstance
  }) => Record<string, AddonGeneratedDeck>
}
```

### Built-in addons (bundled with CLI)

| Addon               | Buttons                                                               | Decks (via `createDecks`) |
| ------------------- | --------------------------------------------------------------------- | ------------------------- |
| `core-buttons`      | `core:action`, `core:change-deck`, `core:toggle`, `core:media-sample` | —                         |
| `date-time`         | `core:date-time`                                                      | —                         |
| `emoji-selector`    | `core:emoji-selector` (on tap, navigates to `emoji` deck)             | `emoji`                   |
| `media-player`      | `core:media-*`                                                        | —                         |
| `system-status`     | `core:cpu`, `core:memory`, `core:battery` (via pub-sub)               | —                         |
| `value-display`     | `core:value`                                                          | —                         |
| `weather`           | `core:weather`                                                        | —                         |
| `brightness`        | `core:brightness`                                                     | —                         |
| `internal-settings` | `core:settings-*`                                                     | `settings`                |
| `session`           | `core:session-info`                                                   | `session:locked`          |

### Icon resolution for addons

- `addon://<addon-name>/<path>` → 3rd-party addon assets
- `builtin://<addon-name>/<path>` → built-in addon assets

Both resolved via the same `resolveIconRef` function.

---

## 11. Pub-sub (state channel)

Addons publish typed channels; buttons subscribe via `useAddonChannel`.

```ts
// In an addon (system-status):
methods.publish('system:cpu', { usage: 0.42, timestamp: Date.now() })

// In a button render:
const cpu = useAddonChannel<{ usage: number; timestamp: number }>('system:cpu')
```

- Channel registry lives in CLI; not exposed on WS as raw pub/sub.
- Bridge emits `state` message when subscribed channels update (debounced 100ms).
- Channels are typed by the publisher (addon zod schema).

---

## 12. WS Bridge v3

**v3 protocol**, server at `ws://127.0.0.1:<port>`, optional token in handshake.

### Handshake

```
client → server:  { type: 'hello', version: 3, token?: string }
server → client:  { type: 'hello-ack', version: 3, keyCount: number, config: <sanitized> }
                  or close(4001, 'token mismatch')
```

### Messages

| Direction    | `type`               | Payload                                 |
| ------------ | -------------------- | --------------------------------------- | -------------------------- | ------------ |
| CLI → client | `hello-ack`          | `{ version, keyCount, config }`         |
| CLI → client | `deck-config`        | `{ deckId, surfaces, navMode }`         |
| CLI → client | `state`              | `{ channels: Record<string, unknown> }` |
| CLI → client | `decks-list`         | `{ decks: Array<{ id, name, icon }> }`  |
| CLI → client | `show-overlay`       | `{ deckId }                             | null }`                    |
| client → CLI | `hello`              | `{ version, token? }`                   |
| client → CLI | `button-action`      | `{ deckId, position, gesture: 'tap'     | 'dbl-tap'                  | 'hold' }`    |
| client → CLI | `method-call`        | `{ callId, name, args }`                |
| client → CLI | `select-deck`        | `{ deckId }`                            |
| client → CLI | `deck-active`        | `{ deckId, mode: 'navigation'           | 'overlay', history: 'push' | 'replace' }` |
| client → CLI | `dismiss-overlay`    | `{}`                                    |
| both         | `method-call-result` | `{ callId, result                       | error }`                   |

**Removed vs legacy v2:** `snapshot` message (Playwright captures screenshots locally in real mode; emulator iframes frontend vite).

### Token flow

- Auto-generated on `start` (daemon); no token in `run` (dev).
- CLI spawns vite as child process with `SIRENO_TOKEN=<token>` env var.
- CLI vite plugin (`sireno-deck/vite`) exposes token via virtual module:
  ```ts
  import { token } from 'virtual:sireno/token'
  ```
- Frontend imports the virtual module, sends token in `hello` handshake.
- For prod (`dist/frontend/`), CLI serves via a small Node HTTP server that injects `<script>window.__SIRENO_TOKEN__='…'</script>` into `index.html`.

---

## 13. Frontend

- Single React 19 app in `packages/cli/frontend/`.
- Vite plugin (`sireno-deck/vite`) registers addon/theme folders via `vite.config.ts` virtual modules.
- WS client (`bridge/`) handles handshake, state subscriptions, method calls.
- Per-deck render: `<Deck>` → `<ButtonFrame>` (unless button sets `full: true`) → button's `render(ctx)`.
- HMR in dev mode; prebuilt `dist/frontend/` for prod.
- Decoupled from CLI/emulator: shares only `bridge/` types via `sireno-deck/api`.

**Bundle contract for addons:** addon exports `frontend?: { main: string; styles?: string[] }` which the CLI vite plugin dynamically imports.

---

## 14. Emulator

- A separate vite dev server (sibling of frontend vite).
- Serves a shell: side panel (deck picker, action log, WS message log, state inspector) + iframe pointing at frontend vite URL.
- Shell renders iframe with the active deck's `keyCount × layout` (from `--device-model` flag).
- Shell converts mouse events on the deck grid into `button-action` messages with `gesture: 'tap' | 'dbl-tap' | 'hold'` (inferred locally from raw down/up via gesture state machine).
- Shell also connects to the WS bridge independently (not via iframe) to inject button actions.
- Iframe frontend connects to the WS bridge independently for its own state subscription.

---

## 15. Hardware

- CLI hardware controller: `@elgato-stream-deck/node` wrapper.
- On start: enumerate devices. If zero → error. If one → use it. If multiple → interactive prompt (arrow keys via `@inquirer/prompts`), save selection to `$XDG_CONFIG_HOME/sireno-deck/device.json`.
- Playwright runs the frontend vite URL, calls `page.screenshot()` every 500 ms (configurable), crops with `sharp` into per-key buffers, writes via `fillKeyBuffer`.
- Skip when buffer hash unchanged.
- Gesture inference (tap / dbl-tap / hold) happens locally; only the inferred gesture is sent to WS bridge.
- Linux udev rules helper script bundled for first-time setup.

---

## 16. OS-specific

| Concern        | Linux                                     | macOS                                        | Windows                       |
| -------------- | ----------------------------------------- | -------------------------------------------- | ----------------------------- |
| Session lock   | `dbus-next` (screensaver interface)       | `osascript`                                  | PowerShell session API        |
| Active app     | gnome-shell D-Bus + Wayland gnome variant | AppleScript `System Events`                  | UIA `GetForegroundWindow`     |
| Key macro      | `xdotool` / `ydotool` / `dotool` (probe)  | AppleScript `keystroke`                      | PowerShell `SendKeys`         |
| Media player   | `playerctl` (MPRIS)                       | `osascript` (Spotify/etc.)                   | PowerShell SMTC               |
| Daemon PID dir | `$XDG_RUNTIME_DIR` then `/tmp`            | `~/Library/Application Support/sireno-deck/` | `%LOCALAPPDATA%\sireno-deck\` |

---

## 17. Build

- **Dev:**
  - `pnpm dev` → `tsx --watch` for CLI + vite for frontend + vite for emulator.
- **Prod:**
  - `pnpm build` → rolldown bundles CLI to `packages/cli/dist/cli/bundle.cjs`; rolldown-vite builds frontend to `packages/cli/dist/frontend/`.
  - Bundler fallback: esbuild for CLI if rolldown blockers.
- **Lint/format:** oxlint + oxfmt on pre-commit via lefthook.
- **Typecheck:** `tsc --noEmit` in CI.

---

## 18. Testing

- **Vitest** with two projects: `cli` (node env) and `frontend` (jsdom env).
- Coverage focus:
  - Config loader + validation (including line-number errors)
  - Addon loader (local + npm)
  - Gesture state machine (tap / dbl-tap / hold only)
  - Icon resolver (all 4 schemes)
  - WS protocol roundtrip
  - Deck runtime: nav stack, overlay, pagination
  - OS providers (mocked)
- **No E2E in v1.** Manual smoke test plan documented.

---

## 19. Implementation Phases

| #   | Phase                            | Status  | Key outputs                                                                                                                                                                         |
| --- | -------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Scaffold                         | ✅ done | pnpm workspace, TS 7.0 RC, oxlint/oxfmt/vitest, yargs CLI shell, pino, daemon helpers                                                                                               |
| 1   | Config + Addon Loader            | ✅ done | zod schemas, `resolveIconRef`, line-aware YAML loader, `@file.yml` expander, addon manifest + loader + registry, `ConfigWatcher` (chokidar)                                         |
| 2   | Deck Runtime + Built-ins         | 🔜 next | pub-sub bus, gesture state machine (tap/dbl-tap/hold), store, pagination, deck runtime (nav/overlay/reserved slots), `core-buttons`, `internal-settings`, `session` built-in addons |
| 3   | WS Bridge v3 + Frontend Skeleton | pending | WS bridge with token handshake, vite plugin (`./vite`), virtual module, frontend React app (`./react`), `useAddonChannel` hook, `<Deck>` + `<ButtonFrame>`                          |
| 4   | Emulator                         | pending | Emulator vite shell, side panel, iframe to frontend vite, mouse-to-gesture mapping, `--device-model` grid                                                                           |
| 5   | Hardware                         | pending | Device enumeration + interactive prompt, Playwright render → screenshot → sharp crop → device write, Linux udev helper                                                              |
| 6   | OS Providers                     | pending | Linux (dbus-next, gnome-shell D-Bus, xdotool/ydotool probe, playerctl), macOS (osascript), Windows (PowerShell + UIA)                                                               |
| 7   | Built-in Themes                  | pending | `themes/default` + `themes/light` manifests, Tailwind 4 tokens, `ButtonFrame` + surfaces                                                                                            |
| 8   | Remaining Built-in Addons        | pending | `date-time`, `emoji-selector` (+ emoji deck), `media-player`, `system-status` (pub-sub), `value-display`, `weather`, `brightness`                                                   |
| 9   | Daemon + Polish                  | pending | `start`/`stop`/`status` real implementation, PID + token files, prod HTTP server (token injection into `index.html`), graceful shutdown, npm addon loader via `require.resolve`     |
| 10  | Docs + Release                   | pending | README + per-addon docs, `pnpm package` script, v0.1.0 release                                                                                                                      |

---

## 20. Locked Decisions Log

Recorded here for posterity; each was explicitly confirmed by the user.

1. **Bundler**: rolldown for CLI + frontend. Vite is migrating to rolldown-vite; using rolldown directly aligns frontend prod build. Single tool for both. Fallback: esbuild for CLI.
2. **Logger**: pino. With pino-pretty for dev.
3. **Daemon PID file**: `$XDG_RUNTIME_DIR` on Linux, platform-appropriate on macOS/Windows. Auto-created.
4. **CLI commands**: `run` (foreground dev) + `start/stop/status` (daemon). No service manager integration in v1.
5. **State**: ephemeral in-memory. No persistence in v1.
6. **Vite addon injection**: vite plugin registers addon folders via virtual modules.
7. **Hot-reload**: config + addon/theme folders via chokidar. On change, keep active deck if it still exists, else reset to `main`.
8. **Subscription API**: pub-sub. Addons publish typed channels, buttons subscribe via `useAddonChannel` hook.
9. **Addon API surface**: only `onTap/onDblTap/onHold/dispose`. No `onPress/onRelease/onActivate/onDeactivate/poll/refresh`.
10. **Built-in decks**: lock deck + settings deck always present, cannot be disabled.
11. **Pagination**: built-in deck type with `paginated: true` flag. CLI chunks buttons into pages of `keyCount-2`. Slot n-2 = next-page system button.
12. **Tailwind 4 + themes**: CSS variables for tokens, `@theme` directive.
13. **CLI package exports**: `.`, `./api`, `./react`, `./vite` (all sub-paths).
14. **Minor features kept**: `@filename.yml` references, `addon://` + `builtin://` + `icon://` asset refs, temporary error deck, overlay last-slot = deck's own icon.
15. **CLI flags**: minimal — `run [--emulator] [--dev] [--config] [--port] [--log-level] [--verbose]` + `start/stop/status`.
16. **Default ports**: random/free (port 0).
17. **WS protocol**: v3 fresh design. No `snapshot` message. `button-action` carries `gesture` not raw down/up.
18. **Session-lock**: built-in `session` addon publishes `session.locked` channel.
19. **No `main_deck` property**: `decks.main` is required and is the main deck.
20. **No `keyCount` in config**: supplied by hardware (real mode) or `--device-model` flag (emulator).
21. **`paginated` optional**: default `false`.
22. **No `paste` block**: OS-detected keystroke via key-macro provider.
23. **No `allow_reserved_slot_override`**: slot `n-1` always reserved.
24. **Addons config**: string-or-`{ source, enabled? }`. No `name` in config — id/name from addon manifest. Detection rule for string form: starts with `.`, `/`, `~`, or contains path separator → local; else npm.
25. **Icon refs**: relative path (resolved against config file's directory), `icon://<id>` → CLI builtin icons, `builtin://<addon>/<path>` → built-in addon, `addon://<addon>/<path>` → 3rd-party addon. Common resolver: `resolveIconRef(ref, ctx)`.
26. **Decks defined programmatically**: addons and core can define decks via `createDecks({ config, deck })` returning config-shape objects, with `internal: true` buttons allowed.
27. **Emoji selector**: built-in button type that, on tap, navigates to the `emoji` deck provided by the emoji built-in addon via `createDecks`.
28. **Gesture state machine outputs**: only `tap | dbl-tap | hold`. No `press-then-release`.
29. **Device selection**: if multiple devices, interactive prompt with arrow keys, save to `$XDG_CONFIG_HOME/sireno-deck/device.json`.
30. **Linux active-app**: gnome-shell D-Bus + Wayland gnome variant (same as legacy).
31. **Linux media-player**: `playerctl` (MPRIS).
32. **Emulator `keyCount`**: auto from `--device-model` flag (mk2=15, plus=32, mini=6, xl=32).
33. **WS token**: env var + virtual module. CLI spawns vite with `SIRENO_TOKEN` env var; vite plugin exposes via `virtual:sireno/token`. Prod CLI HTTP server injects `<script>window.__SIRENO_TOKEN__=…</script>` into `index.html`.
34. **Addon peer-dep**: `sireno-deck ^1.0.0`.
35. **Addon versioning**: `apiVersion` mismatch → warn but still load.
36. **Multiple decks of same type**: merge by id.
37. **Theme scoping**: global only, no per-deck override.
38. **CLI `--version`**: semver from `package.json`.
39. **Addon error surfacing**: pino log + transient error button (system).
40. **Graceful shutdown**: SIGINT/SIGTERM, close WS, kill vite/playwright.
41. **Exit codes**: 0 success, 1 generic error, 2 config error, 3 daemon error, 4 device error.
42. **CLI internal config**: none.
43. **Headless Chromium flags**: env-var override (`SIRENO_CHROMIUM_FLAGS`), default sane flags.

---

## 21. Open Risks

1. **rolldown maturity** — beta; esbuild fallback defined.
2. **TypeScript 7.0 RC** — RC APIs may shift; pin exact version.
3. **WS bridge token injection in prod** — needs care; injected `<script>` must come before app bundle.
4. **Pure Wayland (no gnome-shell)** — explicitly unsupported in v1.
5. **Multi-device parallel** — v1 supports one device at a time; multi-device is a future phase.
6. **oxlint OOM in this dev env** — root-level `oxlint packages` OOMs when scanning `node_modules` containing large config schemas. Workaround: per-package lint works fine (`pnpm --filter sireno-deck lint`). May be host-specific.

---

## 22. Current Progress

### Phase 0 — Scaffold ✅

- pnpm workspace, TS 7.0.1-rc, oxlint 1.71, oxfmt, vitest, yargs, pino, daemon helpers.
- 8/8 vitest tests passing.

### Phase 1 — Config + Addon Loader ✅

- 38 config tests + 23 addon tests passing (69/69 total).
- Config schemas, icon resolver (4 schemes), YAML loader with line numbers, `@file.yml` expander, config discovery, bootstrap validation.
- Addon manifest reader, entry normalization (string-or-object), local loader via dynamic `import()`, registry.
- `ConfigWatcher` (chokidar v5) for hot-reload.
- `pnpm typecheck` clean. `pnpm --filter sireno-deck lint` clean. `pnpm format:check` clean.

### Deferred items (kept for tracking)

- npm addon loader (Phase 9)
- Per-button `configSchema` validation (Phase 2 — uses registry)
- Reject `internal: true` buttons in user config (Phase 2)
- `./api`, `./react`, `./vite` sub-path exports actual files (Phase 3)
- `frontend/` directory (Phase 3)

---

## 23. Phase 2 entry criteria

Start Phase 2 when ready. Phase 2 deliverables:

- `src/core/` directory: pub-sub bus, gesture state machine, store, pagination helpers
- `src/deck/` directory: runtime, system-decks/, system-buttons/
- `src/action/` directory: executor (execa + host.\* interpolation)
- `src/builtin-addons/` directory: `core-buttons`, `internal-settings`, `session`
- Tests for runtime, gesture state machine, pagination, store
- Wire `core-buttons` to use the registry to validate button configs at load time
- Reject `internal: true` buttons when found in user config

Estimated test count after Phase 2: ~110-130 (adding ~40-60 new tests).
