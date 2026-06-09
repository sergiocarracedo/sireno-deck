# Pitfalls — v1.5 Addon & UX Polish

**Milestone:** v1.5 — Addon & UX Polish
**Researched:** 2026-06-07
**Confidence:** HIGH for the well-known gotchas (geocoding rate limits, daily-forecast timezone anchoring, active-win Wayland limits); MEDIUM for project-specific integration risks (need code-level validation during `plan-phase`)

Five feature areas, each with their own failure modes. Most are avoidable if you see them coming.

## Common Mistakes

### Weather

1. **Not anchoring daily forecast to local time.** Open-Meteo's `daily` aggregation is 24h windows, and the window boundaries are *in the timezone you request*. If you omit `&timezone=auto`, the windows start at UTC midnight — meaning a user in Tokyo sees "Tuesday's max" actually be Monday 09:00 → Tuesday 09:00 JST, not the intuitive "Tuesday 00:00 → Wednesday 00:00 JST". The fix: always pass `&timezone=auto` (or the explicit IANA zone returned by the geocoder).
2. **Geocoder cache miss → request storm.** If the cache is keyed by typed string and the user types "Vigo" then "vigo" then " Vigo ", each variant is a fresh API call. Three mitigations:
   - Normalize the cache key (lowercase, trim).
   - Keep the user-typed string in a separate field for display.
   - Cap concurrent in-flight requests (mutex on the geocoder).
3. **City-name resolution returning a list and silently picking the first.** The geocoder returns up to 100 results. Picking `results[0]` is wrong — the user almost certainly wants the *most populous* or *closest to a configured country*, not the alphabetically-first. Default to: highest `population`, or first result if none have population. Document the rule.
4. **Mixing hourly and daily forecast in the same `getForecast` call.** Open-Meteo returns hourly and daily in the same response, but the addon's existing `open-meteo-client.ts` may have separate methods. Don't combine them; keep them separate and call both with `&current=...&hourly=...&daily=...` if you need a single request. For v1.5, separate methods are simpler.
5. **WMO weather code glyph table duplicated.** The hourly forecast page already has a `weather_code → glyph` map. Don't duplicate it in the daily page — import from a shared module.
6. **"City, Country" parsing fragile.** If we ever try to split "Vigo, Spain" to filter by `countryCode=ES`, we need a country-name-to-ISO lookup. That's a separate concern; for v1.5, just pass the whole string to the geocoder. Don't pre-parse.
7. **Reverting from city-name to lat/lon on rename.** The schema is a union, not a discriminator. If a user changes the config from `location: "Vigo"` to `location: {name: "Vigo", latitude: 42.2, longitude: -8.7}`, the previous geocoder cache entry for "Vigo" stays. That's fine — it's just unused.

### Bars

1. **Naive negative color on near-gray pixels gives near-white text — unreadable.** If a bar is `#7a7a7a` (medium gray), the negative is `#858585` — also medium gray. The text is then medium-gray on medium-gray. **Mitigation**: if the sampled mean is within 32 of 128 (luma-128), use a fixed contrast color (pure white or pure black depending on whether mean > 128). "Auto-contrast" is the well-known fix from design tools.
2. **Per-pixel sampling is slow.** Sampling a 72x72 bar for every bar in every render frame is N pixel reads. **Mitigation**: the bar's fill color is deterministic from the config (we control it). Precompute the value text color at *config load* time: `textColor = negative(barItem.color)`. No runtime sampling in the common case. Only fall back to sampling when the bar uses a gradient or theme-driven color (rare).
3. **Sampling after rotation is wrong.** If we sample the rect under the text *before* drawing the text, we get the right answer. If we sample *after* drawing the text on a previous frame, we get the text's color, which is circular. **Mitigation**: always sample the bar fill, not the rendered bar-with-text composite.
4. **Rotated text overflows the bar.** At 90° rotation, the text height becomes its length. A 3-digit value like "100" rotated is ~3 character-heights wide, which can be longer than the bar. **Mitigation**: clip to the bar bounds; truncate or shrink the font to fit. (Defer the exact sizing to the Bars test.)
5. **DOM path doesn't see the hardware's negative color.** If we use sharp pixel sampling only on the hardware path, the emulator shows raw white text on a colored bar, which looks wrong. **Mitigation**: the DOM path uses CSS `mix-blend-mode: difference` on the value text. Result: same visual effect, no sampling.
6. **`mix-blend-mode: difference` only works on the right parent.** The text element's parent must not have `isolation: isolate` (which would contain the blend within the parent). Our existing DOM render path may or may not. Verify in `packages/cli/src/render/`.

