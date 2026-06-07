# Requirements — Sireno Deck

**Version:** v1.5
**Last updated:** 2026-06-08

## Milestone Scope

Milestone `v1.5 — Addons & UX Polish II` builds on the shipped v1.4 surface (system back button, weather addon, emoji selector, content helpers, system-status and media-player addons). This milestone pivots v1.5 away from the deferred distribution build pipeline (Phases 40/47/48) and toward a bundle of UX and addon-API improvements that close the most visible gaps in the current addon surface.

The five feature groups, in priority order:

1. **Weather location by city name + 2-day forecast page** — make the bundled weather addon easier to configure and more informative.
2. **Bars content polish** — primary-color labels, in-bar rotated value text, auto-contrast for readability.
3. **Settings deck** — brightness up/down controls, dedicated deck, logo+version relocated from main deck.
4. **Lock deck access** — allow pre-warming before lock; suppress back injection when locked.
5. **Addon active-app decks** — declarative `process_names` on addon decks; overlay semantics; toggle button; double-tap back to active-app.

## v1.5 Requirements

### Weather — location by city name and geocoding (extends WX-*)

| ID | Requirement | Category |
|----|-------------|----------|
| WX-07 | The weather addon's `location` config accepts either a string (e.g. `"Vigo, Spain"`) or the existing `{name, latitude, longitude}` object; the existing structure is preserved unchanged | Schema |
| WX-08 | When `location` is a string, the addon resolves it via the Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`) and uses the first returned match as the coordinates | Domain |
| WX-09 | Geocoding results are cached in-memory with a normalized lowercase key and a bounded LRU of at least 1000 entries to avoid repeated network calls when the same city is referenced | Domain |
| WX-10 | If geocoding returns no results or the network call fails, the addon shows an honest "location not found" state and does not silently fall back to IP geolocation | Domain |

### Weather — 2-day daily forecast (new WX2-*)

| ID | Requirement | Category |
|----|-------------|----------|
| WX2-01 | The weather button adds a new `daily-forecast` page to its page cycle so users can reach a multi-day view by tapping past the hourly pages | Buttons |
| WX2-02 | The `daily-forecast` page calls the Open-Meteo `/v1/forecast` endpoint with `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=2&timezone=auto`; the `timezone=auto` parameter is required so the 24h windows align to local day boundaries | Domain |
| WX2-03 | The `daily-forecast` page renders a row per day with: day-of-week label, weather code icon (reusing the existing WMO mapping), high temperature, low temperature, and precipitation sum | Buttons |

### Bars content polish (new BARS-*)

| ID | Requirement | Category |
|----|-------------|----------|
| BARS-01 | When a `Bars` item has no `color`, its label uses the active theme's primary color instead of the inherited text color | UI |
| BARS-02 | Each bar renders its `value` inside the bar, rotated 90 degrees, in a color that is the visual negative of the bar pixels under the text (precomputed from `item.color` or a per-bar palette when the bar color is a known solid) | UI |
| BARS-03 | When the bar's effective color is near gray (computed luma within 32 of 128) the value text falls back to white on dark bars and black on light bars, so it never becomes unreadable | UI |

### Settings deck (new SETTINGS-*)

| ID | Requirement | Category |
|----|-------------|----------|
| SETTINGS-01 | A new first-party `settings` addon is shipped under `packages/cli/src/builtin-addons/settings/` and provides a settings deck with brightness controls | Addon |
| SETTINGS-02 | The settings deck exposes a brightness-up button and a brightness-down button that adjust the device brightness in 10% steps using `@elgato-stream-deck/node` `setBrightness(0-100)` and apply the change to every open device | Device |
| SETTINGS-03 | The main deck's reserved-slot button is replaced by a settings button that navigates to the settings deck; this is a deliberate breaking change to the v1.4 main-deck home button and is called out in CHANGELOG | Buttons |
| SETTINGS-04 | The settings deck shows the project logo and the CLI version, replacing the main-deck home button that performed that role under v1.4 (the v1.4 home button is removed from the main deck reserved slot) | Buttons |

### Lock deck access (new LOCK-*)

| ID | Requirement | Category |
|----|-------------|----------|
| LOCK-01 | Users can navigate to the configured lock deck from the main deck even when the session is not locked, so the lock deck can be pre-warmed and inspected before locking the computer | Navigation |
| LOCK-02 | When the session state is `locked`, the core does not inject the system-reserved back button into the lock deck, so the lock deck renders exactly as the user configured it without any system back affordance | System |

### Brightness device control (new BR-*)

| ID | Requirement | Category |
|----|-------------|----------|
| BR-01 | The `StreamDeckDeviceHandle` exposes a `setBrightness(percentage: number)` method that maps `0..100` to the underlying `@elgato-stream-deck/node` `setBrightness` call for the device's product identifier and persists the value for reconnect | Device |
| BR-02 | The brightness change applies to every currently open device handle in a single best-effort pass; failures on individual devices are logged but do not abort the pass | Device |

### Active-app addon decks (new ACTIVEAPP-*)

| ID | Requirement | Category |
|----|-------------|----------|
| ACTIVEAPP-01 | `AddonGeneratedDeck` accepts an optional `process_names: string[]` field; when the active foreground process matches any name in the list (case-insensitive substring match, also matching the OS-specific executable suffix), the deck is registered as an active-app deck | Addon API |
| ACTIVEAPP-02 | When an active-app deck's process is the foreground app, that deck is shown overlaid on top of the current base deck; the overlay deck uses its own local page history but does not push entries onto the base deck's navigation stack | Controller |
| ACTIVEAPP-03 | In an active-app overlay deck, the reserved-slot button is a toggle button (icon + label "Base" or similar) that dismisses the overlay and returns to the base deck, replacing the system back button for that deck | Buttons |
| ACTIVEAPP-04 | When the user is on a base deck and an active-app deck is currently overlaid, double-tapping the system back button dismisses the overlay (returning to the base deck) instead of performing the normal back action | Controller |
| ACTIVEAPP-05 | Active-app overlay decks support internal pagination like any other deck; pages advance with the same n-2 / reserved-slot conventions as the emoji selector and the toggle button remains on every page | Controller |
| ACTIVEAPP-06 | The active-app foreground process is detected via the `active-win` package on all three supported OSes; the addon API version is **not** bumped (changes are additive and backwards compatible) | Addon API |

### Verification

| ID | Requirement | Category |
|----|-------------|----------|
| VERIFY-01 | Tests and fixtures cover: geocoder cache miss + hit + invalid city; daily forecast `timezone=auto`; Bars negative-color for known solid colors and near-gray fallback; brightness up/down with a mock device; lock-deck back-injection skip when locked; active-app overlay toggle and base-deck double-tap back | Verification |

**Total v1.5 requirements:** 25

## v2 Candidates

| Item | Why Deferred |
|------|--------------|
| Multi-day forecast beyond 2 days (3, 5, 7) | The 2-day page satisfies the current product need; extending to a weekly view is a small UI bump on top of the same daily endpoint and can be added without re-architecting |
| Bars secondary axis / comparison bar | Out of scope for v1.5; the v1.4 Bars surface does not require this and the rendering model would need a new layout mode |
| Settings deck: language / theme / addon toggles | The settings deck ships with brightness up/down only; broader settings would need config-edit and persistence work that is better scoped as its own milestone |
| Active-app decks: declarative conditionals (window title regex, app state, multi-app composition) | v1.5 covers the process-name match only; richer conditions need their own design pass on the addon API |
| Active-app decks: history preservation for overlay exits | v1.5 exits the overlay and returns to the base deck's current page (no separate "remember which overlay page" state) |
| Distribution build pipeline (Phases 40/47/48 from v1.4) | Still deferred from v1.4; v1.5 pivots to UX. Distribution target decision is the prerequisite for any future distribution work |

## Out of Scope For v1.5

| Item | Reason |
|------|--------|
| Auto-brightness based on ambient light or time of day | Settings is manual only in v1.5; an automatic policy needs a different decision model |
| Per-button theme overrides in the settings deck | The settings deck uses the active theme like any other deck; theme switching is owned by core |
| Active-app decks on Wayland sessions that lack XWayland | The active-win package requires X11 or Win32 or Quartz; on pure Wayland we surface a clear "not supported" warning at startup and disable active-app decks |
| 7-day or 14-day weather forecast | The user asked for 2-day daily; longer windows are easy to add later but the milestone scope is 2 |
| Configurable back-button double-tap threshold | The double-tap detector uses a hardcoded 350ms threshold (consistent with the existing double-tap shim in the emoji selector); making it configurable would require exposing more of the controller |
| Bumping `SIRENO_ADDON_API_VERSION` | All v1.5 changes to the addon surface are additive and backwards compatible; the version stays at 1 |

---

*Requirements defined: 2026-06-08*
*Total v1.5 requirements: 25*
