# Boundaries and Abstractions

## 0. Scope

This document describes the boundaries inside Sireno Deck — what crosses a
seam, who owns each side, and what may change without breaking things on the
other side. It complements [`ARCHITECTURE.md`](../../ARCHITECTURE.md), which
describes how the system is wired; this one describes what is _not_ allowed
to cross.

Audience: contributors touching the Node service, the WS bridge, the addon API,
the OS-abstraction layer, or anyone authoring an addon or a frontend surface.

Not in scope:

- End-user features or product strategy (see `STRATEGY.md`).
- One-off implementation notes (see `docs/solutions/`).
- Conventions and tooling (see `AGENTS.md`).

## 1. Process layout

Sireno Deck runs as one Node process plus three Vite-served SPAs. The Node
process owns state; the SPAs own rendering and user input. They never share
memory; they communicate exclusively over the WS bridge.

```text
┌─────────────────────────────────────────────────────────────────┐
│                  CLI service (Node, single process)             │
│                                                                 │
│   addon API ── runtime ── methods ── system providers            │
│                                  │                              │
│                                  └─▶ action executor            │
│                                                                 │
│   ws bridge ── protocol (Zod union, PROTOCOL_VERSION = 1)       │
└──────────────────────────────────┬──────────────────────────────┘
                                   │  ws on 127.0.0.1:rand + token
                                   │  JSON frames, wsMessageSchema
              ┌────────────────────┼─────────────────────┐
              ▼                    ▼                     ▼
      ┌───────────────┐    ┌───────────────┐    ┌───────────────────┐
      │  frontend SPA │    │ emulator SPA  │    │ addon frontends   │
      │  :5180        │    │ :52938        │    │ (one iframe per   │
      │  main deck    │    │ virtual device│    │  addon deck)      │
      └───────────────┘    └───────────────┘    └───────────────────┘
```

Rule of thumb: anything that crosses a box is JSON shaped by
`wsMessageSchema`. Anything that stays inside the Node process is a function
call.

## 2. Layering inside the CLI process

Vertical call direction is strictly downward; cross-layer imports are checked
by oxlint (see B13).

```text
        ┌──────────────────────────────────────────────────┐
   top  │ addon frontends (browser, iframe per addon deck) │
        ├──────────────────────────────────────────────────┤
        │ addon API  (addon/api.ts, addon/registry.ts)     │
        ├──────────────────────────────────────────────────┤
        │ runtime     (deck/runtime/runtime.ts)           │
        ├──────────────────────────────────────────────────┤
        │ methods     (deck/methods.ts → coreMethods)     │
        ├──────────────────────────────────────────────────┤
        │ system providers  (system/providers/<capability>/) │
        ├──────────────────────────────────────────────────┤
        │ action executor (action/executor.ts, execa)      │
        ├──────────────────────────────────────────────────┤
        │ ws bridge    (render/ws-bridge.ts)              │
        ├──────────────────────────────────────────────────┤
        │ protocol     (api/protocol-internal.ts)         │
   bot  └──────────────────────────────────────────────────┘
```

Arrows are function calls. Each layer is allowed to call only into the layer
below it; upward communication is via callbacks registered through the
lower layer's surface (e.g. `runtime.setGestureListener`).

## 3. Boundaries

Each subsection has the same shape: a short prose summary, then a 5-column
table. `Stability` is one of `Contract` (third parties depend on it) or
`Implementation detail` (internal; may change freely).

### B1. Process boundary — Node service ↔ Vite SPAs

The Node service owns state and input dispatch. Each SPA owns rendering and
device input. No shared memory, no shared filesystem handles, no in-process
calls across this seam.

| Property   | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| Files      | `packages/cli/src/render/ws-bridge.ts`, `frontend/`, `emulator/` |
| Stability  | Contract                                                         |
| Owns       | ws bridge (Node side); render + DOM (SPA side)                   |
| May change | Internal message ordering, retry strategy, channel IDs           |
| Failure    | WS disconnect → reconnect cache replays state (`lastChannels`)   |

### B2. WS bridge surface

The only sanctioned cross-process API. Everything between Node and a SPA is a
JSON frame; everything else is forbidden (enforced by B13).

| Property   | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/render/ws-bridge.ts:1`                                          |
| Stability  | Contract                                                                          |
| Owns       | Handshake (token), broadcast/sendToCaller, late-bindable device + addon inventory |
| May change | Internals: reconnect cache strategy, channel naming                               |
| Failure    | Unauthenticated peer rejected; malformed frames rejected via `wsMessageSchema`    |

### B3. Protocol contract

The schema and version that both Node and SPAs agree on. Bumping it is a
breaking change for every consumer at once.

| Property   | Value                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/api/protocol-internal.ts:1` (re-exported via `render/protocol.ts`)     |
| Stability  | Contract                                                                                 |
| Owns       | `PROTOCOL_VERSION = 1`, `wsMessageSchema` (Zod discriminated union over all frame kinds) |
| May change | Add new variants freely; existing variants are frozen                                    |
| Failure    | Unknown variant → frame dropped with diagnostic log                                      |

