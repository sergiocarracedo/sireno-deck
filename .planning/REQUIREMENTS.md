# v1.4 — Build, Bundle & UX Polish

**Milestone:** v1.4
**Started:** 2026-06-04

## v1 Requirements

### Build & distribution (BD)
- **BD-01** Build pipeline produces standalone Linux x64 + Linux arm64 + Mac arm64 executables
- **BD-02** Output written to `/works/test/test-sireno-deck` (outside repo, configurable)
- **BD-03** Auto-install Playwright Chromium on first run when missing (no bundled Chromium)
- **BD-04** CI matrix builds for Linux + Mac via GitHub Actions
- **BD-05** Clear "ready to run" UX: bundled CLI runs without Node.js installed

### System-reserved back button (SRB)
- **SRB-01** Last key slot of every subdeck is hard-reserved by the system (addon authors cannot claim it)
- **SRB-02** Main deck: reserved slot is an empty placeholder (no render, no interaction)
- **SRB-03** Subdecks: reserved slot is a core-owned back button
  - **SRB-03a** Tap → navigate to previous deck on the navigation stack
  - **SRB-03b** Hold (≥600ms) → navigate to home deck (`main`)
- **SRB-04** Config validation rejects addon button placed at reserved position
- **SRB-05** Hold threshold reuses existing 600ms hold timer from `addon/api.ts`

### Calendar button (CAL)
- **CAL-01** New `calendar` button type in built-in `date-time` addon
- **CAL-02** Vertical layout: month (small, accent tone) → day (large) → weekday (small, tone)
- **CAL-03** 1-hour poll interval, no interactive commands

### Media-volume buttons (MV)
- **MV-01** New `media-volume` button type (separate from `media-player`)
- **MV-02** Mute toggle variant: detects real mute state, not assume
- **MV-03** Volume up variant: increments system volume
- **MV-04** Volume down variant: decrements system volume
- **MV-05** Linux adapter: pactl against `@DEFAULT_SINK@` (PulseAudio + PipeWire compatible)
- **MV-06** macOS adapter: osascript without sudo
- **MV-07** Windows: explicitly unsupported with honest "not available on this OS" state

### Weather addon (WX)
- **WX-01** New bundled `weather` addon mirroring media-player shape (controller, surface, button, schema, addon registration)
- **WX-02** Primary data source: Open-Meteo (free, no API key, WMO weather codes)
- **WX-03** Fallback data source: wttr.in
- **WX-04** Location: opt-in IP geolocation with manual override in config
- **WX-05** Surface shows icon + temperature + location
- **WX-06** Honest "not available" state for unsupported OS / no network

### Emoji-selector multi-page (EMO)
- **EMO-01** When a category has more emojis than fit on one page, split across multiple pages
- **EMO-02** Page size = `keyCount - reserved - 2` (account for reserved back + prev + next)
- **EMO-03** New `prev` / `next` navigation buttons per page (existing `change-deck` button type)
- **EMO-04** Back button repositions to the system-reserved last slot
- **EMO-05** Per-category pagination (no global cap)
- **EMO-06** Tap on an emoji button delivers the emoji to the host via a per-OS HID keyboard-stroke shim (xdotool on Linux, pbcopy+osascript on macOS, Set-Clipboard+SendKeys on Windows). User-configured `select_command` overrides the default.
- **EMO-07** Double-tap on an emoji button delivers the emoji's shortcode (e.g. `:fire:`) via the same HID shim. User-configured `select_command_shortcode` overrides the default.
- **EMO-08** Emoji entry buttons render the actual unicode character via a native emoji font stack (Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, system-ui). The 12 bundled branded SVG icons remain as deliberate overrides.
- **EMO-09** Each multi-page category uses a single page-nav button at position `n-2` (keyCount - 2). Tap routes to the next page; double-tap routes to the previous page. The button has two `Chip` overlays: "Tap" (top-left) and "Dbl Tap" (bottom-right).
- **EMO-10** Decks can opt in to a deck-config-decorated system back via two optional fields: `system_back_tap_command` (runs on tap) and `system_back_hold_command` (runs on hold ≥600ms). When set, the runtime routes the system-reserved back slot through `runCommand` for those gestures. Default behavior (tap=parent, hold=main) is preserved when the fields are absent.
- **EMO-11** The emoji catalog groups composite piliapp.com groups into separate subcategories: `Smileys and People` → `Smileys` + `People`, `Animals and Nature` → `Animals` + `Nature`, `Food and Drink` → `Food` + `Drink`. Each subcategory has 20-60 emojis.
- **EMO-12** The emoji catalog is shipped as a hand-curated JSON file at `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`, not scraped at build time. Each entry has `{ char, shortcode }`.
- **EMO-13** The emoji-selector addon provides a new first-class `emoji-launcher` button type. When added to a parent deck config (`{ type: 'emoji-launcher', target_deck: 'emoji', label: 'Emojis' }`), the button renders a 2×3 grid of six representative emojis (😂 🔥 ❤️ ⭐ 🍕 🎵) and navigates to the emoji-selector main deck on tap.
- **EMO-14** The existing per-emoji entry button type is renamed from `emoji-entry-button` to `emoji-emoji-button` to make room for the new `emoji-launcher` type. This is a breaking change for any user who has `emoji-entry-button` in their config; the rename is documented in CHANGELOG.

## v2 Requirements (deferred to next milestone)

- Code signing + notarization for Mac
- Windows executable builds
- Weather widget (not just addon)
- Custom keyboard shortcuts
- Multi-deck per monitor

## Out of Scope

- Bundling Chromium with the binary (license + size concerns; auto-install only)
- Cross-compilation of SEA bundles (Node SEA cannot use code cache on cross-compiled outputs)
- Mac x64 build (not in upstream Node SEA CI; arm64 first)
- Weather alerts / forecasts beyond current condition
- Theme overrides for new button types (built-in surfaces only for v1.4)
