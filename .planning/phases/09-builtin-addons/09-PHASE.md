---
phase: 09-builtin-addons
status: not-started
depends_on: [03-deck-runtime, 07-os-providers]
---

# Phase 09 — Remaining Built-in Addons

Goal: ship the rest of the built-in addon catalog.

## Outcomes

1. `src/builtin-addons/date-time/` — `core:date-time` button (renders current time/date).
2. `src/builtin-addons/emoji-selector/` — `core:emoji-selector` button (on tap navigates to `emoji` deck) + `emoji` deck via `createDecks` (grid of emoji buttons).
3. `src/builtin-addons/media-player/` — `core:media-play-pause`, `core:media-next`, `core:media-prev`, `core:media-volume-up`, `core:media-volume-down`. Uses OS media provider (Phase 07).
4. `src/builtin-addons/system-status/` — `core:cpu`, `core:memory`, `core:battery`. Publishes `system:cpu`, `system:memory`, `system:battery` channels periodically (debounced).
5. `src/builtin-addons/value-display/` — `core:value` button (renders a value from a subscribed channel).
6. `src/builtin-addons/weather/` — `core:weather` button. Needs a config (API key, location); no-op stub if no config.
7. `src/builtin-addons/brightness/` — `core:brightness` button. macOS only; stub on Linux/Windows.

## Requirements traceability

- **R7** (built-in addons: date-time, emoji-selector, media-player, system-status, value-display, weather, brightness)

## Key files

```
src/builtin-addons/
  date-time/
  emoji-selector/
  media-player/
  system-status/
  value-display/
  weather/
  brightness/
```
