# v1.7 — Research Summary

**Milestone:** v1.7 (planning)
**Researched:** 2026-06-17
**Status:** Ready for `discuss-milestone`

---

## 1. TL;DR

v1.7 is a focused bug-fix + small-feature + ecosystem-validation milestone: **7 surgical bug fixes** (gesture dispatch, overlay wiring, clipboard/keystroke, shared formatter), **2 small features** (a `LabelValueList` layout redesign for 2/3 items, a new `value-display` builtin addon), and **2 3rd-party smoke tests** (an addon and a theme, both loaded outside the repo via the existing local-source loader). Zero new npm dependencies, zero `SIRENO_ADDON_API_VERSION` bump, zero architectural rewrites. The headline risks are: (a) a v1.6 EMO-15 verification gap that claimed the emoji paste was fixed but never actually wired the keystroke (`util/clipboard.ts:3-5`), and (b) the 3rd-party test paths `/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` do not exist on disk and must be authored as part of the v1.7 plan.

## 2. Theme

**Proposed name:** **"Polish & 3rd-Party Fixtures"**
**Tagline:** Close the v1.6 UX seams and prove the loader walks real third-party code.

(Theme captures both halves: the 7 bug fixes + 2 features are UX polish on shipped primitives; the 2 fixtures validate the loader against real-world 3rd-party code. Compare v1.6 "UX Speed & Overlay Extensions", v1.5 "Addons & UX Polish II", v1.3 "Addon Extensibility & Live Hardware".)

## 3. Stack Delta

**No new dependencies required for v1.7.** The only version audit finding is `clipboardy` 4.0.0 (installed) vs 5.3.1 (latest stable) — 5.0 added Wayland clipboard support and 5.3 added Windows ARM64 binary. The bug fixes for BGFX-05/06 do not need the bump; defer to v1.8.

| Item | Stack impact |
|------|--------------|
| BGFX-01..04, BGFX-07, FBFX-01 | No stack change. All edits to existing files. |
| BGFX-05, BGFX-06 | Reuse existing `keyMacroProvider` (`system/key-macro/index.ts:46-64`); no new package. Optional `clipboardy` 4→5 bump deferred. |
| FBFX-02 (`ValueDisplay`) | Reuse `useButtonActionCommand` (`addon/api.ts:127-168`) + `LabelValueList` (`ui/surfaces/LabelValueListSurface.tsx`). New file under `builtin-addons/value-display/`. No new dep. |
| IMPFX-01 (3rd-party addon) | Folder-install via `source: local, path: <abs-path>`. **No `pnpm install`** — the loader's `tsx/esm/api` path serves `.ts`/`.tsx` directly. |
| IMPFX-02 (3rd-party theme) | Folder-install via `theme: <abs-path>`. Same `tsx` import seam as addons. |

**Stable in v1.7** (do not change): `SIRENO_ADDON_API_VERSION = 1` (`addon/api.ts:14`); `MountedAddonButtonDefinition` contract; `AddonButtonMethods` shape; icon protocol (`icon://`, `addon://`, `builtin://`, `brand://`, `data:`, `https?://`); `useThemeUiPresentation().surfaces.*` theme-override seam.

**NOT stable in v1.7** (subject to change in v1.8+): exact render output of `Icon`/`Label`/`Text`/`Bars`/`LabelValueList` defaults; the `Bars.items` schema (BGFX-07 adds `formatter`); the `LabelValueList.lines` schema (FBFX-01 splits `stack` into `pair`/`triple`); the `keyMacro` parser surface (additive only).

## 4. Architecture Invariants (must preserve)

Every v1.7 fix must respect these load-bearing contracts from v1.6. Do not silently change them under the guise of a bug fix:

1. **Shared command-action contract** (`packages/cli/src/addon/api.ts:76-168`): `useButtonActionCommand` returns `{ onTap, onDblTap, onHold }` that all command-capable builtins share. **FBFX-02 must use this, not a parallel helper.**
2. **`SplitActionSurface` as the dual-action primitive** (`packages/cli/src/ui/surfaces/SplitActionSurface.tsx:11-52`): one diagonal `/` split with primary + optional secondary; theme-overridable. **BGFX-03 must use it for the "back + overlay summon" case; BGFX-04 must render the deck's `icon` inside the secondary slot.**
3. **System back button is always a `SPLIT_ACTION_TYPE` runtime instance** (`packages/cli/src/deck/system-buttons/system-buttons.ts:29-67`): dispatcher returns `OVERLAY_TOGGLE_TYPE` (currently overlaid) or `SPLIT_ACTION_TYPE` (with `pendingOverlayDeck` for the summon path).
4. **Gesture state for double-tap lives in `runtime.ts:1739-1757`**: tap is delayed by `DOUBLE_TAP_DELAY_MS` (400ms) ONLY when `instance.onDblTap` is truthy. **BGFX-01 and BGFX-02 touch this — gesture-state-spread invariant from Phase 56 (`solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md`) is load-bearing.**
5. **Keystroke simulation lives in `keyMacroProvider.send`** (`packages/cli/src/system/key-macro/index.ts:46-64`): Linux uses `xdotool key --clearmodifiers`, macOS uses `osascript`, Windows uses `SendInput`. `methods.pasteText` is the public addon seam and **currently only writes to the clipboard** — root cause of BGFX-05.
6. **Addon manifests declare `apiVersion` matching the package's `SIRENO_ADDON_API_VERSION`** (`packages/cli/src/addon/api.ts:14`). **IMPFX-01 must use `apiVersion: 1`.** Themes use `manifest.yml` (not `package.json`) per `packages/cli/src/themes/default/manifest.yml:1-10`.

