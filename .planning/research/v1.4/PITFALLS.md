# Pitfalls Research — v1.4 Build, Bundle & UX Polish

**Domain:** Standalone executable distribution, calendar button, weather addon, media-player mute/volume, emoji-selector multi-page, system-reserved back button
**Researched:** 2026-06-04
**Confidence:** HIGH (existing project regressions, Node SEA, pactl, Open-Meteo) / MEDIUM (cross-platform distribution, Apple notarization)

---

## Common Mistakes

| # | Mistake | Severity | Why it matters |
|---|---------|----------|----------------|
| 1 | Forgetting that Node SEA cross-compiled builds cannot use `useCodeCache` | HIGH | Node SEA explicitly states that for cross-platform SEAs (e.g., building `linux-x64` from a `darwin-arm64` host), both `useCodeCache` and `useSnapshot` must be set to `false`. The binary will crash on startup if the code cache was built on a different platform. We want code cache for faster startup, so we must run each platform's build on a host of that platform. [HIGH: Node SEA `--build-sea` docs] |
| 2 | Auto-installing Chromium into a system path the user does not control | HIGH | `playwright install` writes to `~/.cache/ms-playwright` by default — that is fine. `playwright install --with-deps` (on Linux) calls `apt`/`dnf` and *requires root*. If we silently run that, we make the user root without consent. Default to `playwright install chromium`; only opt into `--with-deps` after a permission prompt, or skip it and tell the user to install libnss/libxss themselves. [HIGH: Playwright browsers docs] |
| 3 | Allowing a button at position `keyCount - 1` in config validation | HIGH | Without the validation rule, existing user configs (and our own `config.yml` at line 56-57 with `position: 3, 13` etc.) will collide with the system-reserved back button. The runtime will silently overwrite the user's button, and the user will be confused. [HIGH: `config.yml`, `runtime.ts:277`] |
| 4 | Treating the "system back" button as an addon button | HIGH | An addon-owned back button is exactly what v1.3 was *moving away from* (Phase 14 discussion: "shared-base mode accents rather than three bespoke renderers"). The system back must be a *core* button that the runtime injects; otherwise the emoji selector and other addons will each ship their own, and we lose the universal back affordance. [HIGH: PROJECT.md Key Decisions, Phase 14] |
| 5 | Hard-coding the Windows media adapter to a third-party `nircmd` download | MEDIUM | `nircmd` is a single-binary Windows utility. If we make it a dependency, we own its license review, its code-signing, and the failure mode when the user's antivirus quarantines it. v1.4 should leave the Windows media adapter "unavailable" and document the user-installable workaround in the README. [LOW: nircmd is the only viable built-in option] |
| 6 | Calling `set-sink-mute toggle` without first reading the current state | MEDIUM | pactl `toggle` does the right thing atomically, but if the runtime is racing with another app (e.g., the user mutes via their DE), the runtime's stored "muted" state can drift. The mute *button label* should always be re-read after a toggle via `get-sink-mute`, not assumed. Same pattern media-player already uses for play/pause. [HIGH: pactl(1) `get-sink-mute`/`set-sink-mute`] |
| 7 | Calling `osascript` with `sudo` to set system volume | MEDIUM | The system-volume AppleScript line does *not* require `sudo`. Forcing `sudo` makes the user type their password on every volume change, which makes the button useless. The mute toggle, the volume read, and the volume write are all available without `sudo`. (`input volume` *does* require `sudo` — only do that for input/microphone if we add it later.) [HIGH: SS64 osascript examples — only `input volume` needs sudo] |
| 8 | Assuming the emoji-selector's "14 emojis per category" model is universal | HIGH | The current `CATEGORY_DEFINITIONS` has 4 emojis per category. Real emoji catalogs (Unicode CLDR full set) have 100+. The multi-page refactor must page the *runtime* data, not bake 11 into the config schema. The page size is an *internal layout constant*; user-configured favorites can be any length. [HIGH: `support.tsx:7-26`] |
| 9 | Building the weather addon's "geolocation" with an opt-out IP service | MEDIUM | IP geolocation sends the user's public IP to a third-party every time the config loads. Privacy-sensitive users will object. Default to a required `location` config; offer `use_ip_geolocation: true` as a deliberate opt-in. Document which service is used and link to its privacy policy. [MEDIUM: free IP geolocation APIs] |
| 10 | Storing Open-Meteo or wttr.in responses without respecting their license | MEDIUM | Open-Meteo's free tier is "Non-Commercial" by default; commercial use requires a key and a `customer-` server URL. Document this in the README and let users opt in to commercial with a config flag. [HIGH: Open-Meteo `apikey` and licence param] |
| 11 | Building a debounced volume repeat gesture (hold-to-ramp) that polls pactl at 100ms | MEDIUM | pactl spawns a full D-Bus round-trip per call. A 100ms hold-to-ramp loop will hammer the audio daemon and may stutter. Either fire a single `+/- 5%` on tap and a *larger* `+/- 15%` on hold, or use `pactl subscribe` to react to external volume changes. Don't poll. [MEDIUM: pactl(1) `subscribe`] |
| 12 | Bundling Chromium via the SEA `assets` mechanism to "just make it work" | HIGH | Adds ~280 MB to the binary. The Playwright license is permissive, but the Chromium build is *not* signed by Microsoft for general distribution; you ship a Google-internal-channel Chromium. License-safe, but a 280 MB binary is not what the user signed up for. Use first-run `playwright install` instead. [HIGH: Playwright browsers docs, `du -hs` sample] |
| 13 | Auto-running `playwright install` on every startup | MEDIUM | `playwright install` is idempotent but still touches the disk and may print to stdout. Cache a marker file (`~/.cache/sireno-deck/chromium-installed`) and only re-run when the marker is missing. |
| 14 | Storing the SEA build in the repo (`packages/cli/dist/sireno-deck`) | MEDIUM | The repo already has a `.gitignore` that ignores `dist/`, and a built SEA is huge (tens of MB). The output goes to `/works/test/test-sireno-deck/` *outside* the repo, per the milestone scope. Honor that and don't let CI upload artifacts back to the repo. |
| 15 | Using `useSnapshot: true` in the SEA config | HIGH | Snapshots are platform- and V8-version-bound. We don't need them for a CLI that takes a fraction of a second to start anyway. `useCodeCache: true` is enough. [HIGH: Node SEA `useCodeCache`/`useSnapshot` docs] |
| 16 | Forgetting that the `dbus-next` and `@elgato-stream-deck/node` native bindings need glibc-compatible Linux | MEDIUM | The current dev/CI environment is Linux x64 glibc. If a user is on Alpine (musl), the SEA will fail to load native bindings. Document the supported set: glibc-based Linux x64, macOS arm64, Windows x64. Don't try to also support musl in v1.4. |
| 17 | Sign-extending or otherwise mutating the `keyCount` derived from `device.key_count` config | LOW | The config currently does not have a `key_count` field — it comes from the device at runtime (`device info`). Config validation needs a *default* of 15 (the MK.2 key count) when validating button positions. Make this default visible to the user. |
| 18 | Letting the system-back button appear on the *main* deck | HIGH | The milestone scope is explicit: "Main deck: no render (or empty placeholder)." If the runtime injects `system-back` on the main deck, users will see a confusing back button on the first thing they see. Skip injection for the main deck. [HIGH: milestone scope] |

