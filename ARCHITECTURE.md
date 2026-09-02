# Sireno Deck — Architecture

> Read top-to-bottom on first contact describes the system as it exists today.

> See also: [`docs/architecture/boundaries.md`](docs/architecture/boundaries.md)
> for what crosses each seam, who owns each side, and what may change.

---

## 1. What it is

Sireno Deck is a Node CLI that drives an Elgato Stream Deck from a YAML config.
The service runs locally, renders the active deck to a Vite-built SPA, and
pushes the result to the device key-by-key. A second Vite SPA (the _config UI_)
wraps the frontend in a clickable shell so the same code path can be edited and
tested without hardware.

Three Vite-served surfaces (frontend, config UI, addon frontends) and one Node
process (the service). They talk over a single WebSocket on `127.0.0.1`.

## 2. Repo layout

```
sireno-deck/
├── ARCHITECTURE.md            ← you are here
├── README.md
├── config.yml                 ← user-facing example/default config
├── docs/
│   ├── plans/                 ← design + implementation plans
│   └── solutions/             ← institutional learnings (runtime-errors, conventions)
└── packages/
    └── cli/
        ├── src/               ← Node service (TypeScript)
        │   ├── builtin-addons/   ← First-party addons shipped as TS source
        │   └── addons/           ← User-installed addons (npm / local)
        ├── frontend/          ← Vite SPA — renders the active deck
        ├── config-ui/         ← Vite SPA — embeds frontend, adds click overlay
        ├── themes/            ← Built-in theme YAML files
        ├── fixtures/          ← Config + schema fixtures
        └── package.json
```

## 2.5 Boundaries

See [`docs/architecture/boundaries.md`](docs/architecture/boundaries.md) for the
full list of seams (process, ws bridge, protocol, addon API, OS abstraction,
transport, ui, theme, asset, oxlint). The TL;DR: anything that crosses a
boundary is JSON over the WS bridge; everything else is a function call.

## 3. Service (`packages/cli/src/`)

The service is one Node process. It owns: the device, the runtime, the addon
backends, and the WebSocket bridge. It does **not** own rendering — the
frontend SPA does.

### 3.1 CLI entry — `cli/`

yargs command tree.

- `run` — foreground, real mode, exits when the device disconnects.
- `start` — daemonize: write pidfile + token, start HTTP server, then run real mode.
- `stop` — kill the daemon by pidfile, remove token.
- `status` — read pidfile, report.

`start` and `run` both go through the same `runRealModePipeline` (or, in
emulator mode, `runEmulatorLifecycle`).

`preflight()` runs once at startup: load config, register builtins, validate,
load theme, pick a device, connect to the Stream Deck, create the runtime
(`createDeckRuntime({decks, logger})`), and create the system providers
(active-app, session, key-macro, clipboard [linux], media).

### 3.2 Runtime — `deck/runtime.ts`

`createRuntime({decks, pubSub, store, logger})` exposes the public surface:

- `getActiveDeck` — current deck payload.
- `navigateToDeck(id, {addToHistory})` — push or replace.
- `goBack()` — pop `navStack`.
- `setOverlay(deckId | null)` / `getOverlay()` — overlay-deck lifecycle.
- `registerButtonHandler(id, handler)` — addon backends register gesture handlers.
- `mountAddonButtons(deckId, buttons)` — used by the addon-handler-bridge to attach handlers.
- `dispatchGesture(buttonId, gesture)` — single entry point for hardware AND emulator clicks.
- `invokeAction` — bypasses the gesture stream and runs the action directly (used by frontend-UI clicks).
- `setGestureListener(fn)` — addon-handler-bridge subscribes here.
- `setActiveAppProvider` / `stopActiveAppPolling` — wires the active-app overlay loop.
- `navStackDepth` — getter.

Internal state:

