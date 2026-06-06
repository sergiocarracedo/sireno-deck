# Plan 49-04 Summary

**Completed:** 2026-06-06

## What was built

Shipped the emoji-selector's first-class `emoji-launcher` button type with a 2×3 grid render and renamed the existing per-emoji entry button from `emoji-entry-button` to `emoji-emoji-button`. The launcher is the addon's visual entry point on the main deck at position 0, displaying six representative emojis (😂 🔥 ❤️ ⭐ 🍕 🎵) at a larger size with the native emoji font stack. The type rename clears up the conceptual "entry button" role ambiguity: the new launcher is the main entry point, while `emoji-emoji-button` is a per-emoji sender in the subdeck grids.

The bundled `launcher.svg` asset is a 4-cell colored grid showing four of the six emojis as a fallback for environments that don't have a native emoji font. The main deck now starts with the launcher at position 0, then 11+ category buttons (positions 1+), and the system back at position 14.

The CHANGELOG entry documents the breaking change for any out-of-tree configs that reference the old `emoji-entry-button` type name.

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — MODIFIED. Renamed `type: 'emoji-entry-button'` → `type: 'emoji-emoji-button'`. The exported `emojiEntryButton` function name stays (for back-compat with test imports).
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx` — NEW. Exports `emojiLauncherButton` of type `emoji-launcher`. The render is a Tailwind `grid grid-cols-3 grid-rows-2` div with 6 cells, each rendering the emoji character with the `EMOJI_FONT_STACK` inline style and `text-2xl` size. The harness markers `data-sireno-launcher-grid` and `data-sireno-launcher-cell` are emitted for testability.
- `packages/cli/src/builtin-addons/emoji-selector/assets/launcher.svg` — NEW. A 4-cell colored SVG with four of the six emojis as a fallback for headless environments.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — MODIFIED. Added `EMOJI_LAUNCHER_GRID` constant (the six emoji characters) and `EmojiLauncherButtonSchema` (a single optional `label` field, defaults to "Emoji"). Added `launcher.svg` to the bundled assets map. Exported both new symbols.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — MODIFIED. Imported `emojiLauncherButton`, registered it in the addon's `buttons` array. The main deck construction now places the launcher at position 0 and shifts the category buttons to positions 1+.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — MODIFIED. Updated two existing tests to expect the launcher at position 0 and the favorites at position 1. Added two new tests: "renders the launcher button as a 2x3 grid of the six representative emojis" (asserts the harness markers and the six emoji characters in the rendered HTML) and "places the launcher at position 0 of the main deck".
- `CHANGELOG.md` — MODIFIED. Added a 2026-06-06 entry covering all Phase 49 features (launcher, HID shim, real emoji rendering, n-2 page nav, addon-decorated system back) and the `emoji-entry-button` → `emoji-emoji-button` breaking change.

## Decisions made

- The launcher render is a Tailwind grid with explicit `data-sireno-launcher-grid` and `data-sireno-launcher-cell` markers. This lets the test harness verify the grid structure without depending on Tailwind class stringification.
- The launcher's six emojis are the `EMOJI_LAUNCHER_GRID` constant in `support.tsx`. The launcher.tsx imports it and renders all six. If a future plan wants to add/remove emojis, only the constant needs to change.
- The launcher button has no `onTap` and no config-driven `commands` field. It's a display-only button. The "main entry point" purpose is satisfied by being prominent at position 0 of the main deck; tapping the launcher does nothing in this iteration. A future plan can wire an `onTap` that navigates to a quick-pick subdeck if needed.
- The CHANGELOG entry uses the standard "Features / Fixes / Learnings" sections and adds a new "Breaking Changes" subsection to document the type rename. The bundled example config has been updated to use the new name (the in-repo `index.test.ts` references the new name throughout).
- The type rename is a hard rename — no compatibility shim. The test imports reference `emoji-emoji-button` directly. Any out-of-tree config files that reference `emoji-entry-button` will fail to load (the runtime will log a config validation error). The CHANGELOG call-out is the user-facing notice.

## Notes for downstream

- The pre-existing 43 `runtime.test.ts` failures remain. They are out of scope for this phase (they were pre-existing before Phase 46).
- The launcher's render is a CSS grid (`grid-cols-3 grid-rows-2`). On a 72×72px Stream Deck button, the 6 cells are 24×24px each. The `text-2xl` (1.5rem / 24px) emoji glyphs fit comfortably in 24×24px cells. On a smaller button (Stream Deck + at 96×96px or similar), the cells scale up proportionally.
- The bundled `launcher.svg` is a static asset, not a runtime-generated SVG. The `assets` map exposes the absolute file path so the shared `Icon` resolver can load it on demand.
- The launcher button is NOT a tap target for individual emojis — it's a single display button. Tapping anywhere on the launcher fires the (currently no-op) tap. A future plan can split the 2×3 grid into a per-emoji tap surface if needed, but that would require a new button type that handles 6 sub-tap events.
