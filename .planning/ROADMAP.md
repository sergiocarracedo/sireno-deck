# Roadmap — Sireno Deck

**Version:** v1.4 — Build, Bundle & UX Polish
**Milestone goal:** Make the CLI distributable as standalone Linux and Mac executables, expand the bundled addon surface, and add the system-reserved back button for subdeck navigation.
**Last updated:** 2026-06-04

## Milestone Summary

v1.4 ships the CLI as a standalone executable (Linux x64/arm64, Mac arm64) with first-run Chromium auto-install, a system-reserved back button in subdecks, and three bundled-addon additions: calendar date-time, weather, and media-volume (mute + up/down). Emoji-selector paginates large categories.

The work splits into seven vertical slices: distribution plumbing first, then a cross-cutting core change (system-reserved button), then the four user-facing feature addons. The first slice establishes the build and bundle output contract; the second unblocks all subsequent addons that need to know about the reserved slot.

## Phases

### Phase 40: Distribution Build Pipeline

**Goal:** Build the CLI as a standalone Node SEA executable and wire the output to `/works/test/test-sireno-deck`.
**Requirements:** `BD-01`, `BD-02`
**Depends on:** None
**Success criteria:**
- [x] `pnpm bundle` runs `tsdown` to produce a single bundled JS
- [x] `pnpm build:sea` runs `node --build-sea` with `useCodeCache: true` to wrap the bundle
- [x] Per-OS build script (`build:linux-x64`, `build:linux-arm64`, `build:mac-arm64`) produces a working executable for that target
- [x] Output written to `${SIRENO_DIST_DIR:-/works/test/test-sireno-deck}/` with platform-arch subdirectories
- [x] Built executable runs `start --help` without Node.js installed
**Research needed:** No (covered by v1.4 research)

### Phase 41: First-Run Chromium Auto-Install ✓ Complete (2026-06-04)

**Goal:** Detect missing Playwright Chromium on first CLI run and auto-install via `npx playwright install chromium`.
**Requirements:** `BD-03`, `BD-05`
**Depends on:** 40
**Status:** [x] ✓ Complete (2026-06-04)

### Phase 42: System-Reserved Back Button

**Goal:** Hard-reserve the last key slot in every deck. Main deck shows nothing; subdecks show a core-owned back button (tap → previous, hold → home).
**Requirements:** `SRB-01`, `SRB-02`, `SRB-03`, `SRB-04`, `SRB-05`
**Depends on:** 41
**Success criteria:**
- [x] Config validation rejects button placement at reserved slot
- [x] Main deck: reserved slot renders as empty placeholder
- [x] Subdecks: reserved slot renders core-owned back button
- [x] Back button tap → `controller.restoreStack([previousDeckId])`
- [x] Back button hold (≥600ms) → `controller.restoreStack([mainDeckId])`
- [x] Existing bundled addons (date-time, media-player, system-status, emoji-selector) continue to render correctly with reserved slot
**Research needed:** No (covered by v1.4 research)

### Phase 43: Calendar Date-Time Button

**Goal:** Add a new `calendar` button type to the built-in `date-time` addon with vertical month/day/weekday layout.
**Requirements:** `CAL-01`, `CAL-02`, `CAL-03`
**Depends on:** 42 (uses reserved slot awareness)
**Success criteria:**
- [x] New `CalendarButtonSchema` registered in `date-time/schemas.ts`
- [x] `Calendar` button file with vertical layout (accent month → large day → tone weekday)
- [x] 1-hour poll interval, no commands
- [x] Addon exports include calendar button
**Research needed:** No (research confirmed `calendar-sheet.tsx` is a literal stub to replace)

### Phase 44: Media-Volume Buttons