- `navStack: string[]` — initialized with `[mainDeck.id]`.
- `transientDeckId` — for ephemeral / modal decks.
- `overlayDeckId` — current overlay, if any.
- `overlayNavStacks: Map<deckId, string[]>` — each overlay deck owns an
  independent navigation path, preserved across dismiss/reactivate. Push via
  `navigateToDeck` while in overlay mode; pop via `goBack` (tap); dismissed
  by `core:overlay-toggle` dbl-tap or when the user holds `core:back`.

The active-app loop polls `ActiveAppProvider` every 1 s, debounces for 200 ms,
matches `process_name` / `window_name` against per-addon overlay-deck globs
(via `system/glob-match.ts`), and applies or dismisses the overlay deck
through `setOverlay`.

### 3.3 Methods context — `deck/methods.ts`

`createMethods(ctx)` exposes the namespaced host services to addon backends.
Per-button contexts (`AddonButtonBackendContext.methods`) carry keys shaped
`<addonName>:<methodName>`. Built-in methods:

- `runCommand` / `executor` — `execa("/bin/sh", ["-c", cmd])` with `{{ host.* }}` placeholders.
- `keyMacro` — platform key-macro provider (`linux` / `darwin` / `windows`); Linux uses `ydotool` (uinput — works on GNOME Wayland and others; `wtype` is wlroots-only fallback). Linux combos emit `ydotool key <scancode>:1` syntax (Linux `input-event-codes.h`); ASCII literal text goes through `ydotool type --`; non-ASCII literal text (emoji, CJK) routes through `wl-copy` + `ydotool` ctrl+v scancode because `ydotool type` does not handle non-BMP. macOS uses `osascript keystroke`, Windows uses Win32 `SendInput` via inline C# compiled at init.
- `typeText` — addon ergonomic: type literal text (UTF-8, emoji OK) without building a `KeyMacroAction`.
- `navigateToDeck` / `goBack` / `getActiveDeckId` — runtime facade.
- `invalidate` — ask the runtime to re-emit `state` for the active deck.
- `publish` / `subscribe` — channel pub/sub.
- `setKeyMacroProvider` — provider overrides for tests.

### 3.4 Action executor — `action/executor.ts`

`createActionExecutor({host})` returns `{run(command, options)}`. Wraps
`execa("/bin/sh", ["-c", command])`. Replaces `{{ host.hostname }}`,
`{{ host.platform }}`, `{{ host.arch }}`, `{{ host.username }}`,
`{{ host.homedir }}`. Streams stdout/stderr through pino.

### 3.5 Addons API & registry — `addon/api.ts`, `addon/registry.ts`

`SIRENO_ADDON_API_VERSION = 1`. The full `AddonManifestV1` is the canonical
type; `AddonJsonManifest` is the on-disk discovery file
(`sirenodeck.json`).

```ts
interface AddonManifestV1 {
  readonly apiVersion: 1
  readonly name: string
  readonly kind?: "runtime" | "theme"
  readonly buttonTypes: Record<string, AddonButtonTypeDefAny>
  readonly defaultButton?: string
  readonly decks?: Record<string, AddonDeckFactory | AddonDeckDefinition>
  readonly frontend?: { main: string; styles?: string[] }
  readonly poller?: { channels: ReadonlyArray<{ channel; intervalMs; poll }> }
  readonly publishIntervalMs?: number
  readonly globalBackend?: AddonGlobalBackend
}
```

Two shapes for addon-decks are accepted in `manifest.decks`:

- `AddonDeckFactory = (page: number) => AddonGeneratedDeck` — simple, no config.
- `AddonDeckDefinition = { type, configSchema?, createDecks }` — richer, can read config.

`AddonButtonTypeDef = { frontend, backend }` where `backend` is
`AddonButtonTypeBackend` (lifecycle hooks: `onMount`, `onTap`, `onDblTap`,
`onHold`, `dispose`; plus `internal?: boolean` to hide from user config
surfaces).

`AddonButtonBackendContext` carries: `config`, `buttonId`, `addonName`,
`methods` (namespaced), `publish`, `executor`, `signal`, `store`.