## 5. Scope

### 5.1 Bug Fixes (BGFX-01..BGFX-07)

- **BGFX-01** — System back button still feels sluggish on the settings page. The settings-deck branch is a separate code path from the v1.6 PERF-01 back-pop fix; `current_brightness`'s 1s poll defeats the per-deck HTML cache. Most likely the v1.6 measurement was the wrong transition (pop, not landing).
- **BGFX-02** — Double-tap on a no-`onDblTap` button fires `onTap` twice. `runtime.ts:1755-1757` else-branch fires `handleTap` on every release; the `pendingDblTapTimer` debounce only runs when `onDblTap` exists. Fix: extend the debounce to a no-op second-press suppression regardless. Per-button `lastTapAt` field, not global (user can press button 3 + button 7 simultaneously).
- **BGFX-03** — System back / settings slot doesn't use `SplitActionSurface` to show "back to overlay" when an overlay is available. `getLastPositionSystemButton` only injects a split when `pendingOverlayDeck` is populated, and the overlay-active branch is `OVERLAY_TOGGLE_TYPE`, not split. Two distinct fixes: base-deck summon affordance, and overlay-deck back affordance.
- **BGFX-04** — Active-app deck `icon` field is silently dropped. `CoreDeckConfigSchema` is `.strict()` with no `icon`; `RawDeckSchema` is `.passthrough()` so YAML is accepted but the loader drops the field; `OverlayToggleButton` and `SplitActionSurface` secondary fall back to `extractFirstEmoji(deckName)` or generic icon. Schema is the root cause; render is downstream.
- **BGFX-05** — Emoji paste does not actually paste. `util/clipboard.ts:3-5` only calls `clipboardy.write`. The OS paste keystroke is **not sent** — claimed fixed in v1.6 EMO-15, never wired. Phase 59-01 SUMMARY describes the intent; the runtime code does not match.
- **BGFX-06** — `key_macro` keystrokes not sent to apps. Three root causes: (a) `isPureWayland` boolean in `system/key-macro/index.ts:27-29` is inverted (returns true only when env is *misconfigured*); (b) `linux.ts:91-93` swallows `xdotool` failures with an empty `if (result.failed) {}` block; (c) the default provider's logger is `logger: { warn: () => {} }`.
- **BGFX-07** — `Bars` value has no formatter and no documented "no decimals" default. `BarsItem` only has `displayValue?`; callers pre-format. Need a per-item `formatter` slot (default `'none'` = `Math.round`) reusing the numbro mapper from `display-metrics.ts`. Default IS already "no decimals" (Math.round); the gap is the *override* path.

### 5.2 New Features (FBFX-01..FBFX-02)

- **FBFX-01** — Better `system-status-label-values` layout for 2 and 3 items. Replace the cramped `flex-col gap-3` 2-line and the cramped 3-4-line `stack` with a 2-column grid (`'pair'`) for 2 lines and a 3-column grid (`'triple'`) for 3 lines. 4-line keeps current `stack`. Theme-overridable through `useThemeUiPresentation().surfaces.labelValueList`. Auto-selected from line count, not opt-in.
- **FBFX-02** — New builtin addon `ValueDisplay`. Up to 3 per-value `display_command`s, each with `label`, `formatter`, `units`, optional `icon`. Reuses the `useButtonActionCommand` helper (`addon/api.ts:127-168`) so tap/hold/dbl-tap are the standard action contract. Max 3 values per button. Greenfield addon at `packages/cli/src/builtin-addons/value-display/`, mirrors `system-status` split.

### 5.3 3rd-Party Ecosystem (IMPFX-01..IMPFX-02)

- **IMPFX-01** — Third-party addon fixture at `/works/test/test-sireno-deck`. `package.json` with `sirenoAddon: { apiVersion: 1, main: './index.ts' }`, one TSX button using `IconLabelSurface`, one asset. **The path does not exist on disk** (verified 2026-06-17) — must be authored as part of the v1.7 plan. No `pnpm install` step.
- **IMPFX-02** — Third-party theme fixture at `/works/test/test-sireno-deck-theme`. `manifest.yml` (NOT `package.json`) with `name`, `main`, `colorTokens`, `typography`, `assets.styles`, plus an `index.tsx` exporting `buttonFrame`. **The path does not exist on disk** — must be authored as part of the v1.7 plan. Trust model is "in-process, full Node.js permissions; only install code you trust" — must be stated in README. Per user spec: yellow-based colors + custom UI component overrides.

## 6. Critical Findings

