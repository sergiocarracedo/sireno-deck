# Architecture (codebase map)

> Codebase-architecture lens. The full architecture doc lives at `ARCHITECTURE.md` (repo root); this file is the lean reference that the planner reads.

## One-line

`config.yml` → service daemon → Stream Deck (real) or browser emulator, with a plugin system (first-party + npm addons).

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Surface: Stream Deck device OR browser emulator            │
└─────────────────────────────┬────────────────────────────────┘
                              │ button-action WS msgs
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Service daemon (Node)                                       │
│  ── CLI (yargs)                                              │
│  ── OutputClient: RealOutputClient | EmulatorOutputClient    │
│  ── DeckRuntime: navStack, overlay, gesture dispatch         │
│  ── Action executor / methods / system providers            │
│  ── AddonRegistry: builtins + npm addons                     │
│  ── WS bridge: state publisher, gesture broadcaster          │
└─────────────────────────────┬────────────────────────────────┘
                              │ deck-config / state WS msgs
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Frontend SPA (Vite + React 19 + Tailwind 4)                │
│  ── App.tsx → theme resolve, WS client, render <Deck/>       │
│  ── Deck.tsx: <ButtonFrame> × N → addon ButtonSurface       │
│  ── UI primitives (ButtonFrame, Icon, Label, …)              │
│  ── UI surfaces (IconLabel, Bars, LabelValue, SplitAction)   │
│  ── Virtual modules: themes/manifest, addons/registry, token │
└──────────────────────────────────────────────────────────────┘
```

## Component boundaries

- **Service owns** the device, runtime, addon backends, WS bridge. Never renders pixels.
- **Frontend owns** rendering. Never decides navigation — it projects whatever the runtime sent (`deck-active` → URL change).
- **Emulator SPA** embeds the frontend in an iframe + adds click overlay. Owns gesture detection on its own pointer events; emits final gestures to backend.
- **Addons** ship `manifest: AddonManifestV1` (declarative) + `backend` (per-button hooks) + optional `frontend` (React components). The registry validates namespace prefixes.

## Data flow (gesture → action)

```
pointerdown/up
  → gesture detector (real: device.onKeyEvent; emulator: emulator/gesture.ts)
    → WS button-action {deckId, position, gesture}
      → OutputClient.onMessage
        → runtime.dispatchGesture(buttonId, gesture)
          → addon-handler-bridge listener
            → addon onTap/onDblTap/onHold
              → methods.* / executor.run
                → runtime.invalidate
                  → state publisher emits
                    → frontend useAddonChannel(channel)
```

## State ownership

| Concern                   | Owner                                       |
|---------------------------|---------------------------------------------|
| navStack                  | runtime                                     |
| overlay (modal decks)     | runtime                                     |
| Active deck               | runtime (URL = read-only projection)        |
| Gesture queue per key     | transport (real hardware or emulator SPA)   |
| Per-addon state (KV)      | core/store.ts (file-backed)                 |
| Theme tokens              | themes/loader.ts → virtual module → frontend|
| Per-deck button states    | runtime → state publisher → WS → frontend   |

## Build order (current)

1. CLI entry + config loader (foundation).
2. Addon API + registry + 9 first-party addons.
3. Runtime (navStack, gesture dispatch, system providers).
4. WS bridge + protocol.
5. OutputClient abstraction (real + emulator).
6. Frontend SPA + UI primitives + surfaces.
7. Emulator SPA (wraps frontend).
8. Themes loader + virtual modules.
9. Device layer (per-model handlers).

## Decoupling rules (enforced by oxlint)

- `packages/cli/src/` **cannot import** from `packages/cli/frontend/` or `packages/cli/emulator/`. Cross-process comms = WS only.
- Cross-folder imports beyond 3 levels up must use `@/`.
- Wire format is **gesture-only** (`button-action` carries `tap | dbl-tap | hold`). No raw `key-event` over the wire.
- Each transport owns its own gesture detection. Runtime is gesture-source-agnostic.