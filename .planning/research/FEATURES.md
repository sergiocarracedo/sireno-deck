# Features — v1.5 Addon & UX Polish

**Milestone:** v1.5 — Addon & UX Polish
**Researched:** 2026-06-07
**Confidence:** HIGH for table stakes (well-known product categories); MEDIUM for differentiators (project-specific opinions)

The five feature groups share one principle: the user gets a *more usable* Stream Deck without writing a line of code. Each feature has a small, demoable behavior.

## Table Stakes

These are the floor. If we ship nothing else, these must be in.

### Weather
- **Accept `location: "City, Country"` string** in addon config. The previous shape (`location: {name, latitude, longitude}`) keeps working — union type.
- **Resolve city name to coordinates via Open-Meteo Geocoding** with a 24h in-memory cache keyed by the exact input string.
- **2-day daily forecast page** distinct from the existing hourly forecast. Shows max/min temperature, weather glyph, and precipitation per day. Uses `forecast_days=2&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`.
- **Page order: `main` → `data` → `hourly-forecast` → `daily-forecast`** (4 pages, was 3). The tap-to-cycle behavior is preserved.
- **Error state**: unknown city → "?" on the data page with the configured city string shown; falls back to IP geolocation if available (existing behavior).

### Bars
- **Label uses primary color from theme** when item color is not provided. The current code already falls back to a per-item color; this unifies the fallback to theme primary.
- **Value text rendered inside the bar, rotated 90°** (so it reads bottom-to-top), centered along the bar's length axis.
- **Value text color = negative of the average pixel color under the text.** Implementation: sample the bar fill region under where the text will be drawn, compute the mean RGB, and use `(255 - r, 255 - g, 255 - b)` for the text color. Cached per-bar; recomputed when the bar changes (config change, value change).
- **Both hardware (sharp) and emulator (DOM) render paths** show the negative-color behavior. DOM path may use CSS `mix-blend-mode: difference` as a shortcut — see STACK.md.

