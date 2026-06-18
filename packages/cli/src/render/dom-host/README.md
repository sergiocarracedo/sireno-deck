# `render/dom-host/`

Server-side React → HTML rendering for Stream Deck button surfaces.

This folder is the single entry point for everything that turns React elements
into the HTML the runtime needs. External callers should import from
`@/render/dom-host` only — sibling files are implementation details.

## Public API

Import surface — every external caller in this repo uses one of these symbols.

| Symbol | Kind | Purpose |
| ------ | ---- | ------- |
| `HostedButton` | type | A single button's content + presentation metadata |
| `DomHostRenderOptions` | type | Options for `renderDomDeck` |
| `MountedDomHost` | type | A live mount point returned by `createMountedDomHost` |
| `MountedHostedButtonSnapshot` | type | One button's snapshot HTML + key index |
| `renderReactNodeToHtml(node)` | fn | Static `react-dom/server` render — used by 19 tests |
| `renderDomDeck(buttons, opts)` | fn | Full `<!doctype html>` deck document for the browser (Playwright + emulator) |
| `renderMountedHostedButtons(host, buttons)` | fn | Run a `defineMountedButton` body against `host`, snapshot HTML per key |
| `createMountedDomHost()` | fn | Build a live mount point (custom React DOM reconciler under the hood) |
| `createHostedButtonElement(button)` | fn | Wrap a button in the theme provider + buttonFrame seam |

## File layout

```
dom-host/
├── index.tsx                  # orchestrator + public API surface
├── button.tsx                 # ButtonSurface wrap + theme presentation providers
├── deck-document.tsx          # full <!doctype html> deck shell
├── key-slot.tsx               # one Stream Deck key well
├── hosted-button-content.tsx  # pre-rendered HTML vs live React chooser
├── dom-host.test.tsx          # 20 tests covering all 4 render modes
└── README.md                  # this file
```

## Render modes

`renderDomDeck` and `renderMountedHostedButtons` cover the two distinct output
paths:

- **Browser / hardware** — full HTML document, fed to Playwright by
  `cli/commands/start.ts:299` to grab per-key PNGs.
- **Mounted / runtime** — `createMountedDomHost` builds a live mount via a
  custom React DOM reconciler (`index.tsx:163-293`), then
  `renderMountedHostedButtons` re-renders mounted button bodies (Phase 75
  value-display + any `defineMountedButton` using `useButtonActionCommand`)
  and emits per-key HTML for the renderer.

## Conventions

- Internal imports use **relative** paths (`./button`, `./deck-document`)
  — never `@/render/dom-host/...`. The public surface is `@/render/dom-host`
  (resolves to `./index.tsx`).
- All cross-sibling type imports come from `./index` (the orchestrator owns
  `HostedButton`).
- Cross-package imports still use the `@/` alias.