### Settings deck + brightness

1. **`setBrightness` signature mismatch across SDK versions.** v6 of `@elgato-stream-deck/node` used `setBrightness(0.0–1.0)`. v7 uses `setBrightness(0–100)`. We are on v7. **Mitigation**: read `node_modules/@elgato-stream-deck/node/package.json` to confirm version; pin the device layer's wrapper to that signature.
2. **Brightness set, but the device doesn't apply it.** Some devices (older MK.2 models) ignore brightness changes until the next panel fill. **Mitigation**: after `setBrightness`, send a `clearKey` or `fillKeyBuffer` for key 0 to force a panel refresh. Or just accept that the brightness takes effect on the next render frame.
3. **Multi-device: brightness only applies to one device.** If the user has two Stream Decks plugged in, calling `setBrightness` on one doesn't dim the other. **Mitigation**: the brightness controller iterates *all* open devices. Document this.
4. **Brightness change is not atomic with the value display update.** The "current brightness" tile may show the old value while `setBrightness` is in flight. **Mitigation**: optimistic update — set the local state to the new value immediately, then call `setBrightness`. If the device call fails, roll back.
5. **Reserved slot replacement breaks existing user layouts.** If a user has been relying on the home button at the last slot, replacing it with a Settings button changes their muscle memory. **Mitigation**: keep the *behavior* of the home button (press → go to main) on the Settings button as a hold action, with tap → settings deck. Or vice versa. Document the change in CHANGELOG as a v1.4 → v1.5 breaking change for layouts.
6. **The logo+version tile doesn't have a consistent "back" affordance on the settings deck.** After moving the home button to settings, what goes in the last slot *of the settings deck*? The user wants logo+version there too, or a back-to-main button. **Mitigation**: settings deck's last slot is "back to main" (per the existing system-back-injection rules, which still apply on non-locked, non-active-app decks). Logo+version is shown on the settings deck's first slot, paired with the back button in the last slot.

### Lock deck

