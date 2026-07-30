---
title: Architecture
description: How Sireno Deck is wired, from `config.yml` to pixels.
---

Sireno Deck is a single Node process that owns the device, the runtime, and
the addon backends. Three browser-served Vite surfaces read its state.

## At a glance

```
config.yml  ──►  loadConfig + validateFull  ──►  AddonRegistry
                                                 │
                                                 ▼
                DeckRuntime { pub-sub, gesture state machine }
                          │                          │
                          ▼                          ▼
                   WS bridge                    vite frontend
                   (52937)                      (5180)
                          │
                          ▼
                   emulator shell
                   (52938)
```

Every button tap flows through the same `dispatchGesture` entry point —
whether it came from hardware, the emulator click, or a programmatic call.

## Major pieces

- **CLI** — `run` / `start` / `stop` / `status`. Daemonizes via the platform
  convention (`$XDG_RUNTIME_DIR/sireno-deck/`).
- **Runtime** — `packages/cli/src/deck/runtime.ts`. Owns navigation stack,
  active-deck payload, overlay-deck lifecycle, the gesture state machine.
- **Methods context** — `packages/cli/src/deck/methods.ts`. Exposes namespaced
  host services to addon backends: `runCommand`, `keyMacro`, `typeText`,
  `navigateToDeck`, `invalidate`, `publish`, `subscribe`.
- **WS bridge** — `packages/cli/src/render/ws-bridge.ts`. The single
  cross-process channel between service and browser surfaces. `oxlint` blocks
  `cli/src/**` from importing into `frontend/` or `emulator/` — all
  cross-process traffic goes through this bridge.
- **Frontend** — `packages/cli/frontend/`. React 19 + Tailwind 4 SPA that
  renders the active deck using theme tokens.
- **Emulator** — `packages/cli/emulator/`. Clickable shell around the frontend
  that turns mouse clicks into gestures.
- **Addon registry** — `packages/cli/src/addon/registry.ts`. Built-in addons
  plus user-installed addons registered through the addon API.

## Theming

The default theme lives at `packages/cli/src/themes/default/`. A theme is a
manifest (`sirenodeck.json`) plus assets (CSS + fonts). Themes can override:

- **Color tokens** — JSON in `colorTokens`.
- **Typography roles** — JSON in `typography` (main_text, auxiliary_text, monospace).
- **Fonts** — paths to TTF/WOFF files.
- **CSS hooks** — by hooking `.sireno-default-*` data attribute selectors in
  `components.css`.
- **React components** — by registering alternates through
  `ThemeUiPresentationProvider`.

User-authored themes live at `packages/themes/theme-XXXX` (outside the core
distribution).

## For more

- The full architecture document lives in the monorepo: `ARCHITECTURE.md`.
- The strategy document commits the target problem and approach:
  `STRATEGY.md`.
