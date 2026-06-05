# Phase 45 Discussion Log

**Date:** 2026-06-04
**Phase:** 45 — Weather Addon
**Mode:** standard

## Carrying Forward

From v1.4 research (locked):
- Open-Meteo primary (no API key, WMO codes)
- wttr.in as fallback
- IP geolocation is opt-in via `use_ip_geolocation: true`
- 10-minute refresh cadence
- `WmoCode → Lucide icon name` map (27 codes)
- Configurable `units: 'metric' | 'imperial'`
- Manual `location: { lat, lon, name }` config option
- Mirrors media-player addon shape

## Gray Areas Discussed

### 1. Location resolution

**Options considered:**
- **Config first, then opt-in IP geolocation** ✅ chosen
- Auto IP geolocation by default — rejected
- Manual location only — rejected

**Decision:** Read `location` from config first. If absent and `use_ip_geolocation: true` is set, fetch from `ipapi.co`. Without either, show unavailable state with `unavailable_label`.

### 2. Render layout

**Options considered:**
- Icon + temperature + location — rejected by user
- Icon + temperature only — rejected by user
- **All 4 fields (wind/humidity)** ✅ chosen

**Decision:** Render 4 fields: WMO icon (top, accent tone), temperature (middle, primary tone), location name (bottom-left, foreground tone), wind/humidity (bottom-right, foreground tone).

### 3. Backend cascade

**Options considered:**
- **On Open-Meteo error only** ✅ chosen
- No fallback — rejected
- Configurable primary — rejected

**Decision:** Try Open-Meteo first; on network/parse error, fall through to wttr.in. Both return the same `WeatherSnapshot` shape.

### 4. Unavailable state

**Options considered:**
- **Show configured `unavailable_label`** ✅ chosen
- Throw on missing config — rejected
- Always try IP geolocation — rejected

**Decision:** When no location is configured AND IP geolocation is off, show faint `unavailable_label` text (default "Weather").

## Agent's Discretion

- Exact `Text` size and tone for each field
- Spacing between rows
- Whether to round temperature to integer
- Wind speed unit display (km/h vs mph)
- IP geolocation cache strategy (in-memory or filesystem)

## Deferred Ideas

- Weather forecast (multi-day)
- Severe weather notifications
- Weather-driven theme auto-toggle
- Configurable update frequency per-button (already supported via `poll_interval_ms`)

## Next

`plan-phase 45` — convert these decisions into executable plans.