---

## Warning Signs

| Warning sign | Indicates | Action |
|--------------|-----------|--------|
| `node --build-sea` succeeds locally but the binary fails to start on a fresh Linux VM | The SEA has a missing dynamic library, or `useCodeCache` was built on a different glibc. | Build on the same target host. `ldd ./sireno-deck` to verify. |
| `playwright install` exits non-zero with "permission denied" | User is on a system where `~/.cache` is locked, or `--with-deps` is calling `apt` without root. | Drop `--with-deps` and print a clear "install libnss3, libxss1, libasound2 manually" message. |
| `pactl: command not found` on Linux | The system has neither PulseAudio nor PipeWire (e.g., pure-alsa box). The media-player addon should treat this the same as "no player running": `createUnavailableMediaSnapshot('pactl-unavailable')`. | Linux media controller should detect missing `pactl` at activation and return unavailable, same as missing `playerctl`. |
| `osascript` exits with "not authorized" on macOS | The user has not granted the binary Accessibility/Automation permissions. | Catch the error, log it, and return the unavailable snapshot. Don't try to spawn a permission prompt. |
| An emoji category with 30+ emojis still only shows 14 buttons after the multi-page refactor | The paging math is wrong. The page size constant probably doesn't account for the system-reserved back button at `keyCount - 1` (so 14 slots total, minus 1 reserved = 13 user slots, minus 1 next/prev = 11 emoji slots). | Add a fixture with 34 emojis that asserts the page count. |
| `pactl get-sink-mute @DEFAULT_SINK@` returns "Mute" / "Unmuted" in some distros, "yes" / "no" in others | Locale-dependent output. | Parse both. Document the locale caveat in the controller code. |
| The build produces a Linux binary that is 100+ MB | Likely the SEA `useCodeCache` is bundling too much, or `assets` is including more than expected. | Check `sea-config.json` and `assets`. Use `node --build-sea` without `assets` first. |
| GitHub Actions matrix tries to build macOS on a Linux runner | Misconfigured matrix. | Use `runs-on: ${{ matrix.os }}` with explicit `os: [ubuntu-latest, macos-13, windows-latest]` and per-OS scripts. |
| The system-back button appears on the *main* deck | `runtime.ts` is injecting unconditionally. | Add `if (activeDeckId !== mainDeckId) inject` guard. |
| The weather addon's IP geolocation call returns the wrong city | Free public IP geolocation databases are coarse. | Always let the user override with `location: { latitude, longitude }` in config. |
| `node --build-sea` fails with "binary too large" | The `assets` field includes the entire `node_modules`. | Don't auto-include `node_modules`; the SEA only needs `dist/cli.js`. |
| The user can scroll past the last page in the emoji selector | The next button was placed on every page including the last. | Hide the next button on the last page; hide the prev button on the first page. |
| The `media-volume` button is shown on the main deck and the user can't see the `media-player` button anymore | The two buttons are both at fixed positions and they collided. | Reserve specific positions for the new button or surface a single button that toggles state. |
| Audio commands "succeed" but the user sees no change | Either the wrong sink/source is targeted, or the DE has its own volume control that overrides pactl. | Always target `@DEFAULT_SINK@` and document that users on DEs with their own volume control may need to disable them. |

