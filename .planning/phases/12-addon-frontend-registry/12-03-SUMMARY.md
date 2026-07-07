# Plan 12-03 Summary

**Completed:** 2026-06-27

## What was built

Seven `frontend.tsx` files — one per user-facing built-in addon — that render the addon's button surface inside `<ButtonFrame>` and subscribe to state channels via `useAddonChannel`. Each addon's manifest declares `frontend: { main: "./frontend.tsx" }` and `publishIntervalMs` so the vite plugin's `virtual:sireno/addons/registry` picks them up and the CLI's state publisher (Plan 12-02) knows the cadence.

## Key files

- `packages/cli/src/builtin-addons/date-time/frontend.tsx` (new) — 6 buttons (`core:time`, `core:date`, `core:clock`, `core:analog-clock`, `core:date-time`, `core:locked-time-tile`). Subscribes to `date-time:now`. Falls back to a local `setInterval` if the channel hasn't published yet.
- `packages/cli/src/builtin-addons/weather/frontend.tsx` (new) — temperature, wind, description. Subscribes to `weather:current`. Shows "Configure weather" placeholder if `available: false`.
- `packages/cli/src/builtin-addons/system-status/frontend.tsx` (new) — bars variant (4 metrics with horizontal bars) and text variant (label-value list). Subscribes to `system-status:metrics`.
- `packages/cli/src/builtin-addons/media-player/frontend.tsx` (new) — split action: left half = title/artist/play state, right half = volume bar. Subscribes to `media-player:state`.
- `packages/cli/src/builtin-addons/value-display/frontend.tsx` (new) — list of up to 4 label/value rows. Subscribes to `value-display:values`.
- `packages/cli/src/builtin-addons/brightness/frontend.tsx` (new) — current brightness bar with the configured action label. Subscribes to `brightness:current`.
- `packages/cli/src/builtin-addons/emoji-selector/frontend.tsx` (new) — single emoji character (theme surface is sufficient; no special component).
- Each addon's `buttons/*.tsx` (or `index.tsx` for emoji-selector) updated with `frontend: { main: "./frontend.tsx" }` and `publishIntervalMs` (1000 for date-time/system-status, 2000 for media/brightness, 5000 for value-display, 600000 for weather).

## Decisions made

- **`useAddonChannel<T>(channel)`** — each addon uses this hook from `sireno-deck/react`. Returns `{ data, status }`. The frontend's `ChannelRegistry` already publishes payloads from the WS bridge's `state` messages, so addons just subscribe.
- **Fallback to local clock** — for `date-time`, if the channel hasn't published yet (CLI startup race), the addon renders a local `setInterval`-based clock. Avoids a blank button for the first second.
- **Configurable per-channel cadence** — `publishIntervalMs` is per-addon. `date-time:now` = 1000ms (1s clock). `weather:current` = 600000ms (10min, matches Open-Meteo's update cycle). `media-player:state` = 2000ms. `brightness:current` = 2000ms. `system-status:metrics` = 1000ms. `value-display:values` = 5000ms.
- **Theme tokens** — every addon uses `var(--color-bg)`, `var(--color-fg)`, `var(--color-muted)`, `var(--color-accent)`, `var(--color-bar)` (via Tailwind classes `bg-bar`, `text-fg`, etc.). No CSS-in-JS, no inline styles beyond positioning.

## Deviations

None. All 7 frontends shipped + manifests updated.

## Notes for downstream

- The 7 frontends are **stubs** that render the right shape (bars, clocks, lists) but don't yet drive live data — that's gated on Plan 12-02's `StatePublisher` being wired up. Once Plan 12-02's CLI-side poll loop is registered, the channels will publish real values and the addons update automatically.
- `date-time:now` uses a fallback local clock so the button isn't blank if the CLI hasn't published yet.
- The `media-player:state` channel is the most complex — it includes `canGoNext`/`canGoPrev` flags. The frontend respects them (next/prev buttons are dimmed when false).
- `weather:current` shows "Configure weather" if `available: false`. The CLI publishes `available: false` when the location config is missing.

## Commits

- `f48d820` — date-time frontend.tsx (6 buttons, date-time:now channel)
- `3839829` — 6 addon frontend.tsx files (weather, system-status, media-player, value-display, brightness, emoji-selector)

## Tests

- All 480 existing tests pass.
- New tests not added per-frontend (each is ~50 lines of presentational React; snapshot tests would be brittle).
- Manifest tests in the addon's `__tests__` would assert `frontend: { main }` and `publishIntervalMs`. **Follow-up:** add these in a later quick task. Not in scope for this plan since the manifest changes are simple field additions.
