# Plan 51-01 Summary

**Completed:** 2026-06-08

## What was built

The shared `Bars` component now renders the value as rotated text inside the bar fill. A pure `negative-color` helper computes the visual inverse of a hex color with a near-gray auto-contrast fallback. The DOM render path uses `mix-blend-mode: difference` (the browser inverts at render time); the sharp render path uses a precomputed hex color (sharp rasterization ignores CSS blend modes). A new `displayValue?: string` field on `BarsItem` carries a formatted string override; consumers that omit it fall back to `String(Math.round(item.value))`.

## Key files

- `packages/cli/src/ui/negative-color.ts` — pure helper. `parseHex` (accepts `#RGB` and `#RRGGBB`, rejects rgb()/hsl()/named/CSS-var/empty), `toHex` (pads + clamps), `luma` (BT.709 weights), `computeNegativeColor` (per-channel complement with near-gray fallback).
- `packages/cli/src/ui/negative-color.test.ts` — 24 cases (parse 9, toHex 2, luma 3, compute 10).
- `packages/cli/src/ui/Bars.tsx` — `BarsItem` gains `displayValue?: string`; `BarsProps` gains `themePrimaryHex?: string` and `useSharpPath?: boolean`. New `<Text>` element inside the bar fill (absolute, centered, rotated -90deg, mono typography). DOM path: `mix-blend-mode: difference`. Sharp path: explicit precomputed color.
- `packages/cli/src/ui/Bars.test.tsx` — 10 cases total (3 existing + 7 new). The new cases cover: value rendered as rotated text, Math.round fallback, displayValue preferred, sharp path precompute, near-gray in sharp, theme primary fallback, static fallback.

## Decisions made

- **Marker for the value element is a className, not a data-* attribute.** The `Text` component (320 lines, hardens a strict prop list) doesn't pass through custom `data-*` attributes — it only emits its own `data-sireno-text-*`. Used `className="sireno-bars-value ..."` instead. Test assertions use `expect(html).toContain('sireno-bars-value')`.
- **Rotation: -90deg, transformOrigin center.** Keeps the text centered on the bar fill and reads bottom-to-top.
- **luma edge at 128 documented.** `#7f7f7f` (luma 127) → `#ffffff`; `#808080` (luma 128) → `#000000`. The `<` comparison in the ternary lands black for the boundary.
- **Luma floating-point test relaxed to `toBeCloseTo(255, 5)`.** The IEEE-754 sum of 0.2126 + 0.7152 + 0.0722 is not exactly 1.0, so 255 * 1.0 ≈ 254.999... is what the function actually returns for pure white. Test is now tolerant.
- **Complement of `#2563eb` is `#da9c14`, not `#d99c14`.** 0xFF - 0x25 = 0xDA. The plan's "0xDA" math was correct, but its `#d99c14` assertion had a typo (9 instead of a). Implementation is correct; the test was wrong, fixed.

## Notes for downstream

- The system-status consumer (Plan 51-02) will pass `displayValue: displayMetric.formattedValue` and drop the separate value grid below the bars.
- The `useSharpPath` and `themePrimaryHex` props are not yet wired from the renderer in the system-status path. The DOM blend path (the default) does not need them. Wiring them through to support the sharp path is a follow-up if/when needed; it's a small, additive change in the render-time theme context.
- The static white fallback (`#ffffff`) is acceptable as a "no info" state for the sharp path when neither `item.color` nor `themePrimaryHex` is provided. If a future user complains, the next iteration can render the value text in a fixed tone (e.g. `tone="primary"`) instead.
