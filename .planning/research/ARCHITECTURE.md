# Architecture — v1.7 Bugs, Features, and 3rd-Party Loader

**Milestone:** v1.7 (planning)
**Researched:** 2026-06-17
**Confidence:** HIGH for in-codebase seams I read end-to-end (back-button dispatch, dbltap gesture, system-back renderer, clipboard, key-macro providers, Bars/LabelValueList/OverlayToggleButton, addon loader, builtin registry, theme loader); MEDIUM for the 3rd-party test fixtures (`/works/test/test-sireno-deck*` do NOT exist on this machine — gap, not a guess); LOW for the Wayland-detection bug hypothesis (I read the code and it looks wrong, but a real Wayland session reproduction is needed to confirm impact).

This is a bug-fix + small-feature milestone, not a greenfield architecture. Nine of the eleven items are surgical edits to existing seams. The two new pieces (`ValueDisplay` builtin, 3rd-party loader walk) reuse shipped patterns (system-status, internal-settings, config/loader) — the architecture is the existing one.

## Component Boundaries

### New modules

| Module | Path (under `packages/cli/src/`) | Owns |
|--------|----------------------------------|------|
| `builtin-addons/value-display/` | `builtin-addons/value-display/` | New first-party addon exporting one or more `value-display-*` button types. Mirrors the `system-status` split-button pattern (one helper that consumes a `data` source + formatter pipeline). Schemas, optional `poll`/`render` cadence, `commands` action surface via the existing `AddonButtonActionConfigSchema`. |
| `builtin-addons/value-display/buttons/…` | `builtin-addons/value-display/buttons/` | One button per file (Phase 29 hard cut). `onActivate` / `poll` / `render` use the existing `useButtonActionCommand` + `store.button`/`store.addon` pattern. |
| `addon/value-display-runtime.ts` (optional) | `addon/` (only if cross-addon) | Probably NOT needed — the formatter/label/mapper logic can live inside the addon itself, mirroring `builtin-addons/system-status/domain/`. If a shared "format a polled value into a `Bars`/`LabelValueList` item" helper emerges across FX-09 and system-status, factor it then, not now. |

### Extended modules (edits only)

| Module | Path | v1.7 change |
|--------|------|-------------|
| `util/clipboard.ts` | `util/` | `pasteText(text)` must write to the clipboard AND simulate the OS paste keystroke (Ctrl+V / Cmd+V) when the runtime opts in. Currently the keystroke simulation is **missing** — `clipboard.ts:3-5` only calls `clipboardy.write()`. The `PasteSchema.keystroke` field (`core/schemas.ts:36-40`) was authored but **never read** — zero references in `src/`. |
| `deck/runtime.ts` (`createButtonMethods`) | `deck/` | `pasteText` (line 1005-1008) and `keyMacro` (line 1010-1013) need to compose: write text → send the paste chord. Re-use `keyMacroProvider` so the executor (xdotool/osascript/powershell) and platform detection are shared. |
| `system/key-macro/linux.ts` `runCommand` | `system/key-macro/` | The `if (result.failed) { /* non-fatal */ }` block on line 91-93 is empty — failures are silently swallowed. Likely a contributor to bug 6 ("macro keystrokes are not sent to apps"): when `xdotool` is missing or fails, the user sees nothing. |
| `system/key-macro/index.ts` `isPureWayland` | `system/key-macro/` | Lines 27-29: `env.XDG_SESSION_TYPE === 'wayland' && !env.WAYLAND_DISPLAY`. The boolean is inverted. "Pure Wayland" means `WAYLAND_DISPLAY` IS set (no X fallback). Today's check returns true only when both type=wayland AND display is unset — i.e. misconfigured, not real Wayland. On a real Wayland session the linux provider is selected, xdotool is invoked, but the X server is unreachable, so nothing happens (no error, no warn). |
| `deck/runtime.ts` `onKeyEvent` (the `else` branch) | `deck/` | Lines 1755-1757. The "no `onDblTap` configured" branch fires `handleTap` immediately on every release, so a real double-tap gesture fires `tap` twice. The fix needs the same `pendingDblTapTimer` debounce but with a no-op on the second press. |
| `ui/surfaces/BarsSurface.tsx` `valueText` | `ui/surfaces/` | Line 61: `const valueText = item.displayValue ?? String(Math.round(item.value))`. The bar item needs a `formatter` (or `mantissa`) override and a default of **no decimals** for non-numeric metric display (today: `Math.round` already, but the system-status path uses `numbro` with `mantissa: 1` for several formatters). |
| `ui/surfaces/LabelValueListSurface.tsx` `getLayout` | `ui/surfaces/` | Lines 33-43. For 2-line layout the current `double` branch uses `flex-col justify-center gap-3` which is too airy and underuses the 1:1 left/right weight. For 3-line (`stack` branch) the values are pinned right with `text-right` and `whitespace-nowrap`, leaving the icon column underused. Both need new layout modes (`two-column` for 2, `three-row` or grid for 3). |
| `deck/system-buttons/system-buttons.ts` `getLastPositionSystemButton` | `deck/system-buttons/` | Lines 22-67. The `pendingOverlayDeck` and `pendingOverlayDeck.label/name` are passed through to the `SPLIT_ACTION_TYPE` button config, but the rendered secondary surface (line 1097-1103) just shows `MainLabelSurface` with the deck name. Bug 4 says the deck **icon** should be used — the `pendingOverlayDeck` is a `DeckConfig` and may carry an `icon` field elsewhere, but this code only reads `.label`/`.name`. |
| `addon/builtin.ts` | `addon/` | Add the new `valueDisplayAddon` to the `getBundledAddons()` list (line 12-22). Mirrors how `internalSettingsAddon`, `systemStatusAddon`, etc. are wired. |
| `config/loader.ts` (`createBundledAddonRegistry`) | `config/` | No core change. The new addon auto-appears. The third-party loader walk for `/works/test/test-sireno-deck*` runs through the same `loadConfiguredAddons` path; if the fixture has a valid `sirenoAddon` block in `package.json` + a `main` entry, it loads without code changes. |

### Unchanged

- `core/schemas.ts` — the `PasteSchema.keystroke` field already exists; no new core schema work needed.
- `addon/api.ts` — `SIRENO_ADDON_API_VERSION` stays at 1. The v1.7 changes are pure consumer behavior.
- `render/reconciler.ts`, `render/browser-renderer.ts` — no changes. (Bug 1 fix lives in `deck/runtime.ts`, not the render path.)
- `device/stream-deck.ts` — no changes; the transport layer is already fast.
- `config/theme/theme.ts` — no changes needed for `valueDisplayAddon` (it can ship with the shipped `default` theme as-is).