These discoveries change the v1.7 plan from a routine bug-bash into a milestone that has to actively correct v1.6's record:

1. **EMO-15 was a verification gap, not a fix.** Phase 59's `pasteText` implementation in `util/clipboard.ts:3-5` only calls `clipboardy.write(text)`. The keystroke-injection half was never wired. `git log` confirms the only `keyMacroProvider.send` addition in `runtime.ts` is for the action button's separate `keyMacro` method (added in `quick-042`). The Phase 59-01 SUMMARY describes the intent; the runtime code does not match. The 59-VERIFICATION and 69-VERIFICATION artifacts passed because they only asserted `methods.pasteText` was called, not that the keystroke was actually sent. v1.7 must (a) wire the keystroke, (b) update `REQUIREMENTS.md` to mark EMO-15 as "partially satisfied v1.6, fully satisfied v1.7", and (c) make the test assert call order, not just side effects — the original tests mocked `keyMacroProvider` and never asserted the real-path call (the "new-tests-pass-in-isolation-fail-in-full-file" trap).

2. **`/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` do not exist on disk.** Verified via `ls /works/test/` on 2026-06-17 — "No such file or directory". The 3rd-party smoke-test phases (IMPFX-01/02) must include a setup step that creates the directory tree. The user must confirm whether the fixtures should live at those absolute paths (CI-hostile, requires `/works/test/` to exist on CI runners) or in `packages/cli/fixtures/third-party/*` (CI-friendly, symlinked for UAT). **Recommend the latter.** Without this decision, Phase 76 cannot start.

3. **BGFX-01 and BGFX-02 share the same gesture state machine in `runtime.ts:1712-1758`.** Phase 56's gesture-state-spread invariant (`solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md`) is load-bearing — `gestureStates.set(key, { ...gs, field })` must always spread. BGFX-02 introduces a new `lastTapAt` field on `ButtonGestureState`; BGFX-01 may adjust `activateDeckSurface` short-circuit or `current_brightness` interval. **The plan must include a combined regression test** firing single-tap, double-tap, tap-during-hold, double-tap on no-callback, and hold on a button that also has dbltap — and assert the right combination of `onTap`/`onDblTap`/`onHold` calls for each. Without this, a fix in one will silently break the other. Adjacent code at risk: `deck/__tests__/runtime.test.ts:4740-4771` (overlay-toggle test that explicitly waits `DOUBLE_TAP_DELAY_MS`); the `handlePress` block at `runtime.ts:1603-1616` already uses the spread — the new code in the `else` branch at lines 1755-1757 must do the same.

4. **v1.6 measured the wrong transition.** Phase 58 PERF-01's 12.35ms in-process figure was for the back-stack *pop*, not the settings-deck *landing*. BGFX-01's "settings page feels slow" is most likely either (a) `current_brightness`'s 1s render interval forcing full re-renders (the HTML cache skip-when-unchanged is defeated because the brightness *is* changing every second), or (b) the first-frame browser-capture cost (Playwright `page.screenshot` adds 30-100ms on real hardware). The plan must include a real-hardware `SIRENO_PROFILE=1` JSON-hop profile run; in-process numbers alone are not honest verification for this bug. Phase 58's "12.35ms" was an in-process measurement with a documented hardware caveat — the user is reporting that caveat is real.

5. **The 3rd-party trust boundary is unsandboxed by design.** `addon/loader.ts` and `config/theme/theme.ts` import user code via `tsx/esm/api` with no capability check. A malicious 3rd-party addon can `execa`, `readFileSync('~/.ssh/id_rsa')`, `clipboardy.read`, or `fetch('https://evil.example.com')` — there is no permission prompt, no `child_process.fork`, no `vm.Context`. The only existing guards are `validateAddonApiVersion` (correctness, not security), `assertRawSourceModuleGraph` (prevents typos and accidental leaks, not malicious intent), and the `addon/system` field (reserves system button types). The mitigation is *honest documentation*, not a sandbox: README must say "Addons execute in-process with full Node.js permissions; only install code you trust." v1.7's plan must NOT introduce a sandbox — that's a v2+ feature with API stability implications.

6. **`sirenoAddon.apiVersion` collisions.** If the 3rd-party addon uses a `type` prefix that collides with a builtin (`action`, `toggle`, `emoji-emoji-button`, `system-status-bars`, `system-status-label-values`, `locked-time-tile`, etc.), the registry will reject the duplicate. The test addon must pick a unique type name (e.g. `test-sireno-deck-color-cycle-button`).

## 7. Recommended Phases

Phases 71-76, ordered by build dependency (formatters before consumers, schema before render, fixtures after the addon they validate). Each phase is a single plan. Maps directly to FEATURES.md REQ-ID allocation (Phase 71-76 → 11 items).

### Phase 71 — Gesture state machine hardening (BGFX-01, BGFX-02)

