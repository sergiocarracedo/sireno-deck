# Research Summary — v1.4 Build, Bundle & UX Polish

**Domain:** Standalone executable distribution, calendar button, weather addon, media-player mute/volume, emoji-selector multi-page, system-reserved back button
**Researched:** 2026-06-04
**Confidence:** HIGH (codebase, Node SEA, Open-Meteo, pactl, Playwright) / MEDIUM (macOS notarization, Windows audio, cross-platform)

---

## Executive Summary

This milestone is not one feature. It is six adjacent changes that share a build pipeline. The clean path is:

- **Distribution** (1, 2) is a new pipeline layer: keep the existing tsdown build, add a Node SEA stage, plus a Chromium-install guard. The runtime, the bundle, and the dev loop are unchanged.
- **Calendar button** (3) is filling in a literal stub. Schema, registration, interval are already in place.
- **Weather addon** (4) is a clean copy of the media-player addon's shape, but with a different backend (Open-Meteo, opt-in IP geolocation).
- **Media volume + mute** (5) extends the existing `MediaController` interface; Linux uses pactl, macOS uses osascript, Windows stays "unavailable" for v1.4.
- **Emoji multi-page** (6) is a `createDecks` refactor — no new schemas, no new buttons, just math.
- **System-reserved back button** (7) is the only *core* change in this milestone. It touches the config schema, the runtime, the controller, and indirectly every addon's config validation.

The system-reserved back button is the most invasive change and the only one with cross-cutting impact. Get the validation right and the rest of the change is local.

---

## Recommended Stack / Direction

- **Distribution:** Node 20 SEA via `node --build-sea sea-config.json` with `useCodeCache: true` and `disableExperimentalSEAWarning: true`. Two-stage build: `pnpm cli:build` → ESM bundle, `pnpm cli:build:sea` → standalone binary. Output to `/works/test/test-sireno-deck/` (outside the repo). Per-OS CI matrix; macOS arm64 first, document x64 and Linux-alpine as not-yet-supported. [HIGH: Node SEA docs]
- **Chromium:** first-run `playwright install chromium` (no `--with-deps` by default; only opt in with explicit user consent because `--with-deps` requires root). Cache an installed marker under `~/.cache/sireno-deck/`. [HIGH: Playwright browsers docs]
- **Weather API:** Open-Meteo as the primary backend (free, no key, WMO codes, geocoding API). wttr.in documented as a fallback. Both support `&format=j1`-style JSON. [HIGH: Open-Meteo + wttr.in docs]
- **Linux audio:** `pactl set-sink-mute @DEFAULT_SINK@ toggle` and `pactl set-sink-volume @DEFAULT_SINK@ +5%`. PipeWire is now the default on Debian/Ubuntu/Fedora, but it ships a PulseAudio compatibility shim, so `pactl` keeps working. [HIGH: pactl(1), PulseAudio Wikipedia]
- **macOS audio:** `osascript -e 'set volume output muted not (output muted of (get volume settings))'` for mute toggle; `osascript -e 'set volume output volume N'` for set. No `sudo` required for the output controls. [HIGH: SS64 osascript]
- **Windows audio:** leave the adapter as "unavailable" for v1.4. Document `nircmd` as a user-installable workaround in the README. [LOW: no clean built-in]
- **Calendar:** reuse the existing `BuiltinCalendarSheetButtonSchema`. Render a vertical layout with three `Text` components: small month (accent tone), large day, small weekday. [HIGH: `date-time/buttons/calendar-sheet.tsx`]
- **Media-volume:** new button type `media-volume` with a `direction: 'mute' | 'up' | 'down'` config. Reuse `useButtonActionCommand` for tap/hold. Tap = single step; hold = larger step. [HIGH: `addon/api.ts:139-246`]
- **Multi-page emoji:** `createDecks` pages by `EMOJI_PAGE_SIZE = keyCount - 1 - 3` (reserved, prev, next). Each page deck has `prev` (or hidden on first), `next` (or hidden on last), and the emoji slots. [HIGH: `emoji-selector/index.ts`]
- **System back button:** core-injected at runtime for every non-main deck. Validation in `core/schemas.ts` rejects any user button at the reserved position. Main deck renders empty at the last key. Tap → `goBack`, hold (600 ms) → `restoreStack([mainDeckId])`. [HIGH: `runtime.ts:277, 1219`, `controller.ts`, `api.ts:85`]

---

## Feature Recommendations

### Must-have for v1.4

- [ ] Standalone Linux x64 executable in `/works/test/test-sireno-deck/`
- [ ] Standalone macOS arm64 executable in `/works/test/test-sireno-deck/`
- [ ] Per-OS CI matrix building the SEA on each host
- [ ] First-run Chromium install (no bundle, no `--with-deps` by default)
- [ ] Real calendar button render (vertical month/day/weekday)
- [ ] Mute toggle with real-state detection (pactl on Linux, osascript on macOS)
- [ ] Volume up and volume down buttons
- [ ] Emoji-selector multi-page for any category with > `EMOJI_PAGE_SIZE` emojis
- [ ] System-reserved last button injected by the runtime on subdecks
- [ ] Tap-back / hold-home gestures on the system back button
- [ ] Empty placeholder at the last key of the main deck
- [ ] Config validation that rejects buttons at the reserved position