---

## Prevention Strategies

| Strategy | Prevents | How |
|----------|----------|-----|
| Run each platform's build on a host of that platform in CI | #1, #15 | Per-OS matrix with `runs-on: ${{ matrix.os }}`. The Linux runner is `ubuntu-latest`; the Mac runner is `macos-13`; the Windows runner is `windows-latest`. [HIGH: Node SEA cross-platform docs] |
| Cache the Chromium-installed marker in `~/.cache/sireno-deck/` | #13 | Write a marker file after the first successful `playwright install`. The runtime checks for the marker first; on miss, it runs the install and writes the marker. |
| Default `playwright install` to **without** `--with-deps` | #2 | The runtime can drop `--with-deps` on a permission error and still succeed. `--with-deps` only matters when shared libraries are missing; for most users, those libraries are already installed. |
| Validate button positions in `core/schemas.ts` against a `MAX_BUTTON_POSITION` constant | #3, #18 | Config-time error with a path-aware message. Use `path: ['decks', deckId, 'buttons', buttonIndex, 'position']` so the user gets the file:line. [HIGH: `core/schemas.ts:501-603`] |
| Inject the `system-back` button in `runtime.ts`, not in each addon | #4, #18 | The runtime walks the deck list at activation time and inserts the system button. Addons never see position `keyCount - 1`. |
| Detect missing `pactl` / `osascript` at activation time and return `unavailable` | #5 (pactl-missing case) | Wrap the `pactl` call in a `which pactl` check; if absent, return the same `createUnavailableMediaSnapshot` shape that media-player already uses for `playerctl`-missing. [HIGH: `linux-media-controller.ts:24-39`] |
| After every mute toggle, re-read state via `get-sink-mute` / `osascript get volume settings` | #6 | Update the button's display state in the render path. The "real state detection" requirement from the milestone is satisfied because we re-read on every poll cycle. |
| Use `osascript` without `sudo` | #7 | The set-volume line in SS64 examples that uses `sudo` is for `input volume` (microphone). Output volume and mute do not need it. |
| Treat `EMOJI_PAGE_SIZE` as a derived constant, not a magic number | #8 | `const EMOJI_PAGE_SIZE = keyCount - 1 - 3 /* reserved, next, prev */`. The constant is recomputed per device. |
| Default the weather config to require `location`; opt into IP geolocation with a flag | #9 | `WeatherConfigSchema = { location: optional, use_ip_geolocation: default(false) }`. The IP service URL is a constant in the addon. |
| Detect `PIPEWIRE` and `PULSE` runtime, fall back gracefully | #16 (partial) | pactl works against both because PipeWire ships a PulseAudio compatibility shim. If neither is present, return `unavailable`. |
| Run `node --build-sea` without `assets` first, then add only the assets we need | #12 | Test that the binary size is reasonable before adding assets. |
| Keep the weather addon's themable `Surface` symmetric with media-player's | Feature drift | Same `createWeatherButton({ surface })` shape. |
| Use `pactl subscribe` to react to external volume changes | #11 | Instead of polling pactl, register a single subscription in the runtime and invalidate the affected buttons when a `change` event fires. (Deferrable — first version can poll at 1s.) |