**Scope:** `runtime.ts:1712-1758` dispatch. Extend the `pendingDblTapTimer` debounce to the no-`onDblTap` branch (per-button `lastTapAt` field on `ButtonGestureState`); profile the settings-deck transition; consider a same-html-skip short-circuit or coarser `current_brightness` interval (e.g. 2s).
**Why first:** Both bugs share `runtime.ts:1712-1758` and the `ButtonGestureState` map. Fixing them together keeps the spread invariant intact. The combined regression test is the gate.
**Success criterion:** New combined regression test in `runtime.test.ts` fires single-tap, double-tap, tap-during-hold, double-tap on no-callback, and hold-on-dbltap-button — all pass; `brightness-up` test (`internal-settings/buttons/brightness-up.test.tsx`) stays green; `deck/__tests__/runtime.test.ts:4740-4771` (overlay-toggle) stays green; `internal-settings-deck.test.ts` (Phase 67-02 fixed positions) stays green.

### Phase 72 — System-buttons dispatcher + deck `icon` (BGFX-03, BGFX-04)

**Scope:** Add optional `icon?: string` to `CoreDeckConfigSchema` (`core/schemas.ts:190-203`); plumb through `loader.ts:480-495`; thread `addonRegistry` or a `resolveAssetPath` callback into `SystemButtonContext`; update `OverlayToggleButton` and the `SPLIT_ACTION_TYPE` secondary to render the resolved icon (preferring `icon`, falling back to first-emoji-of-name, falling back to `layout-grid` lucide). Extend `getLastPositionSystemButton` to use `SPLIT_ACTION_TYPE` in the overlay-active + summonable case; preserve `OVERLAY_TOGGLE_TYPE` on the overlay deck itself.
**Why this order:** Schema change (BGFX-04) must land before the dispatcher change (BGFX-03) can use the icon. Both touch `system-buttons.ts` so they belong together.
**Success criterion:** Chrome deck's `icon: /works/opensource/sireno-deck/assets/chrome.svg` renders in the badge on the overlay-toggle button and the SplitActionSurface secondary; new dispatcher tests cover the "overlay-active + summonable" and "overlay-active + no-summonable" branches; `system-buttons-dispatcher.test.ts:111-118` test contract preserved. No hard-coded deck names anywhere in the dispatcher.

### Phase 73 — Clipboard + keyMacro provider (BGFX-05, BGFX-06)

**Scope:** Extend `util/clipboard.ts` to write + send paste keystroke (`ctrl+v` on Linux/Windows, `cmd+v` on macOS, 50ms `wait` between) via the existing `keyMacroProvider`. Invert `isPureWayland` in `system/key-macro/index.ts:27-29` — "pure Wayland" means `WAYLAND_DISPLAY` IS set (no X fallback), not unset. Replace the no-op `logger: { warn: () => {} }` default with a real pino logger; surface one-time warnings on first failure (not per call). Update `pasteText` test to assert call order with a real (non-mock) `keyMacroProvider` and a recording executor. Update `REQUIREMENTS.md` to mark EMO-15 as "partially satisfied v1.6, fully satisfied v1.7".
**Why this order:** Both bugs share the `keyMacroProvider` seam. Fixing them together ensures the test coverage is honest.
**Success criterion:** `pasteText` test asserts `clipboardy.write` then `keyMacroProvider.send(['ctrl+v'])` order; linux provider test asserts `xdotool` failure is logged via pino; pure-Wayland test asserts `unsupported` provider is returned when `XDG_SESSION_TYPE=wayland` AND `WAYLAND_DISPLAY` is set; chrome-deck `key_macro` test in `loader.test.ts` still loads; existing `darwin.ts:117-121` / `windows.ts:118-122` warn patterns extended to linux.

### Phase 74 — Shared formatter + Bars + LabelValueList (BGFX-07, FBFX-01)

**Scope:** Extract the numbro mapper from `builtin-addons/system-status/domain/display-metrics.ts:55-78` into `ui/utils/formatters.ts` (numbro-backed, mirrors `SystemStatusFormatter`). Add `formatter?: 'percent' | 'bytes' | 'count' | 'frequency-ghz' | 'uptime' | 'none'` to `BarsItem` (default `'none'` = `Math.round` — preserves current behavior). Add `'pair'` and `'triple'` layouts to `LabelValueListSurface`; preserve `data-sireno-label-value-layout` attribute. Update `system-status-bars` and `system-status-label-values` to use the shared helper (no behavior change to existing callers; `displayValue` still wins). Export a `formatBarsValue(value, formatter?)` helper from `BarsSurface` so 3rd-party addons get the same default without re-implementing numbro.
**Why this order:** BGFX-07 + FBFX-01 share the formatter extraction; doing them together avoids a refactor of system-status twice.
**Success criterion:** `Bars.test.tsx` asserts `75.4 → '75'` default and `75.4 → '75.4'` with `'decimal'`. `LabelValueList.test.tsx` asserts 2-line uses 2-column grid and 3-line uses 3-column grid via stable data attributes. Existing system-status tests stay green. `system-status/index.test.ts` (uses `displayMetric.formattedValue`) unchanged. `numbro(undefined).format(...)` edge case ("NaN") covered — `Bars` falls back to `String(Math.round(value))` for `value === undefined`.

