# Phase 51 CONTEXT — Bars content polish

**Phase:** 51 — Bars content polish
**Discussed:** 2026-06-08
**Status:** locked — proceed to plan-phase 51

## Domain

The shared `Bars` component (`packages/cli/src/ui/Bars.tsx`) currently renders a column per item with a small title and a vertical fill bar, but it does not render the value as text. Phase 51 closes three small UX gaps:

- **BARS-01** — Labels (the bar fill color) use the theme primary color when `item.color` is undefined. (The CSS-variable fallback already exists; this phase locks in coverage and contracts.)
- **BARS-02** — Render the value as text inside the bar body, rotated 90 degrees, in a color that is the visual negative of the bar fill.
- **BARS-03** — When the bar's effective color is near gray (luma within 32 of 128), fall back to white-on-dark / black-on-light so the text stays readable.

The canonical consumer is the system-status addon's bars button.

## Locked decisions

### UX-1 — Drop the system-status value grid

The system-status addon's bars button currently renders the value as a separate grid BELOW the bars via `LabelValueList`. After phase 51, the rotated in-bar value becomes the ONLY place the number lives. The separate value grid is removed.

Rationale: the rotated in-bar value is the user-facing surface that satisfies the requirement; keeping a separate horizontal grid is a duplicate affordance that wastes vertical space and is more visually noisy.

### UX-2 — Add `displayValue?: string` to `BarsItem`

`BarsItem` gains an optional `displayValue: string` field. Render order:
1. If `displayValue` is set, render it.
2. Else render `String(Math.round(item.value))`.

`system-status` populates `displayValue` with its existing formatted strings (`"12.3 GB"`, `"67%"`). Other consumers (none today) can omit it and get the rounded number.

Schema change is additive (new optional field); no breaking change to existing config.

### UX-3 — `mix-blend-mode: difference` for DOM, precompute for sharp

DOM/browser path: the value text uses `<Text style={{ mixBlendMode: 'difference' }}>`. The browser composites the text as the pixel-level inverse of whatever is under it. Adapts to runtime theme switches without code changes.

Sharp path: read the active theme's primary color at config load and precompute the negative complement as a literal hex string. Pass it to the text element via `style={{ color: '...' }}`. Requires the renderer (or a config-time helper) to resolve the active theme manifest and look up `colorTokens.primary`. This is a one-time resolution at config load; the resolved negative is a constant for the lifetime of the process.

For both paths, when `item.color` is a known solid hex (e.g. `#7dd3fc`), precompute the negative from the hex directly. When `item.color` is undefined, fall through to the theme-primary strategy above.

## Specifics

### Negative color precomputation (config load helper)

A new helper in `packages/cli/src/ui/`:

```ts
// packages/cli/src/ui/negative-color.ts (new)
export function computeNegativeColor(
  item: BarsItem,
  themePrimaryHex: string,
): string {
  const effective = item.color ?? themePrimaryHex
  const rgb = parseHex(effective)  // throws on non-hex (we handle below)
  const luma = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
  if (Math.abs(luma - 128) < 32) {
    // BARS-03: near gray, pick a high-contrast fallback
    return luma < 128 ? '#ffffff' : '#000000'
  }
  return toHex({
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  })
}
```

`parseHex` accepts `#RGB`, `#RRGGBB`. If the input is not a hex (e.g. `var(--sireno-color-primary)`), the helper returns `null` and the caller falls back to the DOM blend path (sharp path uses a static `#ffffff` default in this case — see Sharp path default below).

### Resolving the active theme primary

The renderer already knows the active theme at config load (it builds the CSS variable map from `colorTokens.primary`). Expose this through a small read-only accessor or pass it down as a `themePrimaryHex: string` prop to `Bars` when the consumer doesn't supply `item.color`. The simplest shape: a `themePrimaryHex?: string` prop on `Bars` (optional; defaults to `null` → DOM blend path only).

### DOM path rendering

`Bars.tsx`:

```tsx
{!useSharpPath && (
  <Text
    size="xs"
    typography="mono"
    tone="foreground"
    style={{
      transform: 'rotate(-90deg)',
      transformOrigin: 'center center',
      mixBlendMode: 'difference',
    }}
  >
    {displayValue}
  </Text>
)}
```

The DOM blend path doesn't need the precomputed color at all — the browser handles it. This is the cleanest implementation: no precomputation for DOM, precomputation only for sharp.

