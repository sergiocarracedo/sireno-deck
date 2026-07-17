# Project State

**Project:** sireno-deck-2
**Active branch:** chore/nuke-planning-reinit
**Last activity:** 2026-07-17 - Phase 5 UAT fix: n-1 system buttons forward dbl-tap/hold to runtime (commit ccc548f)

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Extract expandTokens to ui/primitives/text-format (REVERTED) | 2026-07-14 | — | .planning/quick/001-extract-expandcomponents/ |
| 002 | Launcher label overlay + paste diagnostic logging | 2026-07-14 | c970a7d | .planning/quick/002-paste-launcher-debug/ |

## Roadmap Evolution

- Phase 4 added: Settings Deck
- Phase 5 added: Overlay Decks
  - PLAN-1 (Wave 1) complete: backend runtime — matcher AND, autoShow gate, per-overlay nav stack, smoke test
  - PLAN-2 (Wave 2) complete: frontend SplitSurface gestures (tap/dbl-tap/hold), icon override, back-hold → mainDeck
  - UAT fixes committed: getActiveDeck overlay-aware, React hooks order, main deck n-1 SplitSurface, GNOME Wayland provider, n-1 dbl-tap/hold forwarding
  - Pending user UAT: restart daemon and verify main deck n-1 overlay-toggle dbl-tap switches to overlay deck
- Phase 6 added: Lock Deck — `lock:` config block (custom buttons + folder passthrough), session-locked → global mode that overrides overlay layer, disables gestures, suppresses system buttons; default 3-button time deck (HH : MM); `go-to-folder` is the only escape hatch from user-defined lock decks. Existing `session:locked` deck in `session` addon becomes the default; needs to be reshaped from 5 buttons → 3.