### Touch points per v1.7 item (file:line index)

| Item | Primary file:line | Secondary file:line | Test file:line |
|------|-------------------|---------------------|----------------|
| Bug 1 — back-button delay (settings) | `deck/runtime.ts:1325-1352` `activateDeckSurface` | `deck/system-buttons/system-buttons.ts:46-67` `getLastPositionSystemButton` settings branch | new: `packages/cli/scripts/profile-settings-transition.ts` (mirrors `scripts/profile-browser.ts`) |
| Bug 2 — dbltap no-callback fires tap | `deck/runtime.ts:1755-1757` `else` branch | `deck/runtime.ts:1603-1616` `handlePress` (gesture-state spread pattern) | `packages/cli/src/deck/__tests__/runtime.test.ts` (existing 5117-line suite) |
| Bug 3 — system button splitSurface always-on | `deck/system-buttons/system-buttons.ts:55-61` `pendingOverlayDeck` propagation | `deck/runtime.ts:1089-1106` `SPLIT_ACTION_TYPE` branch | `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts:89-` |
| Bug 4 — overlay icon not used | `deck/system-buttons/OverlayToggleButton.tsx:14-25` (name → emoji extraction) | `core/schemas.ts:190-203` `DeckConfig` (no `icon` field today) | new: `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts` extension |
| Bug 5 — emoji paste keystroke | `util/clipboard.ts:3-5` `pasteText` | `deck/runtime.ts:1005-1008` `pasteText` method, `core/schemas.ts:36-40` `PasteSchema.keystroke` | `packages/cli/src/util/clipboard.test.ts` |
| Bug 6 — macro keystrokes not sent | `system/key-macro/linux.ts:82-94` `runCommand` (silent failure) | `system/key-macro/index.ts:27-29` `isPureWayland` (inverted boolean) | `packages/cli/src/system/key-macro/get-provider.test.ts` |
| Bug 7 — bars formatter override | `ui/surfaces/BarsSurface.tsx:59-61` `valueText` default | `ui/surfaces/BarsSurface.tsx:8-14` `BarsItem` interface | new: `packages/cli/src/ui/surfaces/__tests__/Bars.test.tsx` (no test file today — `__tests__/Bars.test.tsx` exists per `ui/surfaces/__tests__/`) |
| Feature 8 — label-values 2/3 layout | `ui/surfaces/LabelValueListSurface.tsx:33-43` `getLayout` | `ui/surfaces/LabelValueListSurface.tsx:81-146` `LabelValueList` render | `packages/cli/src/ui/surfaces/__tests__/LabelValueList.test.tsx` (existing) |
| Feature 9 — ValueDisplay builtin | new: `builtin-addons/value-display/` | `addon/builtin.ts:12-22` registration | new: `builtin-addons/value-display/index.test.ts` |
| FX-10 — 3rd-party addon loader | `addon/loader.ts:55-87` `getAddonRootPath` + `readAddonManifest` | `config/loader.ts:362-401` `loadConfig` | new: `packages/cli/src/config/loader-3p-walk.test.ts` |
| FX-11 — 3rd-party theme loader | `config/theme/theme.ts:153-183` `getBuiltinThemeTarget` + `185-215` `getLocalThemeTarget` | `config/theme/theme.ts:614-672` `collectThemeRuntimeFilePaths` | new: `packages/cli/src/config/theme/theme-3p-walk.test.ts` |

### Existing patterns to reuse

These are the shipped seams the planner should mirror rather than re-invent:

