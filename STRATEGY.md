---
name: Sireno Deck
last_updated: 2026-07-23
---

# Sireno Deck Strategy

## Target problem

Elgato's official Stream Deck software doesn't work on Linux, has visually inconsistent buttons wherever it does run, and can't change decks dynamically based on context.

## Our approach

Sireno runs the deck as a background daemon driven by a CLI (and eventually a UI on top). The official app is GUI-only and click-driven; Sireno owns runtime state in a service so deck configuration is declarative — that's what makes theming consistent and dynamic overlays possible.

## Who it's for

**Primary:** Linux homelab dev — hiring Sireno Deck to surface system info at a glance and put per-active-window shortcuts on a physical deck instead of digging through keyboard combos.

## Key metrics

- **Weekly npm downloads** — acquisition signal, distribution breadth on the dominant install channel
- **Weekly upgrade ratio vN→vN+1** — retention proxy without telemetry; do v1 users come back for v2?
- **Open issues filed + median close time** — engagement quality; users hit real walls and cared enough to file

## Tracks

### Runtime coverage

Daemon stability and protocol breadth across Linux, macOS, Windows.

_Why it serves the approach:_ the daemon is the substrate; if it doesn't run everywhere and stay up, declarative config has nothing to render.

### Config-first deck ecosystem

Every deck behavior reachable from YAML, themable across platforms, version-controllable in git.

_Why it serves the approach:_ this is what makes "the deck is in your dotfiles, not in clicks" true — the visual-consistency half of the problem, and the main thing that distinguishes Sireno from a GUI app.

### Dynamic decks as first-class

Context-driven overlays — active window, system state, time-of-day change which keys render and what they do.

_Why it serves the approach:_ kept separate from config-first so "static config you save" and "live state that reshapes the deck" don't collapse into one feature; this is the dynamic-decks half of the target problem.