`AddonGlobalBackend` carries: `pollers`, `subscriptions`, `methods`,
`onLoad(ctx)`, `onUnload(ctx)`. Lives for the lifetime of the addon.

The `AddonRegistry` enforces namespace prefixes — every key in `buttonTypes`
must start with `${name}:` and every key in `decks` must start with `${name}:`.
Tracks `addonsByName`, `buttonsByType`, `decksByType`, `themesByName`.
`resolveActiveTheme(name?)` defaults to `"default"`.

`resolveDomAssetSrc(src)` handles `addon://` / `builtin://` asset references
for addon frontends.

### 3.6 System slot injection — `deck/system-back-injection.ts`

`computeSystemButtonForSlotN1(deck, state)` returns the button that fills the
n-1 (last) slot on a deck. The button type is computed **dynamically at
broadcast time** from the current runtime mode, not baked in at startup:

- Main deck → `core:settings-entry` (opens `internal-settings:settings`).
- In overlay mode → `core:overlay-toggle` (tap = step back within overlay path;
  dbl-tap = dismiss overlay).
- Non-main regular deck, `navStackDepth > 1` → `core:back` (pops nav stack).
- Else → `null` (the slot is free for a user button).

The slot is purely declarative; the visual treatment of the n-1 tile is the
`SplitActionSurface` (see §3.12).

### 3.7 Gesture state machine — `core/gesture-state.ts`

`createGestureDetector({onGesture})` consumes raw `GestureEvent` (`type:
'down' | 'up'`, `timestamp`, `keyIndex`) and emits `GestureResult` with
`kind: 'tap' | 'dbl-tap' | 'hold'`, plus `timestamp`, `durationMs`, and the
underlying `timestamps`.

State per key: `idle → holding → waiting-second → second-down → idle`.

Constants: `HOLD_ACTION_DELAY_MS = 200`, `DOUBLE_TAP_DELAY_MS = 200`.

### 3.8 Addon-handler-bridge — `deck/addon-handler-bridge.ts`

`bridgeAddonBackends(runtime, statePublisher, bridge)` wires everything:

1. Imports each scanned addon's module.
2. Wires `runtime.setGestureListener` to broadcast `runtime:gesture:${buttonId}`
   over the WS bridge (per-button gesture channel).
3. Registers addon-global pollers via `statePublisher.registerChannel` and
   `bridge.registerCacheablePoller`.
4. Calls `onLoad(ctx)` on each global backend.
5. Mounts each per-button backend with `runtime.registerButtonHandler(\`${deck.id}:${button.id}\`, handler)`.

### 3.9 Renderer / WS bridge — `render/ws-bridge.ts`

`WebSocket` server on `127.0.0.1` (port chosen at startup, default 52937).
One connection per frontend / config UI surface.

- Hello handshake: token check, protocol version.
- Channel cache: `lastChannels` + `cacheablePollers` so reconnects replay state.
- `broadcast(msg)` / `sendToCaller(connectionId, msg)`.
- `registerCacheablePoller({id, intervalMs, poll})` — runs server-side, fans out.
- `onMessage` / `onConnection` — host wiring.
- `DEFAULT_KEY_COUNT = 15` (Stream Deck MK.2 / XL).

### 3.10 Protocol — `api/protocol-internal.ts`, `render/protocol.ts`

`PROTOCOL_VERSION = 1`. Zod schemas in `api/protocol-internal.ts`; re-exported
from `render/protocol.ts`.

