# Sireno Deck — Architecture

> Single source of truth for how the project is wired together. Replaces the
> former `.planning/` phase / quick / solutions machinery.
>
> Read top-to-bottom on first contact. Section 8 (proposed changes) is the
> working plan; everything else describes the system as it exists today.

---

## 1. What it is

Sireno Deck is a Node CLI that drives an Elgato Stream Deck from a YAML config.
The service runs locally, renders the active deck to a Vite-built SPA, and
pushes the result to the device key-by-key. A second Vite SPA (the _emulator_)
wraps the frontend in a clickable shell so the same code path runs without
hardware.

Three Vite-served surfaces (frontend, emulator, addon frontends) and one Node
process (the service). They talk over a single WebSocket on `127.0.0.1`.

## 2. Repo layout

```
sireno-deck/
├── ARCHITECTURE.md            ← you are here
├── README.md
├── config.yml                 ← user-facing example/default config
├── packages/
│   └── cli/
│       ├── src/               ← Node service (TypeScript)
│       ├── frontend/          ← Vite SPA — renders the active deck
│       ├── emulator/          ← Vite SPA — embeds frontend, adds click overlay
│       ├── themes/            ← Built-in theme YAML files
│       ├── fixtures/          ← Config + schema fixtures
│       └── package.json
├── builtin-addons/            ← First-party addons shipped as TS source
└── addons/                    ← User-installed addons (npm / local)
```

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
(active-app, session, key-macro, media, clipboard).

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

The active-app loop polls `ActiveAppProvider` every 1 s, debounces for 200 ms,
matches `process_name` / `window_name` against per-addon overlay-deck globs
(via `system/glob-match.ts`), and applies or dismisses the overlay deck
through `setOverlay`.

### 3.3 Methods context — `deck/methods.ts`

`createMethods(ctx)` exposes the namespaced host services to addon backends.
Per-button contexts (`AddonButtonBackendContext.methods`) carry keys shaped
`<addonName>:<methodName>`. Built-in methods:

- `runCommand` / `executor` — `execa("/bin/sh", ["-c", cmd])` with `{{ host.* }}` placeholders.
- `keyMacro` — platform key-macro provider (`linux` / `darwin` / `windows`).
- `pasteText` — write to clipboard, send Ctrl+V / Cmd+V.
- `navigateToDeck` / `goBack` / `getActiveDeckId` — runtime facade.
- `invalidate` — ask the runtime to re-emit `state` for the active deck.
- `publish` / `subscribe` — channel pub/sub.
- `setKeyMacroProvider` / `setClipboardProvider` — provider overrides for tests.

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

`computeSystemButtonForSlotN1(deck, state)` returns the button that fills
the n-1 (last) slot on a deck:

- Main deck → `core:settings-entry` (opens `internal-settings:settings`).
- Overlay deck → `core:overlay-toggle` (dismisses the overlay).
- Any other deck, `navStackDepth > 1` → `core:back` (pops the nav stack).
- Else → `null` (the slot is free for a user button).

The slot is purely declarative; the visual treatment of the n-1 tile is the
`SplitActionSurface` (see §3.12).

### 3.7 Gesture state machine — `core/gesture-state.ts`

`createGestureDetector({onGesture})` consumes raw `GestureEvent` (`type:
'down' | 'up'`, `timestamp`, `keyIndex`) and emits `GestureResult` with
`kind: 'tap' | 'dbl-tap' | 'hold'`, plus `timestamp`, `durationMs`, and the
underlying `timestamps`.

State per key: `idle → holding → waiting-second → second-down → idle`.

Constants: `HOLD_ACTION_DELAY_MS = 500`, `DOUBLE_TAP_DELAY_MS = 500`.

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
One connection per frontend / emulator surface.

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
servers (frontend + emulator). The emulator SPA owns gesture detection; it
sends final-gesture `button-action` messages over the bridge. The backend
`EmulatorOutputClient` looks up the button by position and calls
`runtime.dispatchGesture`. `buildDeckConfigMessage()` builds the per-deck
payload (including `addonName` and `frontendEntry`) and sends it to both
SPAs.

`findWorkspaceRoot()` and `resolveFrontendCwd()` are local helpers used to
locate the Vite projects from the monorepo.

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
`system/{active-app, key-macro, media, session-monitor, clipboard, brightness}/`.
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
the only one rendered at a time. **No React Router** today — navigation is
driven entirely by the runtime.

## 5. Emulator — `packages/cli/emulator/`