### Phase 75 — New `value-display` builtin (FBFX-02)

**Scope:** Greenfield addon at `packages/cli/src/builtin-addons/value-display/`, mirrors `system-status` split. One button type `value-display` (or `value-display-multi` for 2-3 values, single `type` is recommended), schema with `values: 1-3 tuple`, per-value `command | label | formatter | units | icon | unavailable_label`, plus top-level `commands: { tap, hold, 'double-tap' }`. Register in `addon/builtin.ts:12-22`. Reuses `useButtonActionCommand` and the shared formatter from Phase 74. No `SIRENO_ADDON_API_VERSION` bump. Plain `ZodObject` with `.strict()` (no `.refine()` per `solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md`). Always set `defaultRenderIntervalMs` for time-varying values. Single default export from `index.ts` (named export will throw at startup in `addon/builtin.ts`).
**Why this order:** Depends on Phase 74's shared formatter. Comes after the bug fixes so the new addon doesn't inherit bugs.
**Success criterion:** `value-display` button registered in builtin list; `1-value` and `3-value` render correctly; action commands flow through `useButtonActionCommand` (no bespoke gesture handler); schema rejects 0/4-value configs; new fixture config under `packages/cli/fixtures/` exercises the loader; `value-display` button uses `Icon`/`Label`/`Text` kit, not hand-rolled `createElement`.

### Phase 76 — 3rd-party fixtures + trust documentation (IMPFX-01, IMPFX-02)

**Scope:** Author `/works/test/test-sireno-deck` (package.json with `sirenoAddon: { apiVersion: 1, main: './index.ts' }`, one TSX button using `IconLabelSurface`, one asset). Author `/works/test/test-sireno-deck-theme` (manifest.yml with `name`, `main`, `colorTokens` (yellow-based: `primary: '#facc15'`), `typography`, `assets.styles`; index.tsx exporting `buttonFrame`; if user wants "replaces all UI components with own alternatives" then export `ui` with all `surfaces.{iconLabel, bars, splitAction}` overrides). Both fixtures must include a README stating "in-process, full Node.js permissions; only install code you trust" and "This is a first-party test fixture for v1.7's 3rd-party smoke test; not a user-facing addon." Add loader integration tests in `addon/loader.test.ts` and `config/theme/theme.test.ts` pointing at the real on-disk paths. **Path question is a Phase 0 decision** — if user prefers, ship inside `packages/cli/fixtures/third-party/*` and symlink for UAT. Test the API surface stability by asserting a known button/deck shape.
**Why last:** Fixtures validate the loader *after* the ValueDisplay addon has landed; otherwise the loader test would need to know about a not-yet-existing addon.
**Success criterion:** `pnpm cli:dev start --config <test-config>` loads the addon and renders its button; `theme: test-sireno-deck-theme` resolves the theme and renders the override; loader tests assert both succeed; CHANGELOG + README trust paragraph lands; `loader.test.ts:130` apiVersion guard test still passes.

## 8. Risks

Top 5 cross-cutting risks (drawn from PITFALLS.md CC-1..CC-5). L×I = likelihood × impact (1-5 each).

1. **CC-1 — Gesture timing regression (FX-01 + FX-02).** Both bugs touch `runtime.ts:1592-1758` and the `ButtonGestureState` map. The Phase 56 gesture-state-spread invariant (`{...gs, field}` never `{ field }`) is load-bearing. A fix to one that drops the spread will regress the other. **L×I: 4×4. Mitigation:** Phase 71 includes a combined regression test covering single-tap, double-tap, tap-during-hold, double-tap on no-callback, and hold-on-dbltap-button.

2. **CC-3 — Cross-platform keystroke injection (FX-05 + FX-06).** Linux xdotool may be missing; pure Wayland has no xdotool (needs `wtype` + `input` group, or `ydotool` daemon); macOS needs Accessibility permission; Windows SendKeys is legacy and UAC prompts reject it from non-elevated processes. The current default `logger: { warn: () => {} }` swallows every failure. **L×I: 5×4. Mitigation:** Phase 73 wires a real pino logger, surfaces one-time warnings per session (not per call), inverts `isPureWayland`, adds a 50ms `wait` between clipboard write and paste keystroke, and considers a startup-time `which xdotool` precheck.

3. **CC-4 — 3rd-party loader trust boundary (FX-10 + FX-11).** The `tsx/esm/api` import path is unsandboxed by design. A malicious addon can `execa`, `readFileSync('~/.ssh/id_rsa')`, `clipboardy.read`, or `fetch('https://evil.example.com')`. **L×I: 5×5 if a user installs a malicious addon thinking it's sandboxed; L×I: 2×2 if the user understands "trusted-by-opt-in". Mitigation:** Phase 76 adds an explicit README trust paragraph; keeps the existing `assertRawSourceModuleGraph` guard; does NOT introduce `child_process.fork` (deferred to v2+); consider a `redactPath` filter on the loader's error formatter (minor information disclosure today).

