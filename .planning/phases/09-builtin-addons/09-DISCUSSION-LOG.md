# Phase 09: Builtin Addons — Discussion Log

**Gathered:** 2026-06-24
**Mode:** standard

## Areas Discussed

### 1. Date/time button shape

- **Considered A**: Three separate types (`core:time`, `core:date`, `core:clock`).
- **Considered B**: One type with `variant` config (`core:date-time` with `config.variant`).
- **Considered C**: Both — three independent types AND `core:date-time` alias.
- **Decision**: Copy the legacy addon implementation. Legacy ships **6 buttons**
  (`core:date-time`, `core:locked-time-tile`, `core:analog-clock`, `core:clock`,
  `core:date`, `core:time`). All three types the user references are present.
- **Rationale**: User explicitly said "copy the legacy addon implementation";
  legacy covers the union of all three shapes.

### 2. Media button shape

- **Considered A**: Single surface with sub-actions (`core:media-player` +
  `core:media-mute` + `core:media-volume`).
- **Considered B**: Five separate button types (`core:media-play-pause`,
  `core:media-next`, `core:media-prev`, `core:media-volume-up`,
  `core:media-volume-down`).
- **Considered C**: Both — surface AND individual types.
- **Decision**: Copy legacy. Legacy ships the surface + 2 standalone types.
- **Rationale**: User explicit; legacy already implements the surface.

### 3. Weather API strategy

- **Considered A**: Open-Meteo (free, no key).
- **Considered B**: Stub for now (no API).
- **Considered C**: OpenWeatherMap (key required).
- **Decision**: Copy legacy. Legacy uses Open-Meteo.
- **Rationale**: User explicit; matches the no-key requirement of PHASE.md.

### 4. System-status polling cadence

- **Considered A**: 1 s, debounce to 100 ms.
- **Considered B**: 5 s, no debounce.
- **Considered C**: Configurable per button (`config.intervalMs`, default 1000).
- **Decision**: Configurable per button.
- **Rationale**: User explicit; gives power users (low-power devices) the
  ability to dial down without changing global settings.

## Decisions Delegated to Agent's Discretion

- Exact render surface per button (IconLabel vs Bars vs LabelValueList vs
  SplitAction) — pick what matches the legacy UI most closely.
- Hex colors / animation timings for system-status bars (use Phase 08
  theme tokens, not hardcoded colors).
- Polling backoff for Open-Meteo 5xx responses (simple `setTimeout` retry is
  sufficient for v1).
- macOS brightness implementation detail: shell `osascript -e ...` vs `do shell
  script`. Ship whichever matches legacy.
- Whether to ship the macOS brightness path in this phase or defer to a
  future phase. Recommendation: ship it (macOS is the user's platform per
  config.yml's paths), but the user has the final call.

## Areas Not Discussed (inherited from prior decisions)

- Addon contract: `SIRENO_ADDON_API_VERSION = 3`, lifecycle hooks
  `onTap`/`onDblTap`/`onHold`/`dispose` (Phase 02 lock).
- Theme surfaces (Phase 08): every button renders through these.
- Channel pub-sub (Phase 03): used for system-status / value-display.
- Media provider (Phase 07): `createMediaProvider()` for play/pause/etc.

## Deferred Ideas

- Windows / Linux brightness control — Phase 09 ships macOS only.
- Custom formatter for `core:value` — defer to a future phase.
- App-specific system-status metrics — defer.
- Multiple weather providers — defer until requested.
- Animated theme transitions — defer.

## Audit Trail

This file is for human audit only. Downstream agents should not reference it.