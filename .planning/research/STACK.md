# Stack — v1.5 Addon & UX Polish

**Milestone:** v1.5 — Addon & UX Polish
**Researched:** 2026-06-07
**Confidence:** HIGH for Open-Meteo; MEDIUM for HID brightness & active-win (verified against prior training, not freshly fetched); MEDIUM for cross-OS process identification (well-known OS APIs, but per-OS permission posture varies)

This milestone adds five new capabilities. The existing stack covers most of it. New tech is limited to one API (Open-Meteo Geocoding) and one small npm dep (active-win). Everything else reuses what we already have.

## Recommended Stack

### Already in stack — reuse

| Capability | Library / API | Used by |
|------------|---------------|---------|
| Hardware brightness control | `@elgato-stream-deck/node` (device `setBrightness(percentage: 0-100)`) | Settings deck brightness buttons |
| Pixel sampling for negative-color text | `sharp` (already a dep) | Bars in-bar value rendering |
| React + react-reconciler | internal `Render` host config | All new button components |
| zod | `zod` | New `location: string \| {name,latitude,longitude}` union, new `processNames` field on deck definitions |
| Pino logging | `pino` | New geocoder, new brightness controller, new active-app poller |
| vitest | `vitest` | All new modules with adjacent `*.test.ts` |
| Host context (os + session) | `packages/cli/src/system/host-context.ts` | Active-app poller needs OS capability for "active app" support per-OS |
| Session state monitor | `packages/cli/src/system/session-monitor.ts` | Lock-deck navigation guards |

### New additions

| Capability | Library / API | Version target | Rationale |
|------------|---------------|----------------|-----------|
| City name → coordinates | Open-Meteo Geocoding API `https://geocoding-api.open-meteo.com/v1/search?name=...&count=10&language=en&format=json` | n/a (HTTP) | No API key, CORS-friendly, supports `language` and `countryCode` filters, returns `timezone` (lets weather controller use `&timezone=auto` for daily forecast). 2-char minimum, fuzzy at 3+ chars. |
| Active foreground window | `active-win` (sindresorhus) | latest (^8.x) | Pure-JS cross-platform. macOS, Windows, X11 Linux. Returns `{title, owner: {name, processId, ...}}`. ~6M weekly downloads. Wayland: falls back to XWayland only; we mark "active app" unsupported on Wayland for v1.5 (see PITFALLS). |
| Daily forecast (next 2 days) | Open-Meteo `/v1/forecast?latitude=...&longitude=...&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=2&timezone=auto` | n/a (HTTP) | Reuses existing open-meteo-client module. Requires `timezone=auto` to get days anchored at local midnight. `weather_code` is WMO; existing addon's weather-code-to-glyph mapping can be reused. |

### No new dependencies required

- **Brightness control** is already in `@elgato-stream-deck/node`. The current `StreamDeckDeviceHandle` (`packages/cli/src/device/stream-deck.ts`) doesn't expose it; we add a method there without changing the dep.
- **In-bar value text with negative color** is purely a render concern — `sharp` pixel sampling is local to a single image, no new lib.
- **Active-app detection** doesn't need a new lib for the OS API itself (we have `process`), but `active-win` saves writing three OS-specific adapters and handles macOS Accessibility permission errors cleanly. Worth the ~80KB dep.
- **2-day daily forecast** is just an HTTP param change in the existing client.

## Alternatives Considered

### For city name → coordinates

- **OpenStreetMap Nominatim** — free, but requires User-Agent, has heavy rate limits (1 req/sec), and ToS requires real user attribution. **Rejected** — overkill and slower for this use case.
- **Mapbox Geocoding, Google Geocoding, HERE** — accurate but require API keys, paid tiers, and user-config in the addon. **Rejected** for v1.5 — keeping the addon keyless preserves the "no config required" UX.
- **ipapi.co / ip-api.com for IP-based fallback** — already used by the weather controller for "no location configured" fallback. Keep, but as a *fallback*, not a primary city-name lookup.

### For active-app detection

- **`node-window-manager`** — heavier, exposes more window control than we need. **Rejected** for being a sledgehammer.
- **Native per-OS: `osascript` on macOS, `tasklist` on Windows, `xdotool` on Linux** — doable but three implementations, three error modes, three permission stories. **Rejected** for v1.5; would defer feature shipping by 1+ phase.
- **`@nut-tree/nut-js`** — overkill (full UI automation). **Rejected**.

### For cross-OS process identification

