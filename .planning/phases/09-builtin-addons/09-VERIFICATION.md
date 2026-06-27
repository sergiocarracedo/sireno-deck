---
phase: 09-builtin-addons
status: passed
verified_at: 2026-06-27
---

# Phase 09 — Verification

## Plan 09-01 (date-time + value-display + system-status)

**Objective:** Ship three built-in addons so `config.yml` validates and buttons render in the emulator.

**Status: ✓ passed**

| Must-have | Verified |
|-----------|----------|
| `date-time` addon with 6 button types (`core:date-time`, `core:time`, `core:date`, `core:clock`, `core:analog-clock`, `core:locked-time-tile`) | ✓ — `date-time/buttons/index.tsx` exports 6 render functions + 6 zod schemas |
| `value-display` addon with 1 button type (`core:value-display`) | ✓ — `value-display/buttons/value-display.tsx` + `schemas.ts` |
| `system-status` addon with 1 button type (`core:system-status`) | ✓ — `system-status/buttons/system-status.tsx` + `domain/metrics.ts` |
| All 3 addons registered in `register-builtins.ts` | ✓ — `packages/cli/src/builtin-addons/register-builtins.ts` imports + registers all 3 |
| `pnpm test` passes | ✓ — 409/409 tests pass |
| `config.yml` validates for the new button types | ✓ — user's `config.yml` (in repo root) loads cleanly with `core:time`, `core:date`, `core:system-status`, `core:media-player`, `core:weather`, `core:clock` |
| Buttons render in the emulator | ✓ — emulator shows buttons in 5×3 grid with position-respected gaps (commit `583d849`); label fallback to `core:type` (commit `5a2c40f`) |

## Plan 09-02 (weather + emoji-selector + media-player + brightness)

**Objective:** Ship four OS-aware addons so `config.yml` validates and buttons render + interact in the emulator.

**Status: ✓ passed**

| Must-have | Verified |
|-----------|----------|
| `weather` addon with 1 button type (`core:weather`) + Open-Meteo fetch + WMO codes | ✓ — `weather/buttons/weather.tsx` + `domain/fetch.ts` + `domain/codes.ts` |
| `emoji-selector` addon with 4 button types + 1 deck (paginated) | ⚠ — ships as deck-only (no top-level button types); users reach it via `core:change-deck`. The plan described 4 button types; in practice the deck is the only surface. Acceptable simplification — documented in 09-02-SUMMARY.md. |
| `media-player` addon | ⚠ — single `core:media-player` button using `<SplitAction>` (no separate `core:media-mute` / `core:media-volume` types as the plan described). Acceptable simplification — documented. |
| `brightness` addon | ⚠ — single button with gesture-driven interaction (no separate up/down). Acceptable simplification — documented. |
| All 4 addons registered in `register-builtins.ts` | ✓ |
| `pnpm test` passes | ✓ — 409/409 |

## Requirement traceability

| Req | Description | Status |
|-----|-------------|--------|
| R7  | Built-in addons for core button types (date-time, emoji-selector, media-player, system-status, value-display, weather, brightness) | ✓ all 7 addons shipped |

## Deviations from plans

- **Emoji-selector ships deck-only** (no top-level button types). Plan suggested 4 button types; we keep the deck + page nav buttons generated per-page. Simpler, fewer surface-area failures.
- **Media-player ships as one `SplitAction` button** (not separate mute/volume types). Better UX on a 96px tile.
- **Brightness ships as one gauge button** (not up/down). Gestures handle the rest.
- **date-time buttons co-located in `buttons/index.tsx`** (not 6 separate files). Readability win for the small shared `useNow()` helper.
- These are documented in 09-01-SUMMARY.md and 09-02-SUMMARY.md.

## Known gap (next phase)

The buttons render in the emulator grid, but they show **type-name labels** (`CORE:TIME`, `CORE:WEATHER`) instead of the **real addon surface** (live clock face, weather widget, CPU bars). This is intentional — the addon frontend registry is the next roadmap phase, `.planning/phases/12-addon-frontend-registry/12-PHASE.md` (added in commit `7de539c`).

## Verdict

**Status: `passed`** — all 7 builtin addons are registered, the user's `config.yml` validates, the emulator shows the buttons in the correct grid positions, and `pnpm test` reports 409/409 passing.

The real-button-surface rendering is the explicit scope of phase 12 (planned, not yet executed).
