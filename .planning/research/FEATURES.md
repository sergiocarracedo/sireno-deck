# Features — v1.7 (Polishing & 3rd-Party Ecosystem)

**Milestone:** v1.7 — Polishing & 3rd-Party Ecosystem (planning)
**Researched:** 2026-06-17
**Confidence:** HIGH on root-cause file:line for every bug; MEDIUM on FX-09 helper shape (mirrors the existing `useButtonActionCommand` contract); LOW on FX-10/11 (the 3rd-party fixture paths do not exist on disk yet — see Open Questions).

v1.7 is a focused bug-fix + small-feature + ecosystem-validation milestone. It does not introduce new milestones of work; it shores up the seams that real-world use of v1.6 surfaced. Eight of the eleven items are bugs. The remainder ship a single new builtin addon (`ValueDisplay`) and two 3rd-party ecosystem fixtures.

## Architecture invariants this milestone must preserve

These are the load-bearing contracts the v1.6 milestone established. Every v1.7 item must respect them — do not silently change them under the guise of a bug fix.

- **Shared command-action contract** (`packages/cli/src/addon/api.ts:76-168`): `useButtonActionCommand` returns `{ onTap, onDblTap, onHold }` that all built-in command-capable buttons share. FX-09 must use this, not a parallel helper.
- **SplitActionSurface as the dual-action primitive** (`packages/cli/src/ui/surfaces/SplitActionSurface.tsx:11-52`): one diagonal `/` split with primary + optional secondary; theme-overridable through `useThemeUiPresentation().surfaces.splitAction`. FX-03 must use it for the "back + overlay summon" case; FX-04 must render the deck's `icon` inside its `secondary` slot.
- **System back button is always a `SPLIT_ACTION_TYPE` runtime instance** (`packages/cli/src/deck/system-buttons/system-buttons.ts:29-67`): the dispatcher returns either `OVERLAY_TOGGLE_TYPE` (currently overlaid) or `SPLIT_ACTION_TYPE` (with `pendingOverlayDeck` populated for the summon path).
- **Gesture state for double-tap lives in `runtime.ts:1739-1757`**: tap is delayed by `DOUBLE_TAP_DELAY_MS` (400ms) ONLY when `instance.onDblTap` is truthy. This is the core of FX-01 and FX-02.
- **Keystroke simulation lives in `keyMacroProvider.send`** (`packages/cli/src/system/key-macro/index.ts:46-64`): Linux uses `xdotool key --clearmodifiers`, macOS uses `osascript`, Windows uses `SendInput`. `methods.pasteText` is the public addon seam and currently delegates to `packages/cli/src/util/clipboard.ts:3-5` which **only writes to the clipboard** — it does not send the paste keystroke. This is the root cause of FX-05 and is the same root cause that blocks FX-06 for any non-chrome-overlay flow that tries to verify the macro path.
- **Addon manifests declare `apiVersion` matching the package's `SIRENO_ADDON_API_VERSION`** (`packages/cli/src/addon/api.ts:14`). FX-10 must use the current version (1). FX-11 is a theme manifest — see `packages/cli/src/themes/default/manifest.yml:1-10` for the canonical shape (themes use `manifest.yml`, not `package.json`).

---

## Bugs (BGFX-01..BGFX-07)

### BGFX-01 — System back button still feels sluggish on the settings page

- **ID:** BGFX-01
- **Title:** System back button still feels sluggish on the settings page
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As a user, I want the system back button (including from the settings deck) to feel instant, so that navigating back to my previous deck never feels sticky or laggy.

**Current behavior:** The runtime is registering `onDblTap` for every system back button instance — even when there is no actual overlay context to summon or dismiss. `packages/cli/src/deck/runtime.ts:1176-1184` always returns an `onDblTap` from `createSystemBackHandlers`, and the gesture dispatcher in `packages/cli/src/deck/runtime.ts:1739-1754` waits `DOUBLE_TAP_DELAY_MS` (400ms) before firing `onTap` whenever `instance.onDblTap` is truthy. The settings deck is the most visible victim: it is the deepest "real" deck users navigate to, and its n-1 reserved slot is `SPLIT_ACTION_TYPE` with role `'settings'`, which also routes through `createSystemBackHandlers` (`packages/cli/src/deck/runtime.ts:1071-1087`) and therefore carries the same 400ms delay.

Phase 58 made the post-tap path fast (browser capture loop skip-when-unchanged, 12.35ms in-process), but the 400ms pre-tap debounce window inside the gesture handler was never re-examined.

**Desired behavior:** The system back button (settings or sub-deck) fires `onTap` as soon as the key is released, with no perceptible delay. The summon-overlay affordance (dismiss or restore on double-tap) only applies when there is an actual overlay to summon — i.e. when `pendingOverlayDeck` is populated or `lastDismissedOverlayDeckId` is set.

**Acceptance criteria:**
- A back tap from the settings deck is on-screen in <200ms total (gate at gesture-release + render-emit).
- A back tap from a sub-deck (no overlay context) is on-screen in <200ms.
- When a `pendingOverlayDeck` IS set, double-tap still summons within the 400ms window.
- The existing `restoreStack` semantics are unchanged for the sub-deck → main flow.
- New focused regression test (`packages/cli/src/deck/runtime.test.ts`): system back instance without overlay context has `onDblTap` either omitted or marked as fast-path; the dispatcher fires `handleTap` synchronously on release.

**Out of scope:**
- Bumping `SIRENO_ADDON_API_VERSION` for a `meta: { fastTap: true }` flag — fix it inside the dispatcher.
- Changing `DOUBLE_TAP_DELAY_MS` itself (keep the 400ms window for genuine dbl-tap detection on user buttons).

**Open questions:**
- Should the fast-path apply to ALL system buttons (including when overlay is currently shown — where the user pressing the overlay-toggle button usually means "go back to base"), or only when there is no overlay at all? Phase 66 wired the overlay toggle to handle both single and double-tap, so the fast-path can be safely applied there too — confirm with the user during plan-phase.
- Should we expose a per-deck `instant_tap` opt-out (e.g. for power users who want the safety of a longer double-tap window on the settings button), or is "system back = always fast" the cleaner contract?