### B4. Addon API boundary

The contract third-party addons import. Three checkpoints guard it: prefix,
gestures, and shape.

| Property   | Value                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/addon/api.ts:1`, `packages/cli/src/addon/registry.ts:1`                           |
| Stability  | Contract                                                                                            |
| Owns       | `SIRENO_ADDON_API_VERSION`, `AddonManifestV1`, `AddonButtonTypeService`, `AddonFrontendButtonProps` |
| May change | Additive: new lifecycle hooks, new optional fields                                                  |
| Failure    | Bad manifest → addon skipped, diagnostic in `service-log`                                           |

### B5. Runtime / deck model

The runtime is the single source of truth for deck state, navigation, overlay,
and lock. It is gesture-source-agnostic — `RealOutputClient` and
`EmulatorOutputClient` both reach it through the same two entry points.

| Property   | Value                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/deck/runtime/runtime.ts:1`                                                                        |
| Stability  | Implementation detail (internal callers only)                                                                       |
| Owns       | `dispatchGesture`, `invokeAction`, `navStack`, `transientDeckId`, `overlayDeckId`, `lockActive`, `overlayNavStacks` |
| May change | Internal state fields; the two public entry points are frozen                                                       |
| Failure    | Unknown button → `button-error` WS frame → UI temporary-error surface                                               |

### B6. Methods surface

What each addon button gets: a `Methods` instance scoped to that button.
Setters (`setKeyMacroProvider`, `setNotificationProvider`, `setRequirements`)
are deliberately kept off the addon surface; they live on the host side.

| Property   | Value                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/deck/methods.ts:1`                                                                                                                                                                          |
| Stability  | Contract (subset exposed to addons) / Implementation detail (host-only setters)                                                                                                                               |
| Owns       | `runCommand`, `keyMacro`, `typeText`, `dispatch`, `navigateToDeck`, `goBack`, `getActiveDeckId`, `invalidate`, `publish`, `subscribe`, `notify`, `checkRequirement`, `showTemporaryError`, `adjustBrightness` |
| May change | New methods freely; existing signatures frozen                                                                                                                                                                |
| Failure    | Capability missing → `NotImplementedError` → `button-error`                                                                                                                                                   |

### B7. OS abstraction layer

Per-platform providers behind a common interface. The runtime never sees the
implementation; it sees `KeyMacroProvider`, `SessionProvider`,
`NotificationProvider`, `ActiveAppProvider`, `ClipboardProvider`.

| Property   | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Files      | `packages/cli/src/system/providers/{active-app,key-macro,clipboard,notification,session}/<platform>.ts`      |
| Stability  | Implementation detail (internal callers only)                                                                |
| Owns       | `createKeyMacroProvider` factory; `CommandExecutor`, `withTimeout`, `noopUnsubscribe`, `logNull` (shared.ts) |
| May change | Tool preference per platform (`ydotool` vs `wtype`), keymap tables, capability probe order                   |
| Failure    | `createNullKeyMacroProvider` fallback; probe miss → capability missing                                       |

Linux additionally splits active-app into a D-Bus path
(`system/providers/active-app/wayland-gnome.ts`) because GNOME does not expose
the same surface as wlroots.

### B8. Action dispatch

A small URL-like scheme normalises every button action into one of three
flavours: `type://` (keys / text), `brightness://`, or raw shell (via the
executor). The capability probe gates dispatch before it reaches the executor.

| Property   | Value                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/deck/methods.ts:1`, `packages/cli/src/action/executor.ts:1`, `packages/cli/src/system/requirements.ts:1` |
| Stability  | Contract (`type://                                                                                                         | brightness:// | raw`) / Implementation detail (executor internals, macro parser) |
| Owns       | `dispatch` URL parser, host interpolation (`{{ host.* }}`), macro parser (`deck/macro-parse.ts`), execa wrapper            |
| May change | New schemes; new `host.*` keys; new probe order                                                                            |
| Failure    | Unknown host key → `ActionError`; missing capability → `NotImplementedError`                                               |

### B9. Transport boundary

Two `OutputClient` implementations feed the runtime:

- **Real** (`outputClient/real.ts`): owns gesture detection using
  `core/gesture-state.ts`.
- **Emulator** (`outputClient/emulator.ts`): receives gestures from the
  emulator SPA via WS frames; no local gesture detection.