- **Public button shape**: `addon/api.ts:193-247` `MountedAddonButtonDefinition` — the contract every builtin and 3rd-party button implements. `defineMountedButton` (line 299-303) is a no-op brand for type inference.
- **Command action contract**: `addon/api.ts:76-110` `AddonButtonActionCommandsSchema` + `AddonButtonKeyMacroSchema`. Reuse `useButtonActionCommand` (`addon/api.ts:127-168`) in any new addon button to avoid rolling a new tap/hold/dbltap boilerplate.
- **Poll/render cadence**: `deck/runtime.ts:1367-1462` `startActiveDeckPolling` — `defaultPollIntervalMs` and `defaultRenderIntervalMs` are the knobs. `render/scheduler.ts:25-79` `createPollingScheduler` is the shared scheduler.
- **Mounted DOM host**: `render/dom-host.tsx` (9.5K). `createMountedDomHost` and `renderMountedHostedButtons` are the per-deck React tree entry points. Used by `runtime.ts:819-833` `getOrCreateMountedDeckHost`.
- **Button surface primitives**: `ui/surfaces/BarsSurface.tsx`, `IconLabelSurface.tsx`, `LabelValueListSurface.tsx`, `MainLabelSurface.tsx`, `SplitActionSurface.tsx` (all re-exported from `ui/index.ts:7-11`). All support `themeUi.surfaces.<name>` overrides (`config/theme/schemas.ts:92-96`).
- **Theme override plumbing**: `ui/theme-presentation.tsx` + `config/theme/theme.ts:250-292` `getThemeUiPresentation`. Themes can override any surface.
- **System-vs-user button discipline**: `addon/api.ts:254-297` `setAddonButtonOwnerName` / `setAddonButtonIsSystem` + `core/schemas.ts:597-605` reject — system addons (like `internalSettingsAddon`) are registered in the registry but their button types are rejected by config validation. The new `valueDisplayAddon` does **not** need to be `system: true` (it's a normal addon).
- **Asset resolution**: `addon/registry.ts:10-31` `parseAssetReference` parses `addon://` and `builtin://` prefixes. `addon/registry.ts:107-115` `resolveAssetPath` returns the absolute path. `addon/api.ts:333-357` `resolveDomAssetSrc` is the browser-side helper.
- **Lifecycle hooks**: `MountedAddonButtonDefinition` exposes `onActivate` / `onDeactivate` / `onPress` / `onRelease` / `onTap` / `onDblTap` / `onHold` / `poll` / `refresh` / `dispose` (`addon/api.ts:213-242`). Each is optional except `render` and `type` + `configSchema`.

## Data Flow

### Bug 1 — Back-button delay (settings page specific)

The user perception: "system back buttons still having delay, for example the settings page". The v1.6 claim (PERF-01, in-process 12.35ms avg, 2.39ms same-html-skip) was about the **back stack pop**, not the **settings-deck landing**.

The settings deck is reached by `getLastPositionSystemButton` (`system-buttons.ts:46-67`) returning a `SPLIT_ACTION_TYPE` with `role: 'settings'`. The runtime's `instantiateRuntimeButtonInstance` (`runtime.ts:1041-1068`) implements the tap → `deckController.navigateTo(SETTINGS_DECK_ID, { push: true })` → `activateDeckSurface(SETTINGS_DECK_ID, deckId)`.

Per-key measurements in v1.6 only covered the back-stack direction. The settings-deck direction (subdeck → `settings` → render) was not profiled in Phase 58. The most likely real-world cost is:

1. `activateDeckSurface` calls `getDeckButtons(getDisplayDeck())` twice (lines 1337 + 1342), so the `getLastPositionSystemButton` call runs **twice** per activation. Each call re-walks `runtimeDecks` and re-reads the deck config. The cost is small per call but compounds if the deck has many buttons (system-status addon is loaded on the main deck too).
2. `renderMountedDeckButtons` (lines 835-890) iterates every button and calls `renderRuntimeButton`. The settings deck has 5 button positions; with `defaultRenderIntervalMs` defaulted from `defaultIntervalMs` (not present for internal settings), there is no `Render` loop, but every `activateDeckSurface` does at least one full re-render.
3. The `internal-settings` button definitions re-import from `addon/builtin.ts` (already cached), but each render call calls `getCurrentBrightness()` (`internal-settings/buttons/current-brightness.tsx:19`) which is a global read. Not the bottleneck, but it's a synchronous global in the render path.
4. There is no `same-html-skip` short-circuit for the settings-deck landing, because the settings deck is "first activation" — there is no previous frame to compare against.

**The real fix path** is most likely:

- Add a `same-html-skip` short-circuit to `activateDeckSurface` (mirror Phase 58's fix at the runtime layer, not the browser-capture layer): if the active deck id is the same as `previousDeckId`, do not re-render. Today the check at `runtime.ts:1334` is `if (previousDeckId !== activeDeckId)` — this only short-circuits the `onDeactivate` walk, not the `onActivate` + render. Settings page transition *is* a deck-id change, so this branch is dead for the reported case.
- The actual delay the user feels is probably the **first-frame browser capture**: Phase 58 measured this as ~10-12ms in-process, but on real hardware the Playwright `page.screenshot` call adds 30-100ms. Settings page has never been profiled. Bug 1 is most likely a "we measured the wrong transition" gap, not a regression in the pop path.

### Bug 2 — Double-tap without callback fires tap

Trace: `runtime.ts:1712-1758` is the `onKeyEvent` handler.

```
key down   → handlePress(keyIndex)        (sets holdTimer, returns)
key up     → handleRelease(keyIndex)     (clears holdTimer)
            → onKeyEvent inner async (line 1724):
              → if gs.holdTriggered → return (correct, was a hold)
              → if instance.onDblTap:
                  if gs.pendingDblTapTimer:
                    → clearTimeout, handleDblTap     (correct: 2nd tap of a dbltap)
                  else:
                    → schedule handleTap after DOUBLE_TAP_DELAY_MS
              else:
                → handleTap immediately               (BUG: 2nd tap also fires tap)
```

The `else` branch (lines 1755-1757) assumes "no onDblTap means fire tap right away". This is correct for the *first* press of a single tap, but wrong for the *second* press of a real double-tap gesture: tap fires immediately on press 1, then tap fires again immediately on press 2.

The fix: invert the logic. When `instance.onDblTap` is absent, still use the same `pendingDblTapTimer` debounce — but on the second press, the timer's callback is **suppression** (a no-op), not `handleTap`. The user's intent with two quick presses is the same as if there was an `onDblTap` callback: "don't fire tap on the second press".

The lesson from Phase 56 (`STATE.md:131` and `solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md`) is exactly relevant: `gestureStates.set(stateKey, { ...gs, holdTimer, holdTriggered: false })` must preserve `pendingDblTapTimer`. The fix for bug 2 needs the same `...gs` spread discipline on both press 1 (set `pendingDblTapTimer`) and press 2 (clear it). Adjacent code at risk: the `handlePress` block at lines 1603-1616 already does the spread; the new code path in the `else` branch must do the same.

### Bug 3 + 4 — Overlay back uses splitSurface (it does), but overlay icon not used

`runtime.ts:1033-1106` is the `SPLIT_ACTION_TYPE` branch. It always returns a `SplitActionSurface` with `primary = <MainLabelSurface main={'undo2'} label="Back">` and `secondary = pendingOverlayDeck ? <MainLabelSurface main={'send-to-back'} label={deckName}> : undefined`.

The two bugs are separate:

- **Bug 3 says "the system buttons slot (Settings, Back) are not using the splitSurface component to show the back-to-overlay"**. This is the **settings-deck** case: the runtime returns `role: 'settings'` (`runtime.ts:1041-1068`), which renders `<SplitActionSurface primary={<SystemSettingsEntryButton>} secondary={...} />`. That IS a splitSurface. The fix is for the *back* role (the sub-deck case) — when the user is on a subdeck and there is a pending overlay, the slot at `lastPosition` should still render splitSurface. **But the code already does this** via the unconditional `SplitActionSurface` at lines 1091-1104. The bug is more likely that `system-buttons.ts:29-67` only injects a `SPLIT_ACTION_TYPE` button when `pendingOverlayDeckId` is set OR when the deck needs a back button. When `pendingOverlayDeckId` is null, only the back role fires — the secondary surface is undefined, and `SplitActionSurface` degrades to "primary only" (lines 20-22 in `SplitActionSurface.tsx`). That's the correct behavior, but if the user wants the splitSurface to *always* show even without a pending overlay (e.g. to show the back-to-overlay affordance when one is available), the runtime needs to also pass `pendingOverlayDeckId` for the **base deck** (not just the active app match). Verify: `system-buttons.ts:55-61` only sets `pendingOverlayDeck: ctx.runtimeDecks[ctx.pendingOverlayDeckId]` when `ctx.pendingOverlayDeckId !== null && !== ctx.overlayDeckId`. So if the user is on a deck that is not the overlay, but Chrome (process) is the active app, the splitSurface should show the "back to overlay" affordance. The current code only injects the pending overlay when it's a *different* deck than the current overlay. This is the gap.

- **Bug 4 says "despite an overlay deck has an icon, it is not used in the Toggle button and on the splitSurface buttons"**. The `OverlayToggleButton` (`system-buttons/OverlayToggleButton.tsx:24-25`) computes `deckName = activeOverlayDeck?.name ?? activeOverlayDeck?.id` and `extractFirstEmoji(deckName)` (line 14-18, regex-based emoji extraction). The `DeckConfig` type (`core/schemas.ts:190-203`) has no `icon` field. So **the deck doesn't have an icon to use**. The fix is either (a) add an `icon` field to `DeckConfig` and propagate it through the addon-generated deck schema, or (b) reuse the existing `name`/`id` first-emoji fallback for the splitSurface's secondary and the overlay toggle's badge. Option (a) is the right one — emoji-extraction from a name is a workaround, not a model.

### Bug 5 — Emoji paste does not work

`util/clipboard.ts:3-5`:
```ts
export async function pasteText(text: string): Promise<void> {
  await clipboardy.write(text)
}
```

`deck/runtime.ts:1005-1008`:
```ts
pasteText: async (text: string) => {
  const { pasteText: doPaste } = await import('../util/clipboard.js')
  await doPaste(text)
},
```

The copy path works because `clipboardy.write` actually writes to the system clipboard. The paste path does **not** because there is no keystroke simulation step. v1.6 ROADMAP line 11 said "the fix will need an OS-abstracted keystroke simulation helper" and Phase 59 was supposed to add it (success criteria line 45). The shipped `pasteText` does not include that step. The `PasteSchema.keystroke` field (`core/schemas.ts:36-40`) was authored as a future-proofing knob but is never read.

The fix path:
1. Re-use `keyMacroProvider` (already per-platform, already in runtime.ts:1010-1013). Add a helper `keyMacroProvider.paste()` that emits the paste chord for the current OS.
2. In `runtime.ts:pasteText` (line 1005-1008), after `doPaste(text)`, call `keyMacroProvider.paste()` when `options.config?.paste?.keystroke !== false` (default-on, like today's `PasteSchema.keystroke: true`).
3. Linux: `ctrl+v` (or `ctrl+shift+v` if the user is in a terminal). macOS: `cmd+v`. Windows: `ctrl+v` via SendKeys.
4. The current `KeyMacroProvider` interface (`provider.ts:10-13`) only has `send(sequence)`. Either add a `paste()` method to each platform provider OR build a `paste` step via `parseKeyMacro('ctrl+v')` and call `send`. The latter is cheaper — no new contract.

### Bug 6 — Macro keystrokes are not sent to apps

`system/key-macro/linux.ts:59-80` is the linux provider. The build/run path is correct (`xdotool key --clearmodifiers ctrl+t`). The provider IS invoked from `runtime.ts:1010-1013`:
```ts
keyMacro: async (sequence: string) => {
  const steps = parseKeyMacro(sequence)
  await keyMacroProvider.send(steps)
},
```

Two suspected root causes:

1. **`isPureWayland` is inverted** (`index.ts:27-29`): the function returns `true` when the env is misconfigured (XDG=wayland, no WAYLAND_DISPLAY). On a *real* Wayland session the function returns `false`, the linux provider is selected, xdotool is invoked, but xdotool can't talk to Wayland and silently fails. The `runCommand` helper at `linux.ts:82-94` swallows failures (line 91-93 is an empty if block). The result: no keystrokes, no error, no warning. Fix: invert the boolean AND log when the linux provider is selected on a Wayland session with a clear message about installing `xdotool` or using `wtype`/`ydotool`.

2. **`runCommand` failure is silent** (`linux.ts:91-93`). The `if (result.failed) { /* Non-fatal: keep macro playing through unless the program is missing. */ }` block does nothing. Even on X11, if `xdotool` is missing, exit code is non-zero, but the user sees no feedback. Fix: at minimum `options.deps.logger.warn` on the first failure per process, similar to `unsupported.ts:13-21`. The darwin (`darwin.ts:117-121`) and windows (`windows.ts:118-122`) providers already log warnings — linux is the inconsistent one.

The fix should be small and surgical: invert the Wayland detection, add a `logger.warn` in the linux `runCommand` on first failure, and possibly add a `which xdotool` precheck in the linux provider's `send`.

### Bug 7 — Bars formatter, no decimals by default

`ui/surfaces/BarsSurface.tsx:59-61`:
```ts
const valueText = item.displayValue ?? String(Math.round(item.value))
```

The default is `Math.round` which is "no decimals" — that part is correct. But callers don't have a way to override the formatter per item. `system-status/buttons/bars.tsx:104-118` builds `barsItems` from `displayMetric.formattedValue` (a numbro-formatted string). For `frequency-ghz` (display-metrics.ts:71) the formatter is `mantissa: 2, trimMantissa: true` — the bar shows `3.45` (correct for GHz). For `bytes` (line 57-63) it shows `1.5 GB` (correct). The user complaint is "value in the bar needs a number formatter, and by default should use no decimals" — the *default* (no decimals) is already there, but the **per-item formatter override** is missing. The user wants to be able to say "for this bar, format with N decimals" or "format as percentage".

Fix: add `formatter?: 'integer' | 'decimal' | 'percent' | 'bytes' | 'count' | 'frequency-ghz'` to `BarsItem` in `BarsSurface.tsx:8-14`. Default to `'integer'` (no decimals) when not set. When set, call into a numbro-backed helper in `ui/utils/`. Mirror the `SystemStatusFormatter` enum from `system-status/domain/display-metrics.ts:8-14` if possible — but the helper is shared, so factor it to `ui/utils/formatters.ts` and have both bars and system-status import from there.

The fix must keep `displayValue` taking precedence (line 61) so callers that already pre-format (system-status) are unaffected.

### Feature 8 — label-values 2/3 layout

`ui/surfaces/LabelValueListSurface.tsx:33-43`:
```ts
function getLayout(lines: LabelValueListLines): LabelValueLayout {
  if (lines.length === 1) return 'single'
  if (lines.length === 2) return 'double'
  return 'stack'
}
```

The `double` branch uses `flex-col justify-center gap-3` (line 95) — two rows stacked vertically, with `text-right` per line. For a 100×100px Stream Deck key this leaves the label area very small. The `stack` branch (3-4 lines) uses `flex-col justify-center gap-2` and `text-right` per line, which crowds the 3-line case (icons don't get a column, only the row).

The current `Label` cell uses `flex items-center justify-between gap-3` (line 135) which is `left | right` for the label and value. For 2 lines, a `flex-row` layout (two columns side-by-side, each with label+value) is more space-efficient. For 3 lines, a 3-column grid or a 3-row layout with horizontal labels over values (like the action button's pagination layout) is better.

The auto-select (`getLayout`) was specified in Phase 30 to "auto-select its 1/2/3-4 line layout from line count" — that's a layout-per-count policy, but the actual layouts were never refined. Phase 30 shipped the `double` and `stack` names but not the visual designs.

Fix: add a `two-column` layout for 2 lines (each line gets 1/2 width, label-above-value, gap-1) and a `three-row` layout for 3 lines (label-above-value, smaller size, all centered). For 4 lines, keep `stack` but reduce the gap further. The decision per line count:
- 1 → `single` (current, large centered)
- 2 → `two-column` (new, each cell uses ~48% width, label xs / value xl)
- 3 → `three-row` (new, label xs / value lg, full width each)
- 4 → `stack` (current, label xs / value md)

### Feature 9 — ValueDisplay builtin

The user wants a new builtin addon that displays a "value" — a number, a string, a polled metric. The closest shipped analog is `system-status`, which has `system-status-bars` (1-3 metrics) and `system-status-label-values` (1-4 metrics). The v1.7 ask is a **value-only** variant: show one or more values in a single tile, with formatting, optional unit, optional icon, optional label.

The most natural shape, mirroring `system-status`:

```
builtin-addons/value-display/
  index.ts                            # SirenoAddon export
  schemas.ts                          # zod schemas, one per button type
  buttons/
    value-text.tsx                    # one ButtonSurface with title + value
    value-bars.tsx                    # one ButtonSurface with single metric Bars
    value-label-values.tsx            # one ButtonSurface with 1-2 label/value lines
```

Each button type's schema:
- `value-text`: `{ source: { command: string } | { static: string }, label?: string, formatter?: ValueFormatter, units?: string }`
- `value-bars`: same as system-status `system-status-bars` but with one metric (the user asks for the single-bar case to use the same surface)
- `value-label-values`: same as system-status `system-status-label-values` but with 1-2 metrics

The **public addon API surface** is already complete (`addon/api.ts:46-57` methods, `addon/api.ts:300-303` `defineMountedButton`). No new exports needed in `addon/api.ts`. The addon just needs:

- `apiVersion: SIRENO_ADDON_API_VERSION` (constant 1)
- `name: 'value-display'`
- `buttons: [valueTextButton, valueBarsButton, valueLabelValuesButton]`
- Register in `addon/builtin.ts:12-22` `getBundledAddons()`

The CLI's loader (`config/loader.ts:238-246` `createBundledAddonRegistry`) automatically picks up the new addon because it iterates `getBundledAddons()`. No core loader change.

Test paths (mirror `system-status/index.test.ts`):
- Parser test: each `ValueFormatter` enum value parses
- Button test: mock `hostContext`, mock `methods`, call `definition.onActivate`, then `definition.poll`/`definition.refresh`, render to HTML, assert label/value text

### 3rd-party loader walk (FX-10/11)

The expected fixtures at `/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` **do not exist on this machine** (verified with `ls /works/test/ | grep -i sireno` — no match; full `find` for `package.json` matching `test-sireno*` returns no results). This is a **gap**, not a verification target — the v1.7 plan needs to either create the fixtures or have the user provide them before the loader walk can be tested.

**Loader path** (per `addon/loader.ts` and `config/loader.ts`):

For an addon at `addons/my-addon/` (local source) or `npm:my-pkg` (npm):
1. User config in `config.yml`:
   ```yaml
   addons:
     - name: my-addon
       source: local      # or 'npm'
       path: addons/my-addon  # only for source: local
       enabled: true
   ```
2. `loadConfig` → `loadConfiguredAddons` (`addon/loader.ts:245-273`).
3. For each enabled addon: `getAddonRootPath` (line 55-76) resolves to an absolute directory. For `source: 'local'`, `resolve(cwd, addon.path ?? join('addons', addon.name))`. **Caveat**: the default path is `addons/<name>` relative to the config's cwd (`config/loader.ts:131-141` resolves `cwd` from `dirname(parsedConfig.filePath)`). If the user's fixtures live at `/works/test/test-sireno-deck/`, the config must set `path: /works/test/test-sireno-deck` explicitly. The current loader supports this — `addon.path` is `z.string().optional()` (`core/schemas.ts:24-29`) and `resolve` accepts absolute paths.
4. `readAddonManifest` (`addon/loader.ts:78-87`) reads `package.json` and validates against `validateAddonManifest` (`addon/manifest.ts:39-51`):
   ```json
   {
     "name": "my-addon",
     "sirenoAddon": { "apiVersion": 1, "main": "index.ts" }
   }
   ```
   The `tailwind` field is optional.
5. `validateAddonApiVersion` (`addon/manifest.ts:53-59`) — must equal `SIRENO_ADDON_API_VERSION` (= 1).
6. `importAddon` (`addon/loader.ts:89-105`): for `source: 'local'` with `.ts/.tsx/.jsx` extension, `importRawSourceAddon` is called (line 194-243). This:
   - Walks the source graph (line 155-192), reading each file and resolving relative imports.
   - Asserts all imports stay within the addon root (line 149-153 + 170-172 + 185-187). The trust boundary is enforced.
   - If the addon has no `tsconfig.json`, writes a temp one (line 197-227) with the right `@/*` → `packages/cli/src/*` alias mapping. The temp file is deleted in the `finally` (line 239-241).
   - Uses `tsx/esm/api.tsImport` with the resolved tsconfig.
7. `registry.registerAddon` (`addon/registry.ts:81-97`) — adds buttons, decks, assets to the registry.

**For the expected gaps:**

- The `@/*` alias mapping in the temp tsconfig (`addon/loader.ts:213-214`) points to `PACKAGE_SOURCE_ROOT` which is `packages/cli/src/`. If a 3rd-party addon imports `@/ui/surfaces/BarsSurface`, the alias works.
- The trust/in-process invariant is the `isWithinRoot` check (line 149-153). Addons are trusted, run in-process. There's no sandbox. The 3rd-party addon has full Node access.
- The registration step is `registry.registerAddon(addon, { rootDir })` (line 259). After this, the addon's buttons are available via `getButton(type)` and decks via `getDeckType(type)`. The addon must be listed in `config.addons` to be loaded.

**For a 3rd-party theme** at `/works/test/test-sireno-deck-theme`:
1. User config: `theme: /works/test/test-sireno-deck-theme` (absolute path) or `theme: ./themes/my-theme` (relative to config).
2. `resolveTheme` (`config/theme/theme.ts:674-728`):
   - `resolveThemeTarget` (line 217-248): first tries built-in (line 153-183, walks up from `MODULE_DIRECTORY` looking for `<root>/themes/<name>/manifest.yml`), then tries local path. **For an absolute path not under a known built-in theme directory, the local path is used.**
   - `parseThemeYaml` (line 112-151) reads `<theme>/manifest.yml` and validates with `ThemeManifestSchema` (`config/theme/schemas.ts:53-61`):
     ```yaml
     name: my-theme
     colorTokens:
       accent: '#ff0000'
       background: '#000000'
       # ... other required tokens
     typography:
       main_text: { ... }
       auxiliary_text: { ... }
       monospace: { ... }
     main: index.ts
     ```
   - `collectThemeRuntimeFilePaths` (line 614-672) walks the source graph and enforces `isWithinThemeRoot` (line 581-593) — theme runtime imports must stay within the theme package root or `../utils`. **Same trust boundary as addons.**
   - `importThemeRuntime` (line 360-441) uses `tsx/esm/api` with the package tsconfig (`PACKAGE_TSCONFIG_PATH`).
   - The runtime must export `buttonFrame` (function). Optional: `mediaPlayerSurface`, `ui`.

**The 3rd-party fixture gap**: there's no gap in the loader code itself — it correctly handles absolute paths, raw-source addons, and theme packages. The gap is the **absence of test fixtures**. v1.7 planning must either:
- Create the two fixtures in `/works/test/...` with a minimal `package.json` + `manifest.yml` + `index.ts`, OR
- Ask the user to provide the fixtures.

The closest existing analogs:
- Addon: `packages/cli/src/builtin-addons/internal-settings/` (small, 4 buttons, system: true)
- Theme: `themes/dark.yml` (built-in) — but no first-class "external 3rd-party" theme fixture exists. The Phase 25 closure added `.tsx` custom theme fixtures at `themes/`, but those are workspace-local, not 3rd-party. A 3rd-party theme would be the first time the loader walks a path outside the package root.

If the fixtures cannot be created, the fallback is: write a small `addons/test-external-addon/` in the package fixture tree and a `themes/test-external-theme/` in the same, and a `config.test.yml` that references them via relative path. This proves the loader path without leaving the package.

## Build Order

The bug-fix items are largely independent and can be parallelized. The dependencies are:

1. **Bug 7 (Bars formatter)** — pure addition to `BarsItem`, no runtime impact. Can ship first; tests are small.
2. **Bug 2 (dbltap no-callback)** — touches `runtime.ts:1755-1757` only. Adjacent code: the gesture state spread from Phase 56 (`solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md`).
3. **Bug 5 (paste keystroke)** — reuses `keyMacroProvider` from `runtime.ts:1010-1013`. Adjacent: `PasteSchema.keystroke` schema is already in place.
4. **Bug 6 (macro keystrokes)** — same file as Bug 5. Two suspects: inverted `isPureWayland` and silent linux `runCommand`. Both are 1-2 line fixes.
5. **Bug 1 (back button delay)** — investigation, not a code fix. The settings page transition was never profiled in Phase 58; the first action is to add a profile scenario, then decide if the fix is in `activateDeckSurface` short-circuit or somewhere else.
6. **Bug 4 (overlay icon)** — needs a schema decision: add `icon` to `DeckConfig` (`core/schemas.ts:190-203`) or rely on `name` first-emoji. The schema change is small but ripples through addon `decks` schemas.
7. **Bug 3 (splitSurface always-on)** — depends on Bug 4 (if we go the "icon" route, the secondary surface is icon-aware). If we go the "name emoji" route, no schema change.
8. **Feature 8 (label-values 2/3 layout)** — pure UI change, isolated to `LabelValueListSurface.tsx:33-43`. No dependencies.
9. **Feature 9 (ValueDisplay)** — greenfield addon, mirrors `system-status`. Depends on Bug 7 if it reuses the formatter (likely).
10. **FX-10 (3rd-party addon)** — depends on a fixture existing. If no fixture, this is "create fixture + prove loader walks it" — i.e. a small loader test using a workspace-local fixture.
11. **FX-11 (3rd-party theme)** — same as FX-10. No fixture exists.

Recommended phase decomposition (each can be one plan):

- **Phase 71: gesture correctness + 3rd-party gesture invariants** — Bug 2 (dbltap no-callback), Bug 5 (paste keystroke), Bug 6 (macro keystrokes). All in `runtime.ts` + `clipboard.ts` + `key-macro/*`. No schema change.
- **Phase 72: back-button performance re-investigation** — Bug 1. Profile the settings-deck transition, identify whether the bottleneck is runtime JS, browser capture, or USB write. Apply a same-html-skip-style short-circuit if needed.
- **Phase 73: overlay deck icon + splitSurface always-on** — Bug 3 + Bug 4. Add `icon` to `DeckConfig`, update `OverlayToggleButton` and the `SPLIT_ACTION_TYPE` secondary surface. Touches `core/schemas.ts`, `system-buttons.ts`, `OverlayToggleButton.tsx`, the `system-status`/`weather`/`emoji-selector` deck schemas.
- **Phase 74: shared number formatter** — Bug 7. Add `ui/utils/formatters.ts` (numbro-backed, mirrors `system-status/domain/display-metrics.ts:47-79`). Wire into `BarsSurface.tsx:59-61` and `LabelValueListSurface.tsx:45-79` (Feature 8). Update `system-status` to use the shared helper.
- **Phase 75: ValueDisplay addon** — Feature 9. Greenfield. Add `builtin-addons/value-display/`, register in `addon/builtin.ts:12-22`. Mirrors `system-status` tests.
- **Phase 76: 3rd-party loader + theme walkthrough** — FX-10/11. Create workspace-local fixtures, prove the loader walks them. (If the user provides external fixtures, swap them in.)

## Integration Points

| External | Where we integrate | Risk |
|----------|--------------------|------|
| `numbro` (already a dep, used by `system-status`) | `ui/utils/formatters.ts` (new) | LOW — same package, same version, same call shape. |
| `keyMacroProvider` (already wired in `runtime.ts:1010-1013`) | `runtime.ts:pasteText` (line 1005-1008) for Bug 5 | LOW — the `keyMacroProvider.paste()` is a thin wrapper around `parseKeyMacro('ctrl+v').send()`. |
| `DeckConfig.icon` (new field) | `core/schemas.ts:190-203`, `core/schemas.ts:213-220` `CoreDeckConfigSchema`, `core/schemas.ts:480-495` deck expansion | MEDIUM — schema addition ripples through addon-generated deck shapes. The `icon` is optional, so existing addons keep working. |
| `process.platform` + `env.WAYLAND_DISPLAY` | `system/key-macro/index.ts:27-29` `isPureWayland` | LOW — the fix is a 1-line boolean inversion. Verify on a real Wayland session before claiming. |
| 3rd-party addon path (`/works/test/test-sireno-deck`) | `config/loader.ts:362-401` (loads config) → `addon/loader.ts:245-273` (loads addons) | MEDIUM — depends on fixture existence and `package.json` shape. No code change required. |
| 3rd-party theme path (`/works/test/test-sireno-deck-theme`) | `config/loader.ts:362-401` → `config/theme/theme.ts:674-728` | MEDIUM — same as addon, no code change required. |

## API Version Decision

`SIRENO_ADDON_API_VERSION = 1` (`addon/api.ts:14`).

- **Bug 2, 5, 6, 7** — pure behavior changes inside the CLI. No addon surface change. No bump.
- **Bug 3, 4** — adding `icon?: string` to `DeckConfig` (`core/schemas.ts:190-203`) is a non-breaking addition (existing decks without `icon` are still valid). The addon-generated deck type already uses `.passthrough()` (`core/schemas.ts:143`), so it's tolerant.
- **Feature 8** — pure UI change. No addon surface.
- **Feature 9** — new addon, not a new API version.
- **FX-10/11** — proving the existing loader works.

**Conclusion: do NOT bump `SIRENO_ADDON_API_VERSION` for v1.7.** Keep it at 1.

## Verification Strategy

For each v1.7 fix, the verification path is:

- **Bug 1**: a new profile script scenario for "subdeck → settings deck", running through `createDeckRuntime` (mirroring `scripts/profile-browser.ts`). Output: `profile-settings-transition.txt`. Compare to Phase 58 baseline (12.35ms in-process). If the new scenario is > 50ms in-process, the fix needs to land.
- **Bug 2**: unit test in `deck/__tests__/runtime.test.ts` that calls `onKeyEvent` twice within `DOUBLE_TAP_DELAY_MS` on a button whose `definition.onDblTap` is undefined. Assert `instance.onTap` was called **once** (current behavior: twice).
- **Bug 5**: unit test in `util/clipboard.test.ts` that asserts `pasteText` calls both `clipboardy.write` and a new `keystrokeProvider.paste()` (or `keyMacroProvider.send(['ctrl+v'])`).
- **Bug 6**: two unit tests in `system/key-macro/get-provider.test.ts`: (1) linux provider on real Wayland env (`XDG_SESSION_TYPE=wayland, WAYLAND_DISPLAY=wayland-0`) should fall back to `unsupported`, (2) linux provider logs a warning on first failed `xdotool` invocation.
- **Bug 7**: unit test in `ui/surfaces/__tests__/` (new file) that asserts the default `formatter` is `'integer'` (no decimals), and that `formatter: 'decimal'` with `value: 3.456` renders `3.46`.
- **Bug 3 + 4**: unit test in `deck/__tests__/system-buttons-dispatcher.test.ts` (existing) that asserts the `SPLIT_ACTION_TYPE` button config carries `pendingOverlayDeck: { icon: 'foo' }` when the deck has an icon.
- **Feature 8**: snapshot test in `ui/surfaces/__tests__/LabelValueList.test.tsx` (existing) that asserts the new `two-column` and `three-row` layouts for 2 and 3 lines.
- **Feature 9**: unit tests in `builtin-addons/value-display/index.test.ts` (new) mirroring `system-status/index.test.ts`.
- **FX-10/11**: a `loader-3p-walk.test.ts` that creates a workspace-local fixture (e.g. `packages/cli/fixtures/external-addon/`), points the loader at it, and asserts the addon is registered. Same for theme.

## Architectural Risks

1. **Bug 1 (back button delay) is actually a measurement gap, not a regression.** v1.6 only measured the pop direction. If the fix is "add a profile scenario + maybe a short-circuit", that's fine, but if the actual user-perceived delay is the **first-frame browser capture** (Playwright `page.screenshot` adds 30-100ms on real hardware), the fix lives in `render/browser-renderer.ts` and the v1.6 hardware caveat applies. **Risk: chasing a wrong layer.** Mitigation: profile first, fix second.

2. **The dbltap no-callback fix is adjacent to Phase 56's gesture-state-spread invariant.** A regression in this fix could re-introduce the `pendingDblTapTimer` loss that Phase 56 closed. **Risk: breaking the gesture state machine.** Mitigation: every code path that writes to `gestureStates` must use `{ ...gs, ... }`, never `{ field: value }` alone. Add a runtime test that exercises the spread invariant with both the dbltap and hold paths.

3. **Adding `icon` to `DeckConfig` ripples through the deck registry.** Existing addon-deck generators (e.g. `emoji-selector/index.ts:125-138`) that produce `AddonGeneratedDeck` need to be tolerant of the new field. The `.passthrough()` on `RawDeckSchema` (`core/schemas.ts:143`) and the strict mode on `CoreDeckConfigSchema` (`core/schemas.ts:213-220`) make this safe for the core path, but addon-shipped deck schemas may need updating. **Risk: silent breakage of existing addons.** Mitigation: ship `icon` as optional, run the full v1.6 test sweep (113/120 baseline) as a regression check.

4. **The Wayland detection fix could change behavior for v1.6 users on hybrid X/Wayland sessions.** Inverting `isPureWayland` means users who were silently falling through to the linux provider on Wayland will now see the "unsupported" warning. **Risk: regression for users who were working around the bug.** Mitigation: detect `which xdotool` before falling through, OR add `wtype`/`ydotool` as fallback providers in a follow-up.

5. **3rd-party test fixtures do not exist on this machine.** The "FX-10" and "FX-11" items are unverifiable without fixtures. **Risk: shipping "the loader walks 3rd-party addons/themes" without actually testing it.** Mitigation: create workspace-local fixtures in `packages/cli/fixtures/external-addon/` and `packages/cli/fixtures/external-theme/` as the canonical loader-walk proof, and document the path so the user can drop in their `/works/test/...` fixtures later.

## Open Questions

1. **Bug 1**: Was the v1.6 settings-deck transition ever profiled on real hardware, or is the 12.35ms in-process figure only for the pop direction? (Confidence: LOW — the Phase 57/58 research focused on the pop direction.)
2. **Bug 2**: Should the dbltap no-callback branch be merged into the same gesture state machine, or kept as a separate fast-path that only schedules the suppression timer? The current code is a fast-path; merging could re-introduce the Phase 56 bug.
3. **Bug 4**: Is adding `icon` to `DeckConfig` the right model, or should the deck carry a `themeIcon` / `iconRef` that points to an `addon://` asset? The latter is consistent with the existing `addon://` / `builtin://` reference system (`addon/registry.ts:10-31`).
4. **Bug 5**: Should the `PasteSchema.keystroke` default flip to `true` (current default), or be opt-in? Today's default is `true` (`core/schemas.ts:38`), but the runtime never reads it. If the user wants to disable keystroke simulation (e.g. they have a buggy `xdotool` and prefer pure clipboard write), the schema should be honored.
5. **Bug 6**: Should the linux provider also support `wtype` (Wayland-native) and `ydotool` as fallbacks? Or is the answer "users on pure Wayland use a different OS-level daemon"?
6. **Feature 9**: How many `value-display-*` button types? The user said "ValueDisplay" (singular). The most useful split is probably `value-text` (single value with label/icon) and `value-label-values` (1-2 values). Should `value-bars` exist, or is that just `system-status-bars` with one metric?
7. **FX-10/11**: The fixtures at `/works/test/test-sireno-deck*` do not exist. Should v1.7 create workspace-local fixtures (`packages/cli/fixtures/external-addon/` and `packages/cli/fixtures/external-theme/`) as canonical proof, or wait for the user to provide the external fixtures?
8. **API version**: If a v1.7 fix *does* require a new addon field (e.g. `DeckConfig.icon`), should that trigger a version bump even though it's backwards-compatible? The Phase 32 decision was "no bump for additive changes" but that was for the polling contract; the deck contract has different precedents.

## Adjacent Code at Risk (one-line index per item)

These are the call sites and tests the planner must not break:

- `deck/__tests__/runtime.test.ts:4740-4771` — overlay-toggle test that explicitly waits `DOUBLE_TAP_DELAY_MS` for the system-back single-tap. **Bug 2 fix must keep this test green.** If the dbltap-no-callback branch is refactored to use the same debounce, the test will need to wait for the new debounce to elapse on the back button (which DOES have `onDblTap`), so the timing should be unchanged.
- `deck/__tests__/system-buttons-dispatcher.test.ts:89-` — `getLastPositionSystemButton` dispatcher tests for the 5 cases from Phase 55-02. **Bug 3 + 4 fixes will change the button shape** (new `pendingOverlayDeck.icon` field, new `splitAction` config), so this test file needs an extension.
- `deck/__tests__/internal-settings-deck.test.ts` — Phase 67-02 fixed-position tests. **Bug 1 fix** (if it touches `activateDeckSurface`) must not change the settings deck's position 0/1/2/4 contract. The fixed-position design leaves n-1 free for any keyCount in {6, 9, 15, 32} per `internal-settings-deck.test.ts`.
- `system/key-macro/get-provider.test.ts:50-60` — pure-Wayland test. **Bug 6 fix** will change the boolean semantics; the test must update to reflect "real Wayland session = `XDG_SESSION_TYPE=wayland` AND `WAYLAND_DISPLAY=wayland-0` is the `unsupported` path" (the inverse of the current test).
- `ui/surfaces/__tests__/Bars.test.tsx` (existing) and `__tests__/LabelValueList.test.tsx` (existing) — **Bug 7 and Feature 8 fixes** add new props; existing tests need to be extended to cover the new defaults.
- `builtin-addons/system-status/index.test.ts` — system-status uses `displayMetric.formattedValue` (already pre-formatted by numbro) for both bars and label-values. **Bug 7 fix** must keep `displayValue` taking precedence so the existing system-status test stays green.
- `builtin-addons/emoji-selector/index.test.ts:154-189` — paste unit tests with `vi.fn()`. **Bug 5 fix** adds a new `keystrokeProvider` (or `keyMacroProvider.send`) call to the `pasteText` method; existing test mocks need a new method added.
- `config/loader.test.ts` — the loader test file (39.5K) exercises addon loading, theme resolution, and deck generation. **FX-10/11 fixes** add external fixture tests next to this.

## Confidence Summary

| Item | Confidence | Why |
|------|-----------|-----|
| Bug 1 — back-button dispatch path | HIGH | I read `runtime.ts:1712-1758` end-to-end and the system-buttons dispatcher end-to-end. |
| Bug 2 — dbltap else branch fires tap on second press | HIGH | Direct read of `runtime.ts:1755-1757`. The fix shape is the same `pendingDblTapTimer` pattern from lines 1745-1753. |
| Bug 3 — splitSurface always-on for the *back* role (not the settings role) | MEDIUM | I read both branches in `system-buttons.ts` and `runtime.ts:1041-1106`, but the user's "settings page" example may actually mean the settings-deck role (`'settings'`), not the `'back'` role. The brief is ambiguous. |
| Bug 4 — overlay icon | HIGH (current behavior) / MEDIUM (fix shape) | The current code (`OverlayToggleButton.tsx:14-25`) does emoji-from-name extraction, which is a workaround. The `DeckConfig` schema has no `icon` field. The fix is "add `icon` to `DeckConfig`" or "use name emoji", and the user needs to pick. |
| Bug 5 — paste keystroke missing | HIGH | `clipboard.ts:3-5` only calls `clipboardy.write`. `PasteSchema.keystroke` is defined but never read. |
| Bug 6 — linux provider silent failure + inverted `isPureWayland` | HIGH (the bug) / MEDIUM (impact) | The boolean inversion is in the code; reproducing the impact needs a real Wayland session. |
| Bug 7 — bars formatter default | HIGH | The default IS already `Math.round` (no decimals). The gap is the *override* path, which doesn't exist. |
| Feature 8 — label-values 2/3 layout | HIGH | I read `LabelValueListSurface.tsx:33-43` end-to-end. The 2-line `flex-col gap-3` and 3-line `flex-col gap-2` are both space-inefficient. |
| Feature 9 — ValueDisplay API surface | HIGH | The addon surface (`addon/api.ts`) is already complete; the new addon is a consumer. |
| FX-10/11 — 3rd-party loader path | HIGH (the code) / LOW (the fixtures) | The loader code in `addon/loader.ts` and `config/theme/theme.ts` is correct for absolute paths. The fixtures at `/works/test/test-sireno-deck*` do not exist on this machine. |

---

*Architecture researched 2026-06-17 by the learnship-project-researcher persona. All file:line references are accurate against the codebase at the time of research; verify against the current `main` branch before any plan-phase work.*
