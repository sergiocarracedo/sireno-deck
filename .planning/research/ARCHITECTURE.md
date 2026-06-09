# Architecture — v1.5 Addon & UX Polish

**Milestone:** v1.5 — Addon & UX Polish
**Researched:** 2026-06-07
**Confidence:** HIGH for in-codebase seams (based on the codebase map and the v1.4 audit); MEDIUM for new module boundaries (educated guesses that need validation against the actual code during `plan-phase`)

This milestone is mostly evolution of existing seams, not greenfield architecture. Five small surfaces change; the core navigation model grows one new concept (overlay).

## Component Boundaries

### New modules

| Module | Path (under `packages/cli/src/`) | Owns |
|--------|----------------------------------|------|
| `weather/geocoder.ts` | `builtin-addons/weather/` | City name → {lat, lon, timezone, name} via Open-Meteo Geocoding. In-memory LRU-ish cache, 24h TTL. Pure function on the controller side. |
| `weather/components/DailyForecast.tsx` | `builtin-addons/weather/buttons/components/` | 2-day daily forecast tile renderer. Reuses WMO code → glyph mapping. |
| `weather/components/...` page wiring | `builtin-addons/weather/buttons/weather.tsx` | Adds `daily-forecast` to the page array. |
| `device/brightness.ts` | `device/` | Wraps `@elgato-stream-deck/node` `setBrightness`. Single class, device-handle-agnostic, calls into `StreamDeckDeviceHandle.setBrightness(percentage)`. |
| `addon/active-app.ts` | `addon/` | Polls `active-win` at 1s. Emits events: `focus-changed(processName)` and `lost-focus()`. Owns a registry of `{processName, addonId, deckId}` from addon manifests. |
| `addon/active-app-controller.ts` | `addon/` | Subscribes to `active-app.ts` events. Pushes/pops overlay decks on the main `DeckController`. |
| `deck/overlay.ts` | `deck/` | New concept: an *overlay deck* shown on top of the current deck. The current deck remains "underneath" and is restored when the overlay exits. (See "Data Flow" below.) |
| `deck/double-tap.ts` | `deck/` | Detects double-tap on the system-reserved back button. Time window default 350ms, configurable per-deck. State is per-deck (`lastBackTapAt`). |
| `addon/manifest.ts` (extended) | `addon/` | Add `processNames: string[]` to the deck definition types. Bump `SIRENO_ADDON_API_VERSION` from 1 → 2 only if we need it (see "API Version Decision" below). |
| `builtin-addons/settings/...` (or core-managed) | `builtin-addons/settings/` (likely) | New first-party addon exporting the settings deck. TBD whether it lives as an addon or in core — see "Settings Deck: addon vs. core" below. |
| `system/lock-deck-guard.ts` | `system/` | One function: `canNavigateToLockDeck(sessionState) -> boolean`. Currently always true; future-proofs for cases where the OS denies it. |

### Extended modules

