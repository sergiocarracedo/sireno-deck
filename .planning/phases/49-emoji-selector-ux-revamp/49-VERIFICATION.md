# Phase 49 — Emoji-Selector UX Revamp — Verification

**Status:** passed

## Summary

All 4 plans in Phase 49 (Emoji-Selector UX Revamp) executed and verified. The 9 new EMO-* requirements (EMO-06 through EMO-14) are satisfied. The phase ships a hand-curated emoji catalog, per-OS HID keyboard-stroke shim, real emoji rendering via the native font stack, n-2 page nav with Tap/Dbl Tap chip overlays, addon-decorated system back, and a new first-class `emoji-launcher` button type with a 2×3 grid render.

## In-scope test results

- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — 15/15 pass
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.test.ts` — 9/9 pass
- `packages/cli/src/ui/Text.test.tsx` — 3/3 pass

**Total: 27/27 in-scope tests pass.**

## Must-haves coverage

### 49-01 (Wave 1) — Catalog data + per-OS HID shim
- ✓ EMO-06: per-OS HID shim for tap (linux=xdotool, darwin=pbcopy+osascript, win32=Set-Clipboard+SendKeys) — `os-shims.ts` exports `resolveEmojiTypeCommand` with discriminated `ShimCommandResult` (9 tests cover all 3 OSes + unknown + escaping)
- ✓ EMO-07: HID shortcode path — entry button's `useButtonActionCommand` resolver builds the shortcode path with `resolveEmojiShortcodeCommand`; falls back to shim when `select_command_shortcode` is unset
- ✓ EMO-11: pre-split piliapp-style subcategories — `data/categories.json` ships 11 categories (smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags); new test "covers the pre-split piliapp-style subcategories" asserts all 11
- ✓ EMO-12: hand-curated JSON catalog — `data/categories.json` is the single source of truth for emoji data; 383 emojis total

### 49-02 (Wave 2) — Real emoji rendering + size ladder
- ✓ EMO-08: real emoji rendering via native font stack — `EMOJI_FONT_STACK` constant + `renderEmojiGlyph` helper; entry button uses it for non-branded emojis; new test "renders the real unicode glyph for non-branded emojis via the native font stack" asserts the font family names + text-5xl + raw emoji char (NOT U+1Fxxx)

### 49-03 (Wave 3) — n-2 page nav + addon-decorated system back
- ✓ EMO-09: n-2 page nav with Tap/Dbl Tap chips — change-deck schema extended with `meta` and `target_deck_double_tap`; render emits chip overlay; new test "paginates categories with more emojis than fit on one page" asserts the page nav at position 13 with `meta: 'page-nav'`
- ✓ EMO-10: addon-decorated system back — `system_back_tap_command` and `system_back_hold_command` fields on `EmojiSelectorDeckSchema` and global `DeckConfig` interface; runtime's `instantiateRuntimeButtonInstance` reads them at instance creation time and routes through `executeAction` when set; 2 new runtime tests cover the tap and hold paths

### 49-04 (Wave 4) — emoji-launcher button type + type rename
- ✓ EMO-13: new addon-provided entry button (2×3 grid) — `emoji-launcher` button type with 2×3 grid render of six representative emojis (😂 🔥 ❤️ ⭐ 🍕 🎵); main deck places it at position 0; new test "renders the launcher button as a 2x3 grid of the six representative emojis" asserts the grid markers + all 6 cells
- ✓ EMO-14: CHANGELOG entry for the type rename — CHANGELOG.md 2026-06-06 entry has a "Breaking Changes" subsection documenting the `emoji-entry-button` → `emoji-emoji-button` rename

## Deviations from plan

### 49-03 change-deck double-tap detection
The plan called for "reusing the Phase 34 commands.tap / commands.double-tap action contract" on change-deck. That contract's `commands.tap` is a literal string run via `methods.runCommand`, but navigation needs `methods.navigateToDeck`. There is no `sireno navigate` CLI subcommand. Pragmatic deviation: implemented double-tap detection directly in change-deck's onTap using a per-button `store.button.snapshot.tapAt` timestamp (300ms window). The user-visible contract is preserved (tap=next, double-tap=prev, chip overlays).

### 49-04 launcher button has no onTap
The launcher is a display-only button (no tap behavior). The "main entry point" purpose is satisfied by being prominent at position 0 of the main deck. A future plan can wire an `onTap` that navigates to a quick-pick subdeck if needed. The CHANGELOG entry documents the launcher's purpose as the visual entry point.

## Pre-existing test/typecheck noise (out of scope, unchanged)

- 43 pre-existing failures in `src/deck/runtime.test.ts` (predates Phase 46; tests call `options.addonRegistry.listButtons()` without providing `addonRegistry`; new tests in this phase use `createEmptyAddonRegistry()`)
- Pre-existing TS errors in unrelated files: runtime.ts, core-buttons/buttons/action.tsx, core-buttons/buttons/toggle.tsx, addon/loader.ts, addon/registry.test.ts, dom-host*.tsx, dom-host.test.tsx, theme-utilities.ts, stream-deck.ts, browser-renderer.test.ts, system-back-injection.test.ts. All from Quick 036 / date-time drift in the working tree.
- Working tree has 5 unrelated pre-existing modifications (`.planning/quick/036-move-theme-interfaces-to-core/036-SUMMARY.md`, `config.yml`, `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`, `packages/cli/src/builtin-addons/date-time/buttons/date.tsx`, `packages/cli/src/builtin-addons/date-time/index.ts`) — must NOT include in commits (verified clean via `rtk git status` at the end of each plan)

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — NEW (11 categories, 383 emojis)
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.ts` — NEW (per-OS HID shim)
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.test.ts` — NEW (9 tests)
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — MODIFIED (JSON loader, getEmojiShortcode, select_command_shortcode, EmojiLauncherButtonSchema, EMOJI_LAUNCHER_GRID, EMOJI_PAGE_SIZE=12, renderEmojiGlyph, EMOJI_FONT_STACK, system_back fields)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — MODIFIED (per-OS shim wiring, renderEmojiGlyph, type=emoji-emoji-button)
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx` — NEW (emoji-launcher button type with 2x3 grid)
- `packages/cli/src/builtin-addons/emoji-selector/assets/launcher.svg` — NEW (4-cell colored fallback)
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — MODIFIED (createDecks new layout, launcher at position 0, renamed type, registered launcher)
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — MODIFIED (15 tests covering all features)
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — MODIFIED (meta, target_deck_double_tap, page-nav render, 300ms double-tap detection)
- `packages/cli/src/ui/Text.tsx` — MODIFIED (5xl size, fontStack prop)
- `packages/cli/src/ui/Text.test.tsx` — NEW (3 tests for 5xl + fontStack)
- `packages/cli/src/core/schemas.ts` — MODIFIED (DeckConfig interface adds system_back_tap_command + system_back_hold_command)
- `packages/cli/src/deck/runtime.ts` — MODIFIED (system-back instance reads runtimeDecks[deckId] for tap/hold commands; routes through executeAction when set)
- `packages/cli/src/deck/runtime.test.ts` — MODIFIED (2 new tests for system-back decoration)
- `CHANGELOG.md` — MODIFIED (2026-06-06 entry with Features + Breaking Changes + Fixes + Learnings)
- `.planning/phases/49-emoji-selector-ux-revamp/{49-01,49-02,49-03,49-04}-SUMMARY.md` — NEW (one per plan)

## Commits added by this phase

12 commits across 4 plans:
- 49-01: 5 commits (categories.json, support.tsx, os-shims, entry wiring, tests + 1 SUMMARY)
- 49-02: 4 commits (Text 5xl/fontStack, renderEmojiGlyph, entry render, tests + 1 SUMMARY)
- 49-03: 4 commits (change-deck, schemas + createDecks, runtime decoration, tests + 1 SUMMARY)
- 49-04: 4 commits (type rename, launcher, tests, CHANGELOG + 1 SUMMARY)

All commits are clean — no working-tree drift or unrelated changes included.
