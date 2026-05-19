# Phase 3 Discussion Log

**Date:** 2026-05-12
**Mode:** synthesized from direct `/plan-phase 3`
**Phase:** 3 - Themes + Basic Buttons

## Area: Theme Loading

### Decision Point: Theme reference shape
- Option A: Config `theme` accepts either a built-in theme name or a filesystem path. Recommended because it satisfies both built-in switching and user-defined YAML themes with the smallest surface area.
- Option B: Separate `theme` name and `theme_path` fields.
- Option C: Inline theme objects in `config.yml`.
- Planning choice: `theme` accepts built-in name or filesystem path (Recommended)

### Decision Point: Theme source priority
- Option A: Resolve built-in names first, otherwise treat the value as a path. Recommended because built-in switching is the common case and keeps config terse.
- Option B: Require a prefix such as `builtin:` or `file:`.
- Option C: Only allow explicit file paths.
- Planning choice: `Resolve built-in names first, then filesystem path (Recommended)`

## Area: Deck Model

### Decision Point: Startup deck selection
- Option A: Add required top-level `main_deck` pointing to a deck id. Recommended because startup state should be explicit, not implied by map order or magic ids.
- Option B: Hard-code `main` as the root deck id.
- Option C: Use the first declared deck.
- Planning choice: `Required main_deck field (Recommended)`

### Decision Point: Back button behavior
- Option A: Auto-insert a reserved back button at key `0` for every sub-deck. Recommended because it guarantees a way out without forcing repeated config boilerplate.
- Option B: Require users to place their own back buttons in every sub-deck.
- Option C: Add a global gesture for back navigation.
- Planning choice: `Auto-insert key 0 back button on sub-decks (Recommended)`

## Area: Button Interaction

### Decision Point: Tap semantics
- Option A: Treat a press as a tap when the same key emits `down` then `up`. Recommended because it matches Stream Deck expectations while leaving room for hold/double-tap later.
- Option B: Trigger on `down` immediately.
- Option C: Trigger on `up` only with no state tracking.
- Planning choice: `down -> up on same key (Recommended)`

### Decision Point: Action feedback UX
- Option A: Show transient success or failure feedback on the pressed key, then restore the normal button display. Recommended because it is visible on-device and does not require global UI.
- Option B: Only log action success or failure to the terminal.
- Option C: Replace the full deck with a temporary status screen.
- Planning choice: `Transient per-key feedback (Recommended)`

### Decision Point: Periodic display commands
- Option A: Reuse the existing polling scheduler per button and update only the affected key. Recommended because Phase 2 already proved the scheduler and write dedupe path.
- Option B: Re-render the whole deck on every command tick.
- Option C: Poll only on demand after a key press.
- Planning choice: `Reuse per-button scheduler with single-key refresh (Recommended)`

## Area: Extensibility

### Decision Point: Built-in button architecture
- Option A: Introduce a small built-in button registry now. Recommended because Phase 5 depends on a stable registration boundary and Phase 3 is the first point where multiple button types exist.
- Option B: Hard-code button handling in `start.ts` and refactor later.
- Option C: Jump straight to the full addon API now.
- Planning choice: `Small built-in button registry now (Recommended)`

## Areas Delegated To Agent's Discretion
- Exact theme token names beyond the required background, accent, and primary fields.
- Exact button card styling, icon treatment, and typography so long as dark/light differences are obvious.
- Exact timeout and text format for action success/failure feedback.
- Exact module split between deck runtime, button registry, and command execution helper.

## Deferred Ideas
- Hold, long-press, and double-tap gestures.
- User-configurable back button position.
- Rich action feedback overlays with animations or progress states.
- Theme inheritance or token aliases.
