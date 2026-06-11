# Requirements — Sireno Deck

**Version:** v1.6
**Last updated:** 2026-06-11

## Milestone Scope

Milestone `v1.6 — UX Speed & Overlay Extensions` builds on v1.5's shipped overlay, settings, and performance foundation. This milestone fixes the UX friction that emerged during real use — slow button transitions, broken emoji injection — and extends the overlay model with configurable auto-show, richer pagination, improved iconography, and a more complete built-in chrome overlay deck.

The six feature groups, in priority order:

1. **Button response performance** — profile the render pipeline and fix the ~1s back button delay, slow weather page transitions, and any related bottlenecks.
2. **Emoji fixes** — inject emoji into the active input via keystroke simulation (not just clipboard write); deduplicate categories (smiles/people sharing same set).
3. **Pagination button redesign** — 3-line layout with Tap/2xTap/Page X/Y semantics and no overflow.
4. **Icon updates** — system back `undo2`, overlay toggle `send-to-back` + deck icon.
5. **Overlay auto-show config** — `autoShow` flag (default false); when false, a 2-line system back variant lets the user manually activate the overlay via double-tap.
6. **Settings deck layout revamp** — brightness icon order (darker, brighter, percent), version at n-2, `iconTextSurface` for brightness, `<Label>` for percent.
7. **Chrome overlay deck** — more keystroke actions (unclose tab, incognito, etc.).

## v1.5 Requirements (shipped)

*See `.planning/milestones/v1.5-REQUIREMENTS.md` for the shipped v1.5 requirements.*

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

## v1.6 Requirements

### Research (new RES-*)

| ID | Requirement | Category |
|----|-------------|----------|
| RES-01 | Profile the render/navigation pipeline to identify the root cause of the ~1s back button delay and slow weather/button page transitions | Performance |
| RES-02 | Research cross-platform keystroke simulation approaches for emoji injection (xdotool on Linux, osascript on macOS, SendInput on Windows) and confirm which `methods` API extension is required | Research |
| RES-03 | Verify the emoji category data source to identify why smiles and people share the same emoji set and how to deduplicate | Research |

### Button response performance (new PERF-*)

| ID | Requirement | Category |
|----|-------------|----------|
| PERF-01 | The back button transition completes in <200ms on Linux with a typical config (matching the settings-to-deck transition speed) | Performance |
| PERF-02 | Weather page transitions between daily/hourly pages complete in <300ms | Performance |
| PERF-03 | All gesture-to-render transitions use consistent fast paths; no button feels "sticky" compared to others | Performance |

### Emoji — keystroke injection and category fix (new EMO-*)

| ID | Requirement | Category |
|----|-------------|----------|
| EMO-15 | Tapping an emoji in the emoji selector writes the emoji character to the system clipboard AND simulates the OS paste keystroke (Ctrl+V / Cmd+V) so the emoji appears in the active input | Domain |
| EMO-16 | Double-tapping an emoji copies the shortcode to clipboard AND performs the paste keystroke | Domain |
| EMO-17 | The emoji category data is audited and deduplicated so smiles and people (and any other overlapping categories) show distinct emoji sets | Data |

### Pagination button redesign (new PAG-*)

| ID | Requirement | Category |
|----|-------------|----------|
| PAG-02 | The pagination button renders exactly 3 lines with no overflow: line 1 "Tap >" (tap action), line 2 "< 2xTap" (double-tap action), line 3 "Page X/Y" (current page indicator) | UI |
| PAG-03 | The pagination button uses the shared `<Label>` component or equivalent to handle text fitting without overflow, replacing the current chip-based layout if needed | UI |

### Icon updates

| ID | Requirement | Category |
|----|-------------|----------|
| ICON-01 | The system back button uses `undo2` icon instead of the current `chevron-left` | UI |
| ACTIVEAPP-08 | The overlay toggle button uses `send-to-back` icon plus the overlay deck's icon/name label, replacing the current `app-window` icon + "Toggle App" | UI |

### Overlay auto-show mode (new ACTIVEAPP-*)

| ID | Requirement | Category |
|----|-------------|----------|
| ACTIVEAPP-07 | The `DeckConfig` schema accepts a new `autoShow` boolean field (default `true`). When `autoShow` is `false` and the deck's `process_names` match the active app, the overlay is NOT automatically displayed | Config |
| ACTIVEAPP-07a | When `autoShow: false` and the overlay deck's process matches, the system back button in the base deck's last position shows a 2-line variant: line 1 back icon + "Tap", line 2 overlay deck icon + "2xTap" | UI |
| ACTIVEAPP-07b | In `autoShow: false` mode, double-tapping the back button activates the overlay (equivalent to `dismissOverlay()` but reversed — "summon overlay") | Controller |

### Settings deck layout revamp (new SETTINGS-*)

| ID | Requirement | Category |
|----|-------------|----------|
| SETTINGS-05 | The settings deck brightness buttons are in order: position n-3 = darker, position n-2 = brighter, position n-1 = current brightness percentage | UI |
| SETTINGS-06 | Position n-1 (the last button) shows the project logo + version, rendered with no border or background | UI |
| SETTINGS-07 | The brightness up/down buttons use `iconTextSurface` for rendering; the percentage button uses `<Label>` component instead of `iconTextSurface` | UI |

### Chrome overlay deck extensions (new CHROME-*)

| ID | Requirement | Category |
|----|-------------|----------|
| CHROME-01 | The config chrome overlay deck includes additional keystroke-action buttons: unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N), and other common Chrome keyboard shortcuts | Config |

### Verification

| ID | Requirement | Category |
|----|-------------|----------|
| VERIFY-02 | Tests and fixtures cover: render pipeline profiling results reproduced; back button <200ms; emoji keystroke injection on at least one OS; pagination 3-line rendering; icon changes; overlay autoShow behavior; settings deck layout; chrome deck keystrokes | Verification |

**Total v1.6 requirements:** 20

## v2 Candidates / Deferred Items

| Item | Why Deferred |
|------|--------------|
| Distribution build pipeline (Phases 40/47/48) | Pending distribution target decision. Native dep constraints (node-hid, sharp, playwright chromium, dbus x11) rule out Node SEA |
| CI matrix builds for Linux + Mac | Manual cross-platform testing only for v1.6 |
| Auto-brightness based on ambient light or time of day | Settings is manual only; automatic policy needs a different decision model |
| Active-app decks on pure Wayland sessions | Requires XWayland; on pure Wayland a "not supported" warning is surfaced |
| Configurable back-button double-tap threshold | Existing hardcoded 350ms is consistent with emoji-selector's double-tap shim |
| Bumping `SIRENO_ADDON_API_VERSION` | All v1.6 changes are additive and backwards compatible |

---

*Requirements defined: 2026-06-11*
*Total v1.6 requirements: 20*
