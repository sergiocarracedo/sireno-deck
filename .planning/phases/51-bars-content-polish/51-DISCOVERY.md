# Phase 51 Discovery — Bars content polish

**Phase:** 51 — Bars content polish
**Discovered:** 2026-06-08
**Risk tier:** Low (in-codebase render-seam change)

## What Exists Today

`packages/cli/src/ui/Bars.tsx` (79 lines) is the shared component. It accepts a bounded 1–3 tuple of `BarsItem = { color?, maxValue, title, value }`, renders a column per item, and currently:
- Renders the title as a small uppercase `Text` above the bar.
- Renders a rounded bar background (color-mix 12% transparent) and an absolute-positioned fill at the bottom, colored with `item.color` and sized by `getBarFillHeight(item.value, item.maxValue)`.
- **Does NOT render the value as text anywhere** — the value is only used to compute the bar fill height.

The label color (for the bar fill, not the title) is already `item.color ?? 'var(--sireno-color-primary)'` (line 43). BARS-01 is partially satisfied at the CSS-variable level — the runtime injects `--sireno-color-primary` from the active theme's `colorTokens.primary` into the rendered HTML, so the CSS variable fallback works in both DOM and sharp render paths.

`Bars.test.tsx` (55 lines) covers bounded counts, the primary-token fallback (asserts `var(--sireno-color-primary)` is in the HTML and the legacy `var(--color-primary)` is NOT), and count rejection.

## Canonical Consumer: system-status addon

`packages/cli/src/builtin-addons/system-status/buttons/bars.tsx` (146 lines) maps CPU/RAM/Disk metrics to `BarsItem[]`. It renders the value text as a SEPARATE grid BELOW the bars (`<LabelValueList>` shape with formatted strings like `"12.3 GB"`). It feeds `displayMetric.color` into `BarsItem.color`.

Implication: moving the value text inside the bar is a real UX change in the canonical consumer. The system-status addon will need to decide whether to keep the separate value grid (now-redundant) or drop it and rely on the in-bar value.

## Theme primary color path

- `themes/default/manifest.yml:16` → `primary: '#7dd3fc'`
- `themes/light/manifest.yml:7` → `primary: '#2563eb'`
- The runtime injects the primary color as the CSS variable `--sireno-color-primary`, generated from the active theme's `colorTokens.primary`.
- All current consumers reference the variable directly (`Bars.tsx`, `media-volume.tsx`, `analog-clock.tsx`, `light/index.js`). No `useThemeUiPresentation` use for primary.
- `theme-presentation.tsx` is for theme UI wrapper overrides (chips, icons, text shadows), not the primary color token.

## Rendering paths

- DOM/browser render path uses CSS variables — `--sireno-color-primary` works in both DOM and sharp paths because the variable is inlined into the rendered HTML before sharp rasterizes it.
- Sharp render path (`browser-renderer.ts:128`) extracts each key as a raw buffer with `.removeAlpha().raw().toBuffer()`. No pixel sampling of bar interiors today.
- No `mix-blend-mode` usage anywhere in the codebase. Zero matches in `packages/cli/src/`.
- `browser-renderer.test.ts` constructs test buffers with `sharp()` directly.

## Text component surface

`Text.tsx` (320 lines) is the existing rich text primitive. It supports:
- `tone`: accent, danger, foreground, primary, success
- `size`: xs, sm, md, lg, xl, 2xl, 3xl, 5xl
- `typography`: aux, main, mono
- `fit`: shrink behavior from v1.3 (TRF-03/04)
- `style`: passes through to the underlying element (we can use this to inject `transform: rotate(90deg)` and `mix-blend-mode: difference`)
- Rich markup tags via `RICH_TONE_TAGS` / `RICH_SIZE_TAGS`

This means the rotated, blended value text can be a single `<Text style={{ transform: 'rotate(90deg)', mixBlendMode: 'difference' }}>` element without needing a new primitive.

## Negative color implementation options

The keystone insight from the v1.5 research: **value text color can be precomputed at config load from `item.color` when it's a known solid hex**, eliminating runtime pixel sampling in the common case.

- If `item.color` is a hex string (`#7dd3fc`): precompute the negative as a hex string, pass it as a literal color in the `style` prop. The DOM and sharp paths both render literal colors.
- If `item.color` is undefined (the primary fallback): the negative of `var(--sireno-color-primary)` is NOT precomputable from a config file because the theme's primary is unknown at config-load time. Options:
  1. Pass `mix-blend-mode: difference` to the DOM path and let CSS handle it. Sharp rasterization ignores `mix-blend-mode`, so the sharp path needs an explicit precomputed color.
  2. Resolve the theme primary at config-load time by importing the active theme manifest.
  3. Render the value text using a fixed tone (`tone="primary"`) and accept that "negative" means the inverse of the surrounding pixel, not the bar color — relying on `mix-blend-mode: difference` to invert.
- If the user supplies a non-hex color (e.g. a CSS variable reference), we cannot precompute. Fall back to `mix-blend-mode: difference` for DOM and a default high-contrast color for sharp.

## BARS-03 (near-gray fallback) implementation

Trivial precomputation:
1. Parse the bar color to RGB.
2. Compute luma: `0.2126 * r + 0.7152 * g + 0.0722 * b`.
3. If `|luma - 128| < 32`, the bar is near gray — fallback to white (`#ffffff`) for dark bars (luma < 128) and black (`#000000`) for light bars (luma >= 128).
4. Otherwise compute the standard negative: `(255 - r, 255 - g, 255 - b)`.

## Critical UX questions for discuss-phase 51

1. **system-status addon value grid:** keep the separate value grid below the bars, or drop it now that the value is inside the bar? Need user input.
2. **Value format inside the bar:** raw number (`"45"`), percentage (`"45%"`), or the formatted display string (`"12.3 GB"`) from system-status? `BarsItem` currently has `value: number` — adding `displayValue?: string` is an additive schema change.
3. **What is the "negative" of `var(--sireno-color-primary)`?** Two reasonable interpretations:
   - (a) The pixel-level visual negative — relies on `mix-blend-mode: difference` so the result tracks the actual rendered theme primary at runtime.
   - (b) The precomputed complement of the theme's primary hex (resolved at config load by reading the active theme manifest).
   - (a) is simpler and adapts to runtime theme switches; (b) is more deterministic and works in the sharp path without pixel sampling.

## Out-of-Scope Items (per v1.5 plan)

- Per-bar typography overrides
- Bar gradient fills (only solid colors are in scope)
- Animated bar fill transitions
- Bar count beyond 3 (the existing bounded tuple is preserved)

## Risk Assessment

Low overall. The render-seam change is contained in `Bars.tsx` (and the system-status consumer's UX decision). No new external dependencies. The precomputed-color path covers the common case; the DOM-blend path covers the variable-reference case; the sharp path accepts literal colors.

The two design decisions that need user input (UX-1: system-status value grid, UX-2: primary token negative strategy) should be resolved in `discuss-phase 51` before planning.

---

*Discovery complete: 2026-06-08*
*Next: discuss-phase 51 to resolve UX-1 and UX-2*