---

### BGFX-02 — Double-tap on a no-dbltap button fires the tap callback twice

- **ID:** BGFX-02
- **Title:** Double-tap on a button without a `dbltap` callback still fires the normal `tap` callback
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As a user, I want an accidental double-tap on a single-purpose button (no `dbltap` configured) to do nothing on the second press, so that I don't accidentally fire a key-macro, paste, or command twice.

**Current behavior:** `packages/cli/src/deck/runtime.ts:1739-1757` branches on `instance.onDblTap`: when truthy it sets a 400ms `pendingDblTapTimer`; when falsy it calls `handleTap` immediately. The falsy branch fires `onTap` for every release regardless of whether the user is mid-double-tap. The bundled `action` button (`packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx:41-64`) DOES define `onDblTap`, so its taps already get the 400ms delay, but EVERY other command-capable button that uses only the `tap` gesture gets a duplicate `onTap` on double-tap. Concrete visible damage:
- `methods.pasteText` (emoji) — two emojis get pasted (this was the original EMO-15 motivation in v1.5; EMO-15 fixed the keystroke simulation but not the double-fire).
- `methods.keyMacro` (chrome deck) — Ctrl+W fires twice, closing two tabs.
- `methods.runCommand` — same shell command runs twice.

**Desired behavior:** When the user double-taps a button that has no `onDblTap` handler, the gesture fires `onTap` once (or, by the user's wording in the v1.7 brief, "does nothing"). The fastest interpretation that keeps the gesture responsive is: detect a double-tap universally (regardless of whether `onDblTap` exists); if a second release lands within the window, suppress the second `onTap` and — if a handler exists — fire `onDblTap` instead.

**Acceptance criteria:**
- A single tap on a no-dbltap button still fires `onTap` immediately.
- A double-tap on a no-dbltap button fires `onTap` exactly once (the second release is suppressed).
- A double-tap on a button that DOES have `onDblTap` fires `onDblTap` and suppresses both `onTap` invocations (current behavior preserved).
- The 400ms window is unchanged.
- New regression test in `packages/cli/src/deck/runtime.test.ts`: two releases within window on a no-dbltap instance assert `onTap` called once, `onDblTap` never called.

**Out of scope:**
- Configurable per-button `double_tap_window_ms` (already a v2 candidate — `v1.6-REQUIREMENTS.md:162`).
- Touch / mouse events; this is hardware-only.

**Open questions:**
- User wording says "should do nothing" — does that mean "fire onTap once and ignore the second release" (recommended), or "fire nothing at all" (more aggressive — both releases are suppressed)? Confirm during plan-phase. The implementation cost is the same; the UX differs in whether a sloppy single tap is forgiving.

---

### BGFX-03 — System back / settings slot does not use SplitActionSurface to show "back to overlay" when an overlay is available

- **ID:** BGFX-03
- **Title:** System back / settings slot does not show the "back to overlay" affordance via SplitActionSurface when an overlay deck is available
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As a user, I want the system back button (and the settings entry button on the main deck) to show a split-surface with "back" on the primary side and "summon overlay" on the secondary side whenever an overlay deck could be summoned, so I can switch back to my chrome / spotify / etc. deck in one tap.

**Current behavior:** `packages/cli/src/deck/system-buttons/system-buttons.ts:29-67` (`getLastPositionSystemButton`) only populates `pendingOverlayDeck` from `findSummonableActiveAppDeckFor`, which is gated on `deck.autoShow !== false` (`packages/cli/src/deck/runtime.ts:1520-1530`). For the default `config.yml` chrome deck (`autoShow: true` in `config.yml:84`), `findSummonableActiveAppDeckFor` returns `null`, so the SplitActionSurface's `secondary` slot is left undefined even when chrome IS the foreground process and the user has dismissed its overlay. The runtime dispatcher at `packages/cli/src/deck/runtime.ts:1021-1041` shows a different problem: when the deck the user is ON is the overlay (e.g. the chrome deck itself), the system button is `OVERLAY_TOGGLE_TYPE`, which renders the bespoke `OverlayToggleButton` instead of `SplitActionSurface` — so even on the overlay, the "back" affordance is missing.

Net effect: the user dismisses the chrome overlay and has no first-class way to summon it back from the system button slot on the base deck.

**Desired behavior:** Two distinct fixes:
1. **On a base deck where an overlay could be summoned** (active-app process is foreground but overlay is currently dismissed): the system button is `SPLIT_ACTION_TYPE` with `pendingOverlayDeck` populated, so the SplitActionSurface's secondary shows the overlay's icon. The decision must include the `lastDismissedOverlayDeckId` fallback AND should not be gated on `autoShow: false` (i.e. even `autoShow: true` decks get a summon affordance when dismissed).
2. **On the overlay deck itself** (where the user IS looking at chrome): the system button at n-1 should ALSO be a `SplitActionSurface` — primary = "back to base deck" (`undo2` icon + "Back"), secondary = empty (no summon needed when you're already on the overlay).

**Acceptance criteria:**
- With chrome foreground and overlay currently visible, the chrome deck's n-1 button is `SPLIT_ACTION_TYPE` with role `back`, primary = `undo2` + "Back", no secondary.
- With chrome foreground and overlay dismissed (user pressed toggle), the main deck's n-1 button is `SPLIT_ACTION_TYPE` with `pendingOverlayDeck = chrome`, primary = `undo2` + "Back", secondary = chrome icon + "Chrome".
- Double-tap on the main deck's n-1 summons the chrome overlay.
- Loader / dispatcher tests in `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts` and `packages/cli/src/deck/runtime.test.ts` cover both cases.

**Out of scope:**
- Auto-showing the overlay without user action (the existing `autoShow` config remains the source of truth for that).
- Showing a "back to overlay" affordance on a deck that has no active-app match at all.

**Open questions:**
- When the user is on the overlay deck and presses the n-1 system button, should it (a) dismiss the overlay (today's behavior) or (b) navigate back in the underlying deck's history (new behavior — closes the overlay as a side-effect)? The current Phase 66 SplitActionSurface `onTap` for `OVERLAY_TOGGLE_TYPE` calls `dismissOverlay()`. Confirm with the user.
- Should the chrome deck's `autoShow: true` (config.yml:84) be flipped to `autoShow: false` so the user is in control? Or should the new summon affordance be wired for both? The brief is silent on this — flag it as a design decision.

---

### BGFX-04 — Active-app deck `icon` field is not used in the Toggle button or the SplitActionSurface secondary

- **ID:** BGFX-04
- **Title:** A deck's `icon` field is silently dropped — the OverlayToggleButton and SplitActionSurface secondary do not render it
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As a user, I want the icon I configured on an active-app deck (`icon: /path/to/chrome.svg`) to appear in the system back button's overlay-summon affordance and in the overlay toggle button, so I can see at a glance which app the secondary action will summon.

**Current behavior:** Two independent leaks in the same area:
1. **Schema:** `packages/cli/src/core/schemas.ts:213-219` (`CoreDeckConfigSchema`) is `.strict()` and does not include `icon`. The `RawDeckSchema` at line 132 is `.passthrough()`, so the YAML is accepted, but at `packages/cli/src/core/schemas.ts:480-495` the loader builds the `DeckConfig` by hand from named fields only — `deck.icon` is dropped on the floor. The `config.yml:81` `icon: /works/opensource/sireno-deck/assets/chrome.svg` is currently a no-op.
2. **Render:** `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx:22-26` derives the badge from `activeOverlayDeck.name` (extracting the first emoji) and the label from `activeOverlayDeck.name ?? activeOverlayDeck.id`. There is no read of `activeOverlayDeck.icon`. Similarly, `packages/cli/src/deck/runtime.ts:1092-1104` builds the SplitActionSurface's secondary with `MainLabelSurface` using only the deck's name as label; no icon source.

**Desired behavior:** `CoreDeckConfigSchema` accepts an optional `icon?: string` (same vocabulary as the per-button `icon` field — `icon://name`, `addon://name/asset`, `brand://slug`, or an absolute path). The loader plumbs it onto `DeckConfig`. `OverlayToggleButton` and the SplitActionSurface secondary both render the deck's icon (preferring `icon`, falling back to the first-emoji-of-name badge, falling back to the existing `layout-grid` lucide icon).

**Acceptance criteria:**
- `config.yml` chrome deck `icon: /works/opensource/sireno-deck/assets/chrome.svg` is preserved through the loader into the runtime `DeckConfig`.
- `OverlayToggleButton` renders the chrome SVG inside the badge (or as the main glyph) when the deck has an `icon`.
- The SplitActionSurface's `secondary` for a pending overlay uses the same icon.
- Loader test in `packages/cli/src/config/loader.test.ts` asserts `deck.icon` survives parse.
- `OverlayToggleButton.test.tsx` gains a "uses the deck's `icon` field" case (alongside the existing name-emoji cases).

**Out of scope:**
- Themes overriding the icon (current `useThemeUiPresentation().surfaces.splitAction` already covers that escape hatch).
- An icon for the locked deck or the settings deck (only active-app decks are in scope).

**Open questions:**
- Should the `icon` field be `DeckConfig.icon` (deck-level, what the brief asks for) or should it live under the overlay-specific config (e.g. a new `overlay: { icon }` sub-block)? The brief says "an overlay deck" so the user likely means a deck-level field. Confirm during plan-phase.
- The existing emoji-extraction from the deck name is a nice fallback for decks without an `icon`. Should it be promoted to a "first emoji + icon" combined badge, or kept as a fallback-only behavior?

---

### BGFX-05 — Emoji paste does not actually paste

- **ID:** BGFX-05
- **Title:** Tapping an emoji copies to the clipboard but does not paste into the active input
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As a user, I want tapping an emoji in the emoji selector to actually paste the emoji into my active text input, so the v1.6 EMO-15 fix works end-to-end and not just "writes the emoji to the clipboard and leaves the rest to the user."

**Current behavior:** `packages/cli/src/util/clipboard.ts:1-14`:
```ts
import clipboardy from 'clipboardy'

export async function pasteText(text: string): Promise<void> {
  await clipboardy.write(text)
}
```
This writes to the clipboard only — it does NOT call `keyMacroProvider.send(...)` with the OS-specific paste key. The `methods.pasteText` bridge at `packages/cli/src/deck/runtime.ts:1005-1008` just delegates to the above. The v1.6 milestone description in `PROJECT.md:23` claims EMO-15 ships "OS paste keystroke (Ctrl+V / Cmd+V) after clipboard write" but the implementation never landed that hookup. The 59-VERIFICATION and 69-VERIFICATION artifacts pass because they only assert that `methods.pasteText` was called (not that the keystroke was actually sent).

**Desired behavior:** `pasteText` writes the text to the clipboard, then awaits the OS-specific paste keystroke through the existing `keyMacroProvider`:
- Linux: `ctrl+v` (xdotool)
- macOS: `cmd+v` (osascript)
- Windows: `ctrl+v` (SendInput)

The helper needs access to a `KeyMacroProvider` — either injected (preferred, keeps the helper pure and testable) or reached through a top-level `getKeyMacroProvider` factory in the same module.

**Acceptance criteria:**
- Tapping an emoji on Linux with xdotool installed writes the emoji to the clipboard AND emits `xdotool key ctrl+v`.
- The unit test at `packages/cli/src/util/clipboard.test.ts` no longer passes just by asserting `clipboardy.write` was called; it must assert the keyMacroProvider received a `[{ key: 'v', modifiers: ['ctrl'] }]` (or `cmd+v` on darwin) step after the write.
- Runtime seam: `packages/cli/src/deck/runtime.ts:1005-1008` injects the `keyMacroProvider` into the clipboard helper.
- macOS / Windows parity tests use the same step-shape assertion against a stub provider.

**Out of scope:**
- Wayland native paste (`wl-copy` / `wtype` with `--paste`). Existing `createUnsupportedKeyMacroProvider` returns the "pure-wayland" stub; the bug is independent.
- Richer formats (HTML paste, multi-format) — single text paste only.

**Open questions:**
- The clipboard helper currently takes only `text`. Should it accept a `KeyMacroProvider` as a second parameter (call site gets explicit dependency) or should it use module-level state (cleaner call site, harder to test)? The runtime seam already owns the provider; passing it as a parameter is the cleanest seam.
- Should the helper wait a fixed delay between `clipboardy.write` and the keystroke? On some platforms the clipboard write is async; the existing 57-RESEARCH recommended a 30-50ms `wait` step. Confirm whether to embed that.

---

### BGFX-06 — `key_macro` keystrokes are not sent to apps

- **ID:** BGFX-06
- **Title:** `key_macro` keystrokes on the chrome (and any) action buttons are not actually delivered to the foreground app
- **Type:** bug
- **Confidence:** MEDIUM (depends on the platform adapter path being correct end-to-end)
- **User story:** As a user, I want a chrome-deck action button configured with `key_macro: 'ctrl+w'` to actually close the foreground tab, so the chrome overlay deck does what its label promises.

**Current behavior:** Trace of the path:
1. Config validates: `packages/cli/src/config/loader.test.ts:1305-1370` and the `BuiltinActionButtonSchema` (`packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx:10-25`) both accept the `key_macro` field.
2. Tap handler: `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx:29-40` calls `methods.keyMacro(macro)` for the `tap` gesture.
3. Method bridge: `packages/cli/src/deck/runtime.ts:1010-1013`:
   ```ts
   keyMacro: async (sequence: string) => {
     const steps = parseKeyMacro(sequence)
     await keyMacroProvider.send(steps)
   }
   ```
4. Provider selection: `packages/cli/src/deck/runtime.ts:409-411` falls back to `getKeyMacroProvider({ logger: { warn: () => {} } })` when no provider is injected.
5. Provider behavior: `packages/cli/src/system/key-macro/linux.ts:54-80` shells out to `xdotool key --clearmodifiers`; macOS and Windows go through their respective adapters.

The bridge itself looks correct. The two most likely failure modes are:
- The default `getKeyMacroProvider` is being created with an empty logger (`logger: { warn: () => {} }`) so user-side failures (e.g. `xdotool` not installed, X server unreachable) are silently swallowed by `runCommand`'s `// Non-fatal` comment at `linux.ts:92-93`. The user sees nothing happen.
- On Wayland sessions, the linux adapter still uses `xdotool` (which is X11-only). The `createLinuxKeyMacroProvider` does not consult the active Wayland state; the v1.6 EMO-15 verification only confirmed the code path, not that the keystroke actually arrived at the X server.

**Desired behavior:** Three things need to be true:
- When `keyMacroProvider.send` is invoked, the call surfaces real failures (non-zero exit, missing tool) to the user through the existing `showRuntimeButtonError` path. The "Non-fatal: keep macro playing through unless the program is missing" comment at `linux.ts:92-93` should at minimum log a structured warning at the runtime level.
- The default `getKeyMacroProvider` (when no provider is injected) uses the runtime's logger so failures show up in the user's pino output.
- Wayland detection is wired so the linux provider returns `createUnsupportedKeyMacroProvider(deps, 'pure-wayland')` when the active session is Wayland (the `getKeyMacroProvider` factory at `packages/cli/src/system/key-macro/index.ts:46-64` already has the right shape for this — it just needs the `os.variant` field populated for the linux branch).

**Acceptance criteria:**
- New unit test asserts that when `xdotool` returns non-zero, the runtime button error path fires with a stable code (e.g. `4201` — see `runtime.ts:1606-1622` for the pattern).
- New unit test asserts `getKeyMacroProvider` returns the pure-wayland provider when `os.variant === 'wayland'` (or the equivalent surface in the existing host-context variant detection).
- README / CHANGELOG entry: chrome deck keystrokes now log a warning when the underlying tool fails (or the session is unsupported).

**Out of scope:**
- Implementing a Wayland-native paste (wtype / wl-copy pipe). Out of scope per `v1.6-REQUIREMENTS.md:158-164` ("Active-app decks on pure Wayland sessions — requires XWayland").
- Verifying actual OS-level delivery on the CI runner. UAT on real hardware is the gate.

**Open questions:**
- Is the user observing the bug on Wayland specifically, or on X11 too? If X11, the most likely cause is a missing `xdotool` install; the right fix is the failure-surfacing change (not a new xdotool wrapper). Confirm before plan-phase.
- Does the v1.6 verification artifact for EMO-15 (which this code path is adjacent to) have evidence the keystroke is actually delivered, or only that the code path runs? If only the code path, that is itself a documentation defect to file as a sibling.

---

### BGFX-07 — `Bars` surface value has no formatter and no documented "no decimals" default

- **ID:** BGFX-07
- **Title:** The `Bars` component value is hardcoded to `Math.round` with no formatter support
- **Type:** bug
- **Confidence:** HIGH
- **User story:** As an addon author using the shared `Bars` surface, I want a per-item `value_format` (or equivalent) parameter so I can render percent, bytes, or frequency without pre-formatting the value into `displayValue` on the addon side, and I want the default to be no decimals (`Math.round`-equivalent) so the default behavior is consistent.

**Current behavior:** `packages/cli/src/ui/surfaces/BarsSurface.tsx:61`:
```ts
const valueText = item.displayValue ?? String(Math.round(item.value))
```
The `BarsItem` interface at line 8-14 only allows `displayValue?: string` (caller-formatted) or the `Math.round` fallback. There is no `formatter` or `value_format` field. The bundled `system-status-bars` addon has to use the `displayValue` escape hatch (see `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx:111` and `display-metrics.ts:55-78` for the formatter + numbro pattern it has to re-implement inline). Third-party addons writing a value of `12.34` get `12` (rounded) by default — which IS the "no decimals" behavior the user wants, but it is undocumented and impossible to override per item.

**Desired behavior:** Extend `BarsItem` with a `value_format?: 'percent' | 'bytes' | 'count' | 'frequency-ghz' | 'uptime' | 'none'` (same vocabulary as `SystemStatusFormatter` in `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts:8-13`). Default `'none'` (current `Math.round` behavior, no decimals). When `displayValue` is provided it still wins — that contract is preserved.

**Acceptance criteria:**
- `Bars` accepts an optional `value_format` per item.
- The default is `'none'` and renders as `Math.round(value)` (no decimals, current behavior).
- `'percent'` renders `value + '%'` (or uses numbro for `value/100` — pick one and document).
- `'bytes'` and `'count'` use the same numbro patterns as `formatMetricValue` in `display-metrics.ts:55-78`.
- `'frequency-ghz'` renders `value.toFixed(2) + ' GHz'`.
- `'uptime'` uses the same `formatUptime` helper.
- The numbro formatting is extracted to a shared helper in `packages/cli/src/ui/utils/` (e.g. `format-metric-value.ts`) so system-status and the new Bars formatter share one source of truth.
- `system-status-bars` is updated to set `value_format: 'percent'` etc. and stop pre-computing `displayValue`.
- New unit tests in `packages/cli/src/ui/surfaces/__tests__/Bars.test.tsx` for each formatter.

**Out of scope:**
- A new `formatter` field on the system-status schema (it already has one; this bug is about extending Bars to honor a formatter on its own).
- Custom user-defined formatters.

**Open questions:**
- The user's brief says "no decimals" as the default. Should `'none'` literally be `Math.round`, or should it be the `numbro` default mantissa-0 formatter? The former is what the current code does; the latter is more consistent. Recommend `'none' === Math.round` (current behavior preserved), but flag for confirmation.

---

## Features (FBFX-01..FBFX-02)

### FBFX-01 — Better `system-status-label-values` layout for 2 and 3 items

- **ID:** FBFX-01
- **Title:** `system-status-label-values` layout for 2 and 3 items needs a redesign
- **Type:** feature
- **Confidence:** MEDIUM (depends on user approval of the specific layout sketches)
- **User story:** As a user with 2-3 metrics configured on a `system-status-label-values` button, I want a layout that gives each metric enough breathing room and visual weight to be readable at a glance, instead of the current cramped vertical stack.

**Current behavior:** `packages/cli/src/ui/surfaces/LabelValueListSurface.tsx:33-43` selects one of three layouts:
- 1 line → `'single'` (centered, large `2xl` value)
- 2 lines → `'double'` (`flex-col` with `gap-3`, each row has label-left + value-right at `xl` size)
- 3-4 lines → `'stack'` (`flex-col` with `gap-2`, each row at `md` size)

The 2-line layout puts both rows in a single column with the label on the left and the value on the right (a "row" pattern). On a 72x72 Stream Deck button, this gives each label-value pair about 30px of vertical space, which is workable but the value is right-aligned to the button edge — easy to mis-read at a glance. The 3-line layout is a thinner stack with `md` text; users report the values get cut off when the label is long (e.g. "CPU Freq 4.20 GHz" vs "Memory Usage 12.3 GB").

**Desired behavior:** Two redesigned layouts, theme-overridable through `useThemeUiPresentation().surfaces.labelValueList`:
- 2 lines → `'pair'`: a 2-column grid (`grid-cols-2`), each cell with label-above-value (centered). The pair reads as a balanced 2-up summary.
- 3 lines → `'triple'`: a 3-column grid (`grid-cols-3`), each cell at `sm` size. For very long labels, falls back to label-above-value at `xs`. The 4-line case stays on the current `'stack'` layout.

The shared `LabelValueListLines` type already supports 1-4 lines, so no schema changes. `LabelValueList` itself becomes the dispatch point for the new layouts.

**Acceptance criteria:**
- New `'pair'` and `'triple'` layouts are exported and selectable.
- A `system-status-label-values` button with 2 metrics renders side-by-side; with 3 metrics renders in a 3-up grid; with 4 metrics stays on `'stack'`.
- Long labels truncate cleanly without clipping the value.
- A new theme surface hook `useThemeUiPresentation().surfaces.labelValueList` lets a theme override any of the four layouts.
- Existing tests still pass; new tests cover the 2- and 3-line layout DOM structure.

**Out of scope:**
- A 5+ line layout (the schema's `tuple` max is 4).
- Animated transitions between layouts when the count changes.

**Open questions:**
- Should the new layouts be opt-in (a `layout: 'pair' | 'triple' | 'auto'` knob on the addon config) or auto-selected from the line count? The brief implies "needs a better layout" — so auto-select. Confirm.
- 72x72 is tight for a 3-up grid at any readable size. Is a 3-up grid the right answer, or should 3 lines default to "1 big + 2 small" (1+2 layout)? User input needed.

---

### FBFX-02 — New builtin addon `ValueDisplay` (multi-value command-driven display)

- **ID:** FBFX-02
- **Title:** New builtin addon `ValueDisplay` — multi-value command-driven display with shared `LabelValueList` base + tap/dbltap/hold actions
- **Type:** feature
- **Confidence:** MEDIUM (helper shape mirrors `useButtonActionCommand`; specifics need user sign-off)
- **User story:** As an addon author / power user, I want a built-in button type that runs up to 3 shell commands, shows their values in the shared `LabelValueList` (one row per command), with per-value label, optional icon, formatter, and units, and lets me wire tap/dbltap/hold to commands — so I can build a single "system summary" button without writing a custom addon.

**Current behavior:** No such button type exists. The closest analog is `system-status-label-values` (`packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`), but it polls only the built-in canonical system metrics (CPU, RAM, fan, etc.) and cannot run arbitrary commands. Authors who want to display, e.g., a `curl https://api.example.com/...` value have to write a full addon that imports `getCanonicalSystemMetrics` semantics — a high bar.

**Desired behavior:** A new builtin addon `value-display` at `packages/cli/src/builtin-addons/value-display/` exposing a single button type `value-display` (and possibly an aliased `value-display-multi` for 2-3 values, or a single type with a 1-3 item tuple). The button:
1. Runs each per-value `command` through `methods.runCommand` on its poll cadence.
2. Formats the command's `stdout` with the per-value `formatter` (reuse the shared `formatMetricValue` from BGFX-07's extraction).
3. Renders the values in `LabelValueList` — same base component as `system-status-label-values` for visual consistency.
4. Accepts an optional top-level `commands: { tap, hold, 'double-tap' }` config (already in `AddonButtonActionConfigSchema` at `packages/cli/src/addon/api.ts:104-109`).
5. Reuses the existing `useButtonActionCommand` helper from `packages/cli/src/addon/api.ts:127-168` so the action contract is identical to every other command-capable built-in.
6. Max 3 values per button (per user brief).

**Proposed config schema (mirrors `system-status-label-values`):**
```ts
const ValueDisplayItemSchema = z.object({
  command: z.string().min(1),
  formatter: ValueDisplayFormatterSchema.optional(),  // 'percent' | 'bytes' | 'count' | 'frequency-ghz' | 'uptime' | 'none'
  icon: z.string().min(1).optional(),
  label: z.string().min(1),
  unavailable_label: z.string().min(1).optional(),
  units: z.string().min(1).optional(),
}).strict()

const ValueDisplayButtonSchema = z.object({
  ...AddonButtonActionConfigSchema.shape,
  values: z.union([
    z.tuple([ValueDisplayItemSchema]),
    z.tuple([ValueDisplayItemSchema, ValueDisplayItemSchema]),
    z.tuple([ValueDisplayItemSchema, ValueDisplayItemSchema, ValueDisplayItemSchema]),
  ]),
  poll_interval_ms: z.number().int().min(500).default(2_000),
  render_interval_ms: z.number().int().min(500).default(2_000),
}).strict()
```

**YAML usage example:**
```yaml
- position: 7
  type: value-display
  values:
    - command: "df -h / | awk 'NR==2 {print $5}' | tr -d '%'"
      label: Disk
      formatter: percent
      icon: 'icon://hard-drive'
    - command: "cat /proc/loadavg | awk '{print $1}'"
      label: Load
      formatter: count
    - command: "uptime -p | sed 's/^up //'"
      label: Up
      formatter: uptime
  commands:
    tap: 'btop'
    hold: 'systemctl status'
```

**Acceptance criteria:**
- New addon at `packages/cli/src/builtin-addons/value-display/` mirrors the file layout of `system-status/` (one `index.ts`, one `schemas.ts`, one `buttons/values.tsx`, plus a `domain/format.ts` for the formatter dispatch).
- `value-display` button is registered in the addon registry and listed in `packages/cli/src/addon/builtin.ts` alongside the other built-ins.
- Button accepts 1-3 values; schema rejects a 0-value or 4+ value config.
- The button renders with `LabelValueList` (so the v1.7 layout improvements apply automatically).
- `commands.tap | hold | 'double-tap'` are honored through the shared `useButtonActionCommand` helper — no bespoke gesture handler in the addon.
- The formatter uses the same shared helper extracted in BGFX-07.
- New unit tests in `packages/cli/src/builtin-addons/value-display/buttons/values.test.tsx` covering: 1-value render, 3-value render, command output propagation, formatter application, action commands (tap/hold/dbl-tap).

**Out of scope:**
- 4+ value display (the brief says max 3; if the user wants more, they compose two buttons).
- Conditional / templated commands (the existing `{{ host.os.type }}` host-context placeholder is the only template engine — same as everywhere else).
- A custom render override on the addon (the brief says "same base component as system-status-label-values" — keep it that way).
- Bumping `SIRENO_ADDON_API_VERSION` (the new builtin is additive and uses the existing 1.6 schemas).

**Open questions:**
- Should the formatter vocabulary be the same as `SystemStatusFormatter` (percent / bytes / count / frequency-ghz / uptime) or a wider set (e.g. `'date'`, `'duration'`, `'currency'`, `'temperature'`)? Recommend reusing the existing set for consistency; flag for confirmation.
- The brief mentions a "helper for tap/dbltap/hold action commands" — is that the existing `useButtonActionCommand` (already in `packages/cli/src/addon/api.ts:127-168`), or does the user want a NEW helper that, e.g., exposes the value index to the command? The existing helper does NOT pass per-value context. If the user wants `tap` to receive which value was visible, that's a new helper. Confirm during plan-phase.
- Should the addon also be exposed as a deck type (e.g. `value-display-deck` that generates N value-display buttons for a list of metrics)? The brief is silent; recommend NOT — keep scope to a single button type.
- The button type string: `value-display` is consistent with the addon name. Confirm with the user.

---

## Improvements (IMPFX-01..IMPFX-02)

### IMPFX-01 — Third-party addon fixture at `/works/test/test-sireno-deck`

- **ID:** IMPFX-01
- **Title:** Ship a third-party addon fixture at `/works/test/test-sireno-deck` that loads against the production loader with zero core changes
- **Type:** improvement
- **Confidence:** LOW (fixture does not exist on disk yet — see Open Questions)
- **User story:** As a maintainer, I want a real third-party addon checked in outside this repo that I can install through `config.yml` (`source: local, path: /works/test/test-sireno-deck`) and have it work end-to-end, so I can validate the addon loader against a non-shipping, non-builtin addon and catch regressions that the bundled addons would mask.

**Current behavior:** The codebase has comprehensive addon unit tests in `packages/cli/src/addon/loader.test.ts`, `manifest.test.ts`, and `registry.test.ts`, all using either inline definitions or a mocked `tmp/builtin-addons/...` path. There is no actual third-party addon checked in at a stable path that can be loaded by a `config.yml` against the production loader. As a result, regressions in the loader's tsx import, the `addon://` asset resolver, the manifest validation, or the `apiVersion` gate can ship undetected if the bundled-addon path is the only thing exercising the seam.

**Desired behavior:** A minimal but real third-party addon at `/works/test/test-sireno-deck` with:
- `package.json` declaring:
  ```json
  {
    "name": "test-sireno-deck",
    "version": "0.1.0",
    "sirenoAddon": {
      "apiVersion": 1,
      "main": "./index.ts"
    },
    "tailwind": { "safelist": [] }
  }
  ```
- `index.ts` (default export of a `SirenoAddon` with at least one button and one asset, demonstrating `addon://test-sireno-deck/icon.svg`).
- One TSX button file that imports from `sireno-deck-cli` (the public package surface) and renders an `IconLabelSurface` so the addon proves the public API contract.
- `assets/icon.svg` (any minimal svg).
- A `README.md` describing how to install it: add to `config.yml` under `addons` with `source: local` and `path: /works/test/test-sireno-deck`, set `enabled: true`.
- A committed `config.yml` snippet (NOT in the repo's own `config.yml`; the fixture's own README) that shows the install.

**Acceptance criteria:**
- The fixture loads successfully through `pnpm cli:dev start --config <path-to-test-config>` with the addon enabled in config.
- `package.json` `sirenoAddon.apiVersion === 1` (the value of `SIRENO_ADDON_API_VERSION` in `packages/cli/src/addon/api.ts:14`).
- The loader test in `packages/cli/src/config/loader.test.ts` gains a "loads a real third-party addon" case that points at `/works/test/test-sireno-deck` and asserts the button type appears in the registry.
- If the fixture requires a config change outside the addon folder, that change is documented in the addon README, not in the repo's `config.yml`.

**Out of scope:**
- Publishing the fixture to npm.
- Bumping `SIRENO_ADDON_API_VERSION`.
- A "3rd-party addon authoring" tutorial (the fixture's README is enough for v1.7).

**Open questions (CRITICAL — see also end of doc):**
- The path `/works/test/test-sireno-deck` does NOT exist on disk as of 2026-06-17. The milestone audit expects the fixture to be created as part of this milestone. The v1.7 plan-phase MUST create this directory and populate it. Flag explicitly: is the fixture to live INSIDE the repo (e.g. `fixtures/third-party/test-sireno-deck`) or at the `/works/test/test-sireno-deck` path? The brief says the absolute path — confirm whether that is a hard requirement (because it must work outside the repo's cwd) or a typo.
- If the absolute path is the requirement, the loader test in `packages/cli/src/config/loader.test.ts` will only pass on machines where `/works/test/test-sireno-deck` exists. We will need either a `process.env.SIRENO_TEST_ADDON_PATH` override or a test-only copy. Recommend the latter (a fixture copy in `packages/cli/fixtures/third-party/test-sireno-deck`) with a CI smoke test that asserts the absolute path resolves when present.
- Does the user want the fixture's button to demonstrate a specific capability (e.g. command-driven, host-context templated) or just be a "loads and renders" smoke test? Recommend the former so the fixture is useful, not just a happy-path check.

---

### IMPFX-02 — Third-party theme fixture at `/works/test/test-sireno-deck-theme`

- **ID:** IMPFX-02
- **Title:** Ship a third-party theme fixture at `/works/test/test-sireno-deck-theme` that loads against the production theme loader with zero core changes
- **Type:** improvement
- **Confidence:** LOW (fixture does not exist on disk yet)
- **User story:** As a maintainer, I want a real third-party theme checked in outside this repo that I can install through `config.yml` (`theme: test-sireno-deck-theme`) and have it work end-to-end, so I can validate the theme loader against a non-shipping theme and catch regressions that the bundled default theme would mask.

**Current behavior:** The default theme lives at `packages/cli/src/themes/default/` (with `manifest.yml`, `index.ts`, `ButtonFrame.tsx`, `theme.css`, `assets/`). The theme loader path is exercised in unit tests but not against a non-bundled theme. Regressions in the `manifest.yml` parser, the `ButtonFrame.tsx` runtime import via `tsx`, the `theme.css` asset delivery, or the `index.ts` default export can ship undetected.

**Desired behavior:** A minimal but real third-party theme at `/works/test/test-sireno-deck-theme` with:
- `manifest.yml` declaring:
  ```yaml
  name: test-sireno-deck-theme
  main: ./index.ts
  version: 0.1.0
  description: Third-party theme smoke test fixture for v1.7 IMPFX-02.
  authors:
    - name: Sireno Deck Maintainers
  assets:
    styles:
      - ./theme.css
  colorTokens:
    background: '#1f2933'
    frame: '#3e4c59'
    foreground: '#f7f7f7'
    primary: '#7dd3fc'
    accent: '#facc15'
    success: '#34d399'
    danger: '#f87171'
  ```
  (Note: themes use `manifest.yml`, NOT `package.json`. This is the pattern from `packages/cli/src/themes/default/manifest.yml:1-10`.)
- `index.ts` default-exporting `{ buttonFrame: ButtonFrame }` and a named `ButtonFrame` import.
- `ButtonFrame.tsx` rendering a 4px rounded `<div>` with a thin accent border (so the loader is exercised end-to-end).
- `theme.css` declaring the `--sireno-color-*` custom properties from `manifest.yml`'s `colorTokens`.
- A `README.md` describing install: set `theme: test-sireno-deck-theme` in `config.yml` and add `themes_path: /works/test/test-sireno-deck-theme` (or whatever the theme install path config key is — confirm during plan-phase).

**Acceptance criteria:**
- The theme loads successfully through `pnpm cli:dev start --config <path>` with `theme: test-sireno-deck-theme`.
- The `ButtonFrame` renders as expected in the emulator.
- `theme.css` overrides one of the bundled theme's CSS custom properties (e.g. `--sireno-color-primary`) and the override is visible in the browser-deck rendered surface.
- New loader test in `packages/cli/src/themes/loader.test.ts` (or wherever the theme loader test lives) gains a "loads a real third-party theme" case that points at the fixture path and asserts the theme's `buttonFrame` is wired.

**Out of scope:**
- Publishing the theme to npm.
- Adding a new theme install path config key — reuse the existing mechanism (`theme: <name>` resolves a bundled-or-installed theme). If the user wants a new `themes_path:` field, that is a separate feature, not IMPFX-02.

**Open questions:**
- Same as IMPFX-01: `/works/test/test-sireno-deck-theme` does NOT exist on disk. The plan-phase must create the directory or use a fixture copy inside the repo.
- How is the theme currently resolved by name? The default theme uses `theme: default`; the loader presumably maps that to `packages/cli/src/themes/default/`. The fixture needs the same resolver to find it via `theme: test-sireno-deck-theme` — flag if a new resolver path is required (i.e. a config-level `themes_path:` field) because that is a core change and would invalidate the "zero core changes" promise.
- Confirm the user wants the fixture to live at `/works/test/test-sireno-deck-theme` (outside the repo) or whether a fixture copy inside the repo (e.g. `packages/cli/fixtures/third-party/test-sireno-deck-theme`) is acceptable.

---

## REQ-ID Allocation

| ID | Title | Type | Phase bucket |
|----|-------|------|--------------|
| BGFX-01 | System back button still feels sluggish on the settings page | bug | Phase 71 (gesture handler fix) |
| BGFX-02 | Double-tap on a no-dbltap button fires the tap callback twice | bug | Phase 71 (gesture handler fix) |
| BGFX-03 | System back / settings slot does not use SplitActionSurface to show "back to overlay" when an overlay is available | bug | Phase 72 (system-buttons dispatcher) |
| BGFX-04 | Active-app deck `icon` field is not used in the Toggle button or the SplitActionSurface secondary | bug | Phase 72 (deck schema + render) |
| BGFX-05 | Emoji paste does not actually paste | bug | Phase 73 (clipboard.ts keystroke hookup) |
| BGFX-06 | `key_macro` keystrokes are not sent to apps | bug | Phase 73 (keyMacro provider + Wayland) |
| BGFX-07 | `Bars` surface value has no formatter and no documented "no decimals" default | bug | Phase 74 (shared formatter + Bars) |
| FBFX-01 | Better `system-status-label-values` layout for 2 and 3 items | feature | Phase 74 (LabelValueList layouts) |
| FBFX-02 | New builtin addon `ValueDisplay` | feature | Phase 75 (new addon) |
| IMPFX-01 | Third-party addon fixture at `/works/test/test-sireno-deck` | improvement | Phase 76 (fixture) |
| IMPFX-02 | Third-party theme fixture at `/works/test/test-sireno-deck-theme` | improvement | Phase 76 (fixture) |

**Total:** 11 items, 7 bugs + 2 features + 2 improvements. Aligns to 6 phases (71-76). Phase 71-72 (gesture + system buttons) are the highest-leverage bugs because they ship measurable UX wins and unblock user-visible regressions. Phase 73 (keystroke) is the "scary" one because it crosses OS boundaries; allocate a UAT plan that names the OS matrix. Phase 74 (Bars + LabelValueList) is one phase because they share the formatter extraction. Phase 75 (ValueDisplay) is one phase because the addon is small and mirrors `system-status-label-values`. Phase 76 (fixtures) is one phase because both fixtures exercise the loader seam.

## Open Questions

The following MUST be answered before plan-phase can write a definitive plan. Grouped by item, ordered by blocker severity.

### Blockers (the v1.7 plan cannot start without an answer)

1. **IMPFX-01 / IMPFX-02 — where do the third-party fixtures live?** The paths `/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` do NOT exist on disk as of 2026-06-17. The user must confirm:
   - (a) absolute paths are a hard requirement and the fixtures will be created at those paths during execution, OR
   - (b) the fixtures can live inside the repo at `packages/cli/fixtures/third-party/{test-sireno-deck,test-sireno-deck-theme}` and be symlinked or copied to the absolute paths for UAT, OR
   - (c) the brief had a typo and the fixtures should live only inside the repo (this is the cleanest CI-friendly path).
   Recommend (b) — copy in repo for CI, symlink for UAT.

2. **BGFX-03 — what should pressing the n-1 system button on the overlay deck itself do?** The current Phase 66 behavior is `dismissOverlay()`. The new behavior could be:
   - (a) keep `dismissOverlay()` (status quo)
   - (b) navigate back in the underlying deck's history (closing the overlay as a side-effect)
   - (c) configurable per-deck
   Recommend (a) — keep status quo, expand the system-buttons dispatcher to also use SplitActionSurface but with the same `onTap` semantics.

3. **BGFX-04 — is the `icon` field deck-level or overlay-level?** The current `CoreDeckConfigSchema` is strict and has no `icon` field. Adding it at deck level is a one-line schema change. Adding it as `overlay: { icon }` is a new sub-block. The brief implies deck-level.

4. **FBFX-02 — formatter vocabulary.** Reuse the existing `SystemStatusFormatter` set (percent / bytes / count / frequency-ghz / uptime / none), or expand (add `'date'`, `'duration'`, etc.)? Recommend reuse.

5. **FBFX-02 — what is the "helper" the user is asking for?** The brief says "Allow tap/dbltap/hold action commands via the helper." The existing `useButtonActionCommand` already does this. Is the user asking for:
   - (a) the existing helper (recommended — zero new code), OR
   - (b) a new helper that exposes per-value context to the action command (e.g. `tap` receives which value index was visible)?
   The (b) version is a non-trivial expansion. Recommend (a).

### Non-blockers (default proposed, flag if the user disagrees)

6. **BGFX-01 — fast-path for the system back button.** Confirm: apply fast-path to all system back instances when there is no overlay context, OR also fast-path when an overlay IS currently shown (the chrome overlay case)?

7. **BGFX-02 — exact UX on double-tap of a no-dbltap button.** "Fires onTap once" (recommended, forgiving) vs "fires nothing at all" (aggressive, requires perfect single taps).

8. **BGFX-05 — clipboard helper signature.** `pasteText(text, keyMacroProvider)` (explicit injection, recommended) vs module-level state (cleaner call site, harder to test).

9. **BGFX-05 — paste delay.** Should the helper `await sleep 50ms` between `clipboardy.write` and the keystroke? Some platforms race.

10. **BGFX-06 — Wayland detection.** Where does the runtime read `os.variant` for the linux keyMacro provider? Confirm the existing host-context surface exposes a usable variant string (or whether the linux provider should detect it itself via `XDG_SESSION_TYPE`).

11. **BGFX-07 — `'none'` formatter definition.** `Math.round` (preserves current default, recommended) vs `numbro` default-mantissa-0 (more consistent with other formatters).

12. **FBFX-01 — 3-up vs 1+2 layout for 3 lines.** A 3-up grid at 72x72 is tight. A "1 big + 2 small" (1+2) layout might read better.

13. **FBFX-02 — button type name.** `value-display` (consistent with addon name, recommended).

14. **IMPFX-01 — fixture content.** Just a "loads and renders" smoke test (cheaper) or a "demonstrates a non-trivial capability" (more useful)?

15. **IMPFX-02 — theme install path config.** Confirm the existing `theme: <name>` resolver finds a third-party theme by name, or whether a new `themes_path:` config key is needed (the latter is a core change that invalidates the "zero core changes" promise).
