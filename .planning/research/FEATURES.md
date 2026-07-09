# Features

> What Sireno Deck does today and what's planned. Source of truth is `ARCHITECTURE.md`.

## Today (v1.6 + Phase 71–75)

- **YAML-declared decks** — `config.yml` lists button instances; zod validates the whole config.
- **10 built-in addons** — `brightness`, `core-buttons`, `internal-settings`, `session`, `date-time`, `emoji-selector`, `media`, `system-status`, `value-display`, `weather`. Each ships a manifest (`sirenodeck.json`) + TS entry exporting an `AddonManifestV1`.
- **3rd-party addons** — `addons/` directory or npm-installed; auto-scanned on startup.
- **Themes** — YAML visual tokens (`dark.yml`, `light.yml`); resolved into CSS at runtime.
- **Two execution modes**:
  - `real` — daemon + Playwright screenshot loop + Stream Deck blit
  - `emulator` — Vite frontend + emulator iframe + WS click injection
- **Active-app overlay decks** — service polls focused process/window every 1s, debounced 200ms, applies matching overlay deck automatically.
- **Action executor** — `execa("/bin/sh", ["-c", cmd])` with `{{ host.* }}` placeholders (`hostname`, `platform`, `arch`, `username`, `homedir`).
- **Key macros** — cross-platform keystroke injection (`linux.ts`, `darwin.ts`, `windows.ts` providers).
- **Paste text** — write to clipboard + Ctrl/Cmd+V paste keystroke (`clipboardy.writeSync` + `keyMacroProvider.send`).
- **Gesture detection** — `tap` / `dbl-tap` / `hold` with `HOLD_ACTION_DELAY_MS = 500`, `DOUBLE_TAP_DELAY_MS = 500`. Per-key state machine in `core/gesture-state.ts`.
- **Per-button gesture stream** — WS channel `runtime:gesture:${buttonId}` broadcast on every detected gesture.
- **Channel pub/sub** — addons publish to named channels; frontend subscribes via `useAddonChannel`. `StatePublisher` manages per-channel timers + activation per active deck.
- **System back/forward injection** — service computes the n-1 slot button per-deck (`core:settings-entry` on main, `core:overlay-toggle` on overlay, `core:back` on navStackDepth>1).

## Known Limitations (pre-v1.7)

- No React Router in frontend — navigation handled via WS `deck-config` swaps.
- Frontend-UI clicks bypass the gesture stream (use `runtime.invokeAction` directly).
- `gestureHandlers` field exists on backend manifests but is not enforced at runtime — currently default-allow.
- 79 pre-existing failures in `packages/cli/src/deck/runtime.test.ts` from Phase 42/67 system-back-injection firing in test contexts.
- Two shapes for addon decks (`AddonDeckFactory` no-config + `AddonDeckDefinition` config-aware) — registry accepts both.

## Planned (v1.7 P-list — see ARCHITECTURE.md §8)

| ID     | Title                                         | Scope                                                     |
| ------ | --------------------------------------------- | --------------------------------------------------------- |
| **P1** | Add React Router to frontend                  | Routing layer; service stays authoritative on active deck |
| **P2** | `gestureHandlers` opt-in filter, default-deny | Breaking change; WS payload carries per-button opt-in     |
| **P4** | Auto-register all addon decks on load         | No manual user config registration                        |
| **P5** | `internal?: boolean` on `AddonDeckDefinition` | Opt-out of user config surfaces                           |
| **P6** | `SplitActionSurface` on n-1 for every deck    | Main + sub + overlay                                      |
| **P8** | `backend` → `service` rename                  | Terminology cleanup                                       |

## Out of Scope (this milestone)

- Per-addon frontend authoring (only `date-time/frontend.tsx` exists today; others are CLI-side TSX).
- Multi-deck devices (XL has 32 keys but we ship a fixed `DEFAULT_KEY_COUNT = 15`).
- Mobile companion app.
- Hot-reload of addon code (daemon restart required today).