### Should-have for v1.4

- [ ] Weather addon with Open-Meteo as primary backend
- [ ] Weather code-to-Lucide-icon mapping (27 WMO codes)
- [ ] `units: 'metric' | 'imperial'` config
- [ ] wttr.in as documented fallback (and code path that retries on Open-Meteo failure)
- [ ] themable `Surface` for the weather button (mirror media-player's Phase 39 surface contract)
- [ ] IP geolocation opt-in via `use_ip_geolocation: true` with a clear privacy note

### Keep out of v1.4 (defer or reject)

- [ ] Bundling Chromium into the SEA (size + license complexity)
- [ ] macOS x64 executable (Node SEA's CI does not test this — ship arm64 first)
- [ ] Linux musl / Alpine (Node SEA explicitly unsupported)
- [ ] `useSnapshot: true` in the SEA config (platform-bound)
- [ ] Windows media-volume support (no clean first-party CLI; document `nircmd` workaround)
- [ ] Bundling `@elgato-stream-deck/node` into the SEA via `sea.getRawAsset` (defer to v1.5)
- [ ] Apple notarization on a Linux runner (impossible; macOS runner only)
- [ ] Apple code-signing without a Developer ID (impossible; ship ad-hoc signed for v1.4)
- [ ] Hard-coded IP geolocation as a default (privacy concerns; opt-in only)
- [ ] Addon-owned back button at the last position (breaks the system-reserved affordance)
- [ ] Configurable icon / label for the reserved back button (theme can override the `Icon` mapping)
- [ ] Generative multi-page emoji selection that shares state across decks (violates addon isolation)

---

## Roadmap Implications

Recommended roadmap order for v1.4:

1. **Build pipeline foundation** — `sea-config.json`, `pnpm cli:build:sea` script, first successful Linux x64 build. No CI yet. The dev loop and the existing build remain unchanged.
2. **First-run Chromium install** — one shared helper, marker file, friendly fallback if `playwright install` itself fails. This is a tiny, low-risk change that unblocks shipping the standalone binary.
3. **System-reserved back button** — this is the cross-cutting core change. Three coupled edits: `core/schemas.ts` validation, `runtime.ts` injection, `controller.ts` `goHome`. Update `config.yml` and any test fixtures that place buttons at the reserved position. Other milestones' addons (emoji-selector, media-player, system-status) need no changes — their config validation now rejects reserved positions automatically.
4. **Calendar button** — fill in `calendar-sheet.tsx`. Schema, registration, interval are already there.
5. **Media volume + mute** — extend `MediaController` interface, implement on Linux + macOS, leave Windows as "unavailable". Add the new `media-volume` button type. Reuse `useButtonActionCommand`.
6. **Weather addon** — copy the media-player addon's shape, swap the backend, register in `addon/builtin.ts`. Reuse the themable `Surface` contract.
7. **Emoji-selector multi-page** — refactor `createDecks`, add prev/next buttons, add a 30+ emoji category to the demo.
8. **CI matrix** — wire up `.github/workflows/release.yml` with the per-OS jobs; output to `/works/test/test-sireno-deck/`. Add Apple codesign step on the macOS runner.

Why this order:

- Items 1–2 ship the *distribution* shape with zero behavioural risk; they are foundational.
- Item 3 is the only *behavioural* cross-cutting change. It has to land before any other feature ships, because the system-back affordance is the core contract that the rest of the milestone relies on.
- Items 4–7 are additive and depend on the core change. They can ship in any order after item 3.
- Item 8 is the last because it cannot be validated without a working build that produces real artifacts.

The single highest-leverage design decision in this milestone is the **validation rule that rejects user buttons at the reserved position**. It is the only thing that prevents the system-back injection from silently overwriting an existing user button. Plan it as the first slice of the system-back phase.

---

## Primary Recommendation

Ship v1.4 as a stack of small, layered changes, not as one big-bang release. Start with the build pipeline (because nothing else can be tested without it) and the system-reserved back button (because it is the only cross-cutting change). Then land the calendar, weather, media-volume, and emoji-multi-page changes as additive features that all benefit from the system-reserved affordance already being in place. End with the CI matrix that ties the whole pipeline together.

Do not bundle Chromium. Do not cross-compile. Do not let addons own the back button. Do not turn IP geolocation on by default. Do not ship an un-validated system-reserved back button. Those are the five things most likely to ship if we rush.

---

*Research summary for: v1.4 standalone distribution + bundled addons + system-reserved back button*
*Researched: 2026-06-04*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md for v1.4*
