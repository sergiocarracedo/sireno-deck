# Feature Research — v1.4 Build, Bundle & UX Polish

**Domain:** Standalone executable distribution, calendar button, weather addon, media-player mute/volume, emoji-selector multi-page, system-reserved back button
**Researched:** 2026-06-04
**Confidence:** HIGH (codebase, Open-Meteo, pactl, Node SEA) / MEDIUM (macOS, Windows audio) / LOW (notarization hardware-required)

---

## Table Stakes

| Feature | Why expected in this milestone | Complexity | Notes |
|---------|--------------------------------|------------|-------|
| Single-file Linux executable | The milestone goal is "distributable as standalone Linux and Mac executables". | MEDIUM | Node SEA + `node --build-sea`. Output goes to `/works/test/test-sireno-deck/` per the milestone scope. [HIGH: Node SEA docs] |
| Single-file macOS executable | Same milestone goal. | MEDIUM | Same SEA flow on `macos-13` runner. arm64 first; x64 is not currently tested in upstream Node CI and should be documented as a known v1.4 limitation. [HIGH: Node SEA platform support] |
| Auto-install Chromium on first run | User explicitly chose "auto-install Chromium on first run (do NOT bundle Playwright)". | MEDIUM | Wrap `npx playwright install --with-deps chromium` in a one-shot guard. Cache the "installed" marker in `~/.cache/sireno-deck/`. [HIGH: Playwright browsers docs, user scope] |
| Real calendar button in date-time addon | The existing `calendar-sheet.tsx` is a literal stub with `asd2` text and two `Date`/`SHEET` labels (`calendar-sheet.tsx:30-43`). The schema and `builtinCalendarSheetButton` registration are already wired up. | LOW | The schema is already there. The feature is essentially "fill in the render function with a real month/day/weekday layout". [HIGH: `calendar-sheet.tsx`, `schemas.ts:41-45`] |
| Mute toggle that detects real state | The milestone brief explicitly calls this out: "Mute toggle must detect REAL state (not assume)". | MEDIUM | Mirror the `toggle-status` pattern from `core-buttons/buttons/toggle.tsx`: a `status_command` to read, a `toggle_command` to write, and per-platform default commands. [HIGH: `toggle.tsx:91-100`, pactl(1)] |
| Volume up and volume down on the media-player | The existing `media-player-button` has `hold_command` for one command; we need three new commands wired to `volume +5%` / `volume -5%` (or relative pactl). | LOW | Reuse `useButtonActionCommand` (`api.ts:139-246`) with a `commands` config that has `tap`, `hold`, and now the relative volume gestures. The cleanest mapping is a new button type `media-volume` with a single `direction: 'up' | 'down' | 'mute'` config. [HIGH: `media-player-button.tsx:106-128`] |
| Emoji-selector multi-page for big categories | "When a category has many emojis (e.g. 34), split across multiple pages." | MEDIUM | Today every category hardcodes positions 0-14 with `back` at 14 (`emoji-selector/index.ts:42-55`). Multi-page is a `createDecks` change: produce one deck per page * category, with `next-page` / `prev-page` buttons at positions 13/14. The `back` button moves to position 12. [HIGH: `emoji-selector/index.ts`] |
| System-reserved last button (subdecks) | Milestone explicitly demands this. `runtime.ts:277` already computes `reservedBackKeyIndex` but nothing enforces it. The subdeck back button must be core-owned. | HIGH | This is a *CORE* change: schemas, runtime, controller, all addons need to know they cannot place anything at `keyCount - 1`. The simplest implementation is a virtual `system-back` button the runtime injects into every non-main deck. [HIGH: `runtime.ts:277, 1219`, `controller.ts`] |
| System-reserved last button (main deck) | "no render (or empty placeholder)". | MEDIUM | Same core change. Main deck does not need a back button, so the last key stays empty. A user-configurable icon is overkill for v1.4; render nothing or a thin placeholder. [HIGH: milestone scope] |
| Tap → previous deck, Hold → home (subdecks) | Milestone explicitly demands this two-level gesture. | MEDIUM | Reuse the existing `onPress` (600 ms hold threshold from `api.ts:85`) and `onTap` seams. Tap calls `methods.goBack()`. Hold calls a new `methods.goHome()` (or `restoreStack([mainDeckId])` on `controller.ts:67-78`). [HIGH: `api.ts:85`, `controller.ts`] |

