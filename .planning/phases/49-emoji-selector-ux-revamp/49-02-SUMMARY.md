# Plan 49-02 Summary

**Completed:** 2026-06-06

## What was built

Replaced the `U+1Fxxx` text fallback in the emoji entry button with a real-emoji render path that uses a native emoji font stack. The `Text` component grew a new `5xl` size step and a `fontStack` prop that applies `font-family` as inline style. The new `renderEmojiGlyph(char, options)` helper in `support.tsx` renders the raw unicode character at the largest readable size, and the entry button now uses it for non-branded emojis. The 12 branded SVG icons (in `EMOJI_ICON_ASSETS`) remain as deliberate overrides.

The native font stack is: `'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif`. The browser (or emulator) picks the first available emoji font, so a Linux user with Noto Color Emoji installed and a Mac user with Apple Color Emoji both get real emoji glyphs without any asset bundling.

## Key files

- `packages/cli/src/ui/Text.tsx` — Added `'5xl'` to the `SIZE_CLASS` map (Tailwind `text-5xl`, which is `font-size: 3rem; line-height: 1`), added it to `RICH_SIZE_TAGS`, and added a `fontStack?: string` prop to `TextProps`. When `fontStack` is set, it is composed into the `style` object as `fontFamily`.
- `packages/cli/src/ui/Text.test.tsx` — NEW (the repo didn't have a Text test file before). 3 tests: 5xl size renders with the right `data-sireno-text-size`, the `fontStack` prop is applied as inline `font-family`, and `fontFamily` is absent when `fontStack` is omitted.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — Added the `EMOJI_FONT_STACK` constant and the `renderEmojiGlyph(char, options?)` export. The helper wraps the emoji character in a flex-centered `Text` with the font stack and the requested size (default `5xl`).
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — The non-branded render path now calls `renderEmojiGlyph(config.emoji)` instead of `renderEmojiText(getEmojiFallbackLabel(config.emoji))`. The branded SVG path is unchanged.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — Replaced the old "keeps an explicit text fallback for unsupported emoji values" test (which asserted the `U+1Fxxx` text path) with "renders the real unicode glyph for non-branded emojis via the native font stack". The new test asserts the rendered HTML contains the raw emoji character, contains the font-stack family names, contains the `text-5xl` class, and does NOT contain the `U+1Fxxx` fallback text.

## Decisions made

- The Text component's `fontStack` is applied as inline `style.fontFamily` (composed with any caller-supplied `style`), not as a Tailwind class. This avoids having to register a dynamic `font-[...]` arbitrary value class in the Tailwind safelist and keeps the font stack directly visible in the rendered HTML.
- The new `5xl` size step uses Tailwind's `text-5xl` (`3rem / 48px`). For a 72×72px Stream Deck button, that's the largest readable size that still leaves margin around the glyph. The `renderEmojiGlyph` helper applies `flex items-center justify-center` so the glyph centers inside whatever container the parent provides.
- The branded SVG icons (12 emojis) are kept as deliberate overrides. They appear in `EMOJI_ICON_ASSETS` and the entry button's render still uses them when present. This is the same override model the prior `EMOJI_ICON_ASSETS` had.
- The Text test file did not exist before; this plan created it. There is no `Text.test.tsx` in the repo, so the new tests fill a gap. No existing test was removed.

## Notes for downstream

- Plan 49-03 (n-2 page nav + addon-decorated system back) does not depend on this plan's render changes for correctness — the page-nav button can still render via the existing `change-deck` button type. But the larger glyph size and font-stack render are now available for the page-nav button's nav-arrow icon overlay if needed.
- Plan 49-04 (the new `emoji-launcher` button type with 2×3 grid) will use `renderEmojiGlyph` to render each of the six grid cells. The font stack and size are the same shape as the per-emoji entry button.
- The new font stack is applied inline per render. If a future test or theme wants to verify the font stack at the document level, it can grep the rendered HTML for the `font-family:` attribute — that's the contract this plan locks in.