| Module | Path | Change |
|--------|------|--------|
| `weather/schemas.ts` | `builtin-addons/weather/` | `location: z.string().or(z.object({name, latitude, longitude})).optional()` |
| `weather/domain/open-meteo-client.ts` | `builtin-addons/weather/` | New `fetchDailyForecast(lat, lon, days=2)` method, returns `DailyForecast` shape. |
| `weather/domain/weather-controller.ts` | `builtin-addons/weather/` | `resolveCoordinates()` first tries geocoder for string inputs, then falls back to IP geolocation. |
| `weather/buttons/weather.tsx` | `builtin-addons/weather/` | Add `'daily-forecast'` to `pages` array. |
| `ui/Bars.tsx` | `ui/` | Label falls back to `theme.colors.primary` when item has no color. Value text rendered inside the bar, rotated 90°, color computed from underlying pixels. |
| `device/stream-deck.ts` | `device/` | Add `setBrightness(percentage: 0-100)` to `StreamDeckDeviceHandle`. |
| `deck/system-back-injection.ts` | `deck/` | `shouldInjectSystemBack` gains a clause: if `session.state === 'locked'`, return false (don't inject). |
| `deck/controller.ts` | `deck/` | New internal `overlayDeckId?: string`. `setOverlay(deckId)`, `clearOverlay()`. Active-app controller calls these. |
| `deck/navigation.ts` (or wherever `goBack` lives) | `deck/` | `goBack` checks the overlay first; if there's an overlay, clear it; else do existing pop. |

### Unchanged

- `core/schemas.ts` — addon's deck definition types live in `addon/api.ts` (per the codebase map), not in core schemas. Addon API versioning handles compatibility.
- `render/*` — the existing two render paths (hardware sharp + DOM emulator) get a new "negative color text" branch in the bar component, but the rest of the pipeline is unchanged.
- `device/protocol.ts` — the device protocol doesn't change. Brightness is a side-channel on the device object.

## Data Flow

### Active-app deck overlay (new concept)

The key new architecture. Today the controller's stack is linear: `[mainDeckId, ...subDeckIds]`. `navigateTo` pushes, `goBack` pops. With active-app decks, the controller has *one* optional overlay deck on top of the stack.

```
Stack state:
  base:        [main, profile-page, github-page]
  overlay:     chrome-app-deck       (if Chrome is foreground and addon declared it)
  visible:     chrome-app-deck

When user moves away from Chrome:
  base:        [main, profile-page, github-page]   (unchanged)
  overlay:     none
  visible:     github-page                          (restored)

When user presses toggle button on chrome-app-deck:
  base:        [main, profile-page, github-page]   (unchanged)
  overlay:     none
  visible:     github-page                          (same as above)

When user is in github-page and Chrome comes to foreground:
  base:        [main, profile-page, github-page]   (unchanged)
  overlay:     chrome-app-deck
  visible:     chrome-app-deck

When user double-taps back in github-page (with Chrome in foreground):
  base:        [main, profile-page, github-page]   (unchanged — no push)
  overlay:     chrome-app-deck
  visible:     chrome-app-deck
```

The key invariant: **the base stack is never modified by the active-app system**. Only `setOverlay` / `clearOverlay` touch the overlay. The render layer composites `overlay ?? top-of-base`.

### Double-tap detection (back button)

```
On "back" key press at time T:
  if overlay is set:
    clearOverlay()
    return
  if lastBackTapAt is set AND T - lastBackTapAt < windowMs:
    // Double-tap: jump to active-app deck
    if activeAppDeckId is set:
      setOverlay(activeAppDeckId)
    else:
      goBack()  // fall back to single-tap behavior
    lastBackTapAt = null
    return
  lastBackTapAt = T
  schedule a "commit" at T + windowMs: if no second tap, do goBack()
```

The "schedule a commit" is debounced, not a hard wait. The user can press other buttons in the meantime; the commit fires once. (Pitfall: if they press back twice in 350ms, then a third tap comes in 400ms after the first, the third tap acts as a single back. That's fine — matches user expectation.)

### Negative-color value text in Bars

```
For each bar in the bar group:
  1. Layout pass: determine bar geometry (start_x, end_x, width, height)
  2. Sample pass: extract the rectangular region under the value-text location
     sharp(barGroupImage).extract({left, top, width, height}).raw().toBuffer()
  3. Compute mean RGB (sum / pixelCount, integer cast)
  4. Invert: textColor = (255-r, 255-g, 255-b)
  5. Render text with computed color, rotated 90deg, centered

For DOM/emulator path:
  Skip sampling; use CSS mix-blend-mode: difference on the value text element.
```

This requires `Bars.tsx` to grow a `barGroupImage` reference (or a callback) so the hardware path can sample after the bars are drawn. In v1.4, the render pipeline produces the image in one pass; we may need a two-pass render for bar groups with value text. Alternative: precompute the value text color at *config* time using a deterministic mix — but that requires the bar fill color to be known statically, which it is for each item in the config. **Yes, the value text color can be precomputed at config load from the bar's `color` field** — no runtime pixel sampling needed in the static-color case. Only when the bar uses a gradient or theme-driven color does sampling become necessary. **This is a key simplification**: the in-bar value text color = `negative(barItem.color)`, computed at render time once per bar.

For DOM/emulator, we still use `mix-blend-mode: difference` for visual consistency with the rest of the DOM renderer's color philosophy.

### Brightness control

```
settings-deck brightness-up button on tap:
  const new = clamp(currentBrightness + 10, 0, 100)
  for each open device:
    device.setBrightness(new)
  currentBrightness = new
  invalidate(settings-deck)  // re-render value display
```

State lives in the settings addon's local state, not in core. The `setBrightness` method on `StreamDeckDeviceHandle` is the only new surface on the device layer.

## Build Order

The phases are ordered so that each phase's deliverables exercise the new module boundaries in a small slice. The roadmap should follow this order (or close to it):

1. **Geocoder + city-name config + 2-day forecast page** — one feature group, isolated to the weather addon, validates the geocoding HTTP seam and the render-seam of a new page.
2. **Bars content polish (primary-color label, negative-color in-bar value)** — one feature group, isolated to the shared `Bars` component, validates the render-seam change.
3. **Brightness control + device setBrightness** — small device seam change, exercised by a unit test on the device handle and a manual integration test (no UI yet).
4. **Settings deck** — first addon that *uses* the brightness control. This phase can stand alone or be merged with phase 3; the natural split is "device layer" then "addon that uses it."
5. **Lock deck nav refinement** — small change to `shouldInjectSystemBack` and the controller's overlay concept. May be the first exercise of the overlay concept in a "preview" way.
6. **Active-app deck addon API** — the new `processNames` field, the `active-app` poller, the overlay controller, the double-tap detector. The biggest phase. The lock-deck phase (5) is a good warm-up.
7. **Cross-cutting: settings deck on main deck reserved slot** — replaces the home button with a settings button. Touches `system-back-injection` and `system-back-button` plus the addon list. (Could be merged with phase 4.)

## Integration Points

| External | Where we integrate | Risk |
|----------|--------------------|------|
| Open-Meteo Geocoding | `weather/geocoder.ts` (new) | LOW — same host as existing Open-Meteo client, no key, CORS-friendly. |
| Open-Meteo daily forecast | `weather/domain/open-meteo-client.ts` | LOW — adds `&daily=...&forecast_days=2&timezone=auto` to existing URL builder. |
| `@elgato-stream-deck/node` `setBrightness` | `device/stream-deck.ts` | LOW-MEDIUM — verify the v7 API signature against the installed version before writing the wrapper. |
| `active-win` | `addon/active-app.ts` (new) | MEDIUM — first new dep in this milestone. Wayland Linux is the rough edge (falls back to XWayland). |
| Existing `host-context.ts` | `addon/active-app.ts` | LOW — `HostContext.os` tells us whether to enable the poller at all (e.g. disable on Wayland). |
| Existing `session-monitor.ts` | `deck/system-back-injection.ts` (skip when locked) | LOW — already exposes `state`. |
| Theme colors | `ui/Bars.tsx` (primary color fallback for label) | LOW — theme system is mature. |

## API Version Decision

The addon API is currently at version 1 (`SIRENO_ADDON_API_VERSION = 1` in `packages/cli/src/addon/api.ts`).

- **Adding `processNames?: string[]` to deck definitions is backwards-compatible** — existing addons that don't declare it just don't get active-app behavior. The field is optional.
- **Adding `setBrightness` is a host-side method, not an addon-side method.** Addons don't change.
- **The geocoder is internal to the weather addon.** Other addons don't change.

**Conclusion: do NOT bump `SIRENO_ADDON_API_VERSION` for v1.5.** Keep it at 1. Bump only if a breaking change becomes necessary. (None planned.)

## Settings Deck: addon vs. core?

Two options:
- **A: New first-party addon `builtin-addons/settings/`** that ships with the CLI, exports a `settings` deck, registers itself automatically. Addons register decks via the existing `addon api` mechanism. The cli just needs to know "always load the settings addon" (likely via the addon loader's `builtin` discovery).
- **B: A core-managed deck**, like the main deck is core-managed. The settings deck is wired in `core/` rather than via the addon system.

**Recommendation: Option A (addon).** Reasons:
- Consistency: all decks go through the addon system (except the special "main" deck, which is the boot anchor).
- Testability: the settings addon can be unit-tested like any other addon.
- Modularity: future addons can subscribe to the same brightness model.

The cost is small: we need to make sure the loader always picks up builtin-addons. Looking at the codebase map, this is presumably already true (the 5 builtin addons load by default).

If Option A proves awkward (e.g. the loader requires user-installed addons in a specific dir), fall back to Option B.