| Direction       | Message              | Shape                                                         |
| --------------- | -------------------- | ------------------------------------------------------------- |
| client → server | `hello`              | `{ token }`                                                   |
| server → client | `hello-ack`          | `{ ok, protocolVersion, channels? }`                          |
| server → client | `deck-config`        | `{ deckId, surfaces: Record<deckId, {name, buttons[]}> }`     |
| server → client | `state`              | `{ channels: Record<channel, payload>, cadence }`             |
| server → client | `decks-list`         | `{ decks: AddonDeck[] }`                                      |
| server → client | `show-overlay`       | `{ deckId }`                                                  |
| server → client | `dismiss-overlay`    | `{}`                                                          |
| server → client | `deck-active`        | `{ deckId, mode, history }`                                   |
| server → client | `assets`             | `{ assets: {id, data}[] }`                                    |
| client → server | `button-action`      | `{ deckId, position, gesture: "tap" \| "dbl-tap" \| "hold" }` |
| client → server | `select-deck`        | `{ deckId }`                                                  |
| client → server | `method-call`        | `{ callId, name, args }`                                      |
| server → client | `method-call-result` | `{ callId, ok, value?, error? }`                              |
| client → server | `subscribe-channels` | `{ channels: string[] }`                                      |
| server → client | `runtime:gesture:*`  | per-button gesture event (separate stream)                    |

### 3.11 Real mode vs emulator mode

**Real mode** (`cli/commands/real-mode.ts`): `BrowserRenderer` is a Playwright
headless instance that screenshots the frontend URL with `?compact=1`. The
resulting image is sliced and written to the device key-by-key.

**Emulator mode** (`cli/commands/emulator-mode.ts`): spawns two Vite dev
servers (frontend + config UI). The config UI SPA owns gesture detection; it
sends final-gesture `button-action` messages over the bridge. The backend
`EmulatorOutputClient` looks up the button by position and calls
`runtime.dispatchGesture`. `buildDeckConfigMessage()` builds the per-deck
payload (including `addonName` and `frontendEntry`) and sends it to both
SPAs.

`findWorkspaceRoot()` and `resolveFrontendCwd()` are local helpers used to
locate the Vite projects from the monorepo.

### 3.11.1 Process supervisors (vite)

Vite children (frontend / config UI dev servers) are supervised by
`cli/commands/subprocess-supervisor.ts`. The retry state machine lives in
one place.

**Vite supervisor** — `outputClient/real.ts:202` and `outputClient/emulator.ts:117,140`.
On unexpected exit, the supervisor respawns the vite child using the
incremental schedule `DEFAULT_VITE_RETRY_SCHEDULE_MS = [2s, 5s, 15s, 30s, 60s]`
(5 retries, total worst-case ~2 min). After the budget is exhausted, the
supervisor calls `onChildCrash` on the runtime, which resolves the pipeline's
`done` promise and triggers a clean shutdown.

**Daemon lifecycle** — In dev mode `start.ts:startInBackground` spawns the
daemon via `spawnDetached` (`packages/cli/src/cli/commands/spawn-daemon.ts`)
and returns. The wrapper exits cleanly; subsequent `pnpm dev status | stop
| restart | reload | logs` work from any shell via the pid file at
`$XDG_RUNTIME_DIR/sirenodeck/`. The forked daemon's `argv[1]` is
`bin/sirenodeck.js` — the same entry point the systemd-installed daemon
uses. If the daemon crashes in dev, the daemon stays dead; the operator
runs `pnpm dev restart` to recover. Production's auto-restart comes from
systemd's `Restart=always`; dev matches that semantic exactly (no
auto-restart at the wrapper layer).

**In-place reload (SIGUSR1)** — The `reload` command sends `SIGUSR1` to
the daemon; systemd's `reload-or-restart` does the same. The daemon
registers a `SIGUSR1` handler via `SignalProvider.onReload`
(`commands/run.ts`) that calls `runtime.invalidate()` — which re-broadcasts
the deck-config to connected frontends and nudges the `BrowserRenderer`'s
screenshot tick. Without this handler, Node's default action for
`SIGUSR1` is to terminate the process, so previously every reload
request was a latent daemon crash masked by `Restart=always`.

**Dev operator affordance** — After a successful `pnpm dev start`, the
cli handler in `cli/index.ts` calls `promptReloadAndTail`
(`cli/startup-display.ts`). When stdout is a TTY, it prompts the
operator with `Reload + tail logs now? [Y/n]` (default yes). On yes,
it calls `reload()` (sends SIGUSR1, which now triggers
`runtime.invalidate()` as documented above) and tails `service.log`
for a bounded 2 s window. The bounded tail keeps control flowing without
forcing the operator to type Ctrl+C. The prompt is suppressed on
non-TTY environments (CI, ssh without pty, systemd) and on
`--quiet` / `--log-level silent`.