4. **CC-2 — Overlay wiring fragility (FX-03 + FX-04).** A "fix" that hard-codes a deck name (e.g. `if id === 'chrome'`) breaks the abstraction. The dispatcher must read `runtimeDecks[overlayDeckId].icon`, not a literal. **`SystemButtonContext` does not currently include the registry** — Phase 72 must either update all fakes in `system-buttons-dispatcher.test.ts:51-87` or extract a narrower `resolveOverlayIcon(deckId): string | undefined` helper. **L×I: 4×4. Mitigation:** Phase 72 caps any deck-name references in `system-buttons.ts`/`OverlayToggleButton.tsx`/`runtime.ts:1033-1106`; adds two dispatcher tests for the new "overlay-active + summonable" branch; extracts the icon-resolver helper.

5. **CC-5 — API stability for 3rd-party (FX-10 + FX-11).** This is the first real 3rd-party code the runtime will execute. v1.7's contract becomes the de-facto stable surface. A future breaking change silently breaks the test fixtures. **L×I: 3×4. Mitigation:** Phase 76 adds a `loader.test.ts` integration test that resolves the real on-disk paths and asserts a known shape; pins the stable surface in PITFALLS.md CC-5; no `SIRENO_ADDON_API_VERSION` bump (v1.7 changes are additive). Be aware: BGFX-04's `icon` field on `DeckConfig` is non-breaking (`.passthrough()` on `RawDeckSchema` makes it tolerant), but a future v1.8 phase that requires it could be breaking.

## 9. Decisions Needed

Ordered by blocker-ness. Each answerable in 1-2 sentences.

1. **Where do the 3rd-party fixtures live?** `/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` (CI-hostile, requires `/works/test/` to exist on CI) OR `packages/cli/fixtures/third-party/*` (CI-friendly, symlinked for UAT) OR an in-repo copy only. **Recommend in-repo copy + symlink.** This unblocks Phase 76.
2. **BGFX-03: what should pressing n-1 on the overlay deck itself do?** (a) keep `dismissOverlay()` (status quo, recommended), (b) navigate back in the underlying deck's history, (c) configurable per-deck. Affects the SplitActionSurface primary onTap dispatch.
3. **BGFX-04: where does the deck `icon` field live?** Deck-level (`icon?: string` on `CoreDeckConfigSchema`, recommended) or overlay-specific (`overlay: { icon }` sub-block). Affects schema ripple through addon-generated deck types.
4. **FBFX-02: formatter vocabulary.** Reuse `SystemStatusFormatter` (percent / bytes / count / frequency-ghz / uptime / none, recommended) or expand (add `date`, `duration`, `temperature`)? Affects the shared `ui/utils/formatters.ts` shape.
5. **BGFX-02: exact UX on double-tap of a no-callback button.** "Fires onTap once" (recommended, forgiving — sloppy single taps work) or "fires nothing at all" (aggressive — perfect single taps required)? Same implementation cost; different UX.
6. **BGFX-01: real-hardware profile scope.** Should the v1.7 plan require a `SIRENO_PROFILE=1` JSON-hop run on real hardware (Linux + macOS at minimum), or accept in-process numbers as honest verification? The 12.35ms in-process figure is meaningless for the settings-deck case.
7. **FBFX-01: 3-line layout.** 3-column grid at 72×72px (recommended, mirrors `'pair'` for 2-line) or "1 big + 2 small" (1+2 layout, denser)? Affects `LabelValueListSurface` layout dispatch.
8. **BGFX-05: should `methods.pasteText` keep its name and semantics change** (write + paste, recommended) **or add a new `methods.pasteAndType` helper** (keeps `pasteText` as write-only for back-compat)? Either is fine; pick before Phase 73.

## 10. Out of Scope

Deferred explicitly to v1.8 or later (per PITFALLS.md §"What is explicitly OUT of scope" + cross-cutting deferrals):

- **Real sandbox for 3rd-party addons/themes** (`child_process.fork` + `vm.Context`). v2+ feature with API stability implications. v1.7's answer is honest documentation + the existing `assertRawSourceModuleGraph` guard.
- **`SIRENO_ADDON_API_VERSION` bump** (stays at 1). v1.7's changes are additive and backwards-compatible. v1.8 is the bump point if a breaking change ships.
- **Configurable `DOUBLE_TAP_DELAY_MS` per button** (hardcoded 400ms). v2 candidate per v1.6-REQUIREMENTS.
- **Configurable `current_brightness` poll interval** as a config field (currently 1s). May be tightened in Phase 71 but not exposed.
- **Auto-brightness / ambient light / time-of-day brightness.** v2 per v1.6-REQUIREMENTS.
- **CI matrix for macOS/Windows.** Linux only; macOS/Windows UAT is manual with `process.platform === 'darwin'` skip patterns.
- **User-facing theme picker UI.** Themes remain config-driven (`theme: <name>`).
- **Distribution build pipeline (Phases 40/47/48).** v1.8.
- **`clipboardy` 4.x → 5.x bump** (would buy Wayland clipboard support and Windows ARM64 binary). Independent of the bug fixes; deferred to v1.8 or v2.
- **Wayland-native paste** (`wtype` / `wl-copy --paste` / `ydotool` daemon). Out of scope per v1.6-REQUIREMENTS line 158-164 ("Active-app decks on pure Wayland sessions — requires XWayland"). v1.7's answer: invert the `isPureWayland` check and surface the limitation honestly.
- **Real `key_macro` test on macOS/Windows CI.** Linux only; macOS/Windows are skip-conditional.
- **HTML paste / multi-format paste** (single text paste only in v1.7).
- **Conditional / templated `display_command`s** in `ValueDisplay` (the existing `{{ host.os.type }}` host-context placeholder is the only template engine — same as everywhere else).
- **A "test mode" flag for `key_macro`** that simulates execution without calling xdotool/osascript/SendKeys. Useful for CI; deferred to v1.8.

