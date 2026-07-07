# Project

> Sireno Deck — declarative control for the Elgato Stream Deck, with a plugin system and a real-or-emulated frontend.

## One-line

`config.yml` → service daemon → Stream Deck (real) or browser emulator.

## Who it's for

Power users who want to script their Stream Deck — actions, key macros, paste, system-overlay decks — without Elgato's official software. Addon authors who want to ship button types and decks without forking the runtime.

## What ships today (v1.6)

See `research/FEATURES.md` — the TL;DR is YAML-declared decks, 10 built-in addons, 3rd-party addon scanning, themes, real + emulator modes, gesture detection with WS broadcast, channel pub/sub, system-back injection.

## What's planned (v1.7)

See `ROADMAP.md` — five changes (P1, P2, P4, P5, P6) close the gap between the architecture doc's intent and the code. P8 is a follow-up rename.

## Architecture

Source of truth: `ARCHITECTURE.md`. Lean mirrors in `research/{STACK,FEATURES,PITFALLS,SUMMARY}.md`.

## Workflow

This repo uses **learnship** (`.planning/AGENTS.md`) but **no phases / quick / discuss-phase ceremony.** The architecture doc + this roadmap are the plan. A change gets one commit per concern. Capture gotchas to `.planning/solutions/<category>/<slug>.md` with YAML frontmatter.

## Success criteria for v1.7

1. Frontend has React Router; per-deck URLs reflect the active deck.
2. `gestureHandlers` is enforced — addons must opt in to receive gestures.
3. Every addon-defined deck auto-registers; `internal?: true` keeps user-internal decks out of config surfaces.
4. Every deck (main, sub, overlay) shows `SplitActionSurface` on the n-1 slot with the correct primary action.
5. All 10 built-in addons updated to declare `gestureHandlers` where they expose backend gesture handlers.
6. All existing tests still pass; no new failures introduced (the 79 pre-existing failures are out of scope).

## Scope guardrails

- **Out of v1.7:** per-addon frontend authoring (only `date-time/frontend.tsx` exists), multi-row device support (XL has 32 keys), mobile companion, hot-reload of addon code.
- **Open question:** P2's breaking-change policy for 3rd-party addons. Either bump `SIRENO_ADDON_API_VERSION` and warn loudly, or ship P2 with a one-release compatibility shim. Decision deferred to plan-phase.