**Logger default level** — `buildLogger` (`cli/index.ts`) defaults the
pino level to `info` (was `error` before this change). `info` is the
minimum level that surfaces: `status.ts` reporting the running daemon,
the runtime's per-tap `info` logs reaching `service.log`, and the
`SIGUSR1 reload` confirmation line. `--verbose` switches to `debug`
for the deepest signal; `--quiet` / `--log-level silent` suppress
everything.

There is no separate `service-supervisor.ts` in the current codebase —
that file was the previous supervisor for dev mode and was removed when dev
detached to match production's shape.

`pushBlackFrameToDevice` reuses `connectStreamDeck` from
`device/stream-deck.ts:51` so the parent process can push a frame without
going through the full daemon init. Errors are non-fatal — the device may be
unplugged at the moment of crash.

### 3.12 UI primitives & surfaces — `ui/`

React component library shared between the frontend and the addons'
frontends. All components are theme-driven (CSS variables resolved at
runtime through `useResolvedTheme`).

- **Primitives** (`ui/primitives/`): `ButtonFrame`, `Icon`, `Label`, `Text`,
  `Chip`, `TapIndicator`, `ProgressBar`.
- **Surfaces** (`ui/surfaces/`): `IconLabelSurface`, `BarsSurface`,
  `LabelValueListSurface`, `SplitActionSurface`.
- **Contexts** (`ui/contexts/`): theme + asset cache providers.

`SplitActionSurface({primary, secondary?})` is the n-1 tile treatment. It
renders two stacked tiles divided by a diagonal line, with a `TapIndicator`
on the primary side. Falls back to `themeUi.surfaces.splitAction` from the
loaded theme if present.

### 3.13 System providers — `system/`

Interfaces in `system/provider.ts`; per-platform implementations in
`system/{active-app, key-macro, clipboard, media, session-monitor, brightness}/`.
Each is a small adapter that the runtime wires during preflight.

`system/glob-match.ts` compiles overlay-deck matchers from the
`process_names` / `window_names` addon-deck config.

### 3.14 Themes — `themes/`

`themes/loader.ts` resolves the active theme (built-in, local, or npm) and
calls `registerBuiltInThemes(registry)` to register theme entries. CSS is
generated by `themes/css.ts` from the loaded theme's tokens and injected
into the frontend at startup via virtual modules (`virtual:sireno/themes/manifest`).

### 3.15 Device — `device/`

Stream Deck connection lifecycle, reconnect logic, and write cache. Per-model
support lives in `device/models/{mk2, plus, mini, xl}.ts`. Linux udev setup
helpers in `device/linux-udev.ts`. Device registry picks the right model for
the connected hardware.

### 3.16 Core primitives — `core/`

- `pub-sub.ts` — in-process pub/sub for addon channels.
- `store.ts` — persistent per-addon key/value (`store.buttonScope(addonName, key)`).
- `pagination.ts` — paginates a flat button array into decks.
- `icon-asset-registry.ts` — resolves icon asset IDs.
- `watcher.ts` — file-watch helpers for addon `subscriptions`.
- `gesture-state.ts` — see §3.7.

## 4. Frontend — `packages/cli/frontend/`

Vite SPA. Bundled to `packages/cli/frontend/dist/` and served by the
service's HTTP server in real mode.

- `src/App.tsx` — top-level. Resolves theme, opens the WS client, holds the
  active deck in state, renders `<Deck />`.
- `src/components/Deck.tsx` — visual grid. For each button: `ButtonFrame`
  - `ErrorBoundary` + `ButtonSurface` (the addon's React component, looked
    up from `virtual:sireno/addons/registry`).
