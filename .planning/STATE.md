# Project State

**Project:** sireno-deck-2
**Active branch:** main
**Last activity:** 2026-07-21 - Phase 9 in progress (emulator rework + system-status addon)

## Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1-3 | Emoji-selector fixes + paste command | Complete |
| 4 | Settings Deck | Complete |
| 5 | Overlay Decks | Complete (2026-07-17) |
| 6 | Lock Deck | Complete (2026-07-17) |
| 7 | Text Line-Clamp & Ellipsis | Complete |
| 8 | Runtime Resilience | Complete (merged phase-08-runtime-resilience) |

## In Progress

**Phase 10: Deck Reliability, Application Overlays, Config Includes, and Hardware Lifecycle**
- Context gathered 2026-07-21 (deep mode) — 4 workstreams, all decisions captured
- Plans created 2026-07-21 — 5 plans in 2 waves
- All plans executed 2026-07-21:
  - 10-01: hardware splash + black shutdown (push-raw-image.ts, real.ts init wiring)
  - 10-02: Wayland+GNOME window title via FocusTitle D-Bus
  - 10-03: chrome-overlay external addon (21 curated buttons, registered in config.yml)
  - 10-04: frontend asset-timing gate (assetsReady state, LoadingSkeleton)
  - 10-05: nested YAML config includes (`!include path/to/file.yml`, cycle detection, 7 tests)

**Phase 9: Post-v1 Polish**
- Workstreams 1-4 partially complete (emulator side-panel, back-button, system-status addon)
- Config hot-reload (watch) implemented
- Button error variant + config error handling implemented
- Remaining: hardware splash/shutdown (now folded into Phase 10), device-model swap

## Uncommitted Changes

- `config.yml` — config deck structure changes
- `packages/cli/src/config/validation.ts` — enhanced `validateButton` to return `ButtonValidationResult`

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Extract expandTokens to ui/primitives/text-format (REVERTED) | 2026-07-14 | — | .planning/quick/001-extract-expandcomponents/ |
| 002 | Launcher label overlay + paste diagnostic logging | 2026-07-14 | c970a7d | .planning/quick/002-paste-launcher-debug/ |

## Key Features (verified in codebase)

- **Config watch**: `packages/cli/src/cli/commands/run.ts:834-949` (ConfigWatcher, hot-reload)
- **Button error variant**: ButtonFrame.tsx, system-buttons/registry.tsx, protocol-internal.ts, methods.ts, runtime.ts, App.tsx, Deck.tsx
- **Config error handling**: errors.ts (ConfigError), validation.ts (validateButton), requirements.ts
- **Emulator side-panel**: App.tsx, SidePanel, DeviceSelector
- **System-status addon**: system-status addon ported from legacy

## Roadmap Evolution

- Phase 10 added: deck reliability, application overlays, config includes, and hardware lifecycle
- Phase 9 added: post-v1 polish (hardware UX gaps + emulator rework + system-status addon port)
- Phase 4 added: Settings Deck
- Phase 5 added: Overlay Decks (complete)
- Phase 6 added: Lock Deck (complete)
- Phase 7 added: Text Line-Clamp & Ellipsis (complete)
- Phase 8 added: Runtime Resilience (complete)