## 11. Warning Signs (red flags during execution)

Things that should make the executor stop and reconsider. Pulled from PITFALLS.md §"Warning Signs":

- **The new "double-tap debounce" lands but the test only fires one press/release pair.** That tests the existing single-tap path, not the fix. Needs at least two press/release pairs within 400ms with `onDblTap` absent. (BGFX-02)
- **`pasteText` test mocks `keyMacroProvider` but never inspects the *order* of calls.** This is exactly the v1.6 gap that produced the bug. The new test must assert `clipboardy.write` was called before `keyMacroProvider.send`, with at least one test that uses a real (non-mock) provider and a recording executor. (BGFX-05)
- **Chrome overlay `key_macro` test passes on Linux but the same config fails on macOS.** The xdotool path is well-tested; the osascript path is not. Use `process.platform === 'darwin'` skip patterns and real-hardware UAT on at least one non-Linux host. (BGFX-06)
- **A "fix" for BGFX-04 hard-codes `if (deck.id === 'chrome')`.** The deck is `chrome` in one user's config; the runtime must not know about it. Read `runtimeDecks[overlayDeckId].icon`. (BGFX-04)
- **The 3rd-party addon is committed with `apiVersion: 99`.** The loader's `validateAddonApiVersion` guard at `loader.test.ts:130` will fail it. Must declare `apiVersion: 1`. (IMPFX-01)
- **A 3rd-party test theme's `ButtonFrame.tsx` returns `undefined` from a render helper.** The default UI presentation falls back to `<div className="contents">` and silently produces blank buttons. The loader test must call the theme's render with a sample button and assert non-empty output. (IMPFX-02)
- **`ValueDisplay` exports a named `valueDisplay` instead of `default`.** `addon/builtin.ts` does `import valueDisplayAddon from ...`; named export throws at startup. Test must assert `default` shape. (FBFX-02)
- **The `Bars` formatter change makes `system-status-bars` show "0" instead of "0.0" for 0% CPU.** Trap: `numbro(undefined).format(...)` returns `"NaN"`. The "unavailable" path must still hit the `String(Math.round(value))` fallback. Bars test must include `value === 0` and `value === undefined` cases. (BGFX-07)
- **`getLastPositionSystemButton` change ships without updating the matrix test in `system-buttons-dispatcher.test.ts`.** The existing 7 tests assert specific return types; the new "overlay + summonable" branch must add at least 2 more tests. (BGFX-03)
- **The user re-tests on real hardware and the back button still feels slow.** Phase 58's 12.35ms in-process number is meaningless on hardware; the only honest measurement is `SIRENO_PROFILE=1` on the actual device with a JSON hop log. (BGFX-01)

## 12. What plan-phase must include (per-item acceptance)

Minimum evidence each item must produce before it is considered "executed." Reject any plan missing the row's evidence. Pulled from PITFALLS.md §"What plan-phase must include":