---

## Differentiators

| Feature | Value proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| WMO weather-code icon set in the weather addon | Single source of truth; the same WMO codes drive Open-Meteo, wttr.in, and Apple/Google weather. | LOW | Hardcode a `WmoCode → Lucide icon name` map in the addon. 27 codes is the canonical WMO set. Lucide is already a project dep (`lucide-react ^0.552`). [HIGH: Open-Meteo docs, `lucide-react` in deps] |
| `units` config (metric/imperial) for weather | Honors the user's regional default. | LOW | Open-Meteo accepts `&temperature_unit=fahrenheit` and `&wind_speed_unit=mph`; wttr.in takes `?u` or `?m`. Pass through from config. [HIGH: Open-Meteo `temperature_unit`/`wind_speed_unit` params] |
| IP geolocation fallback when the user has no `location` configured | "Just works" out of the box. | MEDIUM | Two free options: `https://ipapi.co/json/` (no key, ~1000 req/day free) and Cloudflare's `cf-ipcountry`/`cf-iplatitude`/`cf-iplongitude` headers (if behind Cloudflare, no key). Choose one with a clear "this is a free public service" disclosure in the config. [MEDIUM: free IP geolocation APIs, no official docs verified at fetch time] |
| Bundled weather code-to-icon component using `Icon` | Reuses the v1.3 themable `Icon` UI primitive instead of bundling a custom icon font. | LOW | `Icon` is already in `ui/index.ts`. Map the WMO code to a Lucide icon name string and pass through. [HIGH: `ui/Icon.tsx`] |
| `media-volume` button as a distinct button type (not an action) | Allows `media-player` button to stay focused on now-playing, and `media-volume` to hold the volume / mute gestures with their own state machine. | LOW | Mirrors how the `toggle` button split out as its own type instead of overloading `action`. [HIGH: `core-buttons/buttons/toggle.tsx` is precedent] |
| Page-of-N indicator on multi-page emoji decks | Tells the user there are more pages. | LOW | The `CATEGORY_DEFINITIONS` model becomes "categoryId → emoji list"; `createDecks` pages them by `EMOJI_PAGE_SIZE` (default 14 minus the 3 reserved: 1 back, 1 next, 1 prev). Emit a `page N of M` small label on a corner button. [HIGH: `support.tsx:7-26`] |
| Optional `appkey` for non-commercial Open-Meteo | Lets commercial users opt in. | LOW | Open-Meteo only requires a key for non-commercial customers via `customer-` server URL prefix. Not v1.4-critical. [HIGH: Open-Meteo `apikey` docs] |
| AppleScript-based volume feedback on macOS | `get volume settings` returns `{output volume:N, output muted:Bool}` — no sudo, no native code. | LOW | `osascript -e 'output muted of (get volume settings)'` reads state, `set volume output volume N` sets it. Same seam media-player already uses. [HIGH: SS64 osascript, macOS media-controller] |

---

## Anti-Features