### Sharp path rendering

`Bars.tsx` (or a sibling helper) computes the negative color from `item.color` or `themePrimaryHex` and passes it explicitly:

```tsx
{useSharpPath && (
  <Text
    size="xs"
    typography="mono"
    style={{
      transform: 'rotate(-90deg)',
      transformOrigin: 'center center',
      color: negativeColor,  // precomputed hex or static fallback
    }}
  >
    {displayValue}
  </Text>
)}
```

The renderer needs a way to know "I am the sharp path". Simplest: a module-level constant `IS_SHARP_PATH` that the sharp entry sets to `true` (analogous to the existing pattern in the codebase). Or pass `useSharpPath` as a prop from the caller. We pick prop-based: the bars button consumer decides, and system-status is the only consumer.

### Sharp path default (when no color is resolvable)

If `item.color` is undefined and `themePrimaryHex` is not provided (DOM blend path is in use, or sharp path with no theme info), the sharp path uses `#ffffff` as the value text color. The text will be invisible against a light background — acceptable as a "no info" state. The DOM path is unaffected.

### Rotation: `-90deg` not `90deg`

Use `transform: 'rotate(-90deg)'` so the text reads bottom-to-top, which is the natural reading direction on a horizontal bar (the text follows the bar's vertical axis, anchored at the bottom). `transformOrigin: 'center center'` keeps the text centered on the bar fill area.

### Bounded tuple remains 1-3

No change to the existing `BarsItems` type. Adding `displayValue?: string` is additive.

## Canonical refs

- `packages/cli/src/ui/Bars.tsx` — the component to modify
- `packages/cli/src/ui/Bars.test.tsx` — existing tests, extend with new cases
- `packages/cli/src/ui/Text.tsx` — supports `style` prop pass-through; supports `tone` and `typography`; we use it for the rotated value
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx` — canonical consumer; populates `displayValue`; drops the value grid
- `packages/cli/src/themes/default/manifest.yml`, `light/manifest.yml` — `colorTokens.primary` source
- `packages/cli/src/render/browser-renderer.ts:128` — sharp path entry; needs `themePrimaryHex` resolution (or a config-time helper that the bars button reads)

## Code context (from discovery)

- `BarsItem` today: `{ color?: string, maxValue: number, title: string, value: number }`. Adding `displayValue?: string` is a strictly additive change.
- Bar fill color today: `const color = item.color ?? 'var(--sireno-color-primary)'` (line 43). The CSS variable is inlined into the rendered HTML before sharp rasterizes, so the var works in both paths.
- Theme primary tokens: default `#7dd3fc`, light `#2563eb`. The renderer builds `--sireno-color-primary` from `colorTokens.primary` in the active theme manifest.
- No `mix-blend-mode` usage anywhere in `packages/cli/src/` today — the rendered text uses solid `tone` colors. We are introducing the first use.
- Sharp path today: `browser-renderer.ts:128` extracts each key as a raw buffer via `sharp(buffer).removeAlpha().raw().toBuffer()`. No pixel sampling of bar interiors.
- Existing `Bars.test.tsx` (55 lines, 3 tests): bounded counts, primary token fallback, count rejection. We add tests for the new value rendering, the negative color, the near-gray fallback, and the displayValue path.

## Verification anchors

- A `Bars` item with no `color` renders the value text inside the bar fill, rotated, using `mix-blend-mode: difference` in the DOM path.
- A `Bars` item with `color: '#7dd3fc'` renders the value text in `#8c2c73` (precomputed negative) in the sharp path; in the DOM path, the same item still uses `mix-blend-mode: difference`.
- A `Bars` item with `color: '#808080'` (luma = 128, near gray) renders white (`#ffffff`) in the sharp path.
- `system-status` consumers: the separate value grid is removed; the formatted string appears inside the bar.

## Deferred ideas (out of scope for phase 51)

- Per-bar typography overrides (no use case)
- Bar gradient fills (only solid colors are in scope)
- Animated bar fill transitions
- Bar count beyond 3 (existing bounded tuple is preserved)
- Optional suffix on rounded numbers (e.g. "12ms" or "45%") — would need a per-bar `format: 'percent' | 'raw' | string` API. Not needed for v1.5.
- A `value: { displayValue, format }` object form for richer formatting — premature for v1.5.

---

*CONTEXT locked: 2026-06-08*
*Next: plan-phase 51*
