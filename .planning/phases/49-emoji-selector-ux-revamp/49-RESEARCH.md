---
phase: 49
status: research_complete
gathered: 2026-06-06
---

# Phase 49: Emoji-Selector UX Revamp — Research

## Don't Hand-Roll

**Per-OS HID shim commands.** Use the platform's existing automation tool, not a custom Node binding. The runtime already routes shell commands through `executeCommand` (`packages/cli/src/action/executor.ts:61`), so each OS only needs a one-line default command. Do **not** try to use `@elgato-stream-deck/node` for text input — the library has no documented text-input API and the device protocol does not expose one. The Stream Deck's job is to send physical key events; the emoji has to be delivered to the host's focused input separately.

**Native emoji font stack.** Use the browser's emoji font stack (`'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif`). Do **not** bundle Twemoji PNGs (asset weight: 1-3MB), and do **not** expand the hand-curated SVG map (silences the "real emoji" feedback).

**Phase 34 `commands.tap` / `commands.double-tap` contract.** Reuse the existing `useButtonActionCommand` schema in `packages/cli/src/addon/api.ts`. Do **not** invent a new action contract for the n-2 page nav.

**Hand-curated JSON catalog.** Vendor the curated subset in `data/categories.json` rather than scraping piliapp.com at build time. Do **not** depend on `unicode-emoji-json` — its grouping is coarser than the piliapp reference and would not give the per-subcategory splits the user wants.

## Common Pitfalls

### xdotool Unicode/emoji on X11
**Pitfall:** `xdotool type` uses XTEST to inject key events. For Unicode codepoints above the BMP (most emoji are U+1Fxxx), xdotool's `type` is unreliable. Some emoji will silently drop or send a wrong codepoint.
**Fix:** Use `xdotool type --clearmodifiers <emoji>` as the primary path, with a fallback to `xclip -selection clipboard < /dev/stdin && xdotool key ctrl+v` for emoji that fail the first path. Detect via shell exit code.

### osascript keystroke can't type emoji directly
**Pitfall:** `osascript -e 'tell application "System Events" to keystroke "🔥"'` does NOT work. AppleScript keystroke only takes single ASCII characters.
**Fix:** For macOS, the default is clipboard paste: `pbcopy < /dev/stdin && osascript -e 'tell application "System Events" to key code 9 using {command down}'` (Cmd+V). Restores clipboard after via `osascript -e 'set the clipboard to (the clipboard as text)'` — actually, no need; pbcopy sets it directly.

### Windows SendKeys can't send Unicode
**Pitfall:** `System.Windows.Forms.SendKeys::SendWait` only handles the basic ASCII / VK key set. It cannot send emoji glyphs.
**Fix:** For Windows, use `Set-Clipboard` + `SendKeys('^v')`. PowerShell snippet: `Set-Clipboard -Value "<emoji>"; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`.

### xdotool not installed (Linux)
**Pitfall:** `xdotool` is not always installed by default. The user gets an "executable not found" error.
**Fix:** Add `xdotool` to the per-OS shim's `isSupported()` check (run `command -v xdotool` once at startup). If unsupported, the render shows the honest "not available on this OS" state. Add `xdotool` to the README install requirements for Linux (mirror the media-volume pattern from Phase 44).

### Wayland-only Linux sessions
**Pitfall:** xdotool is X11-only. On Wayland-only sessions (Fedora 35+, recent Ubuntu GNOME Wayland), xdotool fails.
**Fix:** Detect via `echo $XDG_SESSION_TYPE`. If `wayland`, use `wl-copy < /dev/stdin && wtype -M ctrl v` (requires `wtype` and `wl-clipboard`). If neither is available, "not available" state. Document the requirement.

### Native emoji font rendering in the browser
**Pitfall:** Default font stack may still render the U+1Fxxx fallback if the font stack is wrong. The Text component's `fontFamily` prop is currently scoped to a single family; the new emoji font stack needs to be passed as a comma-separated CSS font-family string, which most browsers respect with fallback.
**Fix:** Pass the font stack as a single string in the `Text` component's `fontFamily` prop, OR set a `font-family` Tailwind class on the wrapper. Verify in both Chromium (Playwright) and a real browser.

### The new entry button type name
**Pitfall:** Naming collision — the existing `emoji-entry-button` is the per-emoji entry, the new addon-provided launcher button is also "entry-like".
**Fix:** Rename the existing per-emoji entry to `emoji-emoji-button` (or `emoji-pick-button`), and use `emoji-entry-button` for the new addon-provided 2×3-grid launcher. Document the rename in CHANGELOG.

### Chip overlay readability on a button
**Pitfall:** Two chips on a single button can crowd the nav arrow icon and become unreadable.
**Fix:** Position the chips in corners (top-left, bottom-right) with `xs` text and `muted` tone. The nav arrow icon sits in the center. The chips should be ~30% of the button width max.

### Subdeck back decoration collision
**Pitfall:** The system back is injected by the runtime (Phase 46 fix), but the new `system_back_tap_command` config field is read from the deck config. The runtime needs to know which config to read when the system back is at the reserved slot of a subdeck.
**Fix:** The runtime reads the active deck's `system_back_tap_command` and `system_back_hold_command` from its config. The `getDeckById` lookup at button-render time gives access to the active deck's config. Pass the active deck config (or the relevant subset) to the system-back instance wiring.

### 2×3 grid glyph sizing
**Pitfall:** 6 emojis in a 2×3 grid on a 72×72 px button = each cell is ~24×24 px. At that size, complex emoji (with skin tone modifiers, ZWJ sequences) can lose detail.
**Fix:** Pick 6 emojis that are visually distinct and survive small sizes (e.g. 😀 🔥 ❤️ ⭐ 🍕 🎵). Document the selection in the addon code.

## Existing Patterns in This Codebase

### Per-OS shim with honest "unsupported" state
See `packages/cli/src/builtin-addons/media-volume/` (Phase 44) for the pattern: `LinuxAdapter`, `MacosAdapter`, `WindowsAdapter` modules each with `isSupported()` and `execute(command)`. The emoji-selector follows the same shape, but the "adapters" are inline command templates (no TypeScript shim file needed since the action is a shell command).

### Action execution with host-context placeholders
`packages/cli/src/action/executor.ts:48` defines `resolveHostContextPlaceholders` — command strings with `{{host.os.type}}` etc. are resolved at execution time. The default shim commands can use the same template syntax if needed (e.g. `{{host.os.type}}-aware shim`).

### Phase 34 command-action contract
`packages/cli/src/addon/api.ts` exports `useButtonActionCommand`. The schema is `commands: { tap?, hold?, double-tap? }` where each value is a command string. The runtime calls `runCommand(commands.tap)` etc. The new n-2 page nav button uses this exact shape.

### Phase 34 — `commands.tap` on `change-deck`
The existing `change-deck` button type (`packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx`) only has tap. The new n-2 button needs to use the Phase 34 `commands.tap` and `commands.double-tap` shape on the change-deck config: `{ type: 'change-deck', target_deck: <next>, commands: { tap: '<navigate>', 'double-tap': '<navigate-back>' } }`. Verify the existing `change-deck` definition reads the `commands` field — if not, extend it.

### Phase 46 emoji-selector layout
The current layout from Phase 46 is: emoji entries fill positions `[0..keyCount-4]`, prev at `keyCount-3`, next at `keyCount-2`, system back at `keyCount-1`. The Phase 49 layout replaces this with: emoji entries at positions `[0..11]`, empty position 12, n-2 page nav at position 13 (keyCount-2), system back at position 14. The 12-emoji cap is fixed (12 = 15 - 1 system back - 1 nav - 1 visual breathing room).

### `Chip` component
`packages/cli/src/ui/Chip.tsx` exports a `Chip` with `size` and `tone` props. `size="xs"` and `tone="muted"` is the right combination for the n-2 button overlay.

### `Text` size ladder
`packages/cli/src/ui/Text.tsx` defines the size ladder. The current top is `2xl` (Phase 3). For the larger emoji glyph, add a `5xl` step OR introduce a separate `giant` size for emoji only. The Text component's `size` enum is closed — add a new entry.

### `getEmojiFallbackLabel` deprecation
`packages/cli/src/builtin-addons/emoji-selector/support.tsx:229` is the U+1Fxxx fallback path. It is no longer needed once the font-stack render is in place. Remove the function and the `EMOJI_ICON_ASSETS` map (or keep the latter as a deliberate override for the 12 branded emojis — the choice is documented in CONTEXT.md).

## Recommended Approach

### Plan breakdown (vertical slices)

1. **Plan 49-01: Catalog data + per-OS HID shim** — Vertical slice 1: catalog JSON committed, shim command strings resolved at runtime, fallback path tested with execa. Demo: a single emoji entry button (e.g. `🔥`) types into the focused input on Linux (xdotool) when tapped.

2. **Plan 49-02: Real emoji rendering + size ladder** — Vertical slice 2: `getEmojiFallbackLabel` removed, `Text` size ladder gains `5xl`, font-stack render path active. Demo: all 6 categories' emojis render as real glyphs in the browser, with the 12 branded SVGs as deliberate overrides.

3. **Plan 49-03: n-2 page nav + addon-decorated system back** — Vertical slice 3: the n-2 button with `Chip` overlays, the `system_back_tap_command` / `system_back_hold_command` deck config fields, the runtime honors the decoration. Demo: a multi-page category uses the n-2 button to navigate; an emoji subdeck's system back runs the decorated tap/hold commands.

4. **Plan 49-04: Addon-provided entry button + 2×3 grid** — Vertical slice 4: the new `emoji-entry-button` (or renamed type) with the 2×3 grid render, registered as a first-class button type. Demo: a parent deck config adds `{ type: 'emoji-entry-button', target_deck: 'emoji' }` and the button shows the 2×3 grid of six emojis that navigates to the emoji-selector main deck on tap.

### Why 4 plans
The phase has 4 distinct user-facing behaviors, each a vertical slice. The plans are wave-ordered (catalog+shim → rendering → nav+back → entry button) because the entry button depends on the catalog data being in place, and the n-2 page nav depends on the rendering being correct. Total 4 plans in 4 waves.

### File structure (predicted)
- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — NEW
- `packages/cli/src/builtin-addons/emoji-selector/data/categories.test.ts` — NEW (catalog schema validation)
- `packages/cli/src/builtin-addons/emoji-selector/data/categories-fixture.test.ts` — NEW (small subset for test speed)
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.ts` — NEW (per-OS command resolution)
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.test.ts` — NEW
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — MODIFY (catalog loader, font-stack size, deprecate fallback)
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — MODIFY (createDecks for new layout, n-2 button)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — MODIFY (rename or extend for select_command_shortcode)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx` — NEW (the 2×3 grid entry button)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/page-nav.tsx` — NEW (the n-2 page nav button, if reusing change-deck doesn't work)
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — MODIFY (accept `commands` field)
- `packages/cli/src/deck/runtime.ts` — MODIFY (system-back honors deck-decorated tap/hold commands)
- `packages/cli/src/deck/system-back-injection.ts` — MODIFY (config lookup for decoration)
- `packages/cli/src/ui/Text.tsx` — MODIFY (add `5xl` size, font stack support)
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — MODIFY (extended tests)
- `packages/cli/src/deck/runtime.test.ts` — MODIFY (decoration tests)

### Tests to write
- Catalog JSON parses and exposes `id`, `label`, `icon`, `emojis: [{ char, shortcode }]`.
- `os-shims` returns the right command for each `hostContext.os.type`.
- The `os-shims` falls back through the chain (xdotool → xclip+ctrlv) on Linux when the primary tool is missing.
- `Text` size `5xl` renders the emoji glyph at the correct CSS class.
- `getEmojiFallbackLabel` is no longer referenced.
- The n-2 page nav button (a) has `Chip` overlays for "Tap" / "Dbl Tap", (b) tap routes to `nextDeckId`, (c) double-tap routes to `prevDeckId` (no-op on page 1).
- The new deck config fields `system_back_tap_command` / `system_back_hold_command` route to `runCommand` when present, and the default behavior is preserved when absent.
- The new `emoji-entry-button` (or renamed type) renders a 2×3 grid of six emojis and calls `navigateToDeck(target_deck)` on tap.

### Risk areas
1. **Renaming the existing `emoji-entry-button` type** is a breaking change for any user who has it in their config. The CHANGELOG must flag this prominently. Alternative: keep the existing name and use a new name (`emoji-launcher`) for the new entry.
2. **Subdeck back decoration** is a runtime-level change that needs careful testing — the runtime must read the active deck's config at button-render time, not at deck-creation time.
3. **The font stack** must be tested in the actual browser (not just the unit test renderer) to confirm real emoji glyphs render.

### Out of scope
- Build-time catalog validation beyond schema (no lint of emoji characters against a Unicode reference).
- Per-emoji `commands.hold` (deferred per CONTEXT).
- Theme overrides for the 2×3 grid (deferred per CONTEXT).