1. **User navigates to lock deck when unlocked, then unlocks the screen manually → confusing state.** If the user presses their lock key (which navigates to lock deck), then the screensaver times out and locks the screen, the lock deck is now shown for the wrong reason. **Mitigation**: when the session transitions to locked, force the controller to navigate to the lock deck (this is the v1.4 behavior; verify it's still wired). Conversely, when the session transitions to unlocked, the controller should *not* auto-navigate away from the lock deck — the user might be reading the time on the lock deck. The lock deck just stays.
2. **"Navigate to lock deck" from the main menu while unlocked looks like a normal deck.** If we don't add a visual indicator, the user might think they're still in the main flow. **Mitigation**: defer the indicator (per FEATURES.md anti-features); if user feedback in the UAT says it's confusing, add a "PREVIEW" badge in v1.5.x.
3. **Back button injected on lock deck shows the user where the home button is supposed to be.** Even with the system-back-injection skip, a user-defined button on the lock deck at the last slot could be a "back" button they configured. **Mitigation**: the lock deck is a *first-party* deck (or addon-managed), and the addon manifest can declare it. Addon authors using the lock-deck concept should be told not to put a back button in the last slot. Document in the addon author guide.
4. **Removing the injected back button on locked state means the user can't escape the lock deck by pressing it.** That's the intent — but if a button gets stuck (e.g. the deck thinks a button is pressed when it isn't), the user has no way out. **Mitigation**: keyboard shortcuts (Esc, q) should still quit the CLI; that's already wired in `util/daemon-lifecycle.ts`. Verify.

### Active-app decks

1. **`active-win` on Wayland returns the wrong window.** On Wayland, `active-win` falls back to XWayland windows, so a native Wayland app (e.g. GNOME Files) won't match. **Mitigation**: at startup, check `HostContext.os === 'linux'` and try to detect Wayland (`XDG_SESSION_TYPE === 'wayland'`). If Wayland, disable active-app decks and log a warning. v1.5 ships without Wayland support; v1.5.x or v1.6 adds it via the `org.gnome.Shell` DBus API or a small native helper.
2. **`active-win` on macOS returns `null` for the title when Accessibility permission is not granted.** The `owner.name` is still returned, so process-name matching still works. **Mitigation**: match on `owner.name` only (which is the friendly app name like "Google Chrome"), not on `title`. Document that *titles* of windows require Accessibility permission and are not used.
3. **`owner.name` is localized.** On a French macOS, `owner.name` is "Safari" or "Safari.app" but might also be a localized form. **Mitigation**: process-name match should be case-insensitive substring and tolerant of ".app" suffix. Normalize by stripping ".app" before matching.
4. **Polling at 1s is too slow for a context switch.** If the user Alt-Tabs from Chrome to Slack, the deck shows Chrome for up to 1 second. **Mitigation**: configurable poll interval; default 500ms is a better balance. Even better: subscribe to OS events where possible (X11 `XFixesSelectionNotify`, macOS `NSWorkspaceDidActivateApplicationNotification`), but that's a v2 feature.
5. **Two addons declare active-app decks for the same process (e.g. both Spotify and a music addon want the foreground).** First-match-wins is fine for v1.5; document it. **Mitigation**: in the addon manifest validation, log a warning at startup if two addons claim the same `processNames` entry.
6. **Active-app deck's `getNextPage` and `navigateToDeck` push to history.** That would re-pollute the base stack. **Mitigation**: when the controller is in overlay mode, calls to `navigateToDeck` from addon code are recorded in the *overlay*'s local history, not the base stack. The overlay has its own "internal history" that the base stack never sees. When the overlay exits (toggle or app loses focus), the overlay's internal history is discarded.
7. **Double-tap detection interferes with the back button's hold action.** Some addons use hold-on-back for a different action. **Mitigation**: double-tap detection runs *only* on the back button's tap action. Hold action is unaffected. The double-tap window is short (350ms); if the user holds longer, the hold fires, and a quick release-then-press doesn't qualify as a double-tap.
8. **The "previous regular deck" the user wants to return to is ambiguous.** If the user navigated main → profile → settings, then Spotify comes to foreground, then the user toggles the active-app deck off — which deck should they be on? Settings? The current behavior would put them on top-of-stack, which is settings. **Mitigation**: that's the correct behavior. Document it: "toggle always returns to the most recently shown regular deck."
9. **Active-app deck's "toggle" button has a different visual than the regular back button.** If the toggle button is the system-reserved slot, the system-back-injection rule currently injects a *back* button on regular decks, not a *toggle* button. **Mitigation**: extend the system-back-injection logic to also detect "this deck is an overlay" and inject a *toggle* button instead. This is a renderer-level change, not a controller change.
10. **Process matching case-sensitivity.** Windows: `chrome.exe`. macOS: `Google Chrome`. Linux: `google-chrome` or `chrome`. The same product appears differently. **Mitigation**: case-insensitive substring matching. Document that "chrome" matches all three.

## Warning Signs

Things that should make you stop and reconsider during planning.

- 🚩 **The geocoder cache is growing unboundedly.** Add a max-size (e.g. 1000 entries) and an LRU eviction policy.
- 🚩 **Brightness controller is calling `setBrightness` 10 times per second.** It should only fire on a button press. Add a debounce or rate-limit.
- 🚩 **The active-app poller is firing on every render frame.** It should fire on a timer independent of the render loop.
- 🚩 **The double-tap detector is misidentifying fast typing as a double-tap.** It should only run on the back button, not on user-defined buttons.
- 🚩 **The negative-color text is still white on a white bar.** The auto-contrast fallback didn't trigger; check the luma threshold.
- 🚩 **The 2-day forecast page shows "Tomorrow" and "Day after tomorrow" but those labels are wrong in the user's locale.** Use `Intl.DateTimeFormat` with the timezone returned by the geocoder, not the system locale's day names. Or just use the date string.

## Prevention Strategies

| Pitfall category | Strategy |
|------------------|----------|
| Geocoder chaos | Normalize cache key (trim + lowercase). Single-flight in-flight. LRU eviction at 1000 entries. |
| Daily forecast timezone | Always `&timezone=auto`. |
| Negative color unreadable | Auto-contrast fallback when luma near 128. |
| Bars runtime cost | Precompute value text color from bar fill at config load. Don't sample pixels per frame. |
| DOM/hardware render divergence | DOM uses `mix-blend-mode: difference`. Hardware uses precomputed negative color. |
| Brightness set, no effect | After `setBrightness`, send a no-op panel command to force a refresh. |
| Multi-device brightness | Loop over all open devices, not just the first. |
| Wayland active-app | Detect at startup; disable with a log warning. |
| macOS title null | Match on `owner.name` only, not on `title`. |
| Process-name case | Case-insensitive substring match; strip `.app` on macOS. |
| Active-app deck history pollution | Overlay has its own internal history. Base stack untouched. |
| Double-tap vs. hold | Run double-tap detection only on the tap action of the back button. |
| Active-app deck conflict | First-match-wins; log warning at startup if two addons claim the same process. |
| Lock-deck no-back-when-locked | Single clause in `shouldInjectSystemBack`. Tested explicitly. |
| Lock-deck no-escape | Keyboard shortcuts (Esc, q) still work — verify in `util/daemon-lifecycle.ts`. |

## What's Worth a Solutions File

After the v1.5 ships, the following solutions should be captured to `.planning/solutions/`:

- **Open-Meteo Geocoder cache + single-flight pattern** — useful for any future addon that hits an external API by user-typed string.
- **CSS `mix-blend-mode: difference` for negative-color text in DOM** — useful for any "color-aware" text overlay beyond Bars.
- **Active-app deck overlay pattern** — overlay state separate from base navigation stack, with toggle and double-tap return. Useful for any future "context switch" feature (e.g. calendar-overlay for events).
- **Stream Deck setBrightness multi-device pattern** — once we verify the v7 API, this is worth capturing for the next person who needs device-level brightness.

## Confidence Tag Summary

| Claim | Confidence | Source |
|-------|-----------|--------|
| Open-Meteo geocoding 2-char minimum, fuzzy at 3+ | HIGH | Live doc fetch |
| Open-Meteo `forecast_days=2` + `daily` + `timezone=auto` correct shape | HIGH | Live doc fetch |
| `@elgato-stream-deck/node` v7 setBrightness signature is 0-100 | MEDIUM | Repo dep, but worth verifying the installed version |
| `active-win` returns `owner.name` even when Accessibility permission is missing on macOS | MEDIUM | Training-data recall; need to verify in the package's readme |
| `active-win` falls back to XWayland on Wayland Linux | MEDIUM | Training-data recall; depends on XWayland being enabled |
| Wayland is detected via `XDG_SESSION_TYPE === 'wayland'` | HIGH | Standard freedesktop env var |
| `mix-blend-mode: difference` produces the negative-color effect | HIGH | Standard CSS, widely used in design tools |
| `sharp.raw().toBuffer()` returns a flat RGB array per pixel | HIGH | Stable sharp API, well-documented |
| Negative-color-of-near-gray is unreadable | HIGH | Design convention |
| Stream Deck MK.2 ignores brightness until panel refresh | LOW | Unverified hardware behavior — may need empirical testing on real device |
