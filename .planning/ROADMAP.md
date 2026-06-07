# Roadmap — Sireno Deck

**Version:** v1.5 — Addons & UX Polish II
**Milestone goal:** Close the most visible UX gaps in the addon surface and ship a richer settings + active-app overlay model. Distribution work (Phases 40/47/48 from v1.4) remains deferred pending a distribution-target decision.
**Last updated:** 2026-06-08

## Milestone Summary

v1.5 is seven vertical slices that span the existing addon surface and the controller layer. The phase order is goal-backward: start with the lowest-risk in-codebase extensions (weather, bars, lock-deck), then introduce the new device seam (brightness), then the first user of that seam (settings deck), then the biggest new architectural concept (active-app overlay decks) at the end where all the preconditions are already exercised.

The keystone technical insight from the v1.5 research: **the negative-color value text in Bars can be precomputed at config load from the bar's fill color, eliminating runtime pixel sampling in the common case.** This is a structural simplification that keeps the DOM and sharp renderers in parity.

Every v1.5 requirement maps to exactly one phase. Verification (VERIFY-01) is the last phase as a single focused regression sweep across the new features; per-feature test coverage is in the must-haves of each plan.

## Phases

### Phase 50: Weather city-name + 2-day daily forecast

**Goal:** Make the bundled weather addon easier to configure by accepting a city-name string and add a new 2-day daily forecast page to the button's page cycle.
**Requirements:** `WX-07`, `WX-08`, `WX-09`, `WX-10`, `WX2-01`, `WX2-02`, `WX2-03`
**Depends on:** None
**Success criteria:**
- [ ] `location: "Vigo, Spain"` resolves to coordinates via the Open-Meteo Geocoding API on first call
- [ ] `location: {name, latitude, longitude}` still works unchanged
- [ ] Geocoding results are cached in an LRU of at least 1000 entries, keyed by the normalized lowercase city name
- [ ] Geocoding miss or network failure surfaces a clear "location not found" state, not a silent fallback
- [ ] The weather button shows a new `daily-forecast` page after the existing hourly pages
- [ ] The `daily-forecast` page calls `/v1/forecast` with `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=2&timezone=auto`
- [ ] The page renders one row per day with day label, icon, high temp, low temp, precipitation sum
**Research needed:** No

### Phase 51: Bars content polish

**Goal:** Make the shared `Bars` component's labels use the theme primary color and render the value text inside the bar with a color that is the visual negative of the bar's pixels.
**Requirements:** `BARS-01`, `BARS-02`, `BARS-03`
**Depends on:** None
**Success criteria:**
- [ ] A `Bars` item with no `color` field renders its label in the active theme's primary color
- [ ] Each bar renders its `value` text inside the bar body, rotated 90 degrees
- [ ] The value text color is the visual negative of the bar's fill color, precomputed at config load when the bar uses a known solid color
- [ ] The DOM path uses `mix-blend-mode: difference` so browser and sharp renderers agree
- [ ] When the bar's effective color is near gray (luma within 32 of 128), the value text falls back to white-on-dark or black-on-light automatically
- [ ] The system-status addon (canonical Bars consumer) renders correctly with both the new label color and the in-bar value text
**Research needed:** No

### Phase 52: Lock deck navigation refinement

**Goal:** Allow the lock deck to be navigated to from the main deck even when the session is not locked, and stop the core from injecting the system back button into the lock deck while it is locked.
**Requirements:** `LOCK-01`, `LOCK-02`
**Depends on:** None
**Success criteria:**
- [ ] The user can navigate to the configured lock deck from the main deck regardless of the current session state
- [ ] While the session state is `locked`, the core does not inject the system-reserved back button into the lock deck
- [ ] While the session state is `unlocked`, the lock deck behaves like any other subdeck (back button present, navigable as normal)
- [ ] The lock deck's "no home or back button when locked" behavior from v1.4 quick 038 is preserved
- [ ] Session monitor integration is unchanged; only the navigation and injection gates change
**Research needed:** No

### Phase 53: Brightness device control

