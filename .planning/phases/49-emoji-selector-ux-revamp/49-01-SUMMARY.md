# Plan 49-01 Summary

**Completed:** 2026-06-06

## What was built

Shipped the emoji-selector's hand-curated piliapp-style catalog as a JSON file in the addon, plus a per-OS HID keyboard-stroke shim resolver that delivers the emoji (or shortcode on double-tap) to the host's focused input. The hand-rolled `CATEGORY_DEFINITIONS` constant is gone; the bundled data is the new source of truth. The `EmojiEntryButtonSchema` gained an optional `select_command_shortcode` field, and the entry button now uses the Phase 34 `useButtonActionCommand` contract so tap delivers the emoji and double-tap delivers the shortcode via the same per-OS shim path.

The shim's per-OS resolution is:
- Linux: `xdotool type --clearmodifiers <emoji>` (with `wl-copy` + `wtype` fallback for Wayland out of scope here)
- macOS: `printf ... | pbcopy && osascript ... keystroke "v" using {command down}` (clipboard paste, since AppleScript keystroke can't send Unicode emoji)
- Windows: `powershell -NoProfile -Command "Add-Type ... Clipboard::SetText(...); SendKeys('^v')"` (clipboard paste, since SendKeys is ASCII-only)
- Other OSes: returns an explicit `unsupported` marker with a human-readable reason

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — NEW. Hand-curated emoji catalog with 11 pre-split subcategories (`smileys`, `people`, `animals`, `nature`, `food`, `drink`, `activities`, `travel`, `objects`, `symbols`, `flags`), 383 emojis total, each with `{ char, shortcode }`.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — Replaced the inline `CATEGORY_DEFINITIONS` constant with a JSON import + a `CATEGORIES` re-export (kept the original name as an alias for back-compat). Added `getEmojiShortcode(char)` helper and the optional `select_command_shortcode` field on the entry button schema.
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.ts` — NEW. Exports `resolveEmojiTypeCommand` / `resolveEmojiShortcodeCommand` with discriminated `ShimCommandResult` (`supported` vs `unsupported`).
- `packages/cli/src/builtin-addons/emoji-selector/os-shims.test.ts` — NEW. 9 tests covering linux/darwin/win32 paths, the unsupported marker for unknown OSes, single-quote escaping in all three shells, and equivalence of the type and shortcode resolver paths.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — Rewrote `onTap` to use the Phase 34 `useButtonActionCommand` contract with a host-context-aware resolver. The resolver builds the resolved `tap` and `double-tap` commands at render time, falling back to the per-OS shim when the user did not supply `select_command` / `select_command_shortcode`.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — Updated the Phase 46 pagination test to use the `drink` category (18 emojis → 2 pages) instead of `smileys` (now 48 emojis → 4 pages). Added 2 new tests: pre-split subcategory coverage and `getEmojiShortcode` lookup.

## Decisions made

- The `EmojiEntryButtonSchema` now extends `AddonButtonActionConfigSchema` (which provides the optional `commands` field). The `useButtonActionCommand` resolver function takes `{ config, hostContext }` and pre-resolves both `tap` and `'double-tap'` at render time so the per-OS shim substitution happens once and `methods.runCommand` receives a literal command string.
- Pre-resolved commands are computed at render time, not tap time. This is fine because the host context (and therefore the OS shim) is stable for the lifetime of the active deck.
- The `CATEGORY_DEFINITIONS` alias is kept as a `readonly CategoryData[]` re-export of `CATEGORIES`. Existing call sites in `index.ts` use `category.emojis: string[]` (and `category.icon`, `category.id`, `category.label`), which still work.
- The `select_command_shortcode` field supports `{{shortcode}}` and `{{emoji}}` placeholders (mirroring the existing `select_command` placeholders). If the user does not supply a `select_command_shortcode`, the resolver falls back to the per-OS shim for the shortcode path. If the shortcode is unknown (not in the catalog), the double-tap is a no-op.
- One pre-existing test broke because the new catalog's `smileys` category is 48 emojis (vs. 16 in the old hand-rolled definition), turning the previously-2-page smileys into a 4-page category. Switched the test to use the `drink` category (18 emojis → 2 pages) which still matches the original test's intent. This is a Phase 46 contract test being kept honest with the new data.

## Notes for downstream

- The catalog file is loaded via `import categoriesData from './data/categories.json' with { type: 'json' }` (Node 22+ import assertion). The repo's Node engine (>=20.x) needs to support import assertions; if a 20.x baseline doesn't have this, the `tsconfig.json` `resolveJsonModule` + plain import is the fallback.
- The shim module's `resolveEmojiTypeCommand` and `resolveEmojiShortcodeCommand` are independent — they both return `ShimCommandResult`, so the render path can check `.kind === 'supported'` and call `.command` on the supported path. Plan 49-04 (the launcher) can reuse these.
- The data-driven `shortcodes` map is built per-category (last-write-wins) and exposed as `category.shortcodes[char]`. The `getEmojiShortcode(char)` helper walks the categories in order. Total lookup cost: 11 categories × 35 emojis avg = ~385 map probes. Acceptable for a runtime helper.
- Plan 49-02 (real emoji rendering) will replace the `U+1Fxxx` text fallback with a native emoji font stack. The branded SVG icons (12 emojis) remain as deliberate overrides via `EMOJI_ICON_ASSETS`.
- Plan 49-03 (n-2 page nav) will rewrite `createDecks` and the layout. The pagination logic itself is unchanged in 49-01; only the data shape and shim wiring changed.
