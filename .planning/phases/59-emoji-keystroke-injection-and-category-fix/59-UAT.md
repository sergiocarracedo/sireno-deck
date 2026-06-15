---
status: testing
phase: 59-emoji-keystroke-injection-and-category-fix
source:
  - 59-01-PLAN.md
  - 59-02-PLAN.md
started: 2026-06-12T15:10:00Z
updated: 2026-06-12T15:25:00Z
---

## Current Test

number: 2
name: Manual UAT — Linux/X11: tap emoji pastes into active input
expected: |
  With a real Stream Deck + active text editor focused, tapping an emoji in the emoji-selector deck inserts the glyph at the cursor (clipboard write + Ctrl+V keystroke). Defer if no hardware.
awaiting: user response

## Internal Evidence (not UAT — captured for the record)

These are not user-acceptance tests; they are internal test/build evidence the user explicitly noted is not real UAT. Captured for the verification trail only.

- **Build is clean:** `pnpm --filter sireno-deck-cli build` → exits 0, 314 files, 1.77 MB output.
- **6 new unit tests pass:** `pnpm --filter sireno-deck-cli test src/deck/__tests__/runtime.test.ts -t "paste keystroke"` → 6 passed. Covers Linux / macOS / Windows / opt-out / unsupported / error-propagation.
- **No regressions in runtime.test.ts:** 70 → 76 tests (exactly +6 from new tests); same 49 baseline failures, no new failures introduced by Phase 59. The 49 are pre-existing failures in uncommitted Phase 60/61 work (theme, weather, date-time, system-back-injection, dom-host, loader, media-player, emoji-selector, builtin, dev-watch) and are unrelated to Phase 59.
- **No regressions in loader.test.ts:** 2 failed / 37 passed baseline unchanged after schema additions.
- **Plan deviation:** used normalized `os.type` values (`macos`/`windows`) per `host-context.ts:51-60`; plan text mentioned `darwin`/`win32`.

## Tests (real UAT — user-observable behavior)

### 1. EMO-17 category audit: zero emoji overlap across all 11 pairs
expected: A `comm -12` audit across the 11 subcategory char sets in `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` returns 0 chars for every pair. Total unique emojis: 383.
result: pass

### 2. Manual UAT — Linux/X11: tap emoji pastes into active input
expected: With a real Stream Deck + active text editor focused, tapping an emoji in the emoji-selector deck inserts the glyph at the cursor (clipboard write + Ctrl+V keystroke). Defer if no hardware.
result: issue
reported: "No it not working, the emoji is not it clipboard neither"
severity: blocker
root_cause: "User's committed `config.yml` has `select_command: \"printf '%s' '{{emoji}}'\"` on the `emoji:` deck. The entry button code (`packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:38-45`) takes an `if (cmd) runCommand(cmd) else pasteText(emoji)` branch — since `select_command` is set, the user hits the `runCommand` path, which executes `printf '%s' '😀'` and writes to stdout, never touching the clipboard. The Phase 59 pasteText changes are wired correctly, but they only fire on the no-`select_command` path."
design_finding: "User observed: `select_command` makes no sense in emoji buttons because the emoji-selector is an addon — the addon owns the behavior (paste the emoji), and the user shouldn't be overriding addon behavior via config. The current design (EmojiEntryButtonWithActionsSchema extends AddonButtonActionConfigSchema) lets the user set `select_command` on every entry button, which breaks the addon ownership boundary. Possible fixes: (a) strip `select_command` from entry button config in the deck generator (`emojiSelectorDeck.createDecks`) so the user can't set it; (b) remove the action config extension from the entry button schema entirely; (c) keep the field but make the entry button fire BOTH `select_command` and `pasteText` (defeats the addon's behavior anyway). User's preference: remove it from the user-facing config. Decision deferred to fix-plan phase."
affected_files:
  - packages/cli/src/builtin-addons/emoji-selector/index.ts
  - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
  - packages/cli/src/builtin-addons/emoji-selector/support.tsx
  - config.yml