- `src/components/ErrorBoundary.tsx` — per-button crash isolation.
- `src/bridge/client.ts` — typed WS client. Handles `hello`, `deck-config`,
  `state`, `assets`, `runtime:gesture:*` (per-button).
- `virtual:sireno/*` — virtual modules: `themes/manifest`, `addons/registry`,
  `token`.

The deck surface is built from the `deck-config` message. The active deck is
the only one rendered at a time. `react-router-dom` (BrowserRouter) is used
in `main.tsx` for route-to-deck mapping, but gesture routing inside the
active deck is driven entirely by the runtime — react-router only owns the
top-level URL ↔ deck mapping.

## 5. Config UI — `packages/cli/config-ui/`

Vite SPA. Embeds the frontend in an iframe (so the same code path runs) and
overlays clickable button regions on top. The overlay captures pointerdown /
pointerup / leave and runs its own gesture detector
(`packages/cli/config-ui/src/gesture.ts`, wrapping the shared constants from
`core/gesture-state.ts`). It sends the final gesture to the backend as a
`button-action` WS message; the backend's `EmulatorOutputClient` is a thin
pass-through that calls `runtime.dispatchGesture`. Renders a side panel
with the current deck tree and lets you toggle the active deck manually.

`App.tsx` wires to the same WS bridge as the frontend.

## 6. Built-in addons

All shipped from `packages/cli/src/builtin-addons/`. Each ships a
`sirenodeck.json` discovery file + an `index.ts` entry exporting
`manifest: AddonManifestV1`. Registered in `register-builtins.ts` in this
order: themes, core, internal-settings, session, date-time,
emoji-selector, media, system-status, value-display, weather, brightness.

| Addon               | Button types                                                  | Publish / poll | Notes                                                            |
| ------------------- | ------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `core`              | `action`, `change-deck`, `toggle`, `page-nav`, `media-sample` | —              | The generic button types every deck is built from.               |
| `internal-settings` | `about`, `brightness`, `theme`                                | —              | All three types are `internal: true`. Hosts the `settings` deck. |
| `session`           | `info`, `time`                                                | —              | `time` is `internal: true`. Hosts the `locked` deck.             |
| `date-time`         | `time`, `date`, `analog-clock`, `locked-time-tile`, `custom`  | `1000 ms`      | Frontend-driven (no backend polling).                            |
| `emoji-selector`    | `launcher`, `category`, `emoji`, `back`, `page-nav`           | —              | Hosts its own per-category / per-page decks.                     |
| `media`             | `player`, `mute`, `volume:up`, `volume:down`                  | `1000 ms`      | Global backend with `methods` (play/pause/next/prev/volume).     |
| `system-status`     | `status`                                                      | `1000 ms`      | 1–2 metrics per tile.                                            |
| `value-display`     | `display`                                                     | `5000 ms`      | 1–3 values per tile.                                             |
| `weather`           | `weather`                                                     | `600_000 ms`   | Uses `subscriptions` (push) + an explicit `poll(id)` trigger.    |
| `brightness`        | `brightness`                                                  | `2000 ms`      | Frontend reads brightness, backends trigger `executor`.          |

> **`gestureHandlers` today:** only `media` and `emoji-selector` declare it on
> their manifests. The runtime currently does **not** enforce it as a filter
> (see §8 P2 for the proposed change).

## 7. Data flows

### 7.1 Gesture → action (after detection)

The runtime is gesture-source-agnostic. Whichever transport produced the
gesture (real hardware, emulator overlay), it calls
`runtime.dispatchGesture(buttonId, gesture)` and the runtime fan-outs from
there.

```
runtime.dispatchGesture(buttonId, gesture)
  → gestureListener (set by addon-handler-bridge)
    → addon-handler-bridge listener
      → addon onTap / onDblTap / onHold (per button)
        → optional methods.* / executor.run
          → runtime.invalidate (asks state publisher to re-emit)
            → state message (only the active deck's channels)
              → frontend ChannelRegistry.publish(channel, payload)
                → useAddonChannel(channel) re-renders
  → bridge.broadcast("runtime:gesture:<buttonId>", {gesture, at})
    → frontend ButtonSurface receives the gesture event
```

