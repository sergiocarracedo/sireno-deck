# Project

> Sireno Deck — declarative control for the Elgato Stream Deck, with a plugin system and a real-or-emulated frontend.

## One-line

`config.yml` → service daemon → Stream Deck (real) or browser emulator.

## Who it's for

Power users who want to script their Stream Deck — actions, key macros, paste, system-overlay decks — without Elgato's official software. Addon authors who want to ship button types and decks without forking the runtime.

## What ships today (v1.7)

Completed 2026-07-08. 6 P-items delivered: React Router frontend nav, gestureHandlers default-deny, default main deck + n-1 injection + addon auto-register, internal? flag on decks, SplitActionSurface on n-1, Backend→Service rename. See `.planning/milestones/v1.7-ROADMAP.md` for full details.

## What's planned (v1.8)

Scope TBD.

## Architecture

Source of truth: `ARCHITECTURE.md`. Lean mirrors in `research/{STACK,FEATURES,PITFALLS,SUMMARY}.md`.

## Workflow

This repo uses **learnship** (`.planning/AGENTS.md`) but **no phases / quick / discuss-phase ceremony.** The architecture doc + this roadmap are the plan. A change gets one commit per concern. Capture gotchas to `.planning/solutions/<category>/<slug>.md` with YAML frontmatter.

## Success criteria for v1.7 (✓ complete)

All 6 criteria met. See `.planning/milestones/v1.7-ROADMAP.md`.

## Scope guardrails

- **Out of v1.7:** per-addon frontend authoring (only `date-time/frontend.tsx` exists), multi-row device support (XL has 32 keys), mobile companion, hot-reload of addon code.
- **Open question:** P2's breaking-change policy for 3rd-party addons. Either bump `SIRENO_ADDON_API_VERSION` and warn loudly, or ship P2 with a one-release compatibility shim. Decision deferred to plan-phase.