### 3. Manual UAT — Linux/X11: double-tap emoji pastes shortcode
expected: Double-tapping an emoji inserts `:shortcode:` (e.g. `:grinning:`) at the cursor.
result: issue
reported: "partically pass, the shortcode is copied to the clipboard, but not automatically pasted"
severity: major
root_cause: "Double-tap path (`entry.tsx:32-37`) always calls `methods.pasteText(shortcode)` (no `select_command` branch), so the clipboard write succeeded. The paste keystroke didn't fire. User is on pure-Wayland (or another platform where the keyMacroProvider is `unsupported`). The Linux keyMacroProvider at `packages/cli/src/system/key-macro/index.ts:27-29, 53-64` returns `createUnsupportedKeyMacroProvider(deps, 'pure-wayland')` when `XDG_SESSION_TYPE === 'wayland' && !WAYLAND_DISPLAY`, and that provider's `send` resolves immediately without error. The CONTEXT decision was to 'let any error propagate' — but the unsupported adapter doesn't error, it silently no-ops. The runtime error UX never fires. The user sees 'clipboard updated but nothing happened.' This defeats the whole point of EMO-15/16: the user can't tell whether the platform is unsupported, the keystroke failed, or the tap worked correctly."
design_finding: "Two possible fixes: (a) make the `unsupported` key-macro provider's `send` throw a clear error (e.g. `new Error('Keystroke simulation is not supported on this platform (pure-wayland)')`); the existing runtime error UX would then surface a 4-digit code on the button; (b) check `keyMacroProvider.supportsKeyMacro` in the runtime's `pasteText` body and throw if false. (a) is the smaller surface and is consistent with the CONTEXT decision to 'let errors propagate.'"
affected_files:
  - packages/cli/src/system/key-macro/unsupported.ts
  - packages/cli/src/system/key-macro/index.ts

### 4. Manual UAT — macOS: tap/double-tap uses Cmd+V
expected: Same as Linux tests, but the keystroke is Cmd+V (verified by inspecting system logs or `Keyboard Viewer`).
result: skipped
reason: "User cannot test macOS — no Mac hardware available"

### 5. Manual UAT — Windows: tap/double-tap uses Ctrl+V
expected: Same as Linux tests, but the keystroke is Ctrl+V (verified via `Spy++` or similar).
result: skipped
reason: "User cannot test Windows — no Windows hardware available"

### 6. Manual UAT — Opt-out: `paste.keystroke: false` skips keystroke
expected: With `paste.keystroke: false` in config.yml, tapping an emoji copies to clipboard but does NOT paste. User must Ctrl+V / Cmd+V manually. (Clipboard can be verified with `xclip -o` / `pbpaste` / clipboard viewer.)
result: issue
reported: "no copied to clipboard"
severity: blocker
root_cause: "Re-confirms the test 2 root cause. With `select_command: \"printf '%s' '{{emoji}}'\"` still in the user's `config.yml`, the tap hits the `runCommand(printf)` path and never reaches `pasteText`. The opt-out flag is irrelevant when the pasteText code path itself isn't entered. The unit test for the opt-out path is proven passing (6/6), but it can only be observed on real hardware once the test 2 config issue is resolved."

### 7. Manual UAT — Error propagation: keyMacroProvider failure surfaces in runtime error UX
expected: If the keyMacroProvider fails (e.g. permissions error on xdotool), the emoji button shows the warning triangle + 4-digit code (e.g. 4105) instead of a silent miss.
result: skipped
reason: "Unit test for this path is proven passing (test #6 of new 6 paste-keystroke tests); not reproducible on a working xdotool setup."

## Summary

total: 7
passed: 1
issues: 3
pending: 0
skipped: 3

## Gaps