### Settings deck
- **New dedicated deck** containing: brightness up, brightness down, current brightness value (display-only), CLI version, and a "back to main" implicit navigation (replaces the home button on the main deck's reserved slot).
- **Brightness control writes to all open Stream Deck devices** through the new `setBrightness` method on `StreamDeckDeviceHandle`.
- **Brightness steps in 10% increments**, clamped to 0–100. Each press immediately calls `setBrightness`.
- **Main deck reserved slot becomes a Settings button** (action button) that navigates to the settings deck on tap.
- **Settings deck is navigable from anywhere** (main deck, sub-decks) via the same Settings button pattern (or via the main deck's reserved slot replacement).

### Lock deck
- **Lock deck is navigable even when the session is not locked.** This lets the user open it and "preview" the layout, or it just works if they navigate to it before the lock event.
- **Back button is not injected when the computer is locked.** The system-back-injection rule for `shouldInjectSystemBack` gains a clause: skip if `session.state === 'locked'`. The lock deck's own "back" affordance is also suppressed under this state.

### Addon active-app decks
- **Addon manifest / deck definition declares `processNames: string[]`** — array of process name fragments to match the foreground app's process name (case-insensitive substring match is fine for v1.5).
- **When a configured process is foreground, that deck is shown overlaid** on top of the current deck (active-app deck) — the underlying deck is not modified in the navigation stack.
- **When the foreground process changes to a non-matching one, control returns** to the underlying deck without history pollution.
- **The active-app deck shows a "toggle" button instead of a back button** in the reserved slot. The toggle button returns to the underlying deck without pushing history.
- **In regular (non-active-app) decks, double-tapping the back button returns to the most recently shown active-app deck** (if any). This gives the user a one-gesture path from anywhere back to the context deck.
- **Active-app decks can paginate** internally (sub-decks under the active-app deck's root). The toggle button on sub-pages behaves the same as the toggle on the root.
- **Active-app deck is a per-addon concept**: a single addon can declare one or more active-app decks; each matches its own process name list. Multiple addons declaring active-app decks is allowed; first-match wins (or last-declared wins — see PITFALLS for the conflict-resolution decision).

## Differentiators

Features that aren't strictly required, but make the addon stand out vs. competitors (e.g. Macro Deck, Stream Deck's own software, Bitfocus Companion).

- **City-name cache is keyed by typed string**, not by lat/lon. So `Vigo`, `Vigo, Spain`, and `Vigo,ES` are three cache entries. Simple, no fuzzy matching on input. (Sophisticated fuzzy would be a differentiator — defer to v2.)
- **The 2-day daily forecast page shares the WMO weather-code-to-glyph mapping** with the hourly forecast page. No duplicate mapping table. (De-duplication is the differentiator: one source of truth for "what does weather_code 71 mean".)
- **The negative-color value text works on the emulator too.** Most DIY solutions only do this in the actual hardware. By making the emulator show the same behavior, addon authors iterating on layout don't get surprised when they push to the device.
- **Brightness control remembers the last set value** for the session. If the device is unplugged and replugged, the cli does NOT auto-restore brightness (the OS may not have a stored preference either); the user has to bump it again. (Defer persistent storage of brightness to v1.5.x; not a v1.5 deliverable.)
- **Active-app decks with a "context" badge**: the toggle button could indicate which regular deck is "underneath" (e.g. a small chevron pointing to a house icon). For v1.5, plain toggle is fine; the badge is a v2 differentiator.
- **The double-tap-to-active-app gesture has a tunable window** (default 350ms), exposed in addon config. Power users may want it tighter (200ms) or looser (500ms) depending on their typing speed.

## Anti-Features

Things explicitly out of scope for v1.5. Documenting so we don't drift into them.

- **Nominatim / Google / Mapbox geocoding** — keep the addon keyless. See STACK.md.
- **City autocomplete dropdown** — Stream Deck tiles are 72x72. There's no room. A list of tiles for "pick a city" is a different feature.
- **Bars with custom shapes (donut, sparkline, gauge)** — Bars stays a horizontal bar with label + value. If we want richer visualizations, that's a new component.
- **Per-app brightness profiles** ("Spotify is foreground → dim to 30%") — over-engineering. Single global brightness is enough.
- **Lock deck "preview" mode with a clear "this is unlocked" badge** — the user said "navigate to it even if not locked" but didn't ask for a visual indicator. If it's confusing in practice, add it in a follow-up. (PITFALLS flags this for early review.)
- **Multi-monitor active-app detection** (which window has focus when the cursor is on screen 2) — out of scope; treat the foreground window as global.
- **Active-app decks for system processes (Finder, Explorer, GNOME Shell)** — too noisy. The addon author can declare them, but we should not seed any system apps in the default config.
- **Active-app decks that themselves navigate to sub-decks** — yes, internally; but the active-app root cannot `navigateToDeck` to a non-active-app deck. That would re-pollute history.
- **Cross-addon "active-app deck chain"** — if Spotify (addon A) is foreground and a sub-deck in Slack (addon B) is open, the chain isn't modeled. The active-app overlay is a one-addon concept.
- **Animations on the in-bar value text** — no spinning numbers, no color fades. The text is a value; it should be readable at a glance.
- **Weather alerts / severe weather notifications** — different feature, requires a push channel (web push, email). Out of scope.
- **Settings deck on the lock screen** — lock-deck is a separate concept; the settings deck is part of the main flow. Do not show settings when locked.
- **Brightness animated ramp** — instant changes. The Stream Deck hardware may have a slight internal ramp; we don't simulate one.

## Feature → Requirement Trace

| Feature group | Count of v1.5 requirements (target) |
|---------------|--------------------------------------|
| Weather city-name | 3–4 (config schema, geocoder, error path, tests) |
| Weather 2-day forecast | 2–3 (component, page integration, daily query update) |
| Bars content polish | 2 (primary-color label, negative-color value) |
| Settings deck | 3–4 (new addon or core-managed deck, brightness controller, settings button on main, reserved-slot replacement) |
| Lock deck nav | 2 (always navigable, back-button skip when locked) |
| Active-app decks | 4–6 (manifest field, overlay controller, toggle button, double-tap detection, process-name matching, multi-deck pagination) |
| **Total v1.5 requirements** | **~16–22** |

These counts feed the REQUIREMENTS.md doc.
