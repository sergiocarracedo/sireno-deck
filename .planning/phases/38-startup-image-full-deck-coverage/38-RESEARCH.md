# Phase 38 Research: Startup Image Full Deck Coverage

**Date:** 2026-06-04
**Confidence:** HIGH — this phase modifies existing code in a single file using sharp operations already proven in the codebase.

## Don't Hand-Roll

- **Sharp composite + extract** — already used by this file (`startup-placeholder.ts`). No need to invent a new image composition pipeline. Sharp handles RGBA compositing, `contain`-mode resizing with aspect ratio preservation, and region extraction. [VERIFIED: codebase]
- **Background color parsing** — sharp accepts hex strings in composite's `create.background` and internally uses the color module. No custom color parsing needed. [VERIFIED: sharp docs]

## Common Pitfalls

1. **Reusing sharp instances for multiple `.extract()` calls** — Known issue [CITED: lovell/sharp#3868, #4105]. Each `extract()` call mutates the same internal pipeline. The current code correctly creates a new `sharp(deckBuffer, {...raw...})` inside each loop iteration. This pattern must be preserved.

2. **`fit: "contain"` with `width` and `height` both set** — With `contain`, the image scales to fit *within* both dimensions. The letterbox color is controlled by `background` on the resize options (defaults to black). Since we composite onto a pre-created canvas with `#efe3e1` background, the letterbox areas will show the canvas background color through the composite. No separate `resize.background` needed. [VERIFIED: sharp docs]

3. **Raw buffer channel order** — Sharp's `.raw()` output is `uint8` RGB (3 channels) after `.removeAlpha()`. Channel count in metadata sometimes reports incorrectly when `extractChannel` is used, but our code doesn't use that — it's straightforward full-image extraction. [VERIFIED: sharp docs, lovell/sharp#2104]

## Existing Patterns in This Codebase

- **Deck-wide composite → per-key extraction** — `startup-placeholder.ts` lines 12-83. Creates a full canvas, resizes logo with `contain`, composites centered, slices into 72×72 key buffers via `.extract()`. This exact pattern is preserved — only dimensions and background color change.
- **Background color constant** — `STREAM_DECK_KEY_PRESET.background` in `render-preset.ts`. The new color (`#efe3e1`) will be a separate constant since it's logo-specific, not a preset property.
- **Test pattern** — `startup-placeholder.test.ts` lines 1-22 verifies buffer size, deck-wide treatment, and per-key content variance. Tests need background color assertion updated.

## Recommended Approach

1. Change `createStartupPlaceholderDeckBuffer` resize from current `88%×36%` math to `width: width, height: height` with `fit: "contain"` — the full canvas dimensions.
2. Remove the `Math.max(72, ...)` / `Math.max(40, ...)` minimum clamps — no longer needed.
3. Replace `STREAM_DECK_KEY_PRESET.background` reference with a hardcoded `"#efe3e1"` constant for the `sharp({ create: { background: ... } })` call.
4. Update test expectations in `startup-placeholder.test.ts` to reflect the new background color.
5. No changes to `start.ts`, `browser-renderer.ts`, `device/`, or any other file.
