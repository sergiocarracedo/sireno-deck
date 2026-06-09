# Research Summary — v1.5 Addon & UX Polish

**Milestone:** v1.5 — Addon & UX Polish
**Researched:** 2026-06-07
**Confidence:** HIGH overall. The new tech is small (one new dep, one new HTTP API). The architecture is mostly evolution of existing seams. The risks are concentrated in two areas: active-app detection cross-OS, and the negative-color Bars render. Both are tractable.

## Executive Summary

This milestone has five user-facing capability groups, but they cluster into three risk tiers:

**Low risk (incremental, in-codebase seams):**
- Weather city-name + 2-day forecast — extends existing weather addon with a new HTTP param and a new component. The Open-Meteo Geocoding API is well-documented and keyless. The 2-day forecast is a one-liner change in the existing client.
- Bars content polish — extends the shared `Bars` component. Label color fallback is a one-line change. Negative-color value text can be precomputed at config load from the bar fill color (no runtime pixel sampling needed in the common case).
- Lock-deck navigation — adds one clause to `shouldInjectSystemBack` and reuses existing session monitor.

**Medium risk (new device-side surface, but bounded):**
- Brightness control — adds `setBrightness` to `StreamDeckDeviceHandle`. The SDK method exists in v7; we just need to verify the installed version's signature (0–100 vs. 0–1) and wrap it. Multi-device iteration is the main gotcha.
- Settings deck — new first-party addon that *uses* brightness control. The "where does the settings deck live" question (addon vs. core) is answered: addon, for consistency.

**Higher risk (new external dep + new architectural concept):**
- Active-app decks — introduces a new npm dep (`active-win`), a new architectural concept (overlay), and a new gesture (double-tap on back). Three integration points, each with OS-specific failure modes. macOS Accessibility, Linux Wayland, Windows process-name casing. The biggest phase.

The recommended phase order isolates each risk tier:
1. Weather (low) — validates the geocoder HTTP seam
2. Bars (low) — validates the render-seam change
3. Lock-deck (low) — warm-up for the overlay concept
4. Brightness (medium) — device seam
5. Settings deck (medium) — first user of brightness
6. Active-app decks (high) — the big one

## Recommended Stack

Keep the existing stack. Add one dep:

| Add | Why |
|-----|-----|
| `active-win` (^8) | Cross-platform foreground window detection. Replaces three per-OS adapters with one dep. |
| Open-Meteo Geocoding (HTTP, no key) | City-name → coordinates. No new dep. |

Everything else is reuse. See `STACK.md` for the full stack table.

## Feature Recommendations

### Must-have for v1.5 (REQ-IDs to be assigned in REQUIREMENTS.md)

**Weather (WEATHER-):**
- City-name string config (`location: "Vigo, Spain"`)
- Lat/lon object config kept (union type)
- 2-day daily forecast page (new 4th page)
- WMO weather code → glyph shared between hourly and daily pages
- Geocoder cache, normalized key, single-flight in-flight
- Auto-contrast (well-populated city picks the right one)

**Bars (BARS-):**
- Label falls back to theme primary color when item has no color
- Value text rendered inside the bar, rotated 90°
- Value text color = negative of bar fill color, precomputed at config load
- DOM path uses `mix-blend-mode: difference` for parity
- Auto-contrast fallback when bar fill is near 128-luma

**Settings deck (SETTINGS-):**
- `setBrightness(percentage: 0-100)` on `StreamDeckDeviceHandle`
- New first-party addon `builtin-addons/settings/`
- Brightness up, brightness down, current brightness display, CLI version
- Main deck reserved slot becomes a Settings button (replaces home button)
- Settings deck reserved slot becomes a back-to-main button
- Brightness persists for the session, not across reboots (deferred to v1.5.x)

**Lock deck (LOCK-):**
- Lock deck navigable when session is not locked
- System back button not injected when `session.state === 'locked'`
- Logo+version tile behavior on lock deck is the existing behavior from v1.4 quick 038

**Active-app decks (ACTIVEAPP-):**
- `processNames: string[]` in addon deck definition (optional field, backwards-compatible)
- `active-win` poller with 500ms default, configurable
- Overlay concept in controller (separate from base stack)
- Toggle button in reserved slot on overlay decks
- Double-tap on back button returns to most recent active-app deck (350ms window)
- Process matching: case-insensitive substring, strip `.app` on macOS
- Wayland: detect at startup, disable with warning
- Multi-addon conflict: first-match-wins, log warning at startup
- Active-app decks can paginate internally (overlay-local history)