**Goal:** Expose `setBrightness(0-100)` on the device handle so future UI surfaces can change the hardware brightness of the Stream Deck.
**Requirements:** `BR-01`, `BR-02`
**Depends on:** None
**Success criteria:**
- [ ] `StreamDeckDeviceHandle.setBrightness(percentage)` exists and calls the underlying `@elgato-stream-deck/node` `setBrightness` for the device's product identifier
- [ ] The installed SDK version's signature (0-1 vs 0-100) is verified at the start of the plan and the wrapper is calibrated to the right scale
- [ ] The brightness value is persisted on the handle for reconnect
- [ ] A public `setBrightnessAll(percentage)` helper iterates every currently open device handle and applies the change in a single best-effort pass
- [ ] Failures on individual devices are logged but do not abort the pass
- [ ] Unit tests cover both single-device and multi-device paths with a mock device
**Research needed:** No (SDK method existence and signature are flagged in `research/STACK.md` for plan-phase verification)

### Phase 54: Settings deck with brightness controls

**Goal:** Ship a new first-party `settings` addon that provides a settings deck with brightness up/down buttons; relocate the logo + version from the main deck reserved slot to the settings deck and replace the main deck home button with a settings button.
**Requirements:** `SETTINGS-01`, `SETTINGS-02`, `SETTINGS-03`, `SETTINGS-04`
**Depends on:** 53
**Success criteria:**
- [ ] A new `settings` addon is registered at `packages/cli/src/builtin-addons/settings/` and ships with the CLI
- [ ] The settings deck contains a brightness-up button and a brightness-down button that adjust every open device in 10% steps via `setBrightnessAll`
- [ ] The settings deck shows the project logo and the CLI version (replaces the v1.4 main-deck home button role)
- [ ] The main deck reserved-slot button is now a settings button (navigates to the settings deck) — this is a deliberate breaking change to the v1.4 main-deck home button and is called out in CHANGELOG
- [ ] The settings deck reserved-slot button is a back-to-main button so the user can return from settings
- [ ] UAT confirms the new default layout is comfortable and the logo + version are still readable in the settings deck
**Research needed:** No

### Phase 55: Active-app addon decks — manifest, overlay, and double-tap

**Goal:** Let addons declare decks that should appear when a specific process is the active app, with overlay semantics (no history pollution) and a toggle button on the overlay; let the user double-tap the back button in a base deck to return to the most recent active-app deck.
**Requirements:** `ACTIVEAPP-01`, `ACTIVEAPP-02`, `ACTIVEAPP-03`, `ACTIVEAPP-04`, `ACTIVEAPP-05`, `ACTIVEAPP-06`
**Depends on:** 52
**Success criteria:**
- [ ] `AddonGeneratedDeck` accepts an optional `process_names: string[]` field; absence of the field means the deck is not an active-app deck
- [ ] Process matching is case-insensitive substring, also matches the OS-specific executable suffix (`.app` on macOS, `.exe` on Windows)
- [ ] An `active-win` poller runs at 500ms by default and detects the active foreground app on Linux (X11/XWayland), macOS, and Windows
- [ ] When a declared process is the foreground app, its deck is shown overlaid on top of the current base deck
- [ ] The overlay deck uses its own local page history; exiting the overlay leaves the base deck's stack exactly as it was
- [ ] In an active-app overlay deck, the reserved-slot button is a toggle button (icon + "Base" label) that dismisses the overlay
- [ ] When the user is on a base deck and an active-app deck is overlaid, double-tapping the back button (within 350ms) dismisses the overlay
- [ ] Active-app overlay decks support internal pagination via the existing n-2 / reserved-slot conventions; the toggle button remains on every page
- [ ] Pure Wayland sessions (no XWayland) surface a clear "not supported" warning at startup and disable active-app decks without crashing
- [ ] Two addons declaring the same `process_name` resolves as first-match-wins, with a startup log warning
- [ ] `SIRENO_ADDON_API_VERSION` stays at 1; the manifest extension is additive and backwards compatible
- [ ] Keyboard escape (Esc, q) still works to exit the daemon even while an overlay is active
**Research needed:** Yes — `active-win` behavior in the install environment, macOS Accessibility permission flow, Wayland detection, and the double-tap window timing should be verified during plan-phase

### Phase 56: v1.5 verification sweep