---

## Things flagged as LOW confidence — surface these as v1.4 risks

- **Apple notarization on the macOS runner** — the Apple Developer docs page (https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution) is JS-gated and was not directly fetchable. The notarization flow is well documented elsewhere (xcrun notarytool submit + xcrun stapler staple) but I have not verified the current 2026 Apple Developer ID workflow. Plan a separate spike phase for notarization if a Developer ID is available, or document that v1.4 ships *ad-hoc* signed only.
- **Windows audio control** — there is no first-party CLI for system volume on Windows that doesn't require PowerShell modules or third-party binaries. `nircmd` works but adds a license review. The plan is to keep Windows `media-volume` as "unavailable" for v1.4 and document the workaround.
- **Bundling `@elgato-stream-deck/node` into the SEA** — possible via the `sea.getRawAsset` + `process.dlopen` flow, but I have not verified that the `.node` binary is portable across glibc variants. Defer to v1.5.
- **Linux on Alpine / musl** — the Node SEA docs explicitly exclude Alpine. v1.4 should document supported platforms (glibc-based Linux x64, macOS arm64, Windows x64) and not promise Alpine/musl support.
- **macOS x64** — Node SEA's CI skips macOS x64 per the official docs ("macOS (arm64 only; x64 is not currently supported and is skipped in the tests)"). v1.4 should ship arm64 first and document x64 as a follow-up.

---

*Pitfalls research for: v1.4 standalone distribution + bundled addons + system-reserved back button*
*Researched: 2026-06-04*
*Sources: Node SEA cross-platform & snapshot caveats, Playwright `playwright install --with-deps` permissions, pactl(1) `get-sink-mute`/`get-sink-volume` output parsing, SS64 osascript sudo requirements, Open-Meteo licensing, codebase scan of `packages/cli/src/builtin-addons/emoji-selector/`, `packages/cli/src/deck/runtime.ts:277, 1219`, `packages/cli/src/core/schemas.ts:106-180`, AGENTS.md Regressions section*