### Keep out of this milestone (anti-features)

- Per-app brightness profiles
- Weather alerts / push notifications
- City autocomplete dropdown
- Bars with non-bar shapes (donuts, gauges, sparklines)
- Lock-deck "preview" badge
- Wayland native active-app support
- Persistent brightness across reboots
- Multi-monitor active-app distinction
- Cross-addon active-app chain

See `FEATURES.md` for the full anti-feature list with rationale.

## Roadmap Implications

### Recommended phase order

1. **Weather: city-name + 2-day forecast** (1 phase, 2 plans)
   - Plan 1: Geocoder + schemas union + cache
   - Plan 2: 2-day daily forecast component + page wiring
   - Risk: LOW. Validates HTTP seam and render-seam of new page.

2. **Bars content polish** (1 phase, 1 plan)
   - Plan: Label primary fallback + in-bar value text + negative color
   - Risk: LOW. Validates render-seam change.

3. **Lock deck navigation refinement** (1 phase, 1 plan)
   - Plan: Remove back injection when locked; allow navigation when not locked
   - Risk: LOW. Warm-up for the overlay concept (next phase).

4. **Brightness control on device layer** (1 phase, 1 plan)
   - Plan: `setBrightness` method on `StreamDeckDeviceHandle` + unit tests
   - Risk: LOW-MEDIUM. No UI yet. Pure device layer.

5. **Settings deck + reserved slot replacement** (1 phase, 2 plans)
   - Plan 1: New `builtin-addons/settings/` addon
   - Plan 2: Main deck reserved slot replacement (logo+version moves to settings)
   - Risk: MEDIUM. First user-facing change that affects every default layout.

6. **Active-app decks** (2 phases, 4–5 plans)
   - Phase A: Addon manifest extension + active-win poller + overlay controller (no UI yet, just state)
   - Phase B: Toggle button render + double-tap detector + integration with system-back-injection + multi-addon warning
   - Risk: HIGH. New dep, new architectural concept, new gesture.

### Total: 5–6 phases, ~9–12 plans

This matches the ~16–22 v1.5 requirements from FEATURES.md.

### Which phases need deeper research flags

- **Phase 6 (active-app decks)** is the risk concentration point. The plan-phase should plan for: a) verifying `active-win` works in the install environment, b) testing the double-tap window with real users, c) verifying Wayland detection, d) testing the multi-addon conflict scenario.
- **Phase 5 (settings deck + reserved slot replacement)** is a UX breaking change. The plan-phase should plan for: a) UAT for the new default layout, b) CHANGELOG entry for the breaking change, c) verifying the logo+version still renders correctly in the new home.

### Which phases are research-flagged "explore" vs. "build"

All phases here are "build" — the features are well-defined. No phase requires a research spike first. The "research" was done in this milestone, before `plan-phase`.

## Primary Recommendation

Build the five feature groups as a sequenced set of 5–6 phases, ordered from low to high risk. The first four phases are self-contained and can each ship as an independently demoable slice. The active-app phase is the most complex and benefits from being last, so all the preconditions (overlay concept, double-tap detector, system-back-injection) are already exercised by the lock-deck phase.

The keystone technical insight: **the negative-color value text in Bars can be precomputed at config load from the bar's fill color, eliminating the need for runtime pixel sampling in the common case.** This simplifies the implementation dramatically — the "sharp pixel sampling" feature becomes a fallback for gradient/theme-driven bar colors, not the primary path.

## Architecture Notes for the Roadmapper

- **Don't bump `SIRENO_ADDON_API_VERSION`.** All changes are backwards-compatible (additive optional fields, new addon). The version stays at 1.
- **The settings deck should be a first-party addon, not a core-managed deck.** Consistency with the rest of the deck system.
- **The overlay concept is a controller-level addition, not a renderer-level one.** The renderer composites "overlay ?? top-of-base" once per frame.
- **Double-tap detection is in the controller, not the renderer.** The renderer just emits "back button pressed" events; the controller decides whether that's a tap, a double-tap, or a hold.
- **The geocoder is internal to the weather addon.** It's not a core service. Other addons don't need it for v1.5.

---

*Research summary for: v1.5 — Addon & UX Polish*
*Researched: 2026-06-07*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, prior codebase map (`.planning/codebase/`, 22 days old), v1.4 audit, v1.4 STATE, and live Open-Meteo API doc fetches this session.*