**Goal:** New `media-volume` button type with mute toggle, volume up, and volume down variants. Detects real mute state.
**Requirements:** `MV-01` through `MV-07`
**Depends on:** 42
**Success criteria:**
- [x] New `MediaVolumeButtonSchema` with `variant: 'mute' | 'up' | 'down'`
- [x] `media-volume` button file reusing shared `MediaStatusIcon` and progress helpers
- [x] Linux adapter uses `pactl` against `@DEFAULT_SINK@` (works on PulseAudio + PipeWire)
- [x] macOS adapter uses osascript (no sudo)
- [x] Windows adapter returns explicit "not available on this OS" snapshot
- [x] Mute button reflects real state via `pactl get-sink-mute` / osascript `output muted of`
**Research needed:** No (covered by v1.4 research)

### Phase 45: Weather Addon

**Goal:** New bundled `weather` addon with icon + temperature + location, mirroring the media-player addon shape.
**Requirements:** `WX-01` through `WX-06`
**Depends on:** 42
**Success criteria:**
- [x] New `weather` addon registered in the bundled registry
- [x] `WeatherController` with `getSnapshot()` returning `{ available, temperature, icon, location, source }`
- [x] Open-Meteo primary fetch (no API key, WMO codes)
- [x] wttr.in fallback if Open-Meteo fails
- [x] IP geolocation is opt-in via config flag; manual location in config otherwise
- [x] Weather `Surface` component renders icon + temperature + location
- [x] Honest "not available" state for unsupported OS / no network
**Research needed:** No (covered by v1.4 research)

### Phase 46: Emoji-Selector Multi-Page

**Goal:** Paginate emoji-selector categories that overflow the deck, with prev/next navigation buttons.
**Requirements:** `EMO-01` through `EMO-05`
**Depends on:** 42
**Success criteria:**
- [x] `createDecks` refactor to compute per-category pages: `keyCount - reserved - 2` user slots per page
- [x] New `prev` / `next` `change-deck` buttons per page
- [x] Back button repositioned to the system-reserved last slot
- [x] Per-category pagination (each category starts on page 1, not global)
**Research needed:** No (covered by v1.4 research)

### Phase 47: CI Matrix Builds for Linux + Mac

**Goal:** GitHub Actions matrix builds produce executables for Linux x64, Linux arm64, and Mac arm64 on every release.
**Requirements:** `BD-04`
**Depends on:** 40, 41
**Success criteria:**
- [x] `.github/workflows/build.yml` runs on tagged releases
- [x] Matrix: `ubuntu-latest` × {x64, arm64} + `macos-latest` × {arm64}
- [x] Each runner executes `pnpm build:sea` for its target
- [x] Artifacts uploaded to GitHub Releases with checksums
**Research needed:** No (covered by v1.4 research)

## Coverage Check

| Requirement | Phase |
|-------------|-------|
| BD-01       | 40    |
| BD-02       | 40    |
| BD-03       | 41    |
| BD-04       | 47    |
| BD-05       | 41    |
| SRB-01      | 42    |
| SRB-02      | 42    |
| SRB-03      | 42    |
| SRB-03a     | 42    |
| SRB-03b     | 42    |
| SRB-04      | 42    |
| SRB-05      | 42    |
| CAL-01      | 43    |
| CAL-02      | 43    |
| CAL-03      | 43    |
| MV-01       | 44    |
| MV-02       | 44    |
| MV-03       | 44    |
| MV-04       | 44    |
| MV-05       | 44    |
| MV-06       | 44    |
| MV-07       | 44    |
| WX-01       | 45    |
| WX-02       | 45    |
| WX-03       | 45    |
| WX-04       | 45    |
| WX-05       | 45    |
| WX-06       | 45    |
| EMO-01      | 46    |
| EMO-02      | 46    |
| EMO-03      | 46    |
| EMO-04      | 46    |
| EMO-05      | 46    |

### Phase 48: Build and Install Documentation

**Goal:** Ship end-user and developer documentation for the v1.4 standalone binary — install, run, and build-from-source flows.
**Status:** [ ] Not started
**Depends on:** Phase 40

### Plans
*Not yet planned — run `plan-phase 48`*