- **BGFX-01** — A real-hardware `SIRENO_PROFILE=1` profile run on Linux + macOS, JSON hop log attached to the SUMMARY. A regression test in `runtime.test.ts` asserting the back transition completes in < 50ms *after* the press handler fires (the 200ms PERF-01 target is in-process only).
- **BGFX-02** — A focused test in `runtime.test.ts`: button with only `onTap`, two press/release pairs within 400ms, assert `onTap` called exactly once. Combined with the existing `double-tap back dismisses overlay` test (line 4657) to ensure no regression of the dblTap-with-handler path.
- **BGFX-03** — Two new tests in `system-buttons-dispatcher.test.ts`: (a) overlay-active + summonable autoShow deck → `SPLIT_ACTION_TYPE` with `pendingOverlayDeck` set, (b) overlay-active + no summonable → `OVERLAY_TOGGLE_TYPE` preserved. Plus updated `createInternalDecks` test (no collision with Phase 67-02 fixed positions).
- **BGFX-04** — A regression test in `OverlayToggleButton.test.tsx` mounting with `icon: '/path/to/chrome.svg'` and asserting the HTML contains a stable `data-sireno-overlay-icon="chrome"` attribute (not a hard-coded lucide class assertion).
- **BGFX-05** — A test in `util/clipboard.test.ts` that mocks `clipboardy.write` and `keyMacroProvider.send`, asserts call order (write first, paste second), and includes at least one test using a real keyMacro provider with a recording executor. Plus a v1.6 retrospective note in `REQUIREMENTS.md` correcting EMO-15 to "partially satisfied v1.6, fully satisfied v1.7."
- **BGFX-06** — A startup-detection test in `system/key-macro/get-provider.test.ts` asserting the pure-Wayland path returns an unsupported provider and emits a one-time warn log. A macOS-conditional assertion (skipped on non-darwin) in `loader.test.ts` for the chrome deck. Documentation update in `README.md`.
- **BGFX-07** — A test in `Bars.test.tsx` asserting `items[0].value === 75.4` renders as `"75"` by default. Plus a test in `system-status/index.test.ts` asserting the bundled formatter defaults to `mantissa: 0` for `bytes` and `count`.
- **FBFX-01** — Two new layout tests in `LabelValueList.test.tsx`: 2-line uses 2-column grid (assert via stable data attribute), 3-line uses `stack-3` (gap-1, smaller font). Existing 1-line and 4-line tests must still pass. `data-sireno-label-value-layout` attribute preserved.
- **FBFX-02** — A new `packages/cli/src/builtin-addons/value-display/index.test.ts` asserting: (a) addon exports `default`, (b) `apiVersion` is current, (c) at least one button's `render()` returns a non-null `ReactElement`, (d) the schema rejects an unknown key. Plus a fixture config under `packages/cli/fixtures/` so the new button is exercised in the loader test.
- **IMPFX-01** — A test in `addon/loader.test.ts` that points at the real `/works/test/test-sireno-deck` path (or a moved-equivalent under `fixtures/`) and asserts successful load. Plus a `README.md` paragraph with the explicit trust sentence.
- **IMPFX-02** — A test in `config/theme/theme.test.ts` that resolves the real on-disk test theme path and asserts the theme loads. Plus the same `README.md` trust paragraph (shared with IMPFX-01).

## 13. Adjacent code at risk (do not break)

From ARCHITECTURE.md §"Adjacent Code at Risk":

- `deck/__tests__/runtime.test.ts:4740-4771` — overlay-toggle test waits `DOUBLE_TAP_DELAY_MS` for system-back single-tap. **BGFX-02 fix must keep this green.** If the dbltap-no-callback branch is refactored to use the same debounce, the test will need to wait for the new debounce on the back button (which DOES have `onDblTap`), so timing should be unchanged.
- `deck/__tests__/system-buttons-dispatcher.test.ts:89-` — `getLastPositionSystemButton` dispatcher tests for the 5 cases from Phase 55-02. **BGFX-03 + 04 fixes** change the button shape (new `pendingOverlayDeck.icon` field, new `splitAction` config), so this test file needs an extension.
- `deck/__tests__/internal-settings-deck.test.ts` — Phase 67-02 fixed-position tests. **BGFX-01 fix** (if it touches `activateDeckSurface`) must not change the settings deck's position 0/1/2/4 contract.
- `system/key-macro/get-provider.test.ts:50-60` — pure-Wayland test. **BGFX-06 fix** will change the boolean semantics; the test must update to reflect "real Wayland session = `XDG_SESSION_TYPE=wayland` AND `WAYLAND_DISPLAY=wayland-0` is the `unsupported` path" (the inverse of the current test).
- `ui/surfaces/__tests__/Bars.test.tsx` and `__tests__/LabelValueList.test.tsx` — **BGFX-07 and FBFX-01** add new props; existing tests need to extend to cover the new defaults.
- `builtin-addons/system-status/index.test.ts` — system-status uses `displayMetric.formattedValue` (pre-formatted by numbro) for both bars and label-values. **BGFX-07 fix** must keep `displayValue` taking precedence.
- `builtin-addons/emoji-selector/index.test.ts:154-189` — paste unit tests with `vi.fn()`. **BGFX-05 fix** adds a new `keyMacroProvider.send` call; existing test mocks need a new method added.
- `config/loader.test.ts` — the loader test (39.5K) exercises addon loading, theme resolution, deck generation. **IMPFX-01/02** add external fixture tests next to this.
- `deck/__tests__/system-buttons-dispatcher.test.ts:51-87` — every test that constructs a `SystemButtonContext` must be updated to include the registry or icon-resolver callback that **BGFX-04** introduces.

---

## Sources

- `.planning/research/STACK.md` — 250 lines. Stack impact of each v1.7 item; HID/keystroke injection architecture; numbro + clipboardy version audit; 3rd-party loader + theme paths.
- `.planning/research/FEATURES.md` — 563 lines. Detailed bug + feature cards with root cause file:line, acceptance criteria, out-of-scope calls, REQ-ID allocation, open questions.
- `.planning/research/ARCHITECTURE.md` — 424 lines. Component boundaries (new modules + extended modules), data flow per bug, build order, integration points, API version decision, verification strategy, adjacent code at risk.
- `.planning/research/PITFALLS.md` — 310 lines. Per-FX risk cards with L×I scoring, cross-cutting risks (CC-1..CC-5), warning signs, prevention strategies, top 5 risks, open questions, plan-phase acceptance checklist, explicit out-of-scope.