### 7.2 Emulator overlay (no hardware)

The config UI SPA in `packages/cli/config-ui/` captures pointer events on the
visible tiles. It runs its own gesture state machine — `dispatchMouseEvent`
in `packages/cli/config-ui/src/gesture.ts`, wrapping the shared
`createGestureDetector` constants from `core/gesture-state.ts`. Only the
final gesture (`tap` / `dbl-tap` / `hold`) is sent over the wire as a
`button-action` message.

```
emulator SPA pointerdown / pointerup / leave (DeckFrame.tsx)
  → gesture buffer (per key)
    → createGestureDetector / dispatchMouseEvent → {kind, position, ...}
      → WS "button-action" {deckId, position, gesture}
        → EmulatorOutputClient.onMessage
          → runtime.dispatchGesture(buttonId, gesture)
            → (same path as 7.1 from here)
```

The `EmulatorOutputClient` does no gesture detection. It is a thin
pass-through that looks up the button by position and calls
`runtime.dispatchGesture`. All detection lives in the emulator SPA.

### 7.3 Real hardware

```
device.onKeyEvent({type: "down" | "up", keyIndex, timestamp})
  → RealOutputClient: createGestureDetector({onGesture}) per key
    → runtime.dispatchGesture(buttonId, gesture)
      → (same path as 7.1 from here)
```

RealOutputClient runs `createGestureDetector` directly on the hardware
events. Nothing crosses the WS for this path — the device is a USB peripheral
on the host. The backend dispatches the gesture; the runtime broadcasts
`runtime:gesture:<buttonId>` over WS.

### 7.4 Decoupling rule

Each transport owns its own gesture detection. The wire format on every
path (real hardware, emulator SPA, chrome SPA) is the **final gesture**
(`button-action` with `gesture: 'tap' | 'dbl-tap' | 'hold'`); raw
`down` / `up` events never cross the bridge.

The chrome SPA in `packages/cli/frontend/` is interactive display: it
emits `button-action` for user clicks and subscribes to `runtime:gesture:*`
(per button) and generic `state` channels to render button feedback. The
config UI SPA in `packages/cli/config-ui/` likewise emits `button-action` for
virtual button presses and subscribes to state for rendering. The real
hardware transport emits `button-action` via the hardware Stream Deck's
native key events.

Shared logic lives in `packages/cli/src/core/gesture-state.ts` — the
constants `HOLD_ACTION_DELAY_MS = 200` and `DOUBLE_TAP_DELAY_MS = 200` are
imported by both transports (RealOutputClient directly, the emulator SPA
via `@sirenodeck/cli`) so any future change applies to both at once.

Neither the backend nor any SPA knows how another transport derives
gestures. A change in tap-detection semantics is local to the transport
that owns it.

### 7.5 Poller → render

```
addon global backend
  → pollers[].poll(ctx) every N ms
    → ctx.publish(data) on a named channel
      → state-publisher caches the channel
        → bridge.broadcast("state", {channels, cadence})
          → frontend ChannelRegistry.publish(channel, payload)
            → useAddonChannel(channel) re-renders
```

State messages are only sent for channels owned by the addons of the
**active** deck (`setActiveDeck({addonNames})` is the gate).

### 7.6 Active-app overlay

Overlay entry is **trigger-only** (auto-show or manual toggle). An overlay deck
owns an independent navigation path (`overlayNavStacks[deckId]`), preserved
across dismiss/reactivate.

```
ActiveAppProvider tick (1 s, 200 ms debounce)
  → match against addon overlay-deck globs (system/glob-match.ts)
    → hit: runtime.setOverlay(deckId)
      → pubSub.publish("runtime:overlay", {deckId, source: "autoShow"})
        → pubSub.publish("runtime:activeDeck", {deckId}) [stack top]
          → bridge.broadcast(deck-config) with inOverlayMode=true
            → frontend renders the overlay above the active deck
    → miss after a previous hit: runtime.setOverlay(null)
      → pubSub.publish("runtime:overlay", {deckId: null})
        → pubSub.publish("runtime:activeDeck", {deckId}) [restores previous]
          → bridge.broadcast(deck-config) with inOverlayMode=false
```