**Goal:** A single focused verification phase that proves the v1.5 features work together: geocoder cache + miss + invalid city; daily forecast `timezone=auto`; Bars negative-color for known solids and near-gray fallback; brightness up/down with a mock device; lock-deck back-injection skip when locked; active-app overlay toggle and base-deck double-tap back.
**Requirements:** `VERIFY-01`
**Depends on:** 50, 51, 52, 53, 54, 55
**Success criteria:**
- [ ] Geocoder tests cover cache miss, cache hit, invalid city name, and network failure
- [ ] Daily forecast tests assert the request includes `timezone=auto` and the 2-day window
- [ ] Bars tests assert label color, in-bar value rendering, and the near-gray auto-contrast fallback for both DOM and sharp paths
- [ ] Brightness tests cover the single-device, multi-device, and rollback paths with a mock SDK
- [ ] Lock-deck tests assert that back injection is skipped when locked and present when unlocked
- [ ] Active-app tests assert: process match, overlay render, toggle behavior, double-tap back, multi-addon conflict warning
- [ ] All existing v1.4 tests still pass
**Research needed:** No

## Coverage Validation

| Requirement | Phase | Status |
|-------------|-------|--------|
| WX-07 | 50 | pending |
| WX-08 | 50 | pending |
| WX-09 | 50 | pending |
| WX-10 | 50 | pending |
| WX2-01 | 50 | pending |
| WX2-02 | 50 | pending |
| WX2-03 | 50 | pending |
| BARS-01 | 51 | pending |
| BARS-02 | 51 | pending |
| BARS-03 | 51 | pending |
| LOCK-01 | 52 | pending |
| LOCK-02 | 52 | pending |
| BR-01 | 53 | pending |
| BR-02 | 53 | pending |
| SETTINGS-01 | 54 | pending |
| SETTINGS-02 | 54 | pending |
| SETTINGS-03 | 54 | pending |
| SETTINGS-04 | 54 | pending |
| ACTIVEAPP-01 | 55 | pending |
| ACTIVEAPP-02 | 55 | pending |
| ACTIVEAPP-03 | 55 | pending |
| ACTIVEAPP-04 | 55 | pending |
| ACTIVEAPP-05 | 55 | pending |
| ACTIVEAPP-06 | 55 | pending |
| VERIFY-01 | 56 | pending |

**Total:** 25/25 v1.5 requirements mapped, 0 circular dependencies, Phase 50 has no unmet dependencies.

## Build Order Rationale

- **Phases 50-52 are independent** of each other and could run in parallel; the roadmap orders them by visible user value (weather is more user-facing than bars polish, which is more user-facing than the lock-deck refinement). The lock-deck phase intentionally sits just before the active-app phase because it is the first phase to use the same "do not inject system back" gate that the overlay concept will reuse.
- **Phase 53 (brightness) is independent** of the addon/content work and is sequenced before the settings deck purely so the settings deck has a stable brightness API to call.
- **Phase 54 (settings) depends on 53** because the settings deck is the first user of the brightness API.
- **Phase 55 (active-app) is the risk concentration point** and is sequenced last so all the preconditions (overlay concept, double-tap detector, system-back-injection gate) are already exercised by the lock-deck phase. The double-tap detector's design also benefits from a clean run of the lock-deck phase first.
- **Phase 56 (verification)** is the cross-cutting regression sweep and sits at the end.

## Phase Sizing

| Phase | Estimated plans | Estimated sessions | Notes |
|-------|-----------------|-------------------|-------|
| 50 — Weather | 2 | 1 | Geocoder first, then daily forecast page |
| 51 — Bars | 1 | 1 | Single coherent render-seam change |
| 52 — Lock deck | 1 | 1 | Two small gates |
| 53 — Brightness | 1 | 1 | Device layer only, no UI yet |
| 54 — Settings deck | 2 | 1-2 | New addon + reserved-slot replacement |
| 55 — Active-app | 3 | 2-3 | New dep, new concept, new gesture |
| 56 — Verification | 1 | 1 | Regression sweep |

**Total:** 7 phases, ~11 plans, ~7-10 sessions.

## Anti-Features Carried Forward (kept out of v1.5)

- Auto-brightness based on ambient light or time of day
- Per-button theme overrides in the settings deck
- Active-app decks on pure Wayland sessions
- 7-day or 14-day weather forecast
- Configurable back-button double-tap threshold
- Bumping `SIRENO_ADDON_API_VERSION`
- Distribution build pipeline (Phases 40/47/48 from v1.4)

---

*Roadmap created: 2026-06-08*
*Total v1.5 phases: 7, total requirements: 25*