Vite SPA. Embeds the frontend in an iframe (so the same code path runs) and
overlays clickable button regions on top. The overlay captures pointerdown /
pointerup / leave and runs its own gesture detector
(`packages/cli/emulator/src/gesture.ts`, wrapping the shared constants from
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

The emulator SPA in `packages/cli/emulator/` captures pointer events on the
visible tiles. It runs its own gesture state machine — `dispatchMouseEvent`
in `packages/cli/emulator/src/gesture.ts`, wrapping the shared
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

Each transport owns its own gesture detection. The wire format on the
emulator path is the **final gesture** (`button-action` with
`gesture: 'tap' | 'dbl-tap' | 'hold'`); raw `down` / `up` events never
cross the bridge. The chrome SPA in `packages/cli/frontend/` is pure
display: it subscribes to `runtime:gesture:*` (per button) and the generic
`state` channels. **It never emits any button event.**

Shared logic lives in `packages/cli/src/core/gesture-state.ts` — the
constants `HOLD_ACTION_DELAY_MS = 200` and `DOUBLE_TAP_DELAY_MS = 200` are
imported by both transports (RealOutputClient directly, the emulator SPA
via `@sireno-deck/cli`) so any future change applies to both at once.

Neither the backend nor the chrome knows how each transport derives
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

```
ActiveAppProvider tick (1 s, 200 ms debounce)
  → match against addon overlay-deck globs (system/glob-match.ts)
    → hit: runtime.setOverlay(deckId)
      → bridge.broadcast("show-overlay", {deckId})
        → frontend renders the overlay above the active deck
    → miss after a previous hit: runtime.setOverlay(null)
      → bridge.broadcast("dismiss-overlay", {})
```

## 8. Proposed architectural changes

The "P-list". Each item is sized to one release and a clear vertical slice.

### P1 — Add React Router to the frontend

**Today:** the frontend is a single-route SPA. The active deck is the only
thing rendered, driven by `deck-config` WS messages.

**Proposal:** add React Router so per-deck and per-addon pages become
first-class. The runtime remains the source of truth for the active deck;
the router reflects it. Routes enable deep-linking, isolated tests of an
addon page in isolation, and stable URLs for emulator / preview links.

**Surface:** `packages/cli/frontend/src/App.tsx`, `packages/cli/frontend/src/main.tsx`,
and a new `routes.tsx`. The `deck-config` handler becomes a `navigate()` call
in addition to `setDeck()`.

### P2 (+P7) — `gestureHandlers` is the opt-in runtime filter, default-deny

**Today:** the manifest field `gestureHandlers: ('tap' | 'dbl-tap' | 'hold')[]`
exists and is declared by `media` and `emoji-selector`. It is **not** enforced
at runtime — backends with `onTap / onDblTap / onHold` are always invoked.

**Proposal:** enforce it. A backend that declares a gesture handler
(`onTap` / `onDblTap` / onHold) must also list that gesture in
`gestureHandlers`. Otherwise the handler is ignored and a warning is logged
in dev. No `gestureHandlers` entry ⇒ default-deny ⇒ the addon must declare
it explicitly to receive any gesture.

**WS payload (P7 folded in):** `deck-config` carries the per-button
`gestureHandlers` list so the frontend can decide whether to forward
clicks (relevant once P1 is in and routes can deep-link into addon pages).

**Required audit before ship:** every `builtin-addons/*/index.ts` must declare
its `gestureHandlers`. Concretely:

| Addon               | Backend handlers currently declared                                               | Needs manifest addition                        |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| `core`              | `change-deck.onTap`, `toggle.onTap`                                               | `gestureHandlers: ['tap']`                     |
| `internal-settings` | `about.onTap`, `brightness.onTap`, `theme.onTap`                                  | `gestureHandlers: ['tap']`                     |
| `session`           | `info.onTap`, `time.onTap`                                                        | `gestureHandlers: ['tap']`                     |
| `date-time`         | `time` is read-only (no backend handler)                                          | none                                           |
| `emoji-selector`    | `launcher.onTap`, `category.onTap`, `emoji.onTap`, `back.onTap`, `page-nav.onTap` | already declared — confirm it includes `'tap'` |
| `media`             | `player.onTap`, `mute.onTap`                                                      | already declared                               |
| `system-status`     | `status.onTap`                                                                    | `gestureHandlers: ['tap']`                     |
| `value-display`     | `display.onTap`                                                                   | `gestureHandlers: ['tap']`                     |
| `weather`           | `weather.onTap`                                                                   | `gestureHandlers: ['tap']`                     |
| `brightness`        | `brightness.onTap`                                                                | `gestureHandlers: ['tap']`                     |

**Surface:** `deck/runtime.ts` (filter in `dispatchGesture` /
`invokeAction`), `deck/addon-handler-bridge.ts` (warn on mismatch), and the
`deck-config` payload schema in `api/protocol-internal.ts`.

### P4 + P5 — Auto-register all addon decks; `internal?: true` opts out of user config

**Today:** `internal-settings:settings` and `session:locked` are
auto-registered (in `registerBuiltins.ts`). Other addon decks (e.g.
`emoji-selector`'s per-category decks) are referenced from `config.yml`.

**Proposal:** every deck from a loaded addon is auto-registered on
`registry.load(addon)`. `internal?: boolean` on `AddonDeckDefinition` hides
a deck from user config surfaces (autocomplete, schema hints, default
emitted config). `internal-settings:settings`, `session:locked`, and the
`emoji-selector` per-category / per-page decks are the first candidates for
`internal: true`.

**Surface:** `addon/registry.ts`, `addon/api.ts` (add `internal?` to
`AddonDeckDefinition`), `config/loader.ts` (skip `internal: true` decks when
generating default configs), every `builtin-addons/*/decks/*` file.

### P6 — `SplitActionSurface` on the n-1 slot for **every** deck, including main

**Today:** the n-1 slot is filled by `computeSystemButtonForSlotN1` and
rendered as a single primary tile. The `SplitActionSurface` exists but is
not wired into the n-1 treatment.

**Proposal:** every deck (main, sub-deck, overlay-deck) renders its n-1 slot
as a `SplitActionSurface`:

- **Main deck n-1:** primary = home / settings nav (opens
  `internal-settings:settings`); secondary = empty / null (dimmed region —
  no second action; the split visually signals "tap left half" without
  committing to a follow-up).
- **Sub-deck n-1:** primary = back (pops `navStack`); secondary = empty.
- **Overlay deck n-1:** primary = dismiss overlay; secondary = empty.

**Surface:** `deck/system-back-injection.ts` (return `{primary, secondary?}`
instead of a single button ID), `frontend/src/components/Deck.tsx` (when
the resolved button is a system slot, render `SplitActionSurface` instead of
`ButtonFrame` + addon `ButtonSurface`), `ui/surfaces/SplitActionSurface.tsx`
(accept the primary/secondary button descriptors).

---

## 9. Known small issues

- **Emulator outer `ButtonFrame` no longer flashes on press.** Intentional.
  The chrome SPA no longer tracks per-tile gesture state from server echoes;
  it only subscribes to `runtime:gesture:*` for the inner `ButtonSurface`.
  The outer frame's pressed/isHolding/holdProgress props are accepted but
  not driven. See §7.4.

- **Two shapes for addon decks.** `AddonDeckFactory` (no config) and
  `AddonDeckDefinition` (config-aware) coexist on `manifest.decks`. The
  factory shape is a footgun for any addon that needs per-instance config.
  Resolution: deprecate `AddonDeckFactory` in a future release once all
  existing addons are on `AddonDeckDefinition`. Tracked in P4+P5.

---

## 10. Glossary

| Term                     | Definition                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**               | A single Stream Deck key with a display and behavior.                                                                                     |
| **Button Type**          | A class of button (display-only, action, toggle) with a rendering model. Defined by an addon.                                             |
| **Button Instance**      | A configured button of a type — the row in `config.yml`.                                                                                  |
| **Deck**                 | A set of button instances displayed together.                                                                                             |
| **Main Deck**            | The default / root deck. Has no back button.                                                                                              |
| **Sub-deck**             | A nested deck navigable from another deck. Includes a back button.                                                                        |
| **Overlay Deck**         | A deck shown _above_ the active deck when an active-app match fires. Dismissed by the overlay toggle.                                     |
| **Addon**                | A TypeScript module providing button types, deck types, and (optionally) a global backend + theme.                                        |
| **Theme**                | A YAML file defining global visual tokens.                                                                                                |
| **Gesture**              | A key event: `tap`, `dbl-tap`, or `hold`.                                                                                                 |
| **Poller**               | A periodic publish in an addon global backend.                                                                                            |
| **Subscription**         | A push-based publish (file watcher, socket).                                                                                              |
| **Channel**              | A named pub/sub topic. Frontends subscribe via `useAddonChannel`.                                                                         |
| **System Slot**          | The n-1 (last) position on a deck, reserved for a back / settings / overlay-toggle button.                                                |
| **Split Action Surface** | A two-tile surface for the system slot, divided by a diagonal line. Primary takes the action; secondary is decorative until further work. |
| **Internal Addon**       | An addon (or a button / deck inside one) marked `internal: true` — hidden from user-facing config surfaces.                               |

---

## 11. Out of scope / future work

### P8 — Rename `backend` → `service` across the addon API

Code uses `backend` everywhere it refers to the addon side: `AddonButtonBackend`,
`AddonButtonBackendContext`, `AddonGlobalBackend`, `AddonBackendMethod`,
`AddonGlobalPoller`, `AddonGlobalSubscription`, `AddonBackendContext`,
`bridgeAddonBackends`, `fake-backend-no-poller`, `fake-button-backend`,
`fake-media-backend`, `button/backend.ts` paths in every addon.

Renames are a long-running migration. Not architectural on its own — it's a
terminology pass. Punted to a separate doc when somebody picks it up.

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

Vitest config lives in `vitest.config.ts` at the repo root. Each package has
its own `__tests__/` and `__mocks__/` directories. Out of scope.