```yaml
- truth: "EMO-17 — emoji category data is audited and deduplicated so smiles/people (and any other overlapping categories) show distinct emoji sets"
  status: partial
  reason: "User reported: emoji char overlap is zero, but the CATEGORY BUTTON ICONS are duplicated. From the user's photo: smileys + people both show the same yellow smiley face; animals + nature show the same candle/leaf; food + drink show the same fork/knife; travel + objects + flags all show the same white box. Confirmed in `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`: the `icon` field for 5 of 11 categories points at SVG assets that are shared with another category (smileys→smileys.svg, people→smileys.svg, animals→nature.svg, nature→nature.svg, food→food.svg, drink→food.svg, travel→objects.svg, objects→objects.svg, flags→objects.svg). The original Phase 57 RES-03 audit only checked emoji char overlap with `comm -12`; it did not check icon asset overlap."
  severity: major
  test: 1
  root_cause: "`icon` field in categories.json points at 4 unique SVG assets for 7 of 11 categories; 5 categories share an icon with at least one other category. The data has emoji diversity (zero char overlap) but the icon layer does not. The available SVG assets in `packages/cli/src/builtin-addons/emoji-selector/assets/` total 21 files; the 5 missing icons could be drawn from `emoji-berry.svg`, `emoji-cool.svg`, `emoji-fire.svg`, `emoji-grin.svg`, `emoji-joy.svg`, `emoji-leaf.svg`, `emoji-party.svg`, `emoji-pizza.svg`, `emoji-rainbow.svg`, `emoji-sushi.svg`, `emoji-wave.svg` (semantic match per category) OR new icons need to be authored. User's recommended approach: rename the surface component to a generic name, rename the `icon` prop to `main`, accept an emoji char OR an icon src in the slot (most direct fix at the rendering layer rather than authoring new SVGs)."
  affected_files:
    - packages/cli/src/builtin-addons/emoji-selector/data/categories.json
    - packages/cli/src/ui/surfaces/IconLabelSurface.tsx (rename + accept emoji char)

- truth: "EMO-15/EMO-16 — tapping an emoji writes the emoji to clipboard AND simulates the OS paste keystroke"
  status: failed
  reason: "User reported on real Stream Deck: tap does nothing because `select_command: \"printf '%s' '{{emoji}}'\"` in the user's `config.yml` routes the tap through `methods.runCommand(printf)` to stdout, never reaching `methods.pasteText`. The Phase 59 pasteText changes are wired correctly but are bypassed when the user sets `select_command` on the emoji-selector deck."
  severity: blocker
  test: 2
  root_cause: "The emoji-selector addon entry button extends `AddonButtonActionConfigSchema` (`packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:15-17`) and the deck generator propagates `config.select_command` to every entry button (`packages/cli/src/builtin-addons/emoji-selector/index.ts:98`). The entry button onTap branches: `if (cmd) runCommand(cmd) else pasteText(emoji)`. So a user-set `select_command` defeats the addon's default paste behavior. The user's design insight: `select_command` makes no sense in the emoji-selector context because the addon owns the behavior; the user shouldn't be overriding addon behavior via config. Possible fixes: (a) strip `select_command` from the entry button's config in the deck generator; (b) remove the action config extension from the entry button schema entirely; (c) keep the field but also fire `pasteText`. User's preference: remove it from the user-facing config."
  affected_files:
    - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
    - packages/cli/src/builtin-addons/emoji-selector/index.ts
    - packages/cli/src/builtin-addons/emoji-selector/support.tsx
    - config.yml

- truth: "EMO-15/EMO-16 — the paste keystroke is observable in the active input"
  status: failed
  reason: "User reported on real Stream Deck: double-tap copies `:shortcode:` to clipboard but does NOT paste. The paste keystroke silently no-ops. The runtime error UX never fires."
  severity: major
  test: 3
  root_cause: "User is on pure-Wayland (or another platform where the keyMacroProvider is `unsupported`). The Linux key-macro provider at `packages/cli/src/system/key-macro/index.ts:27-29, 53-64` returns `createUnsupportedKeyMacroProvider(deps, 'pure-wayland')` when `XDG_SESSION_TYPE === 'wayland' && !WAYLAND_DISPLAY`. That provider's `send` resolves immediately without throwing. The CONTEXT decision was to 'let any error propagate' but the unsupported adapter doesn't error, it silently no-ops. The runtime error UX never fires. The user sees 'clipboard updated but nothing happened.' This defeats the whole point of EMO-15/16: the user can't tell whether the platform is unsupported, the keystroke failed, or the tap worked."
  design_finding: "Two possible fixes: (a) make the `unsupported` key-macro provider's `send` throw a clear error (e.g. `new Error('Keystroke simulation is not supported on this platform (pure-wayland)')`); the existing runtime error UX would then surface a 4-digit code on the button; (b) check `keyMacroProvider.supportsKeyMacro` in the runtime's `pasteText` body and throw if false. (a) is the smaller surface and is consistent with the CONTEXT decision to 'let errors propagate.'"
  affected_files:
    - packages/cli/src/system/key-macro/unsupported.ts
    - packages/cli/src/system/key-macro/index.ts
```