- `process` module (Node built-in) — works for getting the *current* process info, but not the foreground process. **Not applicable** for our use case.
- `ps`, `tasklist`, `pgrep` — every-OS shell. We could shell out from `active-win`'s `owner.processId` to get name; but `active-win` already returns `owner.name` (the friendly app name, e.g. "Google Chrome"). **Reuse active-win output** instead of shelling out again.

### For negative-color text in bars

- **CSS `mix-blend-mode: difference`** in the browser/emulator renderer — works without sharp pixel sampling. **Strong alternative** worth considering: if the bar is rendered to a DOM/canvas, `mix-blend-mode: difference` between the value text and the bar fill gives the negative color for free, no per-pixel sampling.
- **CIE-Lab perceptual luma** instead of naive RGB inverse — overkill for a 5x5 glyph, the human eye reads it as "different". **Rejected**.

Recommendation: use `mix-blend-mode: difference` in the DOM/emulator render path (where pixels are abstract), and sharp pixel sampling in the hardware render path (where we already rasterize to an image). The two paths already diverge in `packages/cli/src/render/`. Make both consistent in output.

## What NOT to Use

- **`@nut-tree/nut-js`** — full UI automation. We only need to read which app is focused.
- **Node HID / usb directly** — we already wrap `@elgato-stream-deck/node`; talking HID directly would duplicate that work and risk device-bricking commands.
- **A second weather API** (Tomorrow.io, AccuWeather, etc.) — Open-Meteo covers the use case without keys. Adding a second provider is a v2 problem.
- **`react-native` / `react-three-fiber`** — over-engineering. We render to a 72x72 image or a DOM canvas; the existing reconciler does this.
- **`fluent-ffmpeg` or any video lib** — irrelevant.

## Versions

| Package | Pin strategy | Notes |
|---------|--------------|-------|
| `@elgato-stream-deck/node` | already `^7.6` in repo | Check `setBrightness` signature: in v7, it's `setBrightness(percentage: number)` where percentage is 0-100. v6 used 0-1. We are on v7. **HIGH confidence** (existing dep, repo usage). |
| `active-win` | `^8.0.0` | Last major bump removed `windows-process-tree` dep. Use latest. macOS will need Accessibility permission for full title — owner.name works regardless. |
| Open-Meteo APIs | n/a | No client lib needed; native `fetch` (Node 20+). |
| `sharp` | already `^0.34` | Reuse for pixel sampling. |
| `zod` | already `^3.x` | Extend existing weather schema; no version bump. |

## Stack Decisions Per Feature

| Feature | Primary tech | Alternative if blocked |
|---------|--------------|------------------------|
| Weather city-name | Open-Meteo Geocoding + extend schemas.ts union | Manual lat/lon only (status quo) |
| Weather 2-day forecast | Extend `daily` query in `open-meteo-client.ts`; new `DailyForecast` component | n/a |
| Bars content polish | `mix-blend-mode: difference` in DOM; sharp raw-pixel sampling in hardware; primary color in label | Plain contrast (just use white/black) if blend mode misbehaves |
| Settings deck + brightness | New `device.setBrightness(percentage)` method on `StreamDeckDeviceHandle`; new builtin addon `settings` with two action buttons + two display tiles for status | Offload to a CLI subcommand if device method is unstable |
| Lock deck navigation | Session monitor + new `isLockDeckNavigable(deckId, sessionState)` in controller; back-button-injection skip-when-locked rule | Always-on if simpler (degrades to v1.4 behavior) |
| Addon active-app decks | `active-win` polling at 1s; addon manifest declares `processNames`; controller resolves overlay vs. push based on flag | "All or nothing" mode flag in addon (v1.6 follow-up) |

## Confidence Tag Summary

| Claim | Confidence | Source |
|-------|-----------|--------|
| Open-Meteo Geocoding endpoint and params | HIGH | Live doc fetch this session |
| Open-Meteo `forecast_days=2` + `daily=` + `timezone=auto` | HIGH | Live doc fetch this session |
| `@elgato-stream-deck/node` v7 has `setBrightness(percentage: 0-100)` | MEDIUM | Training-data recall, repo dep version. **VERIFY in `node_modules` before writing the wrapper.** |
| `active-win` returns `{title, owner.name, owner.processId}` cross-platform | MEDIUM | Training-data recall (well-known package). **VERIFY by installing and testing.** |
| Wayland on Linux: `active-win` only sees XWayland windows | MEDIUM | Training-data recall. **VERIFY by running on a Wayland session.** |
| `sharp` raw pixel sampling API (`extract().raw().toBuffer()`) | HIGH | Long-standing sharp API, already used elsewhere in repo per codebase map |
| `mix-blend-mode: difference` works in browser/emulator DOM | HIGH | Standard CSS, used in many design tools |