**Manual toggle**: `core:overlay-toggle` dbl-tap on the available overlay deck
activates it; `core:overlay-toggle` dbl-tap again dismisses. `core:back`
hold also dismisses.

## 10. Glossary

| Term                     | Definition                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**               | A single Stream Deck key with a display and behavior.                                                                                                                                                                                                                                                                                                                                                                                  |
| **Button Type**          | A class of button (display-only, action, toggle) with a rendering model. Defined by an addon.                                                                                                                                                                                                                                                                                                                                          |
| **Button Instance**      | A configured button of a type — the row in `config.yml`.                                                                                                                                                                                                                                                                                                                                                                               |
| **Deck**                 | A set of button instances displayed together.                                                                                                                                                                                                                                                                                                                                                                                          |
| **Main Deck**            | The default / root deck. Has no back button.                                                                                                                                                                                                                                                                                                                                                                                           |
| **Sub-deck**             | A nested deck navigable from another deck. Includes a back button.                                                                                                                                                                                                                                                                                                                                                                     |
| **Overlay Deck**         | A deck that owns an independent navigation path (`overlayNavStacks[deckId]`). Entered only via trigger auto-show (`autoShow:true`) or `core:overlay-toggle` dbl-tap of the available overlay. `navigateToDeck` never changes mode; it pushes to the current path. Each overlay has its own back stack — tap `core:overlay-toggle` to step back, dbl-tap to dismiss. An overlay deck is a deck with a `trigger` (process/window names). |
| **Addon**                | A TypeScript module providing button types, deck types, and (optionally) a global backend + theme.                                                                                                                                                                                                                                                                                                                                     |
| **Theme**                | A YAML file defining global visual tokens.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Gesture**              | A key event: `tap`, `dbl-tap`, or `hold`.                                                                                                                                                                                                                                                                                                                                                                                              |
| **Poller**               | A periodic publish in an addon global backend.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Subscription**         | A push-based publish (file watcher, socket).                                                                                                                                                                                                                                                                                                                                                                                           |
| **Channel**              | A named pub/sub topic. Frontends subscribe via `useAddonChannel`.                                                                                                                                                                                                                                                                                                                                                                      |
| **System Slot**          | The n-1 (last) position on a deck, reserved for a back / settings / overlay-toggle button. In overlay mode this slot carries `core:overlay-toggle`; in regular mode it carries `core:back` (or `core:settings-entry` on the main deck). Dynamically computed at broadcast time from the current runtime mode.                                                                                                                          |
| **Split Action Surface** | A two-tile surface for the system slot, divided by a diagonal line. Primary takes the action; secondary is decorative until further work.                                                                                                                                                                                                                                                                                              |
| **Internal Addon**       | An addon (or a button / deck inside one) marked `internal: true` — hidden from user-facing config surfaces.                                                                                                                                                                                                                                                                                                                            |

### Config schemas and loader internals

`config/loader.ts` and `config/validation.ts` are referenced but not detailed
in this doc. The schema is zod-based and lives in `core/schemas.ts` (alongside
the addon manifest schemas). Out of scope for architecture; a config doc
would cover it if needed.

### Device model list

`device/models/{mk2, plus, mini, xl}.ts` is referenced from the
`DEVICE_MODELS` export consumed by the frontend's `gridForKeyCount`. New
models are added by listing them in `device/registry.ts`. Out of scope.

### Test harness details

Vitest config lives in `vitest.config.ts` at the repo root. Every package has
its own `__tests__/` directories (colocated with the code); `frontend/` is
the only one that ships `__mocks__/` as well — these back the
`virtual:sireno/{token,theme,addons/registry}` aliases the vite plugins
mount. Out of scope.