| Feature | Why it sounds tempting | Why it's problematic | Better alternative |
|---------|------------------------|----------------------|--------------------|
| Bundle Chromium into the SEA | One install, no surprises. | Adds ~280 MB; Playwright's bundled Chromium is licensed under the same BSD as Playwright, but distributing a Chromium build with the binary makes the download size untenable and the update flow opaque. | First-run `playwright install --with-deps chromium` once. [HIGH: Playwright `du` sample, user scope] |
| Wttr.in as the only weather backend | wttr.in's JSON (`?format=j1`) is one curl call. | Less customizable; we get only what wttr.in exposes. Open-Meteo gives us WMO codes, 16-day forecast, geocoding, and finer-grained fields. Use wttr.in only as a fallback. | Open-Meteo primary; wttr.in as fallback for users behind firewalls that block `api.open-meteo.com`. |
| Generic "audio control" button overloading the existing media-player type | One button to rule them all. | Media-player is now truth-state-driven (real `available`/`status` from `playerctl`); volume/mute are stateless gestures. Mixing them in one button puts two state machines in one button. | Keep `media-player` for now-playing; introduce `media-volume` with `direction: 'mute' | 'up' | 'down'`. |
| Addon-owned back button at the last position | Lets the emoji selector and others draw their own back. | Breaks the core guarantee that the last key always backs out. Subdecks must be navigable from any addon. | Core injects a virtual `system-back` button; addons never receive position `keyCount - 1`. |
| Configurable icon / label for the reserved back button | "Why is the back arrow ugly on this theme?" | Adds config surface that nothing else needs. Themes can already style the `ButtonFrame` for `frameState: 'hold'`. Render a generic chevron using `Icon name="arrow-left"`; let themes override the `Icon` mapping if they really need to. | Ship a plain `arrow-left` icon; document the theme override path. |
| `useSnapshot: true` in the SEA config | Smaller startup. | Snapshots are platform-bound. We need to build on the same platform we ship to. v1.4's Mac arm64 + Linux x64 matrix would still work, but any future addition of Mac x64 / Windows / Alpine would require an additional build host. | `useCodeCache: true` only. |
| Hard-coded IP geolocation as a *required* config | "Just work" everywhere. | Privacy-sensitive users will object. IP geolocation leaks the user's public IP to a third party at *config load time*, not just at *button press*. | IP geolocation is opt-in via a `use_ip_geolocation: true` flag; default off. |
| Notarize on Linux | Save Mac runner minutes. | Apple notarization requires `xcrun notarytool` and an Apple-issued Developer ID. Not possible from Linux. | Mac runner only, behind a secret-protected workflow. |
| Cross-compile Mac from Linux | Single CI host. | Node SEA docs explicitly forbid `useCodeCache` and `useSnapshot` in cross-compiled SEAs because code cache is platform-bound. We want code cache. | Per-OS matrix builds. |
| Native addon (`@elgato-stream-deck/node`) bundled into the SEA via `sea.getAsset` + `process.dlopen` | One artifact, no `node_modules` on the user's box. | Possible but adds a custom `dlopen` path. The user must have the matching glibc and arch. Bundling a `.node` is the most fragile piece of this whole plan. | Document the separate-install path: SEA bundles the CLI; user runs `npm i @elgato-stream-deck/node` once into a well-known dir, or the README walks them through the asset-bundling path explicitly. Defer bundling to v1.5. [MEDIUM: Node SEA native addons, `dbus-next` may also need bundling] |
| Cross-deck multi-page emoji selection that shares state across decks | Smooth UX. | Addons are not supposed to share state with each other. The emoji selector would need its own stack, which duplicates the core's stack. | Per-page deck is a static structure; the "page" is selected by which deck the user is on. No state sharing. |
| Native `AudioDeviceCmdlets` PowerShell module for Windows | No third-party download. | Requires PowerShell 5+ admin install of the module, and an active network on first use. Brittle. | Keep Windows media adapter as "unavailable" for v1.4; document `nircmd` in the README as a user-installable workaround. |
| A unified "system command" framework for all OS-specific commands (audio, weather IP lookup, etc.) | One abstraction. | Today `executeCommand` is the single seam (`action/executor.ts:61-91`) and `hostContext.os.type` switches on it. Building a richer framework would expand scope and lock us into a pattern we may want to abandon. | Use `execa` per-adapter, switch on `hostContext.os.type`, return a `boolean` from each `run()` like media-controller already does. |

---

*Feature research for: v1.4 standalone distribution + bundled addons + system-reserved back button*
*Researched: 2026-06-04*
*Sources: Node.js SEA docs, Playwright browsers docs, Open-Meteo API docs, wttr.in GitHub, pactl(1) Debian manpage, osascript SS64, Apple Core Audio API overview, codebase scan of `packages/cli/src/builtin-addons/{emoji-selector,date-time,media-player,core-buttons}/`, `packages/cli/src/deck/{controller,runtime}.ts`, `packages/cli/src/addon/api.ts`*