Both conform to the `OutputClient` interface and converge on the runtime's
two entry points (`dispatchGesture`, `invokeAction`). The runtime is never
aware of which one fed it.

| Property   | Value                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Files      | `packages/cli/src/outputClient/real.ts`, `packages/cli/src/outputClient/emulator.ts`, `packages/cli/src/outputClient/types.ts`, `packages/cli/src/core/gesture-state.ts` |
| Stability  | Implementation detail                                                                                                                                                    |
| Owns       | `OutputClient` contract; real-hardware gesture detection (`createGestureDetector`); emulator WS gesture ingest                                                           |
| May change | Gesture thresholds, debounce, transport specifics                                                                                                                        |
| Failure    | Both paths funnel through `runtime.dispatchGesture` / `runtime.invokeAction`                                                                                             |

### B10. UI primitives

Shared React primitives consumed by both the main frontend and addon
frontends. Theme-driven; never reaches outside the React layer.

| Property   | Value                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/ui/primitives/*`, `packages/cli/src/ui/surfaces/*`, `packages/cli/src/index.ts` (re-exports)                                                   |
| Stability  | Contract (addon frontends import these)                                                                                                                          |
| Owns       | `ButtonFrame`, `Icon`, `Label`, `Text`, `Chip`, `IconLabelSurface`, `SplitActionSurface`, `TapIndicator`, `TemporaryErrorSurface`, `ThemeUiPresentationProvider` |
| May change | Visual tokens; new primitives; prop renames are breaking                                                                                                         |
| Failure    | n/a (purely presentational)                                                                                                                                      |

### B11. Theme system

Themes are resolved by `themes/loader.ts`, projected into CSS by
`themes/css.ts`, and shipped to the SPAs as virtual modules. They are not
addons (see §4).

| Property   | Value                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/themes/{loader,css}.ts`, `packages/cli/src/themes/<name>/sirenodeck.json`, `virtual:sireno/themes/manifest` |
| Stability  | Contract (theme author manifest)                                                                                              |
| Owns       | Builtin / local / npm theme resolution, token projection, asset serving                                                       |
| May change | Token names; new optional fields                                                                                              |
| Failure    | Missing theme → falls back to default; assets missing → bundled fallback                                                      |

### B12. Asset system

Icons are resolved by name through `core/icon-asset-registry.ts` and shipped
to the SPAs via the `assets` WS message on connect.

| Property   | Value                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| Files      | `packages/cli/src/core/icon-asset-registry.ts:1`, `assets` variant in `wsMessageSchema` |
| Stability  | Contract (icon names)                                                                   |
| Owns       | Name → blob resolution; base64 (or src) transport                                       |
| May change | Transport encoding; cache strategy                                                      |
| Failure    | Missing asset → bundled fallback icon                                                   |

### B13. oxlint-enforced structural boundary

Hard rule, not a soft convention: `packages/cli/src/**` may not import from
`frontend/` or `emulator/`. The oxlint configuration rejects such imports at
lint time.

| Property   | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Files      | `oxlint` config; `packages/cli/src/**`                 |
| Stability  | Contract (compile-time)                                |
| Owns       | The structural rule; nothing else                      |
| May change | Lint configuration only; the rule itself is structural |
| Failure    | Forbidden import → lint error → PR blocked             |

The inverse direction is fine: SPAs import from `cli` through the WS bridge,
not through `import`.

## 4. Addon contract

This section is the detailed version of B4. Addon authors must read it; the
rest of the doc can be skimmed.

### 4.1 Manifest v1 (`sirenodeck.json`)

```ts
{
  apiVersion: 1,                 // literal; checked at registry.load
  name: string,                  // used as namespace prefix for every button/deck/method
  kind: 'addon',
  buttonTypes: {                 // each entry name MUST start with `${name}:`
    [buttonTypeName]: { frontend, service }
  },
  defaultButton: { [buttonTypeName]: defaultConfig },
  decks: Array<DeckEntry> | { createDeck } | { createDecks },
  frontend?: { entry, dev?, styles?, scripts? },
  poller?: { channels, intervalMs? },
  publishIntervalMs?: number,
  globalService?: { onLoad, onDispose }
}
```

`AddonButtonTypeDef = { frontend, service }`:
`AddonButtonTypeService` lifecycle is `onMount(ctx) → onTap | onDblTap | onHold
→ dispose()`. `gestureHandlers` is a default-deny allowlist; anything not
listed is stripped with `console.warn`.

### 4.2 Discovery

Three load paths converge on `AddonRegistry.load`:

- Builtin: `scanBuiltinAddons` walks `packages/cli/src/builtin-addons/*` and
  uses a regex scan of `index.ts` as a fallback when `sirenodeck.json` is
  absent.
- Local: `addons: ['./my-addon']` in `config.yml`.
- npm: `addons: ['pkg', '@scope/pkg', 'pkg@1.2.3']`. Installed at `cacheDir`
  with `--save-exact --no-save` for lockfile pinning.

`AddonJsonManifest` is the on-disk shape; `AddonManifestV1` is the validated
runtime shape.

### 4.3 Rules enforced by `AddonRegistry.load`

- Every `buttonType` and every `deckId` must be prefixed with `<name>:`.
- `gestureHandlers` is a default-deny allowlist; undeclared handlers are
  stripped with `console.warn`.
- Legacy Record-shaped decks are hard-rejected in favour of array entries.
- Duplicate names are rejected.

### 4.4 Wiring point

`packages/cli/src/deck/addon-handler-bridge.ts:1` is the single loop that
takes a loaded addon and:

1. wires `runtime.setGestureListener` to broadcast `runtime:gesture:<buttonId>` over WS;
2. registers pollers via `statePublisher.registerChannel` and `bridge.registerCacheablePoller`;
3. calls `globalService.onLoad(ctx)`;
4. mounts each per-button service with the `gestureHandlers` allowlist.

Builtin addons and third-party addons go through the same loop.

### 4.5 Themes are not addons

Themes live under `packages/cli/src/themes/<name>/` and are resolved through
`themes/loader.ts`. The loader explicitly rejects theme manifests that arrive
through `addons[]` in config.

## 5. Failure modes

Each capability gate and each transport surface produces a small fixed set
of failure signals. The mapping below is part of the contract: addon authors
and frontend authors can rely on it.

### 5.1 Capability missing at startup

`system/requirements.ts` probes `keyMacro`, `clipboard`, `notification` once
at startup. The result feeds `methods.checkRequirement(capability)`. When
`runtime.invokeAction` sees a `type://` action and `checkRequirement('keyMacro')`
returns false, it throws `NotImplementedError` _before_ dispatching.

Surface: `button-error` WS frame → frontend → `TemporaryErrorSurface`.

### 5.2 Capability lost mid-session

Provider nullability is checked per-action, not cached. Same `NotImplementedError`
path.

### 5.3 Malformed addon manifest

`AddonRegistry.load` rejects bad shapes. The CLI emits a `service-log` WS
frame and skips the addon. The runtime never sees a partial addon.

### 5.4 Unknown button or action

Unknown button → `button-error` with diagnostic. Unknown action URL scheme →
`ActionError` from the executor; surfaced as `button-error`.

### 5.5 WS disconnect

The bridge caches `lastChannels` (the set of subscribed state channels). On
reconnect, those channels are replayed automatically. No caller needs to
handle the gap beyond trusting the cache.

## 6. Cross-references

| Topic                                | Source                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| Repo layout & service split          | `ARCHITECTURE.md` §2-3                                               |
| Runtime data flows                   | `ARCHITECTURE.md` §6                                                 |
| WS bridge internals                  | `packages/cli/src/render/ws-bridge.ts:1`                             |
| Protocol schema                      | `packages/cli/src/api/protocol-internal.ts:1`                        |
| Addon API types                      | `packages/cli/src/addon/api.ts:1`                                    |
| Addon registry enforcement           | `packages/cli/src/addon/registry.ts:1`                               |
| Third-party addon loader             | `packages/cli/src/addon/loader.ts:1`                                 |
| Methods surface (per-button)         | `packages/cli/src/deck/methods.ts:1`                                 |
| Gesture-source-agnostic runtime      | `packages/cli/src/deck/runtime/runtime.ts:1`                         |
| Macro parser                         | `packages/cli/src/deck/macro-parse.ts`                               |
| Action executor                      | `packages/cli/src/action/executor.ts:1`                              |
| Capability probe                     | `packages/cli/src/system/requirements.ts:1`                          |
| Per-platform provider layout         | `packages/cli/src/system/providers/*/`                               |
| Shared provider interfaces           | `packages/cli/src/system/providers/shared.ts:1`                      |
| Frontend bundle                      | `packages/cli/frontend/`                                             |
| Config UI bundle                     | `packages/cli/config-ui/`                                            |
| Builtin addons                       | `packages/cli/src/builtin-addons/*`                                  |
| Theme loading                        | `packages/cli/src/themes/{loader,css}.ts`                            |
| Icon asset registry                  | `packages/cli/src/core/icon-asset-registry.ts:1`                     |
| oxlint forbidden-import rule         | `AGENTS.md` "Boundaries" section                                     |
| Session lock idle-monitor regression | `